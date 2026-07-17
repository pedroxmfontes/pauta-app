const { randomUUID } = require('crypto');

// Jobs em memória: acompanham o progresso de "enviar áudio -> transcrever -> analisar".
// Suficiente para um servidor de instância única (uso self-hosted); se o processo
// reiniciar no meio de um job, ele se perde e o usuário precisa reenviar o áudio.
const jobs = new Map();
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hora

function createJob() {
  const id = randomUUID();
  jobs.set(id, { id, status: 'uploading', createdAt: Date.now() });
  return id;
}

function updateJob(id, patch) {
  const job = jobs.get(id);
  if (job) Object.assign(job, patch);
}

function getJob(id) {
  return jobs.get(id);
}

setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > MAX_AGE_MS) jobs.delete(id);
  }
}, 10 * 60 * 1000).unref();

module.exports = { createJob, updateJob, getJob };
