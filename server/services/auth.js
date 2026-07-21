const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('./store');

const SECRET = process.env.JWT_SECRET;

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

/** Cria a conta de dono a partir de OWNER_USERNAME/OWNER_PASSWORD, só na primeira vez (tabela de usuários vazia). */
async function bootstrapOwnerAccount() {
  if (!process.env.OWNER_USERNAME || !process.env.OWNER_PASSWORD) return;
  const existing = await store.countUsers();
  if (existing > 0) return;
  const passwordHash = await hashPassword(process.env.OWNER_PASSWORD);
  await store.createUser({
    username: process.env.OWNER_USERNAME.trim(),
    passwordHash,
    nome: 'Dono',
    role: 'dono'
  });
  console.log(`Conta de dono criada para o usuário "${process.env.OWNER_USERNAME}".`);
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, bootstrapOwnerAccount };
