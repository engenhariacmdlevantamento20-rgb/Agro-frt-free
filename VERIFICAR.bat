@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo === Agro Frete: conferir se nao falta nenhum arquivo ===
echo.
set FALTA=0
if not exist "tools\arquivos-win.txt" (
  echo Falta a pasta tools. Copie a pasta tools do zip completo para ca e rode de novo.
  pause
  exit /b 1
)
for /f "usebackq delims=" %%f in ("tools\arquivos-win.txt") do (
  if not exist "%%f" (
    echo FALTA: %%f
    set FALTA=1
  )
)
echo.
if "%FALTA%"=="1" (
  echo Copie os arquivos acima do zip completo para o seu repositorio e rode este arquivo de novo.
) else (
  echo Tudo certo: nenhum arquivo faltando.
)
pause
