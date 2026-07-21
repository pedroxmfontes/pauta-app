const { verifyToken } = require('../services/auth');
const store = require('../services/store');

const COOKIE_NAME = 'pauta_token';

/** Lê o cookie de login (se existir e for válido) e anexa o usuário em req.user. Nunca bloqueia a requisição. */
async function attachUser(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    const user = await store.getUserById(payload.sub);
    if (user) req.user = { id: user.id, username: user.username, nome: user.nome, role: user.role };
  } catch {
    // token invalido ou expirado — segue sem usuario logado
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'É preciso entrar na conta para acessar isso.' });
  next();
}

function requireOwner(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'É preciso entrar na conta para acessar isso.' });
  if (req.user.role !== 'dono') return res.status(403).json({ error: 'Só o dono da conta pode fazer isso.' });
  next();
}

module.exports = { COOKIE_NAME, attachUser, requireAuth, requireOwner };
