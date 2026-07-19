require('dotenv').config();
const path = require('path');
const express = require('express');

const meetingsRouter = require('./routes/meetings');
const insightsRouter = require('./routes/insights');
const searchRouter = require('./routes/search');
const alertsRouter = require('./routes/alerts');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/meetings', meetingsRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/search', searchRouter);
app.use('/api/dismissed-alerts', alertsRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: 'Arquivo de áudio inválido ou grande demais (máximo 300MB).' });
  }
  if (err && err.message === 'TIPO_DE_ARQUIVO_INVALIDO') {
    return res.status(400).json({ error: 'Esse arquivo não parece ser um áudio válido. Envie um arquivo .mp3, .wav, .m4a, .mp4, .ogg ou .webm.' });
  }
  console.error(err);
  res.status(500).json({ error: err.message || 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Pauta rodando em http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('AVISO: ANTHROPIC_API_KEY não configurada — a análise de reuniões vai falhar até você preencher o .env.');
  }
  if (!process.env.ASSEMBLYAI_API_KEY) {
    console.warn('AVISO: ASSEMBLYAI_API_KEY não configurada — o upload de áudio vai falhar até você preencher o .env.');
  }
});
