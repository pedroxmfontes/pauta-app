/* ============================================================
   STATE
============================================================ */
let allMeetings = [];
let meetings = [];
let currentFolder = '';
let dismissedAlerts = new Set();
let currentView = 'dashboard';
let currentId = null;
let currentMethod = 'audio';
let detailEditMode = false;
let currentUser = null;

/* ============================================================
   PASTAS — filtro global aplicado sobre allMeetings; toda a
   interface (dashboard, insights, timeline, busca, riscos,
   alertas) enxerga só o que está em "meetings" (já filtrado).
============================================================ */
function meetingFolder(m){ return m.pasta || 'Geral'; }
function applyFolderFilter(){
  if(currentFolder && !allMeetings.some(m => meetingFolder(m) === currentFolder)){
    currentFolder = ''; // a pasta selecionada não existe mais (ex: dados de exemplo recarregados) — volta a mostrar tudo
  }
  meetings = currentFolder ? allMeetings.filter(m => meetingFolder(m) === currentFolder) : allMeetings.slice();
}
function folderList(){
  return [...new Set(allMeetings.map(meetingFolder))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
}

/* ============================================================
   ICON LIBRARY — single source of truth for every icon used
============================================================ */
const ICON_PATHS = {
  trendUp: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  trendDown: '<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r="0.6"/>',
  pin: '<path d="M12 2C8 2 5 5 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2.3"/>',
  bulb: '<path d="M9 18h6M10 22h4M12 2a6 6 0 00-4 10.5c.6.6 1 1.5 1 2.5h6c0-1 .4-1.9 1-2.5A6 6 0 0012 2z"/>',
  flag: '<path d="M4 22V4M4 4h13l-2.5 4L17 12H4"/>',
  users: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>',
  repeat: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  doc: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>',
  checkTasks: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12l3 3 5-6"/>',
  spark: '<path d="M12 3v3M12 18v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M3 12h3M18 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  sentiment: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  x: '<path d="M18 6L6 18M6 6l12 12"/>',
  undo: '<path d="M3 7v6h6"/><path d="M3 13a9 9 0 106.7-8.7"/>',
  more: '<circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none"/>'
};
function icon(name, size=15){
  const p = ICON_PATHS[name] || ICON_PATHS.target;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}

function escapeHtml(s){
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function fmtDate(ts){ return new Date(ts).toLocaleDateString('pt-BR', {day:'2-digit', month:'short', year:'numeric'}); }
function slug(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,40); }
function downloadBlob(content, type, filename){
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}
async function readJsonSafe(res){
  try{ return await res.json(); }catch(e){ return {}; }
}
/** Torna uma div clicável também operável por teclado (tab + Enter/Espaço), com foco visível via CSS. */
function makeClickable(el, handler){
  el.setAttribute('tabindex', '0');
  el.setAttribute('role', 'button');
  el.addEventListener('click', handler);
  el.addEventListener('keydown', e=>{
    if(e.key==='Enter' || e.key===' '){ e.preventDefault(); handler(e); }
  });
}

/* ============================================================
   TOASTS & CONFIRM MODAL — elegant feedback, no native dialogs
============================================================ */
function showToast(msg, type='info'){
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast toast-'+type;
  const ic = type==='success' ? 'check' : type==='error' ? 'alert' : 'bulb';
  el.innerHTML = `<span class="toast-icon">${icon(ic,15)}</span><span>${escapeHtml(msg)}</span>`;
  wrap.appendChild(el);
  requestAnimationFrame(()=>el.classList.add('show'));
  setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(), 250); }, 3200);
}
function showConfirm(message, confirmLabel='Confirmar', title='Confirmar ação'){
  return new Promise(resolve=>{
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal-card">
      <div class="modal-title">${escapeHtml(title)}</div>
      <p class="modal-text">${escapeHtml(message)}</p>
      <div class="modal-actions">
        <button class="btn" id="modalCancel">Cancelar</button>
        <button class="btn danger-solid" id="modalConfirm">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(()=>overlay.classList.add('show'));
    function close(v){ overlay.classList.remove('show'); setTimeout(()=>overlay.remove(),200); resolve(v); }
    overlay.addEventListener('click', e=>{ if(e.target===overlay) close(false); });
    overlay.querySelector('#modalCancel').addEventListener('click', ()=>close(false));
    overlay.querySelector('#modalConfirm').addEventListener('click', ()=>close(true));
  });
}

/* ============================================================
   BACKEND — todas as reuniões, análise por IA e transcrição
   agora vivem no servidor. O front-end só chama /api/*.
============================================================ */
async function loadMeetings(){
  try{
    const [meetingsRes, dismissedRes] = await Promise.all([
      fetch('/api/meetings'),
      fetch('/api/dismissed-alerts')
    ]);
    allMeetings = meetingsRes.ok ? await meetingsRes.json() : [];
    const dismissedArr = dismissedRes.ok ? await dismissedRes.json() : [];
    dismissedAlerts = new Set(dismissedArr);
  }catch(e){
    console.error('Falha ao carregar dados do servidor', e);
    showToast('Não foi possível conectar ao servidor. Verifique se ele está rodando.', 'error');
    allMeetings = []; dismissedAlerts = new Set();
  }
  applyFolderFilter();
  renderSidebar();
  renderMain();
}
async function persistDismissedAlerts(){
  try{
    await fetch('/api/dismissed-alerts', {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ids:[...dismissedAlerts]})
    });
  }catch(e){ console.error('Falha ao salvar alertas dispensados', e); showToast('Não foi possível salvar essa preferência.', 'error'); }
}
function setView(view, id){
  currentView = view; currentId = id || null;
  detailEditMode = false;
  renderMain(); renderSidebar();
  window.scrollTo({top:0, behavior:'smooth'});
}

/* ============================================================
   ANALYTICS HELPERS
============================================================ */
function overallScore(a){
  if(!a || !a.score) return null;
  const vals = Object.values(a.score).filter(v=>typeof v === 'number');
  if(!vals.length) return null;
  return Math.round(vals.reduce((s,v)=>s+v,0)/vals.length);
}
function scoreColor(v){ if(v==null) return 'var(--text-mute)'; if(v>=80) return 'var(--green)'; if(v>=60) return 'var(--blue)'; if(v>=40) return 'var(--orange)'; return 'var(--red)'; }
function scoreBadgeClass(v){ if(v==null) return ''; if(v>=80) return 'green'; if(v>=60) return 'blue'; if(v>=40) return 'orange'; return 'red'; }
function sentToNum(s){ const m={positivo:1, misto:0.3, neutro:0, negativo:-1}; return m[(s||'neutro').toLowerCase()] ?? 0; }
function taskCounts(a){
  const t = (a && a.tarefas) || [];
  let pendentes=0, concluidas=0, semResp=0, criticas=0, criticasTotal=0;
  t.forEach(x=>{
    if(x.concluida) concluidas++; else pendentes++;
    if(!x.responsavel || x.responsavel==='não definido') semResp++;
    if(x.critica){
      criticasTotal++;
      if(!x.concluida) criticas++; // "criticas" = críticas ainda EM ABERTO (label usado em todo o app)
    }
  });
  return {total:t.length, pendentes, concluidas, semResp, criticas, criticasTotal};
}
function computeTrendSplit(arr){
  const clean = arr.filter(v=>v!=null);
  if(clean.length<2) return null;
  const half = Math.max(1, Math.floor(clean.length/2));
  const early = clean.slice(0, clean.length-half);
  const recent = clean.slice(clean.length-half);
  if(!early.length) return null;
  const avg = a=>a.reduce((s,v)=>s+v,0)/a.length;
  return {delta: avg(recent)-avg(early), recentAvg:avg(recent), earlyAvg:avg(early)};
}
function aggregateExec(){
  const total = meetings.length;
  let decisoes=0, tarefas=0, pendentes=0, concluidas=0, semResp=0, criticas=0;
  let minProd=0, minPerd=0;
  const porMes={};
  meetings.forEach(m=>{
    const a=m.analise||{};
    decisoes += (a.decisoes||[]).length;
    const tc = taskCounts(a);
    tarefas+=tc.total; pendentes+=tc.pendentes; concluidas+=tc.concluidas; semResp+=tc.semResp; criticas+=tc.criticas;
    if(a.tempo && m.duracaoMin){
      minProd += (a.tempo.produtivo_pct||0)/100 * m.duracaoMin;
      minPerd += (100-(a.tempo.produtivo_pct||0))/100 * m.duracaoMin;
    }
    const mk = new Date(m.criadoEm).toLocaleDateString('pt-BR',{month:'short', year:'2-digit'});
    porMes[mk] = (porMes[mk]||0)+1;
  });
  const chron = meetings.slice().sort((a,b)=>a.criadoEm-b.criadoEm);
  const scores = chron.map(m=>overallScore(m.analise)).filter(v=>v!=null);
  const sentiments = chron.map(m=>sentToNum(m.analise?.sentimento?.geral));
  const criticasPorReuniao = chron.map(m=>taskCounts(m.analise).criticas);
  const scoreTrend = computeTrendSplit(scores);
  const sentTrend = computeTrendSplit(sentiments);
  const criticasTrend = computeTrendSplit(criticasPorReuniao);
  const ranked = meetings.filter(m=>overallScore(m.analise)!=null).sort((a,b)=>overallScore(b.analise)-overallScore(a.analise));
  return {
    total, decisoes, tarefas, pendentes, concluidas, semResp, criticas,
    produtividadeMedia: scores.length ? Math.round(scores.reduce((s,v)=>s+v,0)/scores.length) : null,
    sentimentoMedio: sentiments.length ? sentiments.reduce((s,v)=>s+v,0)/sentiments.length : null,
    decisoesPorReuniao: total ? Math.round(decisoes/total*10)/10 : null,
    horasProdutivas: Math.round(minProd/60*10)/10,
    horasDesperdicadas: Math.round(minPerd/60*10)/10,
    porMes, scoreTrend, sentTrend, criticasTrend,
    maisProdutiva: ranked[0]||null,
    menosProdutiva: ranked.length>1 ? ranked[ranked.length-1] : null
  };
}
/** Em quantas reuniões (das já analisadas) um score específico ficou igual ou abaixo do valor informado. */
function percentileRank(value, allValues){
  const clean = allValues.filter(v=>v!=null);
  if(!clean.length || value==null) return null;
  const belowOrEqual = clean.filter(v=>v<=value).length;
  return Math.round(belowOrEqual/clean.length*100);
}
/**
 * Compara uma reunião com a média histórica das outras já analisadas: percentil geral,
 * pontos fortes/fracos por dimensão de score e uma frase de conclusão automática.
 * Tudo calculado a partir de dados já salvos, sem chamada nova de IA.
 */
function buildComparison(m, scoreLabels){
  const a = m.analise || {};
  if(!a.score) return null;
  const others = meetings.filter(x=>x.id!==m.id && x.analise?.score);
  if(others.length < 2) return null;

  const diffs = Object.entries(scoreLabels).map(([k,label])=>{
    const vals = others.map(x=>x.analise.score[k]).filter(v=>typeof v==='number');
    if(!vals.length || typeof a.score[k]!=='number') return null;
    const avg = vals.reduce((s,v)=>s+v,0)/vals.length;
    return {k, label, value:a.score[k], avg, diff:a.score[k]-avg};
  }).filter(Boolean);

  const os = overallScore(a);
  const othersOverall = others.map(x=>overallScore(x.analise)).filter(v=>v!=null);
  const pct = (os!=null && othersOverall.length) ? percentileRank(os, [...othersOverall, os]) : null;

  const strengths = diffs.filter(d=>d.diff>=5).sort((x,y)=>y.diff-x.diff).slice(0,2);
  const weaknesses = diffs.filter(d=>d.diff<=-5).sort((x,y)=>x.diff-y.diff).slice(0,2);

  let conclusion;
  if(strengths.length && weaknesses.length){
    conclusion = `Esta reunião apresentou ${strengths[0].label.toLowerCase()} acima da média (${strengths[0].value} vs. ${Math.round(strengths[0].avg)}), mas ficou abaixo em ${weaknesses[0].label.toLowerCase()} (${weaknesses[0].value} vs. ${Math.round(weaknesses[0].avg)}) — vale atenção nesse ponto na próxima reunião.`;
  } else if(strengths.length){
    conclusion = `Esta reunião se destacou em ${strengths.map(s=>s.label.toLowerCase()).join(' e ')}, acima da média histórica da empresa.`;
  } else if(weaknesses.length){
    conclusion = `Esta reunião ficou abaixo da média histórica em ${weaknesses.map(s=>s.label.toLowerCase()).join(' e ')} — vale investigar o motivo.`;
  } else {
    conclusion = 'Esta reunião ficou em linha com a média histórica da empresa, sem pontos fortes ou fracos que se destaquem.';
  }

  return { pct, strengths, weaknesses, conclusion, totalComparadas: others.length };
}
/** Críticas e pendentes primeiro, pra quem gerencia identificar rápido o que resolver antes. */
function sortTasksForDisplay(tarefas){
  return tarefas.map((t,i)=>({t, i})).sort((x,y)=>{
    if(!!x.t.concluida !== !!y.t.concluida) return x.t.concluida ? 1 : -1;
    if(!!x.t.critica !== !!y.t.critica) return x.t.critica ? -1 : 1;
    return 0;
  });
}
function taskRowHtml({t,i}){
  return `<tr id="taskrow-${i}" class="${t.critica && !t.concluida ? 'task-critical-row' : ''}">
    <td><input type="checkbox" class="task-check" data-idx="${i}" ${t.concluida?'checked':''}></td>
    <td class="task-desc ${t.concluida?'done':''}">${escapeHtml(t.tarefa)}</td>
    <td>${t.responsavel && t.responsavel!=='não definido' ? escapeHtml(t.responsavel) : badge('sem responsável','orange')}</td>
    <td><span class="prazo-chip">${escapeHtml(t.prazo||'não definido')}</span></td>
    <td>${t.critica ? badge('crítica','red') : ''}</td>
  </tr>`;
}
function taskBadgesHtml(tc){
  const concluidasCriticas = tc.criticasTotal - tc.criticas;
  return `${badge(tc.pendentes+' pendentes', tc.pendentes?'orange':'mute')}${badge(tc.concluidas+' concluídas', 'green')}${tc.semResp?badge(tc.semResp+' sem responsável','orange'):''}${tc.criticas?badge(tc.criticas+' crítica'+(tc.criticas===1?'':'s')+' em aberto','red'):''}${concluidasCriticas>0?badge(concluidasCriticas+' crítica'+(concluidasCriticas===1?'':'s')+' já concluída'+(concluidasCriticas===1?'':'s'),'mute'):''}`;
}

/* ============================================================
   EDIÇÃO MANUAL — permite corrigir o que a IA gerou (resumo,
   decisões, riscos, tarefas) direto na página de detalhe.
============================================================ */
function editRowHtml(value, cls){
  return `<div class="edit-row"><input type="text" class="${cls}" value="${escapeHtml(value)}"><button type="button" class="edit-row-remove" title="Remover">${icon('x',13)}</button></div>`;
}
function resumoSectionHtml(a, editMode){
  if(!editMode) return `<p class="summary-text">${escapeHtml(a.resumo_executivo || 'Sem resumo disponível.')}</p>`;
  return `<textarea id="editResumo" style="min-height:110px; line-height:1.7;">${escapeHtml(a.resumo_executivo || '')}</textarea>`;
}
function decisoesSectionHtml(a, editMode){
  const decisoes = a.decisoes || [];
  if(!editMode){
    return decisoes.length ? `<ul class="plain">${decisoes.map(d=>`<li>${escapeHtml(d)}</li>`).join('')}</ul>` : '<p class="hint">Nenhuma decisão explícita identificada.</p>';
  }
  return `<div id="editDecisoesList" class="edit-list">${decisoes.map(d=>editRowHtml(d,'decision-edit-input')).join('')}</div>
    <button type="button" class="btn small ghost" id="addDecisaoBtn" style="margin-top:6px;">${icon('check',12)} Adicionar decisão</button>`;
}
const RISK_LEVEL_LABEL = {baixo:'Baixo', medio:'Médio', alto:'Alto', critico:'Crítico'};
const RISK_LEVEL_TONE = {critico:'red', alto:'red', medio:'orange', baixo:'blue'};
function riskEditRowHtml(r){
  const opts = ['baixo','medio','alto','critico'];
  return `<div class="edit-row">
    <select class="risk-edit-priority">${opts.map(o=>`<option value="${o}" ${r.prioridade===o?'selected':''}>${RISK_LEVEL_LABEL[o]}</option>`).join('')}</select>
    <input type="text" class="risk-edit-desc" value="${escapeHtml(r.descricao||'')}">
    <button type="button" class="edit-row-remove" title="Remover">${icon('x',13)}</button>
  </div>`;
}
function riscosSectionHtml(a, editMode){
  const riscos = a.riscos || [];
  if(!editMode){
    if(!riscos.length) return '';
    return `<div class="card">
      ${cardTitle(`Riscos identificados (${riscos.length})`, 'flag')}
      <div class="coach-list">${riscos.map(r=>`<div class="coach-item">${badge(RISK_LEVEL_LABEL[r.prioridade]||r.prioridade, RISK_LEVEL_TONE[r.prioridade]||'mute')}<span>${escapeHtml(r.descricao)}</span></div>`).join('')}</div>
    </div>`;
  }
  return `<div class="card">
    ${cardTitle('Riscos identificados', 'flag')}
    <div id="editRiscosList" class="edit-list">${riscos.map(riskEditRowHtml).join('')}</div>
    <button type="button" class="btn small ghost" id="addRiscoBtn" style="margin-top:6px;">${icon('flag',12)} Adicionar risco</button>
  </div>`;
}
function taskEditRowHtml(t){
  const responsavel = t.responsavel==='não definido' ? '' : (t.responsavel||'');
  const prazo = t.prazo==='não definido' ? '' : (t.prazo||'');
  return `<tr>
    <td><input type="checkbox" class="task-edit-concluida" title="Concluída" ${t.concluida?'checked':''}></td>
    <td><input type="text" class="task-edit-tarefa" value="${escapeHtml(t.tarefa||'')}"></td>
    <td><input type="text" class="task-edit-responsavel" value="${escapeHtml(responsavel)}" placeholder="não definido"></td>
    <td><input type="text" class="task-edit-prazo" value="${escapeHtml(prazo)}" placeholder="não definido"></td>
    <td style="text-align:center;"><input type="checkbox" class="task-edit-critica" title="Crítica" ${t.critica?'checked':''}></td>
    <td><button type="button" class="edit-row-remove" title="Remover">${icon('x',13)}</button></td>
  </tr>`;
}
function tarefasSectionHtml(a, editMode){
  const tarefas = a.tarefas || [];
  if(!editMode){
    return tarefas.length ? `
      <table class="tasks">
        <thead><tr><th></th><th>Tarefa</th><th>Responsável</th><th>Prazo</th><th></th></tr></thead>
        <tbody>${sortTasksForDisplay(tarefas).map(taskRowHtml).join('')}</tbody>
      </table>` : '<p class="hint">Nenhuma tarefa identificada.</p>';
  }
  return `
    <table class="tasks" id="editTarefasTable">
      <thead><tr><th></th><th>Tarefa</th><th>Responsável</th><th>Prazo</th><th title="Crítica">!</th><th></th></tr></thead>
      <tbody>${tarefas.map(taskEditRowHtml).join('')}</tbody>
    </table>
    <button type="button" class="btn small ghost" id="addTarefaBtn" style="margin-top:10px;">${icon('checkTasks',12)} Adicionar tarefa</button>`;
}
/** Lê os campos editáveis da tela e monta o payload pra salvar de uma vez. */
function collectDetailEdits(){
  const resumo_executivo = document.getElementById('editResumo').value.trim();
  const decisoes = Array.from(document.querySelectorAll('.decision-edit-input')).map(el=>el.value.trim()).filter(Boolean);
  const riscoRows = Array.from(document.querySelectorAll('#editRiscosList .edit-row'));
  const riscos = riscoRows.map(row=>({
    descricao: row.querySelector('.risk-edit-desc').value.trim(),
    prioridade: row.querySelector('.risk-edit-priority').value
  })).filter(r=>r.descricao);
  const taskRows = Array.from(document.querySelectorAll('#editTarefasTable tbody tr'));
  const tarefas = taskRows.map(row=>({
    tarefa: row.querySelector('.task-edit-tarefa').value.trim(),
    responsavel: row.querySelector('.task-edit-responsavel').value.trim(),
    prazo: row.querySelector('.task-edit-prazo').value.trim(),
    critica: row.querySelector('.task-edit-critica').checked,
    concluida: row.querySelector('.task-edit-concluida').checked
  })).filter(t=>t.tarefa);
  return { resumo_executivo, decisoes, riscos, tarefas };
}
function comparisonCardHtml(m, scoreLabels){
  const cmp = buildComparison(m, scoreLabels);
  if(!cmp) return '';
  const sideHtml = (items, tone, emptyText) => items.length
    ? items.map(s=>`<div class="compare-item"><span>${escapeHtml(s.label)}</span><span class="compare-diff ${tone}">${s.diff>0?'+':''}${Math.round(s.diff)} vs. média</span></div>`).join('')
    : `<p class="hint">${emptyText}</p>`;
  return `<div class="card">
    ${cardTitle('Como esta reunião se compara', 'compass')}
    ${cmp.pct!=null ? `<div class="percentile-banner">
      <span class="percentile-num">${cmp.pct}º</span>
      <span class="percentile-text">percentil — nota geral melhor que ${cmp.pct}% das outras ${cmp.totalComparadas} reuniões já analisadas.</span>
    </div>` : ''}
    <p class="compare-conclusion">${escapeHtml(cmp.conclusion)}</p>
    ${(cmp.strengths.length || cmp.weaknesses.length) ? `<div class="compare-grid">
      <div>
        <div class="compare-col-title green">${icon('trendUp',12)} Pontos fortes</div>
        ${sideHtml(cmp.strengths, 'green', 'Nenhum ponto se destacou acima da média.')}
      </div>
      <div>
        <div class="compare-col-title orange">${icon('alert',12)} Pontos de atenção</div>
        ${sideHtml(cmp.weaknesses, 'orange', 'Nenhum ponto ficou abaixo da média.')}
      </div>
    </div>` : ''}
  </div>`;
}
function computeNarrative(){
  if(meetings.length<2){
    return [{tone:'blue', ic:'compass', text:'Analise mais reuniões para começar a ver tendências e padrões automáticos aqui.'}];
  }
  const chron = meetings.slice().sort((a,b)=>a.criadoEm-b.criadoEm);
  const scores = chron.map(m=>overallScore(m.analise));
  const criticas = chron.map(m=>taskCounts(m.analise).criticas);
  const decisoes = chron.map(m=>(m.analise?.decisoes||[]).length);
  const sentiments = chron.map(m=>sentToNum(m.analise?.sentimento?.geral));
  const items = [];

  const st = computeTrendSplit(scores);
  if(st){
    if(st.delta>=3) items.push({tone:'green', ic:'trendUp', text:`A produtividade média subiu ${Math.round(st.delta)} pontos nas reuniões mais recentes, para ${Math.round(st.recentAvg)}.`});
    else if(st.delta<=-3) items.push({tone:'red', ic:'trendDown', text:`A produtividade média caiu ${Math.round(Math.abs(st.delta))} pontos nas últimas reuniões — vale revisar o que mudou.`});
    else items.push({tone:'blue', ic:'target', text:`A produtividade se mantém estável, em torno de ${Math.round(st.recentAvg)} pontos.`});
  }

  const ct = computeTrendSplit(criticas);
  if(ct && ct.delta<=-0.4) items.push({tone:'green', ic:'check', text:'O número de tarefas críticas em aberto diminuiu nas últimas reuniões.'});
  else if(ct && ct.delta>=0.4) items.push({tone:'red', ic:'alert', text:'As tarefas críticas em aberto aumentaram — atenção redobrada é recomendada.'});

  const sentNow = sentiments.slice(-3);
  const sentAvg = sentNow.reduce((s,v)=>s+v,0)/(sentNow.length||1);
  if(sentAvg>0.3) items.push({tone:'green', ic:'sentiment', text:'O sentimento geral das últimas reuniões continua positivo.'});
  else if(sentAvg<-0.15) items.push({tone:'orange', ic:'sentiment', text:'O sentimento das últimas reuniões tem sido predominantemente negativo.'});
  else items.push({tone:'blue', ic:'sentiment', text:'O sentimento geral das reuniões tem se mantido neutro.'});

  const dt = computeTrendSplit(decisoes);
  if(dt && dt.delta<=-0.5) items.push({tone:'orange', ic:'trendDown', text:'As reuniões recentes têm gerado menos decisões concretas do que antes.'});

  const pend = {};
  meetings.forEach(m=>(m.analise?.tarefas||[]).forEach(t=>{ if(!t.concluida && t.responsavel && t.responsavel!=='não definido') pend[t.responsavel]=(pend[t.responsavel]||0)+1; }));
  const top = Object.entries(pend).sort((a,b)=>b[1]-a[1])[0];
  if(top && top[1]>=2) items.push({tone:'orange', ic:'users', text:`${top[0]} concentra a maior carga de tarefas pendentes (${top[1]}).`});

  return items.slice(0,4);
}
/* ---- similaridade simples de temas, pra não gerar 1 alerta por variação de grafia ---- */
function normTerm(s){
  return (s||'')
    .toLowerCase()
    .normalize('NFD')
    .split('')
    .filter(ch => { const code = ch.codePointAt(0); return code < 0x0300 || code > 0x036f; })
    .join('')
    .trim();
}
function termTokens(s){
  return new Set(normTerm(s).split(/[^a-z0-9]+/).filter(w=>w.length>2));
}
function termSimilarity(a,b){
  const ta=termTokens(a), tb=termTokens(b);
  if(!ta.size || !tb.size) return normTerm(a)===normTerm(b) ? 1 : 0;
  let inter=0; ta.forEach(w=>{ if(tb.has(w)) inter++; });
  const union = new Set([...ta,...tb]).size;
  return union ? inter/union : 0;
}
// Agrupa ocorrências de temas ({termo, meetingId}) em clusters por similaridade (limiar 0.5),
// contando reuniões distintas (não ocorrências) por cluster.
function groupSimilarThemes(occurrences){
  const clusters = [];
  occurrences.forEach(({termo, meetingId})=>{
    let alvo = clusters.find(c=>c.termos.some(t=>termSimilarity(t,termo)>=0.5));
    if(!alvo){
      alvo = {label:termo, termos:[termo], meetingIds:new Set(), contagem:{}};
      clusters.push(alvo);
    } else if(!alvo.termos.includes(termo)){
      alvo.termos.push(termo);
    }
    alvo.contagem[termo] = (alvo.contagem[termo]||0)+1;
    alvo.meetingIds.add(meetingId);
    // label = grafia mais frequente do cluster (fica mais estável e legível que a primeira que apareceu)
    alvo.label = Object.entries(alvo.contagem).sort((a,b)=>b[1]-a[1])[0][0];
  });
  return clusters;
}
function hashId(s){
  let h=0; const str=String(s);
  for(let i=0;i<str.length;i++){ h=(h*31+str.charCodeAt(i))|0; }
  return Math.abs(h).toString(36);
}
function computeAlerts(){
  const alerts = [];

  // 1) Sobrecarga de responsável
  const pend = {};
  meetings.forEach(m=>(m.analise?.tarefas||[]).forEach(t=>{
    if(!t.concluida && t.responsavel && t.responsavel!=='não definido') pend[t.responsavel]=(pend[t.responsavel]||0)+1;
  }));
  Object.entries(pend).forEach(([nome,n])=>{
    if(n>=3) alerts.push({id:`pend:${hashId(nome)}`, nivel:'media', peso:n, tone:'orange', ic:'users', texto:`${nome} acumula ${n} tarefas pendentes entre as reuniões analisadas.`, sugestao:'Redistribua parte das tarefas ou revise prazos junto com a pessoa responsável.'});
  });

  // 2) Temas recorrentes sem solução — só topicos (palavras_chave é ruído demais pra esse sinal),
  //    agrupados por similaridade pra não duplicar o mesmo tema com grafias diferentes.
  const topicOccurrences = [];
  meetings.forEach(m=>{
    const unicos = new Set((m.analise?.topicos||[]).map(t=>(t||'').trim()).filter(Boolean));
    unicos.forEach(t=>topicOccurrences.push({termo:t, meetingId:m.id}));
  });
  groupSimilarThemes(topicOccurrences).forEach(c=>{
    const n = c.meetingIds.size;
    if(n>=3) alerts.push({id:`tema:${hashId(normTerm(c.label))}`, nivel:'alta', peso:n, tone:'red', ic:'repeat', texto:`Tema recorrente sem solução aparente: "${c.label}" apareceu em ${n} reuniões.`, sugestao:'Considere criar uma pauta fixa para esse tema, com um responsável definido.'});
  });

  // 3) Falta de decisões nas últimas reuniões
  const recent = meetings.slice().sort((a,b)=>b.criadoEm-a.criadoEm).slice(0,3);
  if(recent.length===3 && recent.every(m=>(m.analise?.decisoes||[]).length===0)){
    alerts.push({id:`sem-decisao:${hashId(recent.map(m=>m.id).sort().join(','))}`, nivel:'alta', peso:3, tone:'red', ic:'alert', texto:'As últimas 3 reuniões não resultaram em nenhuma decisão registrada.', sugestao:'Avalie se as reuniões precisam de uma pauta mais objetiva ou de um facilitador.'});
  }

  // 4) Tarefas críticas em aberto
  meetings.forEach(m=>(m.analise?.tarefas||[]).forEach(t=>{
    if(t.critica && !t.concluida) alerts.push({id:`critica:${hashId(m.id+'|'+t.tarefa)}`, nivel:'alta', peso:1, tone:'red', ic:'flag', texto:`Tarefa crítica em aberto: "${t.tarefa}" (${m.titulo}).`, sugestao:'Priorize a conclusão dessa tarefa antes da próxima reunião.'});
  }));

  const order = {alta:0, media:1, baixa:2};
  // dentro do mesmo nível, prioriza pelo "peso" (magnitude do problema)
  return alerts.sort((a,b)=> order[a.nivel]-order[b.nivel] || b.peso-a.peso);
}
const ALERTS_DISPLAY_CAP = 6;
function getVisibleAlerts(){
  return computeAlerts().filter(a=>!dismissedAlerts.has(a.id));
}
/** Reúne os riscos identificados pela IA em todas as reuniões, com referência de onde vieram. */
const RISK_ORDER = {critico:0, alto:1, medio:2, baixo:3};
function getAllRisks(){
  const risks = [];
  meetings.forEach(m=>{
    (m.analise?.riscos||[]).forEach((r,idx)=>{
      risks.push({ ...r, meetingId:m.id, meetingTitulo:m.titulo, meetingData:m.criadoEm, idx });
    });
  });
  return risks.sort((a,b)=> (RISK_ORDER[a.prioridade]??9)-(RISK_ORDER[b.prioridade]??9) || b.meetingData-a.meetingData);
}
function computeThemeTimeline(){
  const map = {};
  meetings.forEach(m=>{
    (m.analise?.topicos||[]).forEach(t=>{
      const k=(t||'').trim(); if(!k) return;
      if(!map[k]) map[k]=[];
      map[k].push(m.criadoEm);
    });
  });
  return Object.entries(map).filter(([,d])=>d.length>=2).sort((a,b)=>b[1].length-a[1].length).slice(0,8);
}

/* ============================================================
   SMALL REUSABLE RENDERERS
============================================================ */
function badge(text, tone='mute'){ return `<span class="badge ${tone}">${escapeHtml(text)}</span>`; }
function cardTitle(text, iconName){ return `<div class="card-title"><span class="ct-icon">${icon(iconName,14)}</span>${text}</div>`; }
function deltaBadge(delta, invert=false, digits=0){
  if(delta==null || Math.abs(delta) < 0.5) return `<span class="kpi-delta mute">${icon('target',10)} estável</span>`;
  const up = delta>0;
  const good = invert ? !up : up;
  const cls = good ? 'green' : 'red';
  const ic = up ? 'trendUp' : 'trendDown';
  return `<span class="kpi-delta ${cls}">${icon(ic,10)} ${up?'+':''}${delta.toFixed(digits)}</span>`;
}
function kpiCard(numHtml, numClass, label, iconName, deltaHtml='', contextText=''){
  return `<div class="kpi-card">
    <div class="kpi-top">
      <div>
        <div class="kpi-num ${numClass}">${numHtml}</div>
        ${deltaHtml}
      </div>
      <span class="kpi-icon">${icon(iconName,14)}</span>
    </div>
    <div class="kpi-label">${label}</div>
    ${contextText ? `<div class="kpi-context">${contextText}</div>` : ''}
  </div>`;
}
function emptyStateHtml(iconName, title, text, actionHtml=''){
  return `<div class="empty-state">
    <div class="empty-state-icon">${icon(iconName,24)}</div>
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(text)}</p>
    ${actionHtml}
  </div>`;
}

/* ============================================================
   CHART RENDERERS
============================================================ */
function barChart(dataObj, color){
  const entries = Object.entries(dataObj);
  if(!entries.length) return '<p class="hint">Sem dados suficientes ainda.</p>';
  const max = Math.max(...entries.map(e=>e[1]), 1);
  return entries.sort((a,b)=>b[1]-a[1]).map(([k,v]) => `
    <div class="bar-row" title="${escapeHtml(k)}: ${v}">
      <span class="bar-label">${escapeHtml(k)}</span>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.round(v/max*100)}%; background:${color};"></div></div>
      <span class="bar-value">${v}</span>
    </div>`).join('');
}
function vBarChart(dataObj, color){
  const entries = Object.entries(dataObj);
  if(!entries.length) return '<p class="hint">Sem dados suficientes ainda.</p>';
  const max = Math.max(...entries.map(e=>e[1]), 1);
  return `<div class="vbar-chart">${entries.map(([k,v])=>`
    <div class="vbar-col" title="${escapeHtml(k)}: ${v} reunião(ões)">
      <span class="vbar-value">${v}</span>
      <div class="vbar-track"><div class="vbar-fill" style="height:${Math.round(v/max*100)}%; background:${color};"></div></div>
      <span class="vbar-label">${escapeHtml(k)}</span>
    </div>`).join('')}</div>`;
}
function lineChart(points, color){
  if(points.length < 2) return '<p class="hint">São necessárias pelo menos 2 reuniões com pontuação para ver a tendência.</p>';
  const w=580, h=140, pad=18;
  const stepX = (w-2*pad)/(points.length-1);
  const scaleY = v => h-pad - (v/100)*(h-2*pad);
  const coords = points.map((v,i)=>[pad+i*stepX, scaleY(v)]);
  const path = coords.map((c,i)=>(i===0?'M':'L')+c[0].toFixed(1)+','+c[1].toFixed(1)).join(' ');
  const areaPath = path + ` L${coords[coords.length-1][0].toFixed(1)},${(h-pad).toFixed(1)} L${coords[0][0].toFixed(1)},${(h-pad).toFixed(1)} Z`;
  const dots = coords.map((c,i)=>`<circle class="lc-dot" cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="3.5" fill="${color}"><title>Reunião ${i+1}: ${points[i]}</title></circle>`).join('');
  const last = coords[coords.length-1];
  const gradId = 'lg'+Math.round(Math.random()*100000);
  return `<div class="line-chart-wrap"><svg viewBox="0 0 ${w} ${h}" style="width:100%; height:${h}px; min-width:320px;">
    <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    <line x1="${pad}" y1="${scaleY(50).toFixed(1)}" x2="${w-pad}" y2="${scaleY(50).toFixed(1)}" stroke="var(--border)" stroke-dasharray="3,4"/>
    <path d="${areaPath}" fill="url(#${gradId})" stroke="none"/>
    <path d="${path}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots}
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="5.5" fill="${color}" opacity="0.25"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4" fill="${color}"/>
    <text x="${(last[0]-14).toFixed(1)}" y="${(last[1]-12).toFixed(1)}" class="lc-latest-label" text-anchor="end">${points[points.length-1]}</text>
  </svg></div>`;
}
function stackedTempo(tempo){
  if(!tempo) return '<p class="hint">Sem estimativa de tempo disponível — reanalise a reunião para obter esse indicador.</p>';
  const segs = [
    {k:'produtivo_pct', label:'Produtivo', color:'var(--green)'},
    {k:'conversa_paralela_pct', label:'Conversa paralela', color:'var(--orange)'},
    {k:'repeticao_pct', label:'Repetição de assuntos', color:'var(--red)'},
    {k:'sem_conclusao_pct', label:'Discussão sem conclusão', color:'var(--blue)'}
  ];
  const bar = segs.map(s=>`<div class="stack-seg" style="width:${tempo[s.k]||0}%; background:${s.color};" title="${s.label}: ${tempo[s.k]||0}%"></div>`).join('');
  const legend = segs.map(s=>`<span><span class="legend-dot" style="background:${s.color};"></span>${s.label} — ${tempo[s.k]||0}%</span>`).join('');
  return `<div class="stack-bar">${bar}</div><div class="stack-legend">${legend}</div>`;
}

/* ============================================================
   SIDEBAR
============================================================ */
function renderFolderSelect(){
  const sel = document.getElementById('folderSelect');
  const folders = folderList();
  sel.innerHTML = `<option value="">Todas as pastas</option>` +
    folders.map(f=>`<option value="${escapeHtml(f)}">${escapeHtml(f)}</option>`).join('');
  sel.value = currentFolder;
}

function renderSidebar(){
  renderFolderSelect();
  ['dashboard','insights','timeline','search','risks','alerts','users'].forEach(v=>{
    const el = document.getElementById('nav'+v.charAt(0).toUpperCase()+v.slice(1));
    if(el) el.classList.toggle('active', currentView===v);
  });
  const alertCount = meetings.length ? getVisibleAlerts().length : 0;
  const badgeEl = document.getElementById('alertBadge');
  badgeEl.style.display = alertCount>0 ? 'inline-block' : 'none';
  badgeEl.textContent = alertCount;

  const riskCount = getAllRisks().filter(r=>r.prioridade==='alto' || r.prioridade==='critico').length;
  const riskBadgeEl = document.getElementById('riskBadge');
  riskBadgeEl.style.display = riskCount>0 ? 'inline-block' : 'none';
  riskBadgeEl.textContent = riskCount;

  const list = document.getElementById('meetingList');
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const filtered = meetings.filter(m=>{
    if(!q) return true;
    const hay = [m.titulo, ...(m.analise?.topicos||[]), ...(m.analise?.palavras_chave||[])].join(' ').toLowerCase();
    return hay.includes(q);
  });
  if(!filtered.length){
    list.innerHTML = `<div class="empty-list">${meetings.length===0 ? 'Nenhuma reunião ainda.' : 'Nenhum resultado para essa busca.'}</div>`;
    return;
  }
  list.innerHTML = filtered.slice().sort((a,b)=>b.criadoEm-a.criadoEm).map(m=>{
    const os = overallScore(m.analise);
    return `<div class="meeting-card ${currentView==='detail' && m.id===currentId?'active':''}" data-id="${m.id}">
      <span class="mc-num mono">${String(m.numero).padStart(3,'0')}</span>
      <div class="mc-meta">
        <div class="mc-title">${escapeHtml(m.titulo)}</div>
        <div class="mc-date">${new Date(m.criadoEm).toLocaleDateString('pt-BR',{day:'2-digit', month:'short'})} · ${escapeHtml(meetingFolder(m))}</div>
      </div>
      <span class="mc-score" style="background:${scoreColor(os)};" title="${os!=null? 'Score '+os : 'Sem score'}"></span>
      <div class="mc-menu-wrap">
        <button type="button" class="mc-menu-btn" data-menu-id="${m.id}" title="Mais opções">${icon('more',14)}</button>
        <div class="mc-menu" data-menu-for="${m.id}">
          <div class="mc-menu-item" data-action="edit" data-id="${m.id}">${icon('doc',14)} Editar</div>
          <div class="mc-menu-item" data-action="move" data-id="${m.id}">${icon('inbox',14)} Mover de pasta</div>
        </div>
      </div>
    </div>`;
  }).join('');
  list.querySelectorAll('.meeting-card').forEach(el=>{
    makeClickable(el, e=>{ if(e.target.closest('.mc-menu-wrap')) return; setView('detail', el.dataset.id); });
  });
  list.querySelectorAll('.mc-menu-btn').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.stopPropagation();
      const menu = list.querySelector(`.mc-menu[data-menu-for="${btn.dataset.menuId}"]`);
      const wasOpen = menu.classList.contains('open');
      closeAllMeetingMenus();
      if(!wasOpen) menu.classList.add('open');
    });
  });
  list.querySelectorAll('.mc-menu-item').forEach(item=>{
    item.addEventListener('click', e=>{
      e.stopPropagation();
      closeAllMeetingMenus();
      const id = item.dataset.id;
      if(item.dataset.action==='edit'){
        setView('detail', id);
        detailEditMode = true;
        renderMain();
      } else if(item.dataset.action==='move'){
        openMoveFolderModal(id);
      }
    });
  });
}
function closeAllMeetingMenus(){
  document.querySelectorAll('.mc-menu.open').forEach(el=>el.classList.remove('open'));
}
document.addEventListener('click', closeAllMeetingMenus);

function openMoveFolderModal(meetingId){
  const m = allMeetings.find(x=>x.id===meetingId);
  if(!m) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal-card">
    <div class="modal-title">Mover de pasta</div>
    <p class="modal-text">Escolha a pasta de destino para "${escapeHtml(m.titulo)}".</p>
    <input type="text" id="moveFolderInput" list="moveFolderList" value="${escapeHtml(meetingFolder(m))}" style="margin-bottom:6px;">
    <datalist id="moveFolderList">${folderList().map(f=>`<option value="${escapeHtml(f)}">`).join('')}</datalist>
    <div class="modal-actions">
      <button class="btn" id="moveFolderCancel">Cancelar</button>
      <button class="btn primary" id="moveFolderConfirm">Mover</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(()=>overlay.classList.add('show'));
  function close(){ overlay.classList.remove('show'); setTimeout(()=>overlay.remove(),200); }
  overlay.addEventListener('click', e=>{ if(e.target===overlay) close(); });
  overlay.querySelector('#moveFolderCancel').addEventListener('click', close);
  overlay.querySelector('#moveFolderConfirm').addEventListener('click', async ()=>{
    const novaPasta = document.getElementById('moveFolderInput').value.trim() || 'Geral';
    try{
      const res = await fetch(`/api/meetings/${meetingId}/pasta`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ pasta: novaPasta })
      });
      const data = await readJsonSafe(res);
      if(!res.ok) throw new Error(data.error || 'Falha ao mover a reunião.');
      const idx = allMeetings.findIndex(x=>x.id===meetingId);
      if(idx!==-1) allMeetings[idx] = data;
      applyFolderFilter();
      renderSidebar(); renderMain();
      showToast('Reunião movida com sucesso.', 'success');
      close();
    }catch(e){
      showToast('Não foi possível mover: ' + e.message, 'error');
    }
  });
}

/* ============================================================
   MAIN DISPATCH
============================================================ */
function renderMain(){
  const main = document.getElementById('mainArea');
  let html = '';
  if(currentView==='dashboard') html = dashboardTemplate();
  else if(currentView==='new') html = newMeetingTemplate();
  else if(currentView==='detail'){
    const m = meetings.find(x=>x.id===currentId);
    if(!m){ setView('dashboard'); return; }
    html = detailTemplate(m);
  }
  else if(currentView==='insights') html = insightsTemplate();
  else if(currentView==='timeline') html = timelineTemplate();
  else if(currentView==='search') html = searchTemplate();
  else if(currentView==='risks') html = risksTemplate();
  else if(currentView==='alerts') html = alertsTemplate();
  else if(currentView==='users') html = usersTemplate();

  main.innerHTML = `<div class="view-fade">${html}</div>`;

  if(currentView==='dashboard') bindDashboard();
  else if(currentView==='new') bindNewMeetingForm();
  else if(currentView==='detail') bindDetailActions(meetings.find(x=>x.id===currentId));
  else if(currentView==='insights') runInsights();
  else if(currentView==='timeline') bindTimeline();
  else if(currentView==='search') bindSearch();
  else if(currentView==='risks') bindRisks();
  else if(currentView==='alerts') bindAlerts();
  else if(currentView==='users') bindUsers();
}

/* ============================================================
   DASHBOARD
============================================================ */
function dashboardTemplate(){
  if(meetings.length===0){
    return `
    <div class="eyebrow">Dashboard executivo</div>
    <div class="page-title">Central de inteligência de reuniões</div>
    <div class="page-sub">Um painel único com produtividade, decisões, pendências e padrões de todas as reuniões da empresa.</div>
    ${emptyStateHtml('inbox', 'Nenhuma reunião analisada ainda', 'Envie a gravação de uma reunião para começar a ver score de produtividade, tempo desperdiçado, tarefas por responsável e todos os indicadores aqui.', `
      <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
        <button class="btn primary" id="emptyNewBtn">+ Nova reunião</button>
        <button class="btn" id="emptyDemoBtn">${icon('spark',13)} Ver com dados de exemplo</button>
      </div>
    `)}`;
  }
  const hasDemo = meetings.some(m=>m.demo);
  const s = aggregateExec();
  const recent = meetings.slice().sort((a,b)=>b.criadoEm-a.criadoEm).slice(0,6);
  const chron = meetings.slice().sort((a,b)=>a.criadoEm-b.criadoEm);
  const prodTrend = chron.map(m=>overallScore(m.analise)).filter(v=>v!=null);
  const sentLabel = s.sentimentoMedio==null ? '—' : s.sentimentoMedio>0.4 ? 'Positivo' : s.sentimentoMedio>-0.15 ? 'Neutro' : 'Negativo';
  const narrative = computeNarrative();

  return `
  <div class="eyebrow">Dashboard executivo</div>
  <div class="page-title">Central de inteligência de reuniões</div>
  <div class="page-sub">${s.total} reunião(ões) analisada(s) · atualizado agora</div>

  ${hasDemo ? `<div class="error-box" style="background:var(--blue-soft); border-color:rgba(59,130,246,.4); color:var(--text-dim);">
    ${icon('spark',15)} Estes são dados de demonstração de uma empresa fictícia — pra você ver o produto funcionando.
    <button class="btn small" id="removeDemoBtn" style="margin-left:auto; flex-shrink:0;">Remover exemplo</button>
  </div>` : ''}

  <div class="narrative-card">
    ${cardTitle('Resumo executivo', 'spark')}
    <div class="narrative-list">
      ${narrative.map(n=>`<div class="narrative-item"><span class="narrative-icon ${n.tone}">${icon(n.ic,14)}</span><span class="narrative-text">${escapeHtml(n.text)}</span></div>`).join('')}
    </div>
  </div>

  <div class="kpi-grid">
    ${kpiCard(s.total, '', 'Reuniões analisadas', 'doc')}
    ${kpiCard(s.produtividadeMedia ?? '—', scoreBadgeClass(s.produtividadeMedia), 'Score médio de produtividade', 'target', s.scoreTrend?deltaBadge(s.scoreTrend.delta):'')}
    ${kpiCard(s.decisoes, 'blue', 'Decisões registradas', 'check', '', s.decisoesPorReuniao!=null ? `~${s.decisoesPorReuniao} por reunião` : '')}
    ${kpiCard(s.pendentes, s.pendentes>0?'orange':'green', `Tarefas pendentes de ${s.tarefas}`, 'checkTasks', '', s.tarefas ? `${Math.round(s.pendentes/s.tarefas*100)}% do total ainda em aberto` : '')}
  </div>
  <div class="kpi-grid">
    ${kpiCard(s.criticas, 'red', 'Tarefas críticas em aberto', 'flag', s.criticasTrend?deltaBadge(s.criticasTrend.delta, true):'')}
    ${kpiCard(s.semResp, 'orange', 'Tarefas sem responsável', 'users', '', s.tarefas ? `${Math.round(s.semResp/s.tarefas*100)}% do total de tarefas` : '')}
    ${kpiCard(s.horasProdutivas||'—', 'green', `Horas produtivas estimadas${s.horasProdutivas?'':' (informe a duração)'}`, 'clock', '', (s.horasProdutivas || s.horasDesperdicadas) ? `${Math.round(s.horasProdutivas/(s.horasProdutivas+s.horasDesperdicadas)*100)}% do tempo total em reunião` : '')}
    ${kpiCard(`<span style="font-size:19px; text-transform:uppercase;">${sentLabel}</span>`, '', 'Sentimento médio das reuniões', 'sentiment', s.sentTrend?deltaBadge(s.sentTrend.delta, false, 1):'')}
  </div>

  <div class="grid-2">
    <div class="card">${cardTitle('Tendência de produtividade', 'trendUp')}${lineChart(prodTrend, 'var(--blue)')}</div>
    <div class="card">${cardTitle('Reuniões por mês', 'clock')}${vBarChart(s.porMes, 'var(--blue)')}</div>
  </div>

  <div class="grid-2">
    <div class="card">${cardTitle('Reunião mais produtiva', 'trendUp')}${s.maisProdutiva ? recentRowHtml(s.maisProdutiva) : '<p class="hint">Sem dados suficientes.</p>'}</div>
    <div class="card">${cardTitle('Reunião menos produtiva', 'trendDown')}${s.menosProdutiva ? recentRowHtml(s.menosProdutiva) : '<p class="hint">Sem dados suficientes ainda — precisa de pelo menos 2 reuniões.</p>'}</div>
  </div>

  <div class="card">
    ${cardTitle('Reuniões recentes', 'doc')}
    ${recent.map(m=>recentRowHtml(m)).join('')}
  </div>
  `;
}
function recentRowHtml(m){
  const os = overallScore(m.analise);
  const sent = m.analise?.sentimento?.geral || 'neutro';
  return `<div class="list-row" data-id="${m.id}">
    <div>
      <div class="list-title">${escapeHtml(m.titulo)}</div>
      <div class="list-sub">${fmtDate(m.criadoEm)}${m.participantes?.length ? ' · '+escapeHtml(m.participantes.join(', ')) : ''}</div>
    </div>
    <div class="list-right">
      <span class="badge mute" style="text-transform:capitalize;">${escapeHtml(sent)}</span>
      <span class="score-pill" style="background:${scoreColor(os)}22; color:${scoreColor(os)};">${os ?? '—'}</span>
    </div>
  </div>`;
}
function bindDashboard(){
  const b = document.getElementById('emptyNewBtn'); if(b) b.addEventListener('click', ()=>setView('new'));
  document.querySelectorAll('.list-row').forEach(el=>makeClickable(el, ()=>setView('detail', el.dataset.id)));

  const demoBtn = document.getElementById('emptyDemoBtn');
  if(demoBtn) demoBtn.addEventListener('click', async ()=>{
    demoBtn.disabled = true;
    try{
      const res = await fetch('/api/meetings/demo', { method:'POST' });
      const data = await readJsonSafe(res);
      if(!res.ok) throw new Error(data.error || 'Falha ao carregar o exemplo.');
      allMeetings = data;
      applyFolderFilter();
      showToast('Dados de exemplo carregados.', 'success');
      renderSidebar(); renderMain();
    }catch(e){
      demoBtn.disabled = false;
      showToast('Não foi possível carregar o exemplo: ' + e.message, 'error');
    }
  });

  const removeBtn = document.getElementById('removeDemoBtn');
  if(removeBtn) removeBtn.addEventListener('click', async ()=>{
    const ok = await showConfirm('As reuniões de exemplo (marcadas como demonstração) serão removidas. Suas reuniões reais não são afetadas.', 'Remover exemplo', 'Remover dados de demonstração?');
    if(!ok) return;
    try{
      const res = await fetch('/api/meetings/demo', { method:'DELETE' });
      const data = await readJsonSafe(res);
      if(!res.ok) throw new Error(data.error || 'Falha ao remover o exemplo.');
      allMeetings = allMeetings.filter(m=>!m.demo);
      applyFolderFilter();
      showToast('Dados de exemplo removidos.', 'success');
      renderSidebar(); renderMain();
    }catch(e){
      showToast('Não foi possível remover o exemplo: ' + e.message, 'error');
    }
  });
}

/* ============================================================
   NEW MEETING — enviar gravação (padrão) ou colar transcrição
============================================================ */
const SAMPLE_TRANSCRIPT = `Marina: Bom dia, pessoal. Vamos revisar o pipeline da semana e decidir o que fazer com a renovação do Grupo Aurora.
Diego: O Grupo Aurora pediu um desconto para fechar o plano anual. Acho que dá pra oferecer 10% se eles assinarem até o fim do mês.
Fernanda: Concordo. Eu agendo uma call com eles pra fechar isso.
Marina: Combinado, 10% de desconto no anual. Diego, você manda a proposta revisada?
Diego: Mando até sexta-feira, é urgente porque o contrato atual vence em 10 dias.
Marina: E sobre os leads parados, temos três que estão sem contato há mais de duas semanas. Vamos priorizar esses antes de abrir novos.
Fernanda: Faz sentido, o time está confiante que vamos bater a meta do trimestre se resolvermos isso rápido.
Marina: Ótimo, eu atualizo o CRM com os novos estágios ainda essa semana.`;

const AUDIO_STEPS = {
  uploading: 'Enviando o áudio...',
  transcrevendo: 'Transcrevendo a reunião (pode levar alguns minutos)...',
  analisando: 'Analisando o conteúdo e calculando indicadores...'
};

function newMeetingTemplate(){
  return `
  <div class="eyebrow">Nova análise</div>
  <div class="page-title">Transformar uma reunião em inteligência de negócio</div>
  <div class="page-sub">Envie a gravação da reunião — o site transcreve e analisa automaticamente. Prefere colar uma transcrição pronta? Também dá.</div>
  <div class="form-card">
    <div class="method-tabs">
      <button type="button" class="method-tab active" data-method="audio">${icon('inbox',13)} Enviar gravação</button>
      <button type="button" class="method-tab" data-method="text">${icon('doc',13)} Colar transcrição</button>
    </div>

    <div class="form-row">
      <div>
        <label for="fTitulo">Título da reunião</label>
        <input type="text" id="fTitulo" placeholder="Ex: Alinhamento semanal — squad de vendas">
      </div>
      <div>
        <label for="fDuracao">Duração (minutos, opcional)</label>
        <input type="number" id="fDuracao" min="1" placeholder="Detectada automaticamente do áudio">
      </div>
    </div>

    <div class="form-row">
      <div>
        <label for="fPasta">Pasta</label>
        <input type="text" id="fPasta" list="fPastaList" placeholder="Ex: RH, Financeiro, Vendas" value="${escapeHtml(currentFolder || 'Geral')}">
        <datalist id="fPastaList">${folderList().map(f=>`<option value="${escapeHtml(f)}">`).join('')}</datalist>
        <p class="hint">A análise entre reuniões só cruza reuniões da mesma pasta.</p>
      </div>
      <div>
        <label for="fVisibilidade">Visibilidade</label>
        <select id="fVisibilidade">
          <option value="dono" selected>Restrito à gestão (proprietários)</option>
          <option value="todos">Toda a equipe</option>
        </select>
      </div>
    </div>

    <label for="fParticipantes">Participantes (opcional, na ordem em que costumam falar, separados por vírgula)</label>
    <input type="text" id="fParticipantes" placeholder="Ex: Ana, Bruno, Carla">
    <p class="hint" id="participantesHint">Ao enviar áudio, usamos essa ordem para identificar quem é cada locutor detectado automaticamente na gravação.</p>

    <div id="methodAudio">
      <label>Gravação da reunião</label>
      <div class="file-drop" id="fileDrop">
        <input type="file" id="fAudio" accept="audio/*,video/mp4,video/webm,.m4a,.mp3,.wav,.ogg,.webm">
        <div id="fileDropText">${icon('inbox',22)}<br>Clique ou arraste o arquivo de áudio aqui<br><span class="hint" style="margin:4px 0 0;">MP3, WAV, M4A, MP4, OGG ou WEBM — até 300MB</span></div>
      </div>
    </div>

    <div id="methodText" style="display:none;">
      <label for="fTranscricao">Transcrição da reunião</label>
      <textarea id="fTranscricao" placeholder="Cole aqui a transcrição. Para análise de participação por pessoa, identifique as falas por nome (ex: Ana: precisamos revisar o contrato até sexta)."></textarea>
      <p class="hint">A análise de participantes funciona melhor quando cada fala começa com o nome de quem falou. <span class="sample-link" id="btnSample">Usar um exemplo de transcrição</span></p>
    </div>

    <div id="formError"></div>
    <div class="form-actions">
      <button class="btn primary" id="btnAnalisar">Transcrever e analisar</button>
      <span id="formStatus" class="hint"></span>
    </div>
    <div id="progressWrap"></div>
  </div>
  `;
}

function bindNewMeetingForm(){
  currentMethod = 'audio';

  document.querySelectorAll('.method-tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      currentMethod = btn.dataset.method;
      document.querySelectorAll('.method-tab').forEach(b=>b.classList.toggle('active', b===btn));
      document.getElementById('methodAudio').style.display = currentMethod==='audio' ? '' : 'none';
      document.getElementById('methodText').style.display = currentMethod==='text' ? '' : 'none';
      document.getElementById('participantesHint').style.display = currentMethod==='audio' ? '' : 'none';
      document.getElementById('btnAnalisar').textContent = currentMethod==='audio' ? 'Transcrever e analisar' : 'Analisar reunião';
      clearFormError(); clearProgress();
    });
  });

  const fileDrop = document.getElementById('fileDrop');
  const fileInput = document.getElementById('fAudio');
  makeClickable(fileDrop, ()=>fileInput.click());
  fileInput.addEventListener('change', updateFileDropLabel);
  ['dragover','dragleave','drop'].forEach(evt=>{
    fileDrop.addEventListener(evt, e=>{
      e.preventDefault(); e.stopPropagation();
      fileDrop.classList.toggle('dragover', evt==='dragover');
      if(evt==='drop' && e.dataTransfer.files.length){
        fileInput.files = e.dataTransfer.files;
        updateFileDropLabel();
      }
    });
  });

  document.getElementById('btnSample').addEventListener('click', ()=>{
    document.getElementById('fTitulo').value = 'Alinhamento comercial — reunião de exemplo';
    document.getElementById('fParticipantes').value = 'Marina, Diego, Fernanda';
    document.getElementById('fDuracao').value = '32';
    document.getElementById('fTranscricao').value = SAMPLE_TRANSCRIPT;
  });

  document.getElementById('btnAnalisar').addEventListener('click', ()=>{
    if(currentMethod==='audio') submitAudioMeeting(); else submitManualMeeting();
  });
}
const AUDIO_EXT_RE = /\.(mp3|wav|m4a|ogg|oga|webm|mp4|aac|flac|opus)$/i;
function isValidAudioFile(file){
  if(!file) return false;
  const okMime = /^audio\//.test(file.type) || ['video/mp4','video/webm'].includes(file.type);
  const okExt = AUDIO_EXT_RE.test(file.name || '');
  return okMime || okExt;
}
function updateFileDropLabel(){
  const f = document.getElementById('fAudio').files[0];
  const box = document.getElementById('fileDropText');
  if(f && !isValidAudioFile(f)){
    showFormError(`"${f.name}" não parece ser um arquivo de áudio. Envie um arquivo .mp3, .wav, .m4a, .mp4, .ogg ou .webm.`);
  } else {
    clearFormError();
  }
  box.innerHTML = f
    ? `${icon('doc',22)}<br><b>${escapeHtml(f.name)}</b><br><span class="hint" style="margin:4px 0 0;">${(f.size/1024/1024).toFixed(1)} MB — clique para trocar</span>`
    : `${icon('inbox',22)}<br>Clique ou arraste o arquivo de áudio aqui<br><span class="hint" style="margin:4px 0 0;">MP3, WAV, M4A, MP4, OGG ou WEBM — até 300MB</span>`;
}

function setFormBusy(busy){ document.getElementById('btnAnalisar').disabled = busy; }
function showFormError(msg){ document.getElementById('formError').innerHTML = `<div class="error-box">${icon('alert',15)} ${escapeHtml(msg)}</div>`; }
function clearFormError(){ const el=document.getElementById('formError'); if(el) el.innerHTML=''; }
function renderSimpleProgress(label){
  const wrap = document.getElementById('progressWrap');
  if(!wrap) return;
  wrap.innerHTML = `<div class="progress-steps"><div class="progress-step active"><span class="step-dot"></span>${escapeHtml(label)}</div></div>`;
}
function renderAudioProgress(doneSteps, currentStatus){
  const wrap = document.getElementById('progressWrap');
  if(!wrap) return;
  wrap.innerHTML = `<div class="progress-steps">${Object.entries(AUDIO_STEPS).map(([key,label])=>{
    const isDone = doneSteps.includes(key);
    const isCurrent = key===currentStatus;
    return `<div class="progress-step ${isDone?'done':''} ${isCurrent?'active':''}"><span class="step-dot"></span>${label}</div>`;
  }).join('')}</div>`;
}
function clearProgress(){ const w = document.getElementById('progressWrap'); if(w) w.innerHTML=''; }

async function submitManualMeeting(){
  const titulo = document.getElementById('fTitulo').value.trim();
  const participantes = document.getElementById('fParticipantes').value.trim();
  const duracaoMin = document.getElementById('fDuracao').value;
  const transcricao = document.getElementById('fTranscricao').value.trim();
  const pasta = document.getElementById('fPasta').value.trim();
  const visibilidade = document.getElementById('fVisibilidade').value;
  clearFormError();
  if(!titulo || !transcricao){ showFormError('Preencha o título e cole a transcrição antes de analisar.'); return; }

  setFormBusy(true);
  renderSimpleProgress('Analisando conteúdo e calculando indicadores...');
  try{
    const res = await fetch('/api/meetings/manual', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ titulo, participantes, duracaoMin, transcricao, pasta, visibilidade })
    });
    const data = await readJsonSafe(res);
    if(!res.ok) throw new Error(data.error || 'Falha ao analisar a reunião.');
    allMeetings.push(data);
    currentFolder = meetingFolder(data);
    applyFolderFilter();
    showToast('Reunião analisada com sucesso.', 'success');
    setView('detail', data.id);
  }catch(e){
    setFormBusy(false);
    clearProgress();
    showFormError(e.message);
  }
}

async function submitAudioMeeting(){
  const titulo = document.getElementById('fTitulo').value.trim();
  const participantes = document.getElementById('fParticipantes').value.trim();
  const duracaoMin = document.getElementById('fDuracao').value;
  const file = document.getElementById('fAudio').files[0];
  const pasta = document.getElementById('fPasta').value.trim();
  const visibilidade = document.getElementById('fVisibilidade').value;
  clearFormError();
  if(!titulo){ showFormError('Preencha o título da reunião.'); return; }
  if(!file){ showFormError('Selecione o arquivo de áudio da reunião.'); return; }
  if(!isValidAudioFile(file)){
    showFormError(`"${file.name}" não parece ser um arquivo de áudio. Envie um arquivo .mp3, .wav, .m4a, .mp4, .ogg ou .webm.`);
    return;
  }

  setFormBusy(true);
  const fd = new FormData();
  fd.append('audio', file);
  fd.append('titulo', titulo);
  fd.append('participantes', participantes);
  fd.append('pasta', pasta);
  fd.append('visibilidade', visibilidade);
  if(duracaoMin) fd.append('duracaoMin', duracaoMin);

  try{
    renderAudioProgress([], 'uploading');
    const res = await fetch('/api/meetings/audio', { method:'POST', body: fd });
    const data = await readJsonSafe(res);
    if(!res.ok) throw new Error(data.error || 'Falha ao enviar o áudio.');
    await pollAudioJob(data.jobId);
  }catch(e){
    setFormBusy(false);
    clearProgress();
    showFormError(e.message);
  }
}

async function pollAudioJob(jobId){
  const doneSteps = [];
  let lastStatus = null;
  while(true){
    const res = await fetch(`/api/meetings/jobs/${jobId}`);
    const job = await readJsonSafe(res);
    if(!res.ok) throw new Error(job.error || 'Falha ao consultar o andamento da transcrição.');

    if(job.status !== lastStatus){
      if(lastStatus) doneSteps.push(lastStatus);
      lastStatus = job.status;
    }

    if(job.status === 'concluido'){
      allMeetings.push(job.meeting);
      currentFolder = meetingFolder(job.meeting);
      applyFolderFilter();
      showToast('Reunião transcrita e analisada com sucesso.', 'success');
      setView('detail', job.meeting.id);
      return;
    }
    if(job.status === 'erro'){
      throw new Error(job.error || 'Falha ao processar a reunião.');
    }

    renderAudioProgress(doneSteps, job.status);
    await new Promise(r=>setTimeout(r, 2500));
  }
}

/* ============================================================
   DETAIL
============================================================ */
function detailTemplate(m){
  const a = m.analise || {};
  const os = overallScore(a);
  const tc = taskCounts(a);
  const scoreLabels = {produtividade:'Produtividade', objetividade:'Objetividade', clareza:'Clareza', engajamento:'Engajamento', tomada_decisao:'Tomada de decisão', execucao:'Execução', comunicacao:'Comunicação'};

  return `
  <div class="eyebrow">Reunião analisada</div>
  <div class="detail-header">
    <div>
      <div class="mono" style="font-size:11px; color:var(--text-mute);">#${String(m.numero).padStart(3,'0')}</div>
      <div class="detail-title">${escapeHtml(m.titulo)}</div>
      <div class="detail-meta">${fmtDate(m.criadoEm)}${m.duracaoMin?' · '+m.duracaoMin+' min':''}${m.participantes?.length ? ' · ' + escapeHtml(m.participantes.join(', ')) : ''} · ${escapeHtml(meetingFolder(m))}</div>
    </div>
    <div class="detail-actions">
      <span class="score-pill" style="background:${scoreColor(os)}22; color:${scoreColor(os)}; font-size:16px; padding:7px 15px;">${os ?? '—'}</span>
      ${detailEditMode ? `
        <button class="btn small" id="btnCancelEdit">Cancelar</button>
        <button class="btn small primary" id="btnSaveEdit">${icon('check',13)} Salvar alterações</button>
      ` : `
        <button class="btn small" id="btnEditToggle">${icon('doc',13)} Editar</button>
        <button class="btn small" id="btnExportMd">${icon('doc',13)} .md</button>
        <button class="btn small" id="btnExportCsv">${icon('checkTasks',13)} CSV</button>
        <button class="btn small" id="btnExportPdf">${icon('doc',13)} PDF</button>
        <button class="btn small danger" id="btnExcluir">Excluir</button>
      `}
    </div>
  </div>

  <div class="stack-col">
    <div class="card">
      ${cardTitle('Resumo executivo', 'doc')}
      ${resumoSectionHtml(a, detailEditMode)}
      ${!detailEditMode ? `<div class="tag-grid">
        <div><div class="hint" style="margin-bottom:9px;">Tópicos</div><div class="tags">${(a.topicos||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('') || '<span class="hint">Nenhum identificado.</span>'}</div></div>
        <div><div class="hint" style="margin-bottom:9px;">Palavras-chave</div><div class="tags">${(a.palavras_chave||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('') || '<span class="hint">Nenhuma identificada.</span>'}</div></div>
      </div>
      ${(a.clientes_citados?.length || a.produtos_ou_projetos_citados?.length) ? `
      <div class="tag-grid">
        <div><div class="hint" style="margin-bottom:9px;">Clientes citados</div><div class="tags">${(a.clientes_citados||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('') || '<span class="hint">Nenhum citado.</span>'}</div></div>
        <div><div class="hint" style="margin-bottom:9px;">Produtos / projetos</div><div class="tags">${(a.produtos_ou_projetos_citados||[]).map(t=>`<span class="tag">${escapeHtml(t)}</span>`).join('') || '<span class="hint">Nenhum citado.</span>'}</div></div>
      </div>` : ''}` : '<p class="hint" style="margin-top:8px;">Tópicos, palavras-chave e clientes citados não são editáveis por aqui.</p>'}
    </div>

    <div class="card">
      <div class="card-title-row">
        ${cardTitle('Score da reunião', 'target')}
        <span class="score-pill" style="background:${scoreColor(os)}22; color:${scoreColor(os)};">${os ?? '—'} / 100</span>
      </div>
      ${a.score ? `<div class="score-bars-grid">${Object.entries(scoreLabels).map(([k,label])=>`
        <div class="bar-row" title="${label}: ${a.score[k] ?? '—'}">
          <span class="bar-label">${label}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${a.score[k]||0}%; background:${scoreColor(a.score[k])};"></div></div>
          <span class="bar-value">${a.score[k] ?? '—'}</span>
        </div>`).join('')}</div>` : '<p class="hint">Sem score disponível — reanalise a reunião.</p>'}
    </div>

    ${!detailEditMode ? comparisonCardHtml(m, scoreLabels) : ''}

    <div class="card">
      ${cardTitle(`Decisões tomadas${detailEditMode?'':' ('+(a.decisoes||[]).length+')'}`, 'check')}
      ${decisoesSectionHtml(a, detailEditMode)}
    </div>

    ${riscosSectionHtml(a, detailEditMode)}

    <div class="card">
      <div class="card-title-row">
        ${cardTitle('Tarefas', 'checkTasks')}
        ${!detailEditMode ? `<div id="taskBadges" style="display:flex; gap:6px; flex-wrap:wrap;">${taskBadgesHtml(tc)}</div>` : ''}
      </div>
      ${tarefasSectionHtml(a, detailEditMode)}
    </div>

    <div class="grid-2" style="margin-bottom:0;">
      ${a.participantes ? `
      <div class="card">
        ${cardTitle('Participação (estimada pelo texto)', 'users')}
        ${a.participantes.map(p=>`
          <div class="p-row">
            <div class="p-avatar">${escapeHtml(p.nome.slice(0,2).toUpperCase())}</div>
            <div class="p-info">
              <div class="p-name">${escapeHtml(p.nome)}</div>
              <div class="p-stats">${p.turnos} falas · ${p.tarefas_criadas} tarefa(s)</div>
            </div>
            <div class="p-track"><div class="p-fill" style="width:${p.participacao_pct}%;"></div></div>
            <span class="mono" style="font-size:11px; color:var(--text-dim); width:32px; text-align:right;">${p.participacao_pct}%</span>
          </div>`).join('')}
      </div>` : `<div class="card">${cardTitle('Participação', 'users')}<p class="hint">Identifique as falas por nome na transcrição (ex: "Ana: ...") ou informe os participantes na ordem de fala ao enviar o áudio, para ativar essa análise.</p></div>`}

      <div class="card">
        ${cardTitle('IA Coach — próxima reunião', 'compass')}
        ${(a.coach?.length) ? `<div class="coach-list">${a.coach.map(c=>`<div class="coach-item"><span class="coach-icon">${icon('bulb',12)}</span>${escapeHtml(c)}</div>`).join('')}</div>` : '<p class="hint">Sem recomendações disponíveis.</p>'}
      </div>
    </div>

    <div class="card">
      ${cardTitle('Indicadores de tempo', 'clock')}
      ${stackedTempo(a.tempo)}
      ${(a.tempo && m.duracaoMin) ? `<p class="hint" style="margin-top:13px;">De ${m.duracaoMin} min, aproximadamente ${Math.round((a.tempo.produtivo_pct||0)/100*m.duracaoMin)} min foram produtivos.</p>` : ''}
    </div>
  </div>
  `;
}
function bindDetailActions(m){
  if(!m) return;

  if(detailEditMode){
    document.getElementById('btnCancelEdit').addEventListener('click', ()=>{
      detailEditMode = false;
      renderMain();
    });
    document.getElementById('btnSaveEdit').addEventListener('click', async (e)=>{
      const btn = e.currentTarget;
      btn.disabled = true;
      const payload = collectDetailEdits();
      try{
        const res = await fetch(`/api/meetings/${m.id}/analise`, {
          method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
        });
        const data = await readJsonSafe(res);
        if(!res.ok) throw new Error(data.error || 'Falha ao salvar as alterações.');
        Object.assign(m.analise, data.analise);
        detailEditMode = false;
        showToast('Alterações salvas.', 'success');
        renderMain(); renderSidebar();
      }catch(err){
        btn.disabled = false;
        showToast('Não foi possível salvar: ' + err.message, 'error');
      }
    });

    const wireRemove = (row) => { const b = row.querySelector('.edit-row-remove'); if(b) b.addEventListener('click', ()=>row.remove()); };
    document.querySelectorAll('.edit-row').forEach(wireRemove);
    document.querySelectorAll('#editTarefasTable tbody tr').forEach(wireRemove);

    const addDecisaoBtn = document.getElementById('addDecisaoBtn');
    if(addDecisaoBtn) addDecisaoBtn.addEventListener('click', ()=>{
      const list = document.getElementById('editDecisoesList');
      list.insertAdjacentHTML('beforeend', editRowHtml('', 'decision-edit-input'));
      wireRemove(list.lastElementChild);
      list.lastElementChild.querySelector('input').focus();
    });
    const addRiscoBtn = document.getElementById('addRiscoBtn');
    if(addRiscoBtn) addRiscoBtn.addEventListener('click', ()=>{
      const list = document.getElementById('editRiscosList');
      list.insertAdjacentHTML('beforeend', riskEditRowHtml({descricao:'', prioridade:'medio'}));
      wireRemove(list.lastElementChild);
      list.lastElementChild.querySelector('input').focus();
    });
    const addTarefaBtn = document.getElementById('addTarefaBtn');
    if(addTarefaBtn) addTarefaBtn.addEventListener('click', ()=>{
      const tbody = document.querySelector('#editTarefasTable tbody');
      tbody.insertAdjacentHTML('beforeend', taskEditRowHtml({tarefa:'', responsavel:'', prazo:'', critica:false, concluida:false}));
      wireRemove(tbody.lastElementChild);
      tbody.lastElementChild.querySelector('input').focus();
    });
    return;
  }

  document.getElementById('btnEditToggle').addEventListener('click', ()=>{
    detailEditMode = true;
    renderMain();
  });
  document.getElementById('btnExportMd').addEventListener('click', ()=>{ exportMd(m); showToast('Relatório .md exportado.', 'success'); });
  document.getElementById('btnExportCsv').addEventListener('click', ()=>{ exportCsv(m); showToast('Tarefas exportadas em CSV.', 'success'); });
  document.getElementById('btnExportPdf').addEventListener('click', ()=>window.print());
  document.getElementById('btnExcluir').addEventListener('click', async ()=>{
    const ok = await showConfirm('Essa ação não pode ser desfeita. A reunião e toda a sua análise serão removidas.', 'Excluir reunião', 'Excluir esta reunião?');
    if(!ok) return;
    try{
      const res = await fetch(`/api/meetings/${m.id}`, { method:'DELETE' });
      const data = await readJsonSafe(res);
      if(!res.ok) throw new Error(data.error || 'Falha ao excluir a reunião.');
      allMeetings = allMeetings.filter(x=>x.id!==m.id);
      applyFolderFilter();
      showToast('Reunião excluída.', 'success');
      setView('dashboard');
    }catch(e){
      showToast('Não foi possível excluir: ' + e.message, 'error');
    }
  });
  document.querySelectorAll('.task-check').forEach(cb=>{
    cb.addEventListener('change', async (e)=>{
      const idx = parseInt(e.target.dataset.idx,10);
      const done = e.target.checked;
      const previamenteConcluida = m.analise.tarefas[idx].concluida;
      m.analise.tarefas[idx].concluida = done;
      const row = document.getElementById('taskrow-'+idx);
      const desc = row?.querySelector('.task-desc');
      if(desc) desc.classList.toggle('done', done);
      if(row){
        row.classList.remove('task-row-flash');
        void row.offsetWidth;
        row.classList.add('task-row-flash');
      }
      if(row) row.classList.toggle('task-critical-row', !!m.analise.tarefas[idx].critica && !done);
      const tc = taskCounts(m.analise);
      const badgesWrap = document.getElementById('taskBadges');
      if(badgesWrap){
        badgesWrap.innerHTML = taskBadgesHtml(tc);
      }
      try{
        const res = await fetch(`/api/meetings/${m.id}/tasks/${idx}`, {
          method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({concluida: done})
        });
        const data = await readJsonSafe(res);
        if(!res.ok) throw new Error(data.error || 'Falha ao salvar.');
        showToast(done ? 'Tarefa marcada como concluída.' : 'Tarefa reaberta.', 'success');
      }catch(err){
        // reverte a UI otimista em caso de falha no servidor
        e.target.checked = previamenteConcluida;
        m.analise.tarefas[idx].concluida = previamenteConcluida;
        if(desc) desc.classList.toggle('done', previamenteConcluida);
        showToast('Não foi possível salvar a alteração: ' + err.message, 'error');
      }
    });
  });
}
function exportMd(m){
  const a = m.analise || {};
  let md = `# ${m.titulo}\n\nData: ${fmtDate(m.criadoEm)}\n`;
  if(m.participantes?.length) md += `Participantes: ${m.participantes.join(', ')}\n`;
  if(overallScore(a)!=null) md += `Score geral: ${overallScore(a)}/100\n`;
  md += `\n## Resumo executivo\n${a.resumo_executivo||''}\n`;
  md += `\n## Tópicos\n${(a.topicos||[]).map(t=>'- '+t).join('\n')}\n`;
  md += `\n## Decisões\n${(a.decisoes||[]).map(d=>'- '+d).join('\n')}\n`;
  md += `\n## Tarefas\n`;
  (a.tarefas||[]).forEach(t=>{ md += `- [${t.concluida?'x':' '}] ${t.tarefa} — Responsável: ${t.responsavel||'não definido'} — Prazo: ${t.prazo||'não definido'}${t.critica?' — CRÍTICA':''}\n`; });
  md += `\n## Palavras-chave\n${(a.palavras_chave||[]).join(', ')}\n`;
  md += `\n## Sentimento\n${(a.sentimento&&a.sentimento.geral)||''} — ${(a.sentimento&&a.sentimento.resumo)||''}\n`;
  if(a.coach?.length){ md += `\n## Recomendações da IA\n${a.coach.map(c=>'- '+c).join('\n')}\n`; }
  downloadBlob(md, 'text/markdown', `relatorio-${slug(m.titulo)}.md`);
}
function exportCsv(m){
  const a = m.analise || {};
  let csv = 'Tarefa,Responsavel,Prazo,Critica,Concluida\n';
  (a.tarefas||[]).forEach(t=>{
    const row = [t.tarefa, t.responsavel||'', t.prazo||'', t.critica?'Sim':'Nao', t.concluida?'Sim':'Nao']
      .map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',');
    csv += row + '\n';
  });
  downloadBlob(csv, 'text/csv', `tarefas-${slug(m.titulo)}.csv`);
}

/* ============================================================
   INSIGHTS — visual blocks: Tendência / Risco / Oportunidade / Recorrência / Próxima ação
============================================================ */
function insightsTemplate(){
  return `
  <div class="eyebrow">Inteligência entre reuniões</div>
  <div class="page-title">Padrões, gargalos e oportunidades</div>
  <div class="page-sub">Cruzamento automático de todas as reuniões analisadas para revelar o que não aparece em uma reunião isolada.</div>
  <div class="card" id="insightsBody">
    <div class="skeleton skel-line" style="width:60%;"></div>
    <div class="skeleton skel-line" style="width:80%;"></div>
    <div class="skeleton skel-line" style="width:40%;"></div>
  </div>
  `;
}
async function runInsights(){
  const body = document.getElementById('insightsBody');
  if(meetings.length < 2){
    body.innerHTML = `<p class="hint">São necessárias pelo menos 2 reuniões analisadas para identificar padrões entre elas.</p>`;
    return;
  }
  try{
    const res = await fetch('/api/insights', { method:'POST' });
    const ins = await readJsonSafe(res);
    if(!res.ok) throw new Error(ins.error || 'Falha ao gerar insights.');
    if(ins.tooFew){
      body.innerHTML = `<p class="hint">São necessárias pelo menos 2 reuniões analisadas para identificar padrões entre elas.</p>`;
      return;
    }
    const blocks = [
      {title:'Tendência', tone:'blue', ic:'trendUp', items:ins.tendencias},
      {title:'Risco', tone:'red', ic:'alert', items:ins.riscos},
      {title:'Oportunidade', tone:'green', ic:'bulb', items:ins.oportunidades},
      {title:'Assunto recorrente', tone:'orange', ic:'pin', items:ins.assuntos_recorrentes}
    ];
    body.innerHTML = `<div class="insights-grid">${blocks.map(b=>`
      <div class="insight-block tone-${b.tone}">
        <div class="insight-block-head"><span class="insight-block-icon">${icon(b.ic,14)}</span><span class="insight-block-title">${b.title}</span></div>
        <ul class="plain">${(b.items||[]).map(x=>`<li>${escapeHtml(x)}</li>`).join('') || '<li>Nenhum identificado.</li>'}</ul>
      </div>
    `).join('')}</div>
    ${ins.proxima_acao ? `<div class="next-action-card">
      <span class="next-action-icon">${icon('target',18)}</span>
      <div><div class="next-action-label">Próxima ação sugerida</div><div class="next-action-text">${escapeHtml(ins.proxima_acao)}</div></div>
    </div>` : ''}`;
  }catch(e){
    body.innerHTML = `<div class="error-box">${icon('alert',15)} Não foi possível gerar os insights. ${escapeHtml(e.message||'Tente novamente.')}</div>`;
  }
}

/* ============================================================
   TIMELINE — connected vertical timeline of meetings
============================================================ */
function timelineTemplate(){
  if(meetings.length < 2){
    return `<div class="eyebrow">Timeline</div><div class="page-title">Linha do tempo das reuniões</div>
    ${emptyStateHtml('clock', 'Ainda não há histórico suficiente', 'São necessárias pelo menos 2 reuniões analisadas para montar a timeline.')}`;
  }
  const chron = meetings.slice().sort((a,b)=>a.criadoEm-b.criadoEm);
  const recurring = new Set(computeThemeTimeline().map(t=>t[0]));
  return `
  <div class="eyebrow">Timeline</div>
  <div class="page-title">Linha do tempo das reuniões</div>
  <div class="page-sub">${fmtDate(chron[0].criadoEm)} — ${fmtDate(chron[chron.length-1].criadoEm)} · cor do ponto = score da reunião · ${icon('alert',10)} marca risco · temas com <span class="tag tag-orange" style="padding:1px 8px;">${icon('pin',10)} destaque</span> se repetem em outras reuniões</div>
  <div class="card">
    <div class="tl-vwrap">
      ${chron.map(m=>{
        const os = overallScore(m.analise);
        const flagged = (m.analise?.topicos||[]).filter(t=>recurring.has(t));
        const decisoesN = (m.analise?.decisoes||[]).length;
        const tc = taskCounts(m.analise);
        const sentNeg = sentToNum(m.analise?.sentimento?.geral) < -0.15;
        const isRisk = tc.criticas > 0 || sentNeg;
        const isResolved = tc.total > 0 && tc.pendentes === 0;
        return `<div class="tl-vitem">
          <div class="tl-vdot" style="background:${scoreColor(os)};">${isRisk?`<span class="tl-vdot-flag">${icon('alert',9)}</span>`:''}</div>
          <div class="tl-vcard" data-id="${m.id}">
            <div class="tl-vdate">${fmtDate(m.criadoEm)}</div>
            <div class="tl-vtitle">${escapeHtml(m.titulo)}</div>
            <div class="tl-vmeta">
              ${badge(decisoesN+' decisão'+(decisoesN===1?'':'ões'), decisoesN>=2?'green':decisoesN?'blue':'mute')}
              ${isRisk?badge(tc.criticas>0? tc.criticas+' crítica'+(tc.criticas===1?'':'s') : 'sentimento negativo', 'red'):''}
              ${isResolved?badge('todas as tarefas concluídas','green'):''}
              ${os!=null?`<span class="score-pill" style="background:${scoreColor(os)}22;color:${scoreColor(os)};">${os}</span>`:''}
            </div>
            ${flagged.length? `<div class="tl-vflags">${flagged.map(f=>`<span class="tag tag-orange">${icon('pin',10)} ${escapeHtml(f)}</span>`).join('')}</div>`:''}
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>
  `;
}
function bindTimeline(){
  document.querySelectorAll('.tl-vcard').forEach(el=>makeClickable(el, ()=>setView('detail', el.dataset.id)));
}

/* ============================================================
   SEARCH — answer + confidence + sources with excerpts
============================================================ */
function searchTemplate(){
  const themes = meetings.length ? computeThemeTimeline() : [];
  return `
  <div class="eyebrow">Memória corporativa</div>
  <div class="page-title">O conhecimento acumulado da empresa</div>
  <div class="page-sub">Pergunte qualquer coisa sobre o histórico de reuniões — decisões, responsáveis, clientes, projetos — e receba uma resposta com as fontes exatas. Ex: "Quando decidimos trocar de fornecedor?" · "Quem ficou responsável pelo Projeto Alpha?" · "O que foi decidido sobre orçamento?"</div>
  ${themes.length ? `
  <div class="card" style="margin-bottom:16px;">
    ${cardTitle('Temas mais discutidos', 'repeat')}
    <div class="theme-cloud">${themes.map(([tema,datas])=>`<span class="theme-chip" title="Apareceu em ${datas.length} reuniões">${escapeHtml(tema)} <b>${datas.length}</b></span>`).join('')}</div>
  </div>` : ''}
  <div class="card">
    <div class="search-box">
      <input type="text" id="searchQuery" placeholder="Digite sua pergunta...">
      <button class="btn primary" id="btnSearch">Perguntar</button>
    </div>
    <div id="searchResult"></div>
  </div>
  `;
}
function bindSearch(){
  const run = () => runSearch();
  document.getElementById('btnSearch').addEventListener('click', run);
  document.getElementById('searchQuery').addEventListener('keydown', e=>{ if(e.key==='Enter') run(); });
}
async function runSearch(){
  const q = document.getElementById('searchQuery').value.trim();
  const result = document.getElementById('searchResult');
  if(!q) return;
  if(meetings.length===0){ result.innerHTML = `<p class="hint" style="margin-top:16px;">Nenhuma reunião analisada ainda.</p>`; return; }
  result.innerHTML = `<div style="margin-top:22px;"><div class="skeleton skel-line" style="width:70%;"></div><div class="skeleton skel-line" style="width:50%;"></div></div>`;
  try{
    const res = await fetch('/api/search', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({query:q}) });
    const r = await readJsonSafe(res);
    if(!res.ok) throw new Error(r.error || 'Falha ao responder.');
    const confMap = {alta:'green', media:'orange', baixa:'red'};
    const confTone = confMap[r.confianca] || 'mute';
    const fontes = (r.fontes||[]).map(f=>{
      const meta = [f.data?fmtDate(f.data):'', f.participantes?.length?f.participantes.join(', '):''].filter(Boolean).join(' · ');
      return `<div class="source-card">
        <div class="source-info">
          <div class="source-title">${escapeHtml(f.titulo)}</div>
          ${meta?`<div class="hint" style="margin:1px 0 5px;">${escapeHtml(meta)}</div>`:''}
          <div class="source-trecho">${escapeHtml(f.trecho||'')}</div>
        </div>
        ${f.meetingId?`<button class="btn small" data-id="${f.meetingId}">${icon('doc',12)} Abrir reunião</button>`:''}
      </div>`;
    }).join('');
    result.innerHTML = `
      <div class="search-answer">${escapeHtml(r.resposta)}</div>
      <div class="confidence-row">Confiança da resposta: ${badge(r.confianca||'—', confTone)}</div>
      ${fontes ? `<div class="source-list">${fontes}</div>` : ''}
    `;
    result.querySelectorAll('.source-card button').forEach(b=>b.addEventListener('click', ()=>setView('detail', b.dataset.id)));
  }catch(e){
    result.innerHTML = `<div class="error-box" style="margin-top:16px;">${icon('alert',15)} Não foi possível responder. ${escapeHtml(e.message||'Tente novamente.')}</div>`;
  }
}

/* ============================================================
   RISKS — riscos que a IA identifica durante a análise de cada
   reunião (atrasos, orçamento, fornecedores, clientes, equipe...)
============================================================ */
function risksTemplate(){
  if(meetings.length===0){
    return `<div class="eyebrow">Riscos</div><div class="page-title">Painel de riscos</div>
    ${emptyStateHtml('alert', 'Nenhuma reunião analisada ainda', 'Os riscos identificados pela IA em cada reunião aparecem aqui automaticamente.')}`;
  }
  const risks = getAllRisks();
  const nivelLabel = {critico:'Crítico', alto:'Alto', medio:'Médio', baixo:'Baixo'};
  const nivelTone = {critico:'red', alto:'red', medio:'orange', baixo:'blue'};
  if(!risks.length){
    return `<div class="eyebrow">Riscos</div><div class="page-title">Painel de riscos</div>
    <div class="page-sub">Riscos que a IA identifica automaticamente durante a análise de cada reunião — atrasos, orçamento, fornecedores, clientes insatisfeitos e outros sinais de alerta ao negócio.</div>
    ${emptyStateHtml('check', 'Nenhum risco identificado', 'Tudo tranquilo por enquanto — a IA não encontrou sinais de risco nas reuniões analisadas.')}`;
  }
  const counts = risks.reduce((acc,r)=>{ acc[r.prioridade]=(acc[r.prioridade]||0)+1; return acc; }, {});
  return `
  <div class="eyebrow">Riscos</div>
  <div class="page-title">Painel de riscos</div>
  <div class="page-sub">Riscos identificados automaticamente pela IA em cada reunião — atrasos, orçamento, fornecedores, clientes insatisfeitos e outros sinais de alerta. ${risks.length} risco(s) em ${meetings.length} reunião(ões) analisada(s).</div>
  <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:20px;">
    ${['critico','alto','medio','baixo'].filter(p=>counts[p]).map(p=>badge(`${counts[p]} ${nivelLabel[p].toLowerCase()}`, nivelTone[p])).join('')}
  </div>
  ${risks.map(r=>`
    <div class="alert-card risk-card tone-${nivelTone[r.prioridade]||'blue'}" data-id="${r.meetingId}">
      <span class="alert-icon">${icon('flag',15)}</span>
      <div class="alert-body">
        <div class="alert-top">${badge(nivelLabel[r.prioridade]||r.prioridade, nivelTone[r.prioridade]||'mute')}</div>
        <div class="alert-text">${escapeHtml(r.descricao)}</div>
        <div class="alert-suggestion">${icon('doc',13)}<span>${escapeHtml(r.meetingTitulo)} · ${fmtDate(r.meetingData)}</span></div>
      </div>
    </div>`).join('')}
  `;
}
function bindRisks(){
  document.querySelectorAll('.risk-card').forEach(el=>makeClickable(el, ()=>setView('detail', el.dataset.id)));
}

/* ============================================================
   ALERTS — prioritized, with icons and suggested actions
============================================================ */
function alertsTemplate(){
  if(meetings.length===0){
    return `<div class="eyebrow">Alertas</div><div class="page-title">Alertas automáticos</div>
    ${emptyStateHtml('inbox', 'Nenhuma reunião analisada ainda', 'Os alertas aparecem automaticamente assim que houver dados suficientes entre suas reuniões.')}`;
  }
  const all = computeAlerts();
  const visible = all.filter(a=>!dismissedAlerts.has(a.id));
  const shown = visible.slice(0, ALERTS_DISPLAY_CAP);
  const hiddenCount = visible.length - shown.length;
  const dismissedCount = all.filter(a=>dismissedAlerts.has(a.id)).length;
  const nivelLabel = {alta:'Alta prioridade', media:'Média prioridade', baixa:'Baixa prioridade'};
  const nivelTone = {alta:'red', media:'orange', baixa:'blue'};
  return `
  <div class="eyebrow">Alertas</div>
  <div class="page-title">Alertas automáticos</div>
  <div class="page-sub">Gerados a partir de padrões nos dados — tarefas acumuladas, temas sem solução e falta de decisões recentes. Mostrando os ${Math.min(ALERTS_DISPLAY_CAP, visible.length)} mais relevantes.</div>
  ${shown.length ? shown.map(a=>`
    <div class="alert-card tone-${a.tone}" data-alert-id="${a.id}">
      <button class="alert-dismiss" data-dismiss-id="${a.id}" title="Dispensar este alerta">${icon('x',13)}</button>
      <span class="alert-icon">${icon(a.ic,15)}</span>
      <div class="alert-body">
        <div class="alert-top">${badge(nivelLabel[a.nivel], nivelTone[a.nivel])}</div>
        <div class="alert-text">${escapeHtml(a.texto)}</div>
        <div class="alert-suggestion">${icon('compass',13)}<span>${escapeHtml(a.sugestao)}</span></div>
      </div>
    </div>`).join('') : emptyStateHtml('check', 'Nenhum alerta no momento', 'Tudo dentro do esperado — continue analisando reuniões para manter esse panorama atualizado.')}
  ${hiddenCount>0 ? `<div class="alerts-hidden-note">+ ${hiddenCount} alerta${hiddenCount===1?'':'s'} de menor prioridade não exibido${hiddenCount===1?'':'s'}.</div>` : ''}
  ${dismissedCount>0 ? `
  <div id="dismissedToggle" class="alerts-dismissed-toggle">${dismissedCount} alerta${dismissedCount===1?'':'s'} dispensado${dismissedCount===1?'':'s'} — clique para ver</div>
  <div id="dismissedList" class="dismissed-list" style="display:none;">
    ${all.filter(a=>dismissedAlerts.has(a.id)).map(a=>`
      <div class="dismissed-row">
        <span>${escapeHtml(a.texto)}</span>
        <button class="btn small" data-restore-id="${a.id}">${icon('undo',12)} Restaurar</button>
      </div>`).join('')}
  </div>` : ''}
  `;
}
function bindAlerts(){
  document.querySelectorAll('.alert-dismiss').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const id = btn.dataset.dismissId;
      const card = document.querySelector(`.alert-card[data-alert-id="${id}"]`);
      dismissedAlerts.add(id);
      await persistDismissedAlerts();
      renderSidebar();
      if(card){
        card.classList.add('dismissing');
        setTimeout(()=>renderMain(), 180);
      } else {
        renderMain();
      }
    });
  });
  const toggle = document.getElementById('dismissedToggle');
  if(toggle){
    makeClickable(toggle, ()=>{
      const list = document.getElementById('dismissedList');
      if(list) list.style.display = list.style.display==='none' ? 'flex' : 'none';
    });
  }
  document.querySelectorAll('[data-restore-id]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      dismissedAlerts.delete(btn.dataset.restoreId);
      await persistDismissedAlerts();
      renderSidebar();
      renderMain();
      showToast('Alerta restaurado.', 'success');
    });
  });
}

/* ============================================================
   USUÁRIOS — só o dono vê e acessa essa área (o servidor também
   bloqueia via requireOwner, isso aqui é só a interface).
============================================================ */
function usersTemplate(){
  return `
  <div class="eyebrow">Administração</div>
  <div class="page-title">Usuários</div>
  <div class="page-sub">Crie contas de acesso para o dono ou para funcionários. Cada pessoa entra com seu próprio usuário e senha.</div>

  <div class="form-card" style="margin-bottom:24px;">
    <div class="card-title">Nova conta</div>
    <div id="userFormError" class="error-box" style="display:none;"></div>
    <form id="newUserForm">
      <div class="form-row">
        <div>
          <label for="newUserNome">Nome</label>
          <input type="text" id="newUserNome" placeholder="Ex: Thiago Nascimento" required>
        </div>
        <div>
          <label for="newUserRole">Tipo de conta</label>
          <select id="newUserRole">
            <option value="funcionario">Funcionário</option>
            <option value="dono">Dono</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div>
          <label for="newUserUsername">Usuário (login)</label>
          <input type="text" id="newUserUsername" placeholder="Ex: ana.souza" required>
        </div>
        <div>
          <label for="newUserPassword">Senha</label>
          <input type="password" id="newUserPassword" placeholder="Mínimo 6 caracteres" required>
        </div>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn primary" id="newUserSubmitBtn">Criar conta</button>
      </div>
    </form>
  </div>

  <div class="card">
    <div class="card-title">Contas existentes</div>
    <div id="usersListArea"><div class="skeleton skel-line" style="width:60%;"></div></div>
  </div>`;
}

function bindUsers(){
  const form = document.getElementById('newUserForm');
  const errorEl = document.getElementById('userFormError');
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    errorEl.style.display = 'none';
    const nome = document.getElementById('newUserNome').value.trim();
    const role = document.getElementById('newUserRole').value;
    const username = document.getElementById('newUserUsername').value.trim();
    const password = document.getElementById('newUserPassword').value;
    const btn = document.getElementById('newUserSubmitBtn');
    btn.disabled = true;
    try{
      const res = await fetch('/api/auth/users', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ nome, role, username, password })
      });
      const data = await readJsonSafe(res);
      if(!res.ok){
        errorEl.textContent = data.error || 'Não foi possível criar a conta.';
        errorEl.style.display = 'block';
        return;
      }
      showToast('Conta criada com sucesso.', 'success');
      form.reset();
      loadUsersList();
    }catch(err){
      errorEl.textContent = 'Não foi possível conectar ao servidor.';
      errorEl.style.display = 'block';
    }finally{
      btn.disabled = false;
    }
  });
  loadUsersList();
}

async function loadUsersList(){
  const area = document.getElementById('usersListArea');
  try{
    const res = await fetch('/api/auth/users');
    const users = await readJsonSafe(res);
    if(!res.ok || !Array.isArray(users)){
      area.innerHTML = '<p class="hint">Não foi possível carregar as contas.</p>';
      return;
    }
    if(!users.length){
      area.innerHTML = '<p class="hint">Nenhuma conta cadastrada ainda.</p>';
      return;
    }
    area.innerHTML = `<table class="tasks"><thead><tr><th>Nome</th><th>Usuário</th><th>Tipo</th><th>Criado em</th></tr></thead><tbody>
      ${users.map(u=>`<tr>
        <td>${escapeHtml(u.nome)}</td>
        <td class="mono">${escapeHtml(u.username)}</td>
        <td><span class="badge ${u.role==='dono'?'blue':'mute'}">${u.role==='dono'?'Dono':'Funcionário'}</span></td>
        <td class="mono">${fmtDate(u.criadoEm)}</td>
      </tr>`).join('')}
    </tbody></table>`;
  }catch(err){
    area.innerHTML = '<p class="hint">Não foi possível carregar as contas.</p>';
  }
}

/* ============================================================
   LOGIN — tela exibida enquanto não há sessão válida.
============================================================ */
function renderUserBar(){
  if(!currentUser) return;
  document.getElementById('userBarName').textContent = currentUser.nome || currentUser.username;
  document.getElementById('userBarRole').textContent = currentUser.role === 'dono' ? 'Dono' : 'Funcionário';
  const navUsers = document.getElementById('navUsers');
  if(navUsers) navUsers.style.display = currentUser.role === 'dono' ? '' : 'none';
}

async function checkAuth(){
  try{
    const res = await fetch('/api/auth/me');
    if(!res.ok) return false;
    currentUser = await res.json();
    return true;
  }catch(e){ return false; }
}

function bindAuthForm(){
  const form = document.getElementById('authForm');
  const errorEl = document.getElementById('authError');
  form.addEventListener('submit', async e=>{
    e.preventDefault();
    errorEl.style.display = 'none';
    const username = document.getElementById('authUsername').value.trim();
    const password = document.getElementById('authPassword').value;
    const btn = document.getElementById('authSubmitBtn');
    btn.disabled = true;
    try{
      const res = await fetch('/api/auth/login', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ username, password })
      });
      const data = await readJsonSafe(res);
      if(!res.ok){
        errorEl.textContent = data.error || 'Não foi possível entrar.';
        errorEl.style.display = 'block';
        return;
      }
      currentUser = data;
      document.getElementById('authOverlay').style.display = 'none';
      document.querySelector('.app').style.display = '';
      renderUserBar();
      renderMain();
      loadMeetings();
      initLanding();
    }catch(err){
      errorEl.textContent = 'Não foi possível conectar ao servidor.';
      errorEl.style.display = 'block';
    }finally{
      btn.disabled = false;
    }
  });
}

async function boot(){
  bindAuthForm();
  document.getElementById('btnLogout').addEventListener('click', async ()=>{
    await fetch('/api/auth/logout', { method:'POST' });
    location.reload();
  });
  const authed = await checkAuth();
  if(!authed){
    document.getElementById('authOverlay').style.display = 'flex';
    return;
  }
  document.querySelector('.app').style.display = '';
  renderUserBar();
  renderMain();
  loadMeetings();
  initLanding();
}

/* ============================================================
   NAV BINDINGS
============================================================ */
document.getElementById('btnNew').addEventListener('click', ()=>setView('new'));
makeClickable(document.getElementById('navDashboard'), ()=>setView('dashboard'));
makeClickable(document.getElementById('navInsights'), ()=>setView('insights'));
makeClickable(document.getElementById('navTimeline'), ()=>setView('timeline'));
makeClickable(document.getElementById('navSearch'), ()=>setView('search'));
makeClickable(document.getElementById('navRisks'), ()=>setView('risks'));
makeClickable(document.getElementById('navAlerts'), ()=>setView('alerts'));
makeClickable(document.getElementById('navUsers'), ()=>setView('users'));
document.getElementById('searchInput').addEventListener('input', renderSidebar);
document.getElementById('folderSelect').addEventListener('change', e=>{
  currentFolder = e.target.value;
  applyFolderFilter();
  setView('dashboard');
});

/* ============================================================
   LANDING — vitrine mostrada antes do painel, até o usuário
   clicar em "Entrar". Fica lembrado no navegador (localStorage).
============================================================ */
const LANDING_SEEN_KEY = 'pautaLandingVisto';
function initLanding(){
  const overlay = document.getElementById('landingOverlay');
  const features = document.getElementById('landingFeatures');
  features.innerHTML = [
    { ic:'spark', t:'Análise automática', d:'Resumo, decisões e tarefas gerados pela IA a cada reunião analisada.' },
    { ic:'flag', t:'IA de riscos', d:'Atrasos, estouro de orçamento e clientes insatisfeitos, identificados sozinhos.' },
    { ic:'compass', t:'Memória corporativa', d:'Pergunte sobre qualquer reunião passada e receba a fonte exata usada.' },
    { ic:'target', t:'Dashboard executivo', d:'Produtividade, tendências e prioridades da empresa em um painel só.' }
  ].map(f=>`<div class="landing-feature">
    <span class="landing-feature-icon">${icon(f.ic,15)}</span>
    <div><div class="landing-feature-title">${escapeHtml(f.t)}</div><div class="landing-feature-text">${escapeHtml(f.d)}</div></div>
  </div>`).join('');

  if(!localStorage.getItem(LANDING_SEEN_KEY)){
    overlay.style.display = 'flex';
  }
  document.getElementById('landingEnterBtn').addEventListener('click', ()=>{
    localStorage.setItem(LANDING_SEEN_KEY, '1');
    overlay.style.display = 'none';
  });
}

boot();
