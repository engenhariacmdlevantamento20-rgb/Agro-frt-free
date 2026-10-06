@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Agro Frete: conferir o projeto ===
call npm run check
if errorlevel 1 exit /b 1
call npm run typecheck
if errorlevel 1 exit /b 1
echo Estrutura e tipos verificados.
pause
