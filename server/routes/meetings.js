const express = require('express');
const multer = require('multer');
const store = require('../services/store');
const jobs = require('../jobs');
const { callClaude } = require('../services/anthropic');
const { uploadAudio, requestTranscript, pollTranscript, buildTranscriptText } = require('../services/assemblyai');
const { getKnownThemes, buildCorePrompt, buildIntelPrompt } = require('../services/prompts');

const ALLOWED_AUDIO_EXT = /\.(mp3|wav|m4a|ogg|oga|webm|mp4|aac|flac|opus)$/i;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 300 * 1024 * 1024 }, // 300MB
  fileFilter: (req, file, cb) => {
    const okMime = /^audio\//.test(file.mimetype) || ['video/mp4', 'video/webm'].includes(file.mimetype);
    const okExt = ALLOWED_AUDIO_EXT.test(file.originalname || '');
    if (okMime || okExt) return cb(null, true);
    cb(new Error('TIPO_DE_ARQUIVO_INVALIDO'));
  }
});

const router = express.Router();

/** Mesma heurística do app original: identifica falas no formato "Nome: texto" para estimar participação. */
function parseSpeakers(transcricao, tarefas) {
  const linhas = (transcricao || '').split('\n').map(l => l.trim()).filter(Boolean);
  const re = /^([A-ZÀ-Ú][^\s:][\wÀ-ÿ' -]{0,24}):\s*(.+)$/;
  const falas = {};
  linhas.forEach(l => {
    const m = l.match(re);
    if (m) {
      const nome = m[1].trim();
      if (!falas[nome]) falas[nome] = { palavras: 0, turnos: 0 };
      falas[nome].palavras += m[2].split(/\s+/).filter(Boolean).length;
      falas[nome].turnos += 1;
    }
  });
  const nomes = Object.keys(falas);
  if (nomes.length < 2) return null;
  const totalPalavras = nomes.reduce((s, n) => s + falas[n].palavras, 0) || 1;
  return nomes.map(n => ({
    nome: n,
    participacao_pct: Math.round(falas[n].palavras / totalPalavras * 100),
    turnos: falas[n].turnos,
    tarefas_criadas: (tarefas || []).filter(t => t.responsavel === n).length
  })).sort((a, b) => b.participacao_pct - a.participacao_pct);
}

async function runAnalysis({ titulo, participantesList, duracaoMin, transcricao }) {
  const meetingsSoFar = await store.listMeetings();
  const temasConhecidos = getKnownThemes(meetingsSoFar);

  const core = await callClaude(
    buildCorePrompt({
      titulo,
      participantesInformados: participantesList.join(', ') || 'não informado',
      transcricao,
      temasConhecidos
    }),
    { maxTokens: 2200 }
  );

  const intel = await callClaude(
    buildIntelPrompt({
      resumo: core.resumo_executivo || '',
      decisoesCount: (core.decisoes || []).length,
      tarefasCount: (core.tarefas || []).length,
      transcricao
    }),
    { maxTokens: 1200 }
  );

  const tarefasComStatus = (core.tarefas || []).map(t => ({ ...t, concluida: false, critica: !!t.critica }));
  const participantesAnalise = parseSpeakers(transcricao, tarefasComStatus);

  const analise = {
    ...core,
    tarefas: tarefasComStatus,
    score: intel.score || null,
    tempo: intel.tempo || null,
    coach: intel.coach || [],
    participantes: participantesAnalise
  };

  return store.addMeeting({
    titulo,
    participantes: participantesList,
    duracaoMin: Number.isFinite(duracaoMin) ? duracaoMin : null,
    transcricao,
    analise
  });
}

router.get('/', async (req, res, next) => {
  try {
    res.json(await store.listMeetings());
  } catch (e) { next(e); }
});

// Fluxo "colar transcrição" — roda de forma síncrona, igual ao app original.
router.post('/manual', async (req, res, next) => {
  try {
    const { titulo, participantes, duracaoMin, transcricao } = req.body || {};
    if (!titulo || !transcricao) {
      return res.status(400).json({ error: 'Título e transcrição são obrigatórios.' });
    }
    const participantesList = (participantes || '').split(',').map(s => s.trim()).filter(Boolean);
    const meeting = await runAnalysis({
      titulo: String(titulo).trim(),
      participantesList,
      duracaoMin: parseInt(duracaoMin, 10),
      transcricao: String(transcricao).trim()
    });
    res.json(meeting);
  } catch (e) { next(e); }
});

// Fluxo "enviar gravação" — cria um job e processa em segundo plano
// (transcrever um áudio pode levar minutos; o front-end consulta o progresso).
router.post('/audio', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo de áudio foi enviado.' });
    const { titulo, participantes, duracaoMin } = req.body || {};
    if (!titulo) return res.status(400).json({ error: 'O título da reunião é obrigatório.' });

    const participantesList = (participantes || '').split(',').map(s => s.trim()).filter(Boolean);
    const duracaoInformada = parseInt(duracaoMin, 10);
    const jobId = jobs.createJob();
    res.json({ jobId });

    (async () => {
      try {
        jobs.updateJob(jobId, { status: 'uploading' });
        const uploadUrl = await uploadAudio(req.file.buffer);

        jobs.updateJob(jobId, { status: 'transcrevendo' });
        const transcriptId = await requestTranscript(uploadUrl);
        const transcriptData = await pollTranscript(transcriptId, {
          onTick: () => jobs.updateJob(jobId, { status: 'transcrevendo' })
        });

        const { text: transcricao } = buildTranscriptText(transcriptData, participantesList);
        if (!transcricao.trim()) {
          throw new Error('A transcrição voltou vazia — verifique se o áudio contém fala audível.');
        }
        const duracaoAuto = transcriptData.audio_duration ? Math.round(transcriptData.audio_duration / 60) : null;

        jobs.updateJob(jobId, { status: 'analisando' });
        const meeting = await runAnalysis({
          titulo: String(titulo).trim(),
          participantesList,
          duracaoMin: Number.isFinite(duracaoInformada) ? duracaoInformada : duracaoAuto,
          transcricao
        });

        jobs.updateJob(jobId, { status: 'concluido', meeting });
      } catch (err) {
        console.error('Falha no processamento do job', jobId, err);
        jobs.updateJob(jobId, { status: 'erro', error: err.message });
      }
    })();
  } catch (e) { next(e); }
});

router.get('/jobs/:id', (req, res) => {
  const job = jobs.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job não encontrado ou expirado.' });
  res.json(job);
});

router.patch('/:id/tasks/:idx', async (req, res, next) => {
  try {
    const idx = parseInt(req.params.idx, 10);
    const concluida = !!(req.body || {}).concluida;
    const meeting = await store.updateMeeting(req.params.id, m => {
      if (!m.analise?.tarefas?.[idx]) throw new Error('Tarefa não encontrada.');
      m.analise.tarefas[idx].concluida = concluida;
      return m;
    });
    res.json(meeting);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await store.deleteMeeting(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
