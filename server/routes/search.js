const express = require('express');
const store = require('../services/store');
const { callClaude } = require('../services/anthropic');
const { buildSearchPrompt, SEARCH_TOOL } = require('../services/prompts');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const query = (req.body || {}).query;
    if (!query || !String(query).trim()) {
      return res.status(400).json({ error: 'Digite uma pergunta.' });
    }
    const meetings = await store.listMeetings();
    if (meetings.length === 0) {
      return res.status(400).json({ error: 'Nenhuma reunião analisada ainda.' });
    }
    const dados = meetings.map(m => ({
      titulo: m.titulo,
      data: m.criadoEm,
      resumo: m.analise?.resumo_executivo || '',
      decisoes: m.analise?.decisoes || [],
      tarefas: (m.analise?.tarefas || []).map(t => `${t.tarefa} (resp: ${t.responsavel})`),
      topicos: m.analise?.topicos || [],
      clientes: m.analise?.clientes_citados || []
    }));
    const r = await callClaude(buildSearchPrompt(String(query).trim(), dados), SEARCH_TOOL, { maxTokens: 900 });

    const fontes = (r.fontes || []).map(f => {
      const match = meetings.find(m => m.titulo === f.titulo);
      return {
        ...f,
        meetingId: match ? match.id : null,
        data: match ? match.criadoEm : null,
        participantes: match ? match.participantes : []
      };
    });
    res.json({ ...r, fontes });
  } catch (e) { next(e); }
});

module.exports = router;
