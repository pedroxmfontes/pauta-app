const express = require('express');
const store = require('../services/store');
const { callClaude } = require('../services/anthropic');
const { buildInsightsPrompt } = require('../services/prompts');

const router = express.Router();

function overallScore(a) {
  if (!a || !a.score) return null;
  const vals = Object.values(a.score).filter(v => typeof v === 'number');
  if (!vals.length) return null;
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

router.post('/', async (req, res, next) => {
  try {
    const meetings = await store.listMeetings();
    if (meetings.length < 2) {
      return res.json({ tooFew: true });
    }
    const dados = meetings.map(m => ({
      titulo: m.titulo,
      data: m.criadoEm,
      resumo: m.analise?.resumo_executivo || '',
      topicos: m.analise?.topicos || [],
      palavras_chave: m.analise?.palavras_chave || [],
      clientes: m.analise?.clientes_citados || [],
      produtos: m.analise?.produtos_ou_projetos_citados || [],
      decisoes: (m.analise?.decisoes || []).length,
      sentimento: m.analise?.sentimento?.geral || '',
      score: overallScore(m.analise)
    }));
    const ins = await callClaude(buildInsightsPrompt(dados), { maxTokens: 1200 });
    res.json(ins);
  } catch (e) { next(e); }
});

module.exports = router;
