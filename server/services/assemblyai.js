const UPLOAD_URL = 'https://api.assemblyai.com/v2/upload';
const TRANSCRIPT_URL = 'https://api.assemblyai.com/v2/transcript';

function getApiKey() {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error('ASSEMBLYAI_API_KEY não está configurada no servidor (veja o arquivo .env).');
  return apiKey;
}

/** Sobe o áudio (buffer) para a AssemblyAI e retorna a URL temporária de upload. */
async function uploadAudio(buffer) {
  const apiKey = getApiKey();
  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    headers: { authorization: apiKey },
    body: buffer
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Falha ao enviar o áudio para transcrição (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.upload_url;
}

/** Pede a transcrição com separação de locutores (diarização) em português. */
async function requestTranscript(audioUrl) {
  const apiKey = getApiKey();
  const res = await fetch(TRANSCRIPT_URL, {
    method: 'POST',
    headers: { authorization: apiKey, 'content-type': 'application/json' },
    body: JSON.stringify({
      audio_url: audioUrl,
      speaker_labels: true,
      language_code: 'pt'
    })
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Falha ao iniciar a transcrição (${res.status}): ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.id;
}

/** Consulta o status da transcrição até terminar (completed) ou falhar (error). */
async function pollTranscript(id, { onTick, intervalMs = 3000, timeoutMs = 30 * 60 * 1000 } = {}) {
  const apiKey = getApiKey();
  const start = Date.now();
  while (true) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('A transcrição demorou demais e foi interrompida. Tente novamente com um áudio mais curto.');
    }
    const res = await fetch(`${TRANSCRIPT_URL}/${id}`, { headers: { authorization: apiKey } });
    if (!res.ok) throw new Error(`Falha ao consultar a transcrição (${res.status}).`);
    const data = await res.json();
    if (data.status === 'completed') return data;
    if (data.status === 'error') throw new Error('Erro ao transcrever o áudio: ' + (data.error || 'motivo desconhecido.'));
    if (onTick) onTick(data.status);
    await new Promise(r => setTimeout(r, intervalMs));
  }
}

/**
 * Monta o texto da transcrição no formato "Nome: fala", mapeando os locutores
 * detectados automaticamente (A, B, C...) para os nomes informados pelo usuário,
 * na ordem em que cada um fala pela primeira vez. Isso reaproveita a mesma
 * análise de participação que o app já fazia a partir de transcrições manuais.
 */
function buildTranscriptText(transcriptData, participantNames = []) {
  const utterances = transcriptData.utterances || [];
  if (!utterances.length) {
    return { text: transcriptData.text || '', speakerMap: {} };
  }
  const speakerMap = {};
  let nextIdx = 0;
  const lines = utterances.map(u => {
    if (!(u.speaker in speakerMap)) {
      speakerMap[u.speaker] = participantNames[nextIdx] || `Locutor ${u.speaker}`;
      nextIdx++;
    }
    return `${speakerMap[u.speaker]}: ${u.text}`;
  });
  return { text: lines.join('\n'), speakerMap };
}

module.exports = { uploadAudio, requestTranscript, pollTranscript, buildTranscriptText };
