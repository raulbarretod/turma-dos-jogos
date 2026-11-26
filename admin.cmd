@echo off
rem Painel do administrador da Turma dos Jogos: liga o servidor local e abre o painel no navegador.
rem So funciona neste computador. Para desligar, feche esta janela.
title Turma dos Jogos - painel do administrador
cd /d "%~dp0"
rem abre o navegador 2 segundos depois, quando o servidor ja esta ligado
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:8000/admin"
node servir.mjs
pause
