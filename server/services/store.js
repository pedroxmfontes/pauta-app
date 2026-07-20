const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Fila simples para serializar leitura+escrita e evitar corromper o arquivo
// quando duas operações tentam salvar ao mesmo tempo.
let writeQueue = Promise.resolve();
function serialize(task) {
  const run = writeQueue.then(task, task);
  writeQueue = run.then(() => {}, () => {});
  return run;
}

async function ensureDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify({ meetings: [], dismissedAlerts: [] }, null, 2), 'utf-8');
  }
}

async function readDb() {
  await ensureDb();
  const raw = await fs.readFile(DB_FILE, 'utf-8');
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.meetings)) parsed.meetings = [];
    if (!Array.isArray(parsed.dismissedAlerts)) parsed.dismissedAlerts = [];
    return parsed;
  } catch {
    return { meetings: [], dismissedAlerts: [] };
  }
}

async function writeDb(db) {
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

async function listMeetings() {
  const db = await readDb();
  return db.meetings;
}

function addMeeting(partial) {
  return serialize(async () => {
    const db = await readDb();
    const numero = db.meetings.length ? Math.max(...db.meetings.map(m => m.numero || 0)) + 1 : 1;
    const meeting = { id: randomUUID(), numero, criadoEm: Date.now(), ...partial };
    db.meetings.push(meeting);
    await writeDb(db);
    return meeting;
  });
}

function updateMeeting(id, updater) {
  return serialize(async () => {
    const db = await readDb();
    const idx = db.meetings.findIndex(m => m.id === id);
    if (idx === -1) throw new Error('Reunião não encontrada.');
    db.meetings[idx] = updater(db.meetings[idx]);
    await writeDb(db);
    return db.meetings[idx];
  });
}

function deleteMeeting(id) {
  return serialize(async () => {
    const db = await readDb();
    const before = db.meetings.length;
    db.meetings = db.meetings.filter(m => m.id !== id);
    if (db.meetings.length === before) throw new Error('Reunião não encontrada.');
    await writeDb(db);
  });
}

/** Insere reuniões de demonstração já analisadas (sem passar pela IA), marcadas com demo:true. */
function seedDemoMeetings(demoMeetings) {
  return serialize(async () => {
    const db = await readDb();
    let nextNumero = db.meetings.length ? Math.max(...db.meetings.map(m => m.numero || 0)) + 1 : 1;
    const inserted = demoMeetings.map(partial => {
      const meeting = { id: randomUUID(), numero: nextNumero++, demo: true, ...partial };
      db.meetings.push(meeting);
      return meeting;
    });
    await writeDb(db);
    return inserted;
  });
}

/** Remove só as reuniões de demonstração (demo:true), preservando reuniões reais. */
function clearDemoMeetings() {
  return serialize(async () => {
    const db = await readDb();
    const before = db.meetings.length;
    db.meetings = db.meetings.filter(m => !m.demo);
    await writeDb(db);
    return before - db.meetings.length;
  });
}

async function getDismissedAlerts() {
  const db = await readDb();
  return db.dismissedAlerts;
}

function setDismissedAlerts(ids) {
  return serialize(async () => {
    const db = await readDb();
    db.dismissedAlerts = Array.isArray(ids) ? ids : [];
    await writeDb(db);
  });
}

module.exports = {
  listMeetings,
  addMeeting,
  updateMeeting,
  deleteMeeting,
  seedDemoMeetings,
  clearDemoMeetings,
  getDismissedAlerts,
  setDismissedAlerts
};
