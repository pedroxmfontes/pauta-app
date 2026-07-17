#!/usr/bin/env bash
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "O Node.js não foi encontrado neste computador."
  echo "Baixe e instale em: https://nodejs.org/ (versão 18 ou mais recente)"
  echo "Depois, rode este script de novo."
  echo ""
  exit 1
fi

if [ ! -f ".env" ]; then
  cp ".env.example" ".env"
  echo ""
  echo "Criei o arquivo .env nesta pasta, a partir do exemplo."
  echo "Antes de continuar, abra o arquivo .env em um editor de texto e preencha:"
  echo "  ANTHROPIC_API_KEY=sua chave aqui"
  echo "  ASSEMBLYAI_API_KEY=sua chave aqui"
  echo ""
  echo "Salve o arquivo .env e rode este script de novo."
  echo ""
  exit 0
fi

if [ ! -d "node_modules" ]; then
  echo "Instalando dependências pela primeira vez, isso pode levar um minuto..."
  npm install || { echo "Falha ao instalar as dependências."; exit 1; }
fi

echo ""
echo "============================================"
echo "  Iniciando o Pauta..."
echo "  Quando aparecer a mensagem de servidor rodando,"
echo "  abra http://localhost:3000 no navegador."
echo "  Para parar o programa, aperte Ctrl+C."
echo "============================================"
echo ""
npm start
