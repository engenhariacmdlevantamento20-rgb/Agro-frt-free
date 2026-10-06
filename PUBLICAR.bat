@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem === Troque aqui se o nome do seu site no Netlify for outro ===
set SITE=shimmering-dodol-ff6e33

echo.
echo === Agro Frete: publicar no Netlify ===
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo Falta instalar o Node.js. Baixe a versao LTS em https://nodejs.org , instale e abra este arquivo de novo.
  pause
  exit /b 1
)

echo [1/3] Instalando pecas do sistema (pode demorar alguns minutos)...
call npm install
if errorlevel 1 goto erro

if exist ".netlify\state.json" (
  echo [2/3] Netlify ja conectado.
  goto publicar
)

echo.
echo [2/3] Conectando ao Netlify...
call npx --yes netlify-cli status >nul 2>nul
if errorlevel 1 (
  echo Vai abrir o navegador padrao do Windows: faca login e autorize.
  echo Se preferir outro navegador, copie o endereco https://app.netlify.com/authorize... que aparece aqui e cole no navegador que quiser.
  call npx --yes netlify-cli login
  if errorlevel 1 goto erro
)
call npx --yes netlify-cli link --name %SITE%
if not errorlevel 1 goto publicar

echo.
echo Nao achei o site "%SITE%" na conta do Netlify que esta logada neste computador.
echo Isso acontece quando o login salvo e de OUTRA conta ^(comum quando se usam varios navegadores^).
echo.
set /p TROCAR=Quer entrar com outra conta agora? Digite S e Enter. Ou so Enter para escolher o site numa lista: 
if /i "%TROCAR%"=="S" (
  call npx --yes netlify-cli logout
  call npx --yes netlify-cli login
  if errorlevel 1 goto erro
  call npx --yes netlify-cli link --name %SITE%
  if not errorlevel 1 goto publicar
)
echo.
echo Escolha o seu site na lista que vai aparecer (use as setas e Enter):
call npx --yes netlify-cli link
if errorlevel 1 goto erro

:publicar
echo.
echo [3/3] Construindo e publicando (alguns minutos)...
call npx --yes netlify-cli deploy --build --prod
if errorlevel 1 goto erro

echo.
echo Pronto! Seu site foi publicado.
pause
exit /b 0

:erro
echo.
echo Algo deu errado. Copie as ultimas linhas desta janela e me mande.
pause
exit /b 1
