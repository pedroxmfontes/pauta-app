const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Chama o Claude forçando o uso de uma "tool" com schema fixo (tool use / structured output),
 * em vez de pedir JSON em prosa. Isso garante que a resposta já vem parseada e no formato
 * esperado, eliminando a necessidade de "arrancar" JSON de um texto livre (e os erros que
 * isso causava quando a IA envolvia a resposta em texto extra ou crases).
 * A chave de API nunca sai do servidor — o front-end só chama nossas próprias rotas.
 */
async function callClaude(prompt, tool, { maxTokens = 1500 } = {}) {
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
        messages: [{ role: 'user', content: prompt }],
        tools: [tool],
        tool_choice: { type: 'tool', name: tool.name }
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
  const toolBlock = (data.content || []).find(b => b.type === 'tool_use');
  if (!toolBlock) throw new Error('A resposta da IA não retornou os dados esperados. Tente novamente.');
  return toolBlock.input;
}

module.exports = { callClaude };
