@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo O Node.js nao foi encontrado neste computador.
  echo Baixe e instale em: https://nodejs.org/ - versao 18 ou mais recente.
  echo Depois, feche esta janela e clique 2x neste arquivo de novo.
  echo.
  pause
  exit /b 1
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo.
  echo Criei o arquivo .env nesta pasta, a partir do exemplo.
  echo Antes de continuar, abra o arquivo .env com o Bloco de Notas e preencha:
  echo   ANTHROPIC_API_KEY=sua chave aqui
  echo   ASSEMBLYAI_API_KEY=sua chave aqui
  echo.
  echo Salve o arquivo .env e clique 2x neste script de novo.
  echo.
  pause
  exit /b 0
)

if not exist "node_modules" (
  echo Instalando dependencias pela primeira vez, isso pode levar um minuto...
  echo.
  call npm install
  if errorlevel 1 (
    echo.
    echo Falha ao instalar as dependencias. Verifique sua conexao com a internet e tente de novo.
    pause
    exit /b 1
  )
)

echo.
echo ============================================
echo   Iniciando o Pauta...
echo   Quando aparecer a mensagem de servidor rodando,
echo   abra http://localhost:3000 no navegador.
echo   Para parar o programa, feche esta janela.
echo ============================================
echo.
call npm start

pause
