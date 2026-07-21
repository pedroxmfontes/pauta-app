require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const { attachUser, requireAuth } = require('./middleware/auth');
const { bootstrapOwnerAccount } = require('./services/auth');

const authRouter = require('./routes/auth');
const meetingsRouter = require('./routes/meetings');
const insightsRouter = require('./routes/insights');
const searchRouter = require('./routes/search');
const alertsRouter = require('./routes/alerts');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(attachUser);

app.use('/api/auth', authRouter);
app.use('/api/meetings', requireAuth, meetingsRouter);
app.use('/api/insights', requireAuth, insightsRouter);
app.use('/api/search', requireAuth, searchRouter);
app.use('/api/dismissed-alerts', requireAuth, alertsRouter);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    return res.status(400).json({ error: 'Arquivo de áudio inválido ou grande demais (máximo 300MB).' });
  }
  if (err && err.message === 'TIPO_DE_ARQUIVO_INVALIDO') {
    return res.status(400).json({ error: 'Esse arquivo não parece ser um áudio válido. Envie um arquivo .mp3, .wav, .m4a, .mp4, .ogg ou .webm.' });
  }
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3000;

(async () => {
  if (!process.env.DATABASE_URL) {
    console.warn('AVISO: DATABASE_URL não configurada — nenhuma reunião vai poder ser salva até você preencher o .env.');
  }
  if (!process.env.JWT_SECRET) {
    console.warn('AVISO: JWT_SECRET não configurada — o login não vai funcionar até você preencher o .env.');
  }
  try {
    await bootstrapOwnerAccount();
  } catch (err) {
    console.warn('AVISO: não foi possível criar a conta de dono automaticamente (verifique DATABASE_URL, OWNER_USERNAME e OWNER_PASSWORD).', err.message);
  }

  app.listen(PORT, () => {
    console.log(`Pauta rodando em http://localhost:${PORT}`);
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('AVISO: ANTHROPIC_API_KEY não configurada — a análise de reuniões vai falhar até você preencher o .env.');
    }
    if (!process.env.ASSEMBLYAI_API_KEY) {
      console.warn('AVISO: ASSEMBLYAI_API_KEY não configurada — o upload de áudio vai falhar até você preencher o .env.');
    }
  });
})();
