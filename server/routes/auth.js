const express = require('express');
const store = require('../services/store');
const { hashPassword, verifyPassword, signToken } = require('../services/auth');
const { COOKIE_NAME, requireAuth, requireOwner } = require('../middleware/auth');

const router = express.Router();

function cookieOpts(req) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return { httpOnly: true, secure, sameSite: 'lax', maxAge: 30 * 24 * 60 * 60 * 1000 };
}

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Informe usuário e senha.' });
    const user = await store.getUserByUsername(username.trim());
    if (!user) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    const token = signToken(user);
    res.cookie(COOKIE_NAME, token, cookieOpts(req));
    res.json({ id: user.id, username: user.username, nome: user.nome, role: user.role });
  } catch (e) { next(e); }
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, cookieOpts(req));
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json(req.user);
});

router.get('/users', requireOwner, async (req, res, next) => {
  try { res.json(await store.listUsers()); } catch (e) { next(e); }
});

router.post('/users', requireOwner, async (req, res, next) => {
  try {
    const { username, password, nome, role } = req.body || {};
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Informe usuário, senha e tipo de conta.' });
    }
    if (!['dono', 'funcionario'].includes(role)) {
      return res.status(400).json({ error: 'Tipo de conta inválido.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });
    }
    const passwordHash = await hashPassword(password);
    const user = await store.createUser({ username: username.trim(), passwordHash, nome, role });
    res.status(201).json(user);
  } catch (e) { next(e); }
});

module.exports = router;
