/** Tópicos mais frequentes já vistos no histórico, para a IA reusar a mesma grafia em vez de criar variações do mesmo tema. */
function getKnownThemes(meetings, limit = 20) {
  const freq = {};
  meetings.forEach(m => (m.analise?.topicos || []).forEach(t => {
    const k = (t || '').trim();
    if (!k) return;
    freq[k] = (freq[k] || 0) + 1;
  }));
  return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([k]) => k);
}

function buildCorePrompt({ titulo, participantesInformados, transcricao, temasConhecidos }) {
  return `Você é um analista de reuniões corporativas de nível executivo. Leia a transcrição e responda APENAS com JSON válido, sem markdown, sem crases, sem texto antes ou depois, em português do Brasil.

{
  "resumo_executivo": "2 a 4 frases sobre objetivo, discussão e desfecho",
  "topicos": ["até 5 tópicos curtos"],
  "decisoes": ["até 5 decisões tomadas, frases curtas"],
  "tarefas": [{"tarefa":"curta", "responsavel":"nome ou 'não definido'", "prazo":"ou 'não definido'", "critica": true ou false}],
  "palavras_chave": ["até 6"],
  "clientes_citados": ["até 4, lista vazia se nenhum"],
  "produtos_ou_projetos_citados": ["até 4, lista vazia se nenhum"],
  "sentimento": {"geral":"positivo|neutro|negativo|misto", "resumo":"uma frase curta"}
}

Marque "critica": true só para tarefas realmente urgentes ou de alto impacto (prazos apertados, risco financeiro, cliente insatisfeito). Não invente decisões, tarefas ou clientes que não estão no texto — use listas vazias quando não houver.
${temasConhecidos.length ? `
Estes tópicos já foram usados em reuniões anteriores da mesma empresa: ${temasConhecidos.join(', ')}.
Se algum assunto desta reunião for o mesmo de algum desses tópicos, reutilize EXATAMENTE a mesma grafia (mesmas palavras, sem sinônimos) em "topicos", para manter consistência no histórico. Só use uma grafia nova se o assunto realmente for diferente.` : ''}

Título: ${titulo}
Participantes informados: ${participantesInformados || 'não informado'}

Transcrição:
"""
${transcricao}
"""`;
}

function buildIntelPrompt({ resumo, decisoesCount, tarefasCount, transcricao }) {
  return `Você é um consultor de produtividade corporativa, rigoroso e realista (não dê notas altas por padrão). Com base no resumo e na transcrição abaixo, responda APENAS com JSON válido, sem markdown, em português do Brasil:

{
  "score": {"produtividade":0-100,"objetividade":0-100,"clareza":0-100,"engajamento":0-100,"tomada_decisao":0-100,"execucao":0-100,"comunicacao":0-100},
  "tempo": {"produtivo_pct":0-100,"conversa_paralela_pct":0-100,"repeticao_pct":0-100,"sem_conclusao_pct":0-100},
  "coach": ["até 4 recomendações curtas e específicas para melhorar a próxima reunião"]
}

As quatro porcentagens de "tempo" devem somar aproximadamente 100.

Resumo: ${resumo}
Decisões tomadas: ${decisoesCount}
Tarefas identificadas: ${tarefasCount}

Transcrição:
"""
${transcricao}
"""`;
}

function buildInsightsPrompt(dados) {
  return `Você é um analista de inteligência de negócios. Abaixo está um conjunto de dados de reuniões da mesma empresa. Responda APENAS com JSON válido, sem markdown, em português do Brasil:

{
  "tendencias": ["até 3 tendências observadas ao longo das reuniões"],
  "riscos": ["até 3 riscos ou gargalos identificados"],
  "oportunidades": ["até 3 oportunidades de melhoria"],
  "assuntos_recorrentes": ["até 3 temas ou problemas que se repetem em várias reuniões"],
  "proxima_acao": "uma única recomendação concreta e específica, a mais importante de todas"
}

Dados:
${JSON.stringify(dados)}`;
}

function buildSearchPrompt(query, dados) {
  return `Você é um assistente que responde perguntas sobre um histórico de reuniões corporativas. Use apenas os dados fornecidos. Se a resposta não estiver nos dados, diga isso claramente e use confianca "baixa". Responda APENAS com JSON, sem markdown, em português do Brasil:

{"resposta":"resposta direta e objetiva", "confianca":"alta|media|baixa", "fontes":[{"titulo":"título exato de uma reunião relevante", "trecho":"trecho ou paráfrase curta que embasa a resposta"}]}

Inclua no máximo 3 fontes, só as realmente relevantes.

Pergunta: ${query}

Dados das reuniões:
${JSON.stringify(dados)}`;
}

module.exports = { getKnownThemes, buildCorePrompt, buildIntelPrompt, buildInsightsPrompt, buildSearchPrompt };
