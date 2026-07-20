/**
 * Dados de demonstração de uma empresa fictícia ("Nébula Tech"), já totalmente
 * analisados — inseridos direto no banco, sem chamar a IA, então carregar o
 * exemplo não consome crédito de API nenhum. Servem só pra quem abre o site
 * pela primeira vez ver o produto funcionando antes de subir uma reunião real.
 */
const DAY = 24 * 60 * 60 * 1000;

function buildDemoMeetings() {
  const now = Date.now();

  return [
    {
      titulo: '[Exemplo] Kickoff — Expansão para o mercado corporativo',
      participantes: ['Camila', 'Bruno', 'Rafael', 'Juliana'],
      duracaoMin: 38,
      criadoEm: now - 21 * DAY,
      transcricao: `Camila: Bom dia! Vamos alinhar o plano de expansão pro mercado corporativo esse trimestre.
Bruno: Já mapeei 12 contas-alvo. Acho que dá pra começar por 3 delas esse mês.
Rafael: Concordo, mas precisamos ter a proposta comercial pronta antes. Eu cuido disso até sexta.
Juliana: Combinado. E o time de sucesso do cliente já sabe que vem volume novo chegando?
Camila: Ainda não, vou avisar o Bruno pra alinhar com eles essa semana.
Rafael: O maior risco aqui é a integração com o CRM do cliente — já tivemos problema parecido antes.
Juliana: Boa observação, vamos monitorar isso de perto nas próximas reuniões.`,
      analise: {
        resumo_executivo: 'A equipe alinhou o plano de expansão para o mercado corporativo, definindo 3 contas-alvo prioritárias para o mês e a necessidade de uma proposta comercial pronta até sexta-feira. Foi levantado o risco de integração com sistemas de CRM de clientes corporativos, um problema já enfrentado anteriormente.',
        topicos: ['Expansão para mercado corporativo', 'Integração com CRM', 'Contas-alvo prioritárias'],
        decisoes: ['Priorizar 3 das 12 contas-alvo mapeadas para o primeiro mês', 'Preparar proposta comercial específica para contas corporativas'],
        tarefas: [
          { tarefa: 'Preparar proposta comercial para contas corporativas', responsavel: 'Rafael', prazo: 'sexta-feira', critica: false, concluida: true },
          { tarefa: 'Avisar o time de sucesso do cliente sobre o volume novo', responsavel: 'Bruno', prazo: 'esta semana', critica: false, concluida: true }
        ],
        palavras_chave: ['expansão', 'corporativo', 'CRM', 'contas-alvo', 'proposta comercial'],
        clientes_citados: [],
        produtos_ou_projetos_citados: ['Expansão corporativa'],
        sentimento: { geral: 'positivo', resumo: 'Time animado com a nova fase de expansão.' },
        riscos: [
          { descricao: 'Integração com CRM de clientes corporativos já causou problemas no passado', prioridade: 'medio', status: 'aberto' }
        ],
        score: { produtividade: 78, objetividade: 75, clareza: 80, engajamento: 82, tomada_decisao: 76, execucao: 70, comunicacao: 79 },
        tempo: { produtivo_pct: 78, conversa_paralela_pct: 8, repeticao_pct: 6, sem_conclusao_pct: 8 },
        coach: [
          'Detalhar um plano de mitigação para o risco de integração com CRM antes que ele se repita',
          'Definir métricas de sucesso para as 3 contas-alvo prioritárias'
        ],
        participantes: [
          { nome: 'Camila', participacao_pct: 32, turnos: 3, tarefas_criadas: 0 },
          { nome: 'Rafael', participacao_pct: 28, turnos: 2, tarefas_criadas: 1 },
          { nome: 'Bruno', participacao_pct: 22, turnos: 2, tarefas_criadas: 1 },
          { nome: 'Juliana', participacao_pct: 18, turnos: 2, tarefas_criadas: 0 }
        ]
      }
    },
    {
      titulo: '[Exemplo] Acompanhamento semanal — Vendas e Onboarding',
      participantes: ['Camila', 'Bruno', 'Rafael'],
      duracaoMin: 30,
      criadoEm: now - 14 * DAY,
      transcricao: `Camila: Como estão as 3 contas prioritárias?
Bruno: Duas avançando bem, mas a conta da Vortex Log travou na integração com o CRM deles de novo.
Rafael: É o mesmo problema que já esperávamos. Vou escalar com o time técnico ainda hoje.
Camila: Isso é crítico, não podemos perder essa conta por causa disso.
Bruno: Também estou com muita coisa pendente de outras contas, preciso de ajuda pra distribuir.
Rafael: Eu assumo a integração da Vortex Log, você foca no restante.`,
      analise: {
        resumo_executivo: 'A reunião revisou o andamento das contas prioritárias e identificou que a integração com o CRM da conta Vortex Log travou novamente, repetindo um problema já antecipado. Rafael assumiu a resolução técnica, enquanto Bruno segue sobrecarregado com as demais contas.',
        topicos: ['Integração com CRM', 'Conta Vortex Log', 'Distribuição de carga de trabalho'],
        decisoes: ['Rafael assume a resolução técnica da integração da Vortex Log'],
        tarefas: [
          { tarefa: 'Escalar problema de integração da Vortex Log com o time técnico', responsavel: 'Rafael', prazo: 'hoje', critica: true, concluida: true },
          { tarefa: 'Redistribuir contas pendentes de Bruno', responsavel: 'Bruno', prazo: 'não definido', critica: false, concluida: false },
          { tarefa: 'Fazer follow-up comercial com a segunda conta prioritária', responsavel: 'Bruno', prazo: 'esta semana', critica: false, concluida: false },
          { tarefa: 'Preparar relatório de risco da conta Vortex Log', responsavel: 'Bruno', prazo: 'não definido', critica: false, concluida: false }
        ],
        palavras_chave: ['Vortex Log', 'CRM', 'integração', 'sobrecarga', 'contas prioritárias'],
        clientes_citados: ['Vortex Log'],
        produtos_ou_projetos_citados: ['Expansão corporativa'],
        sentimento: { geral: 'negativo', resumo: 'Frustração com a repetição do problema técnico.' },
        riscos: [
          { descricao: 'Integração com CRM da conta Vortex Log travada pela segunda vez, risco de perda da conta', prioridade: 'alto', status: 'aberto' }
        ],
        score: { produtividade: 62, objetividade: 68, clareza: 64, engajamento: 60, tomada_decisao: 65, execucao: 55, comunicacao: 60 },
        tempo: { produtivo_pct: 60, conversa_paralela_pct: 10, repeticao_pct: 22, sem_conclusao_pct: 8 },
        coach: [
          'Criar um checklist técnico padrão de integração de CRM para evitar repetição do mesmo problema',
          'Redistribuir a carga de Bruno formalmente, com prazos definidos'
        ],
        participantes: [
          { nome: 'Bruno', participacao_pct: 38, turnos: 3, tarefas_criadas: 3 },
          { nome: 'Rafael', participacao_pct: 34, turnos: 2, tarefas_criadas: 1 },
          { nome: 'Camila', participacao_pct: 28, turnos: 2, tarefas_criadas: 0 }
        ]
      }
    },
    {
      titulo: '[Exemplo] Acompanhamento semanal — Vendas e Onboarding',
      participantes: ['Camila', 'Bruno', 'Rafael', 'Juliana'],
      duracaoMin: 33,
      criadoEm: now - 7 * DAY,
      transcricao: `Camila: E a integração da Vortex Log, resolvemos?
Rafael: Ainda não, o time técnico disse que precisa de mais uma semana. É a terceira vez que discutimos isso.
Juliana: Isso já está virando um padrão preocupante, precisamos de um responsável fixo pra esse tipo de problema.
Bruno: Concordo, e eu continuo com muitas contas na mão, não consegui avançar nas pendências da semana passada.
Camila: Vamos definir isso até a próxima reunião, sem falta.`,
      analise: {
        resumo_executivo: 'A integração com o CRM da conta Vortex Log segue sem solução pela terceira reunião consecutiva, gerando preocupação sobre um padrão recorrente sem dono definido. Bruno continua sobrecarregado com pendências acumuladas de reuniões anteriores.',
        topicos: ['Integração com CRM', 'Conta Vortex Log', 'Sobrecarga de trabalho'],
        decisoes: [],
        tarefas: [
          { tarefa: 'Definir responsável fixo para problemas recorrentes de integração', responsavel: 'não definido', prazo: 'próxima reunião', critica: true, concluida: false },
          { tarefa: 'Redistribuir contas pendentes de Bruno', responsavel: 'Bruno', prazo: 'não definido', critica: false, concluida: false },
          { tarefa: 'Fazer follow-up comercial com a segunda conta prioritária', responsavel: 'Bruno', prazo: 'esta semana', critica: false, concluida: false }
        ],
        palavras_chave: ['Vortex Log', 'CRM', 'recorrente', 'sobrecarga'],
        clientes_citados: ['Vortex Log'],
        produtos_ou_projetos_citados: ['Expansão corporativa'],
        sentimento: { geral: 'negativo', resumo: 'Preocupação crescente com problema não resolvido.' },
        riscos: [
          { descricao: 'Integração da Vortex Log sem solução pela terceira semana consecutiva', prioridade: 'critico', status: 'aberto' },
          { descricao: 'Bruno sobrecarregado, acumulando pendências entre reuniões', prioridade: 'medio', status: 'aberto' }
        ],
        score: { produtividade: 50, objetividade: 55, clareza: 58, engajamento: 52, tomada_decisao: 40, execucao: 38, comunicacao: 56 },
        tempo: { produtivo_pct: 48, conversa_paralela_pct: 12, repeticao_pct: 32, sem_conclusao_pct: 8 },
        coach: [
          'Não deixar essa reunião terminar sem um responsável fixo definido — o problema já se repetiu 3 vezes',
          'Considerar trazer o time técnico diretamente para a próxima reunião, em vez de discutir por intermediários'
        ],
        participantes: [
          { nome: 'Camila', participacao_pct: 30, turnos: 3, tarefas_criadas: 1 },
          { nome: 'Rafael', participacao_pct: 26, turnos: 2, tarefas_criadas: 0 },
          { nome: 'Juliana', participacao_pct: 24, turnos: 2, tarefas_criadas: 0 },
          { nome: 'Bruno', participacao_pct: 20, turnos: 2, tarefas_criadas: 2 }
        ]
      }
    },
    {
      titulo: '[Exemplo] Revisão mensal de resultados',
      participantes: ['Camila', 'Bruno', 'Rafael', 'Juliana'],
      duracaoMin: 42,
      criadoEm: now - 1 * DAY,
      transcricao: `Camila: Boa notícia, o time técnico resolveu a integração da Vortex Log ontem, já está em produção.
Rafael: Isso, e definimos o Diego do time técnico como ponto focal fixo pra esse tipo de problema daqui pra frente.
Juliana: Ótimo. E as pendências do Bruno?
Bruno: Redistribuí duas contas com a Camila essa semana, já estou bem mais tranquilo.
Camila: Perfeito. Batemos a meta de 3 contas ativas esse mês, vamos comemorar isso com o time.
Rafael: Combinado, e já podemos planejar a próxima leva de contas-alvo pro mês que vem.`,
      analise: {
        resumo_executivo: 'A reunião trouxe boas notícias: a integração da conta Vortex Log foi resolvida e um ponto focal fixo foi definido para problemas técnicos recorrentes. A sobrecarga de Bruno foi aliviada com redistribuição de contas, e a meta de 3 contas ativas no mês foi atingida.',
        topicos: ['Integração com CRM', 'Meta mensal de contas', 'Planejamento do próximo mês'],
        decisoes: ['Diego, do time técnico, vira ponto focal fixo para problemas de integração', 'Planejar a próxima leva de contas-alvo para o mês seguinte'],
        tarefas: [
          { tarefa: 'Planejar próxima leva de contas-alvo', responsavel: 'Rafael', prazo: 'não definido', critica: false, concluida: false }
        ],
        palavras_chave: ['Vortex Log', 'meta mensal', 'ponto focal', 'planejamento'],
        clientes_citados: ['Vortex Log'],
        produtos_ou_projetos_citados: ['Expansão corporativa'],
        sentimento: { geral: 'positivo', resumo: 'Time aliviado e comemorando a meta batida.' },
        riscos: [],
        score: { produtividade: 85, objetividade: 82, clareza: 84, engajamento: 88, tomada_decisao: 80, execucao: 83, comunicacao: 86 },
        tempo: { produtivo_pct: 85, conversa_paralela_pct: 6, repeticao_pct: 3, sem_conclusao_pct: 6 },
        coach: [
          'Documentar o que funcionou na resolução da Vortex Log para replicar em problemas futuros',
          'Aproveitar o momento positivo para revisar metas do próximo trimestre com o time'
        ],
        participantes: [
          { nome: 'Camila', participacao_pct: 29, turnos: 3, tarefas_criadas: 0 },
          { nome: 'Rafael', participacao_pct: 27, turnos: 3, tarefas_criadas: 1 },
          { nome: 'Bruno', participacao_pct: 23, turnos: 2, tarefas_criadas: 0 },
          { nome: 'Juliana', participacao_pct: 21, turnos: 2, tarefas_criadas: 0 }
        ]
      }
    }
  ];
}

module.exports = { buildDemoMeetings };
