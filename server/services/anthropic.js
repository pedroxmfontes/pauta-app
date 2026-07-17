const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Chama o Claude com um prompt que pede JSON puro de volta.
 * A chave de API nunca sai do servidor — o front-end só chama nossas próprias rotas.
 */
async function callClaude(prompt, { maxTokens = 1500 } = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY não está configurada no servidor (veja o arquivo .env).');
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

  let response;
  try {
    response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      })
    });
  } catch (e) {
    throw new Error('Não foi possível conectar à API da Anthropic: ' + e.message);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Falha na chamada da API Anthropic (${response.status}): ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  const textBlock = (data.content || []).find(b => b.type === 'text');
  if (!textBlock) throw new Error('A resposta da IA veio sem conteúdo de texto.');

  const clean = textBlock.text.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    throw new Error('A IA retornou um JSON inválido ou incompleto (talvez a reunião seja longa demais). Tente novamente.');
  }
}

module.exports = { callClaude };
