const { Pool } = require('pg');
const { randomUUID } = require('crypto');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost')
    ? { rejectUnauthorized: false }
    : false
});

async function ensureDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY,
      numero INTEGER NOT NULL,
      criado_em BIGINT NOT NULL,
      demo BOOLEAN NOT NULL DEFAULT FALSE,
      data JSONB NOT NULL
    )
  `);
  await pool.query(`CREATE SEQUENCE IF NOT EXISTS meetings_numero_seq`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL
    )
  `);
  await pool.query(
    `INSERT INTO app_state (key, value) VALUES ('dismissedAlerts', '[]'::jsonb) ON CONFLICT (key) DO NOTHING`
  );
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nome TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('dono','funcionario')),
      criado_em BIGINT NOT NULL
    )
  `);
}

// Roda uma vez no carregamento do módulo; toda função abaixo espera essa promise
// antes de consultar, então nenhuma query roda antes das tabelas existirem.
const ready = ensureDb();
ready.catch(() => {}); // evita warning de "unhandled rejection" — o erro real aparece pra quem usar as funções abaixo

async function listMeetings() {
  await ready;
  const { rows } = await pool.query('SELECT data FROM meetings ORDER BY numero ASC');
  return rows.map(r => r.data);
}

function addMeeting(partial) {
  return (async () => {
    await ready;
    const { rows } = await pool.query(`SELECT nextval('meetings_numero_seq') AS n`);
    const meeting = { id: randomUUID(), numero: Number(rows[0].n), criadoEm: Date.now(), ...partial };
    await pool.query(
      'INSERT INTO meetings (id, numero, criado_em, demo, data) VALUES ($1,$2,$3,$4,$5)',
      [meeting.id, meeting.numero, meeting.criadoEm, !!meeting.demo, meeting]
    );
    return meeting;
  })();
}

function updateMeeting(id, updater) {
  return (async () => {
    await ready;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT data FROM meetings WHERE id = $1 FOR UPDATE', [id]);
      if (!rows.length) throw new Error('Reunião não encontrada.');
      const updated = updater(rows[0].data);
      await client.query(
        'UPDATE meetings SET numero=$1, criado_em=$2, demo=$3, data=$4 WHERE id=$5',
        [updated.numero, updated.criadoEm, !!updated.demo, updated, id]
      );
      await client.query('COMMIT');
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })();
}

function deleteMeeting(id) {
  return (async () => {
    await ready;
    const { rowCount } = await pool.query('DELETE FROM meetings WHERE id = $1', [id]);
    if (!rowCount) throw new Error('Reunião não encontrada.');
  })();
}

/** Insere reuniões de demonstração já analisadas (sem passar pela IA), marcadas com demo:true. */
function seedDemoMeetings(demoMeetings) {
  return (async () => {
    await ready;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = [];
      for (const partial of demoMeetings) {
        const { rows } = await client.query(`SELECT nextval('meetings_numero_seq') AS n`);
        const meeting = { id: randomUUID(), numero: Number(rows[0].n), demo: true, ...partial };
        await client.query(
          'INSERT INTO meetings (id, numero, criado_em, demo, data) VALUES ($1,$2,$3,$4,$5)',
          [meeting.id, meeting.numero, meeting.criadoEm, true, meeting]
        );
        inserted.push(meeting);
      }
      await client.query('COMMIT');
      return inserted;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  })();
}

/** Remove só as reuniões de demonstração (demo:true), preservando reuniões reais. */
function clearDemoMeetings() {
  return (async () => {
    await ready;
    const { rowCount } = await pool.query('DELETE FROM meetings WHERE demo = true');
    return rowCount;
  })();
}

async function getDismissedAlerts() {
  await ready;
  const { rows } = await pool.query("SELECT value FROM app_state WHERE key = 'dismissedAlerts'");
  return rows.length ? rows[0].value : [];
}

function setDismissedAlerts(ids) {
  return (async () => {
    await ready;
    const value = Array.isArray(ids) ? ids : [];
    await pool.query(
      `INSERT INTO app_state (key, value) VALUES ('dismissedAlerts', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = $1::jsonb`,
      [JSON.stringify(value)]
    );
  })();
}

async function countUsers() {
  await ready;
  const { rows } = await pool.query('SELECT COUNT(*)::int AS c FROM users');
  return rows[0].c;
}

async function getUserByUsername(username) {
  await ready;
  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return rows[0] || null;
}

async function getUserById(id) {
  await ready;
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] || null;
}

async function listUsers() {
  await ready;
  const { rows } = await pool.query(
    'SELECT id, username, nome, role, criado_em AS "criadoEm" FROM users ORDER BY criado_em ASC'
  );
  return rows;
}

function createUser({ username, passwordHash, nome, role }) {
  return (async () => {
    await ready;
    const id = randomUUID();
    const criadoEm = Date.now();
    try {
      await pool.query(
        'INSERT INTO users (id, username, password_hash, nome, role, criado_em) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, username, passwordHash, nome || username, role, criadoEm]
      );
    } catch (err) {
      if (err.code === '23505') throw new Error('Já existe um usuário com esse nome de usuário.');
      throw err;
    }
    return { id, username, nome: nome || username, role, criadoEm };
  })();
}

module.exports = {
  listMeetings,
  addMeeting,
  updateMeeting,
  deleteMeeting,
  seedDemoMeetings,
  clearDemoMeetings,
  getDismissedAlerts,
  setDismissedAlerts,
  countUsers,
  getUserByUsername,
  getUserById,
  listUsers,
  createUser
};
