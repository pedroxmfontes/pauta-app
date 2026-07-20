const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Chama o Claude forçando o uso de uma "tool" com schema fixo (tool use / structured output),
 * em vez de pedir JSON em prosa — a resposta já vem parseada e no formato esperado.
 *
 * `content` é um array de blocos de texto. Um bloco pode trazer `cacheable: true` para marcar
 * um ponto de cache de prompt (útil quando o mesmo conteúdo grande, como uma transcrição, é
 * reenviado em mais de uma chamada — a Anthropic cobra bem menos por tokens lidos do cache).
 * `tools` é a lista de ferramentas disponíveis nessa chamada; `toolName` força qual delas usar.
 * Passar a MESMA lista de tools e o MESMO bloco cacheável em chamadas em sequência é o que
 * permite a segunda chamada reaproveitar o cache escrito pela primeira.
 *
 * A chave de API nunca sai do servidor — o front-end só chama nossas próprias rotas.
 */
async function callClaude({ content, tools, toolName, maxTokens = 1500 }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY não está configurada no servidor (veja o arquivo .env).');
  }
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

  const messageContent = content.map(block => {
    const out = { type: 'text', text: block.text };
    if (block.cacheable) out.cache_control = { type: 'ephemeral' };
    return out;
  });

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
        messages: [{ role: 'user', content: messageContent }],
        tools,
        tool_choice: { type: 'tool', name: toolName }
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
