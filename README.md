# Pauta — Inteligência de reuniões

Envie a gravação de uma reunião, o site transcreve automaticamente (com identificação de quem falou) e gera score de produtividade, decisões, tarefas por responsável, alertas e insights entre reuniões.

Esta é a versão reescrita para rodar como um app de verdade, fora do ambiente de Artifacts do claude.ai:
- As chaves de API ficam **só no servidor** (nunca no navegador).
- Os dados são persistidos em disco (`data/db.json`), não dependem de `window.storage`.
- O upload de áudio + transcrição automática (via AssemblyAI) substitui a colagem manual de transcrição — a opção de colar texto continua disponível como alternativa.

## Colocar no ar com um link grátis (recomendado se você quer mandar pra alguém testar)

Isso publica o app na internet de graça, num endereço tipo `https://pauta-app-xxxx.onrender.com`. Quem receber esse link só clica e abre — não precisa instalar nada. É a opção mais simples, mas tem uma troca: como é gratuito, se ninguém usar o site por 15 minutos ele "dorme" e demora uns 30-60 segundos pra acordar da próxima vez — e as reuniões analisadas se perdem nesse processo. Para um teste com um amigo, isso costuma ser um bom negócio.

**Passo 1 — Colocar o código no GitHub** (site gratuito para guardar código; se você já tem conta, pule para o passo 2):
1. Crie uma conta em [github.com](https://github.com/) (botão "Sign up").
2. Depois de logado, clique no `+` no canto superior direito → **New repository**.
3. Dê um nome (ex: `pauta-app`), deixe como **Public**, e clique em **Create repository**.
4. Na página do repositório, clique em **Add file → Upload files**.
5. Extraia o `pauta-app.zip` no seu computador e arraste **todos os arquivos e pastas de dentro dele** (não o zip em si) para essa página.
6. Clique em **Commit changes** lá embaixo.

**Passo 2 — Publicar no Render:**
1. Copie a URL do repositório que você acabou de criar (ex: `https://github.com/seu-usuario/pauta-app`).
2. Acesse este link, substituindo a parte final pela URL que você copiou:
   `https://render.com/deploy?repo=https://github.com/seu-usuario/pauta-app`
3. Faça login (o botão "GitHub" já resolve, já que você acabou de criar a conta lá).
4. O Render vai mostrar uma tela pedindo duas informações: sua chave da **Anthropic** e da **AssemblyAI**. Cole cada uma no campo correspondente.
5. Clique em **Deploy Blueprint** (ou **Apply**) e aguarde alguns minutos.
6. Quando terminar, o Render mostra o link do seu site (algo como `https://pauta-app-xxxx.onrender.com`). É esse link que você manda pro seu amigo.

## Pré-requisitos (para rodar localmente, sem publicar na internet)

- [Node.js](https://nodejs.org/) 18 ou mais recente (usa `fetch` nativo). Baixe e instale antes de continuar.
- Uma chave de API da **Anthropic** (Claude) — [console.anthropic.com](https://console.anthropic.com/).
- Uma chave de API da **AssemblyAI** (transcrição + separação de locutores) — [assemblyai.com](https://www.assemblyai.com/). Tem crédito grátis para testar.

## Jeito mais simples de rodar (recomendado para quem não mexe com código)

1. Instale o [Node.js](https://nodejs.org/) (basta seguir o instalador, próximo → próximo → concluir).
2. Dê **dois cliques** em `iniciar.bat` (Windows) — ou rode `./iniciar.sh` no Terminal (Mac/Linux).
3. Na primeira vez, o script vai criar o arquivo `.env` e pedir para você preencher as chaves de API nele (abra com o Bloco de Notas). Salve o arquivo e rode o script de novo.
4. Da segunda vez em diante, ele já instala tudo o que falta sozinho e sobe o servidor.
5. Quando aparecer "Pauta rodando em http://localhost:3000" no terminal, abra esse endereço no navegador.

Enquanto o terminal estiver aberto, o site funciona. Fechar a janela do terminal desliga o site.

## Instalação manual (alternativa)

```bash
cd pauta-app
npm install
cp .env.example .env
```

Edite o `.env` e preencha:

```
ANTHROPIC_API_KEY=sk-ant-...
ASSEMBLYAI_API_KEY=...
```

## Rodando

```bash
npm start
```

Acesse `http://localhost:3000`.

## Como funciona o fluxo de nova reunião

1. **Enviar gravação** (padrão): o usuário sobe o arquivo de áudio (mp3, wav, m4a, ogg, webm — até 300MB) e, opcionalmente, os nomes dos participantes na ordem em que costumam falar.
   - O servidor sobe o áudio para a AssemblyAI, pede a transcrição com separação de locutores (`speaker_labels`), espera terminar, mapeia "Locutor A/B/C" para os nomes informados (na ordem de primeira fala) e só então manda o texto para o Claude analisar.
   - Isso acontece em background: o front-end recebe um `jobId` na hora e fica consultando `/api/meetings/jobs/:id` a cada poucos segundos, mostrando o progresso (enviando → transcrevendo → analisando).
   - A duração da reunião é detectada automaticamente a partir do áudio, caso o campo não seja preenchido.
2. **Colar transcrição**: mantém o fluxo original, para quem já tem uma transcrição pronta de outra ferramenta.

## Arquitetura

```
pauta-app/
  iniciar.bat              → clique duplo pra rodar no Windows (instala e sobe tudo sozinho)
  iniciar.sh                → equivalente para Mac/Linux
  server/
    index.js              → app Express, serve o front-end e as rotas /api/*
    jobs.js                → jobs em memória (progresso de transcrição+análise)
    services/
      store.js             → persistência em data/db.json (fila de escrita simples)
      anthropic.js          → chamada ao Claude (chave só no servidor)
      assemblyai.js         → upload de áudio, transcrição e diarização
      prompts.js            → prompts usados nas chamadas ao Claude
    routes/
      meetings.js           → CRUD de reuniões, upload de áudio, análise manual
      insights.js           → padrões entre reuniões (POST /api/insights)
      search.js             → busca em linguagem natural (POST /api/search)
      alerts.js             → alertas dispensados (GET/PUT /api/dismissed-alerts)
  public/
    index.html              → shell da aplicação (mesma UI/design original)
    app.js                  → toda a lógica de front-end (SPA sem framework)
  data/
    db.json                 → criado automaticamente na primeira execução
```

## Limitações conhecidas (é um MVP de uso único)

- **Um único "espaço de trabalho"**: não há login nem separação por cliente/empresa. Se no futuro você quiser vender para várias empresas com dados isolados, isso exige adicionar autenticação e trocar `data/db.json` por um banco de dados real (Postgres, por exemplo) — vale pedir essa evolução quando chegar a hora.
- **Armazenamento em arquivo JSON**: simples e suficiente para o volume de um único negócio, mas não é feito para alta concorrência. Para escalar, trocar por SQLite/Postgres.
- **Upload de áudio fica em memória** durante o processamento (limite de 300MB). Para arquivos maiores ou muito tráfego simultâneo, migrar para upload direto em disco/streaming.
- **Sem fila persistente de jobs**: se o servidor reiniciar no meio de uma transcrição, aquele job específico se perde (o usuário precisa reenviar). Para produção mais robusta, isso poderia usar uma fila persistente (ex: SQLite table ou Redis).
- Os custos de Anthropic e AssemblyAI são cobrados por uso — acompanhe o consumo nos painéis de cada serviço.
