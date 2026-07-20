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

/* ============================================================
   TOOLS — schemas fixos que a IA deve preencher (tool use).
   Isso substitui o antigo formato de "responda em JSON puro".
============================================================ */
const CORE_TOOL = {
  name: 'reportar_analise_reuniao',
  description: 'Reporta a análise estruturada de uma reunião corporativa a partir da transcrição.',
  input_schema: {
    type: 'object',
    properties: {
      resumo_executivo: { type: 'string', description: '2 a 4 frases sobre objetivo, discussão e desfecho' },
      topicos: { type: 'array', items: { type: 'string' }, description: 'até 5 tópicos curtos' },
      decisoes: { type: 'array', items: { type: 'string' }, description: 'até 5 decisões tomadas, frases curtas' },
      tarefas: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            tarefa: { type: 'string' },
            responsavel: { type: 'string', description: "nome ou 'não definido'" },
            prazo: { type: 'string', description: "ou 'não definido'" },
            critica: { type: 'boolean' }
          },
          required: ['tarefa', 'responsavel', 'prazo', 'critica']
        }
      },
      palavras_chave: { type: 'array', items: { type: 'string' }, description: 'até 6' },
      clientes_citados: { type: 'array', items: { type: 'string' }, description: 'lista vazia se nenhum' },
      produtos_ou_projetos_citados: { type: 'array', items: { type: 'string' }, description: 'lista vazia se nenhum' },
      sentimento: {
        type: 'object',
        properties: {
          geral: { type: 'string', enum: ['positivo', 'neutro', 'negativo', 'misto'] },
          resumo: { type: 'string', description: 'uma frase curta' }
        },
        required: ['geral', 'resumo']
      },
      riscos: {
        type: 'array',
        description: "Riscos reais mencionados ou implícitos na conversa (atrasos, orçamento, fornecedor, cliente insatisfeito, falta de equipe, etc). Lista vazia se nenhum risco real identificado.",
        items: {
          type: 'object',
          properties: {
            descricao: { type: 'string', description: 'frase curta descrevendo o risco' },
            prioridade: { type: 'string', enum: ['baixo', 'medio', 'alto', 'critico'] }
          },
          required: ['descricao', 'prioridade']
        }
      }
    },
    required: ['resumo_executivo', 'topicos', 'decisoes', 'tarefas', 'palavras_chave', 'clientes_citados', 'produtos_ou_projetos_citados', 'sentimento', 'riscos']
  }
};

const INTEL_TOOL = {
  name: 'reportar_indicadores_reuniao',
  description: 'Reporta os indicadores de qualidade e produtividade de uma reunião.',
  input_schema: {
    type: 'object',
    properties: {
      score: {
        type: 'object',
        properties: {
          produtividade: { type: 'integer' }, objetividade: { type: 'integer' }, clareza: { type: 'integer' },
          engajamento: { type: 'integer' }, tomada_decisao: { type: 'integer' }, execucao: { type: 'integer' }, comunicacao: { type: 'integer' }
        },
        required: ['produtividade', 'objetividade', 'clareza', 'engajamento', 'tomada_decisao', 'execucao', 'comunicacao'],
        description: 'cada campo de 0 a 100'
      },
      tempo: {
        type: 'object',
        properties: {
          produtivo_pct: { type: 'integer' }, conversa_paralela_pct: { type: 'integer' },
          repeticao_pct: { type: 'integer' }, sem_conclusao_pct: { type: 'integer' }
        },
        required: ['produtivo_pct', 'conversa_paralela_pct', 'repeticao_pct', 'sem_conclusao_pct'],
        description: 'porcentagens de 0 a 100 que devem somar aproximadamente 100'
      },
      coach: { type: 'array', items: { type: 'string' }, description: 'até 4 recomendações curtas e específicas para melhorar a próxima reunião' }
    },
    required: ['score', 'tempo', 'coach']
  }
};

const INSIGHTS_TOOL = {
  name: 'reportar_insights_entre_reunioes',
  description: 'Reporta padrões, riscos e oportunidades identificados ao cruzar várias reuniões.',
  input_schema: {
    type: 'object',
    properties: {
      tendencias: { type: 'array', items: { type: 'string' }, description: 'até 3 tendências observadas ao longo das reuniões' },
      riscos: { type: 'array', items: { type: 'string' }, description: 'até 3 riscos ou gargalos identificados' },
      oportunidades: { type: 'array', items: { type: 'string' }, description: 'até 3 oportunidades de melhoria' },
      assuntos_recorrentes: { type: 'array', items: { type: 'string' }, description: 'até 3 temas ou problemas que se repetem em várias reuniões' },
      proxima_acao: { type: 'string', description: 'uma única recomendação concreta e específica, a mais importante de todas' }
    },
    required: ['tendencias', 'riscos', 'oportunidades', 'assuntos_recorrentes', 'proxima_acao']
  }
};

const SEARCH_TOOL = {
  name: 'reportar_resposta_pesquisa',
  description: 'Reporta a resposta a uma pergunta sobre o histórico de reuniões, citando as fontes usadas.',
  input_schema: {
    type: 'object',
    properties: {
      resposta: { type: 'string', description: 'resposta direta e objetiva' },
      confianca: { type: 'string', enum: ['alta', 'media', 'baixa'] },
      fontes: {
        type: 'array',
        description: 'no máximo 3 fontes, só as realmente relevantes',
        items: {
          type: 'object',
          properties: {
            titulo: { type: 'string', description: 'título exato de uma reunião relevante' },
            trecho: { type: 'string', description: 'trecho ou paráfrase curta que embasa a resposta' }
          },
          required: ['titulo', 'trecho']
        }
      }
    },
    required: ['resposta', 'confianca', 'fontes']
  }
};

/* ============================================================
   PROMPTS — instruções de comportamento. O formato de saída
   já é garantido pelo schema da tool, então o texto foca só
   em COMO a IA deve pensar sobre o conteúdo.

   O bloco de transcrição fica separado das instruções e é marcado
   como "cacheable": as chamadas core/intel usam o MESMO bloco de
   transcrição e a MESMA lista de tools, então a segunda chamada
   reaproveita o cache de prompt escrito pela primeira (a transcrição
   é o maior custo em tokens de cada análise, e hoje é enviada duas vezes).
============================================================ */
function buildTranscriptBlock(transcricao) {
  return { text: `Transcrição da reunião:\n"""\n${transcricao}\n"""`, cacheable: true };
}

function buildCoreInstructions({ titulo, participantesInformados, temasConhecidos }) {
  return { text: `Você é um analista de reuniões corporativas de nível executivo. Leia a transcrição acima e preencha os dados da análise com a ferramenta "reportar_analise_reuniao".

Marque "critica": true só para tarefas realmente urgentes ou de alto impacto (prazos apertados, risco financeiro, cliente insatisfeito). Não invente decisões, tarefas, clientes ou riscos que não estão no texto — use listas vazias quando não houver.
Para "riscos", identifique apenas sinais reais de risco ao negócio (atrasos, estouro de orçamento, fornecedor não respondendo, cliente insatisfeito, falta de equipe, dependência crítica não resolvida). Não crie risco a partir de conversa neutra.
${temasConhecidos.length ? `
Estes tópicos já foram usados em reuniões anteriores da mesma empresa: ${temasConhecidos.join(', ')}.
Se algum assunto desta reunião for o mesmo de algum desses tópicos, reutilize EXATAMENTE a mesma grafia (mesmas palavras, sem sinônimos) em "topicos", para manter consistência no histórico. Só use uma grafia nova se o assunto realmente for diferente.` : ''}

Título: ${titulo}
Participantes informados: ${participantesInformados || 'não informado'}` };
}

function buildIntelInstructions({ resumo, decisoesCount, tarefasCount }) {
  return { text: `Você é um consultor de produtividade corporativa, rigoroso e realista (não dê notas altas por padrão). Com base no resumo e na transcrição acima, preencha os indicadores com a ferramenta "reportar_indicadores_reuniao".

Resumo: ${resumo}
Decisões tomadas: ${decisoesCount}
Tarefas identificadas: ${tarefasCount}` };
}

function buildInsightsBlock(dados) {
  return {
    text: `Você é um analista de inteligência de negócios. Abaixo está um conjunto de dados de reuniões da mesma empresa. Preencha os insights com a ferramenta fornecida.

Dados:
${JSON.stringify(dados)}`,
    cacheable: true
  };
}

function buildSearchDadosBlock(dados) {
  return {
    text: `Você é um assistente que responde perguntas sobre um histórico de reuniões corporativas. Use apenas os dados fornecidos. Se a resposta não estiver nos dados, diga isso claramente e use confiança "baixa".

Dados das reuniões:
${JSON.stringify(dados)}`,
    cacheable: true
  };
}

function buildSearchQuestionBlock(query) {
  return { text: `Pergunta: ${query}` };
}

module.exports = {
  getKnownThemes,
  buildTranscriptBlock, buildCoreInstructions, buildIntelInstructions,
  buildInsightsBlock, buildSearchDadosBlock, buildSearchQuestionBlock,
  CORE_TOOL, INTEL_TOOL, INSIGHTS_TOOL, SEARCH_TOOL
};
