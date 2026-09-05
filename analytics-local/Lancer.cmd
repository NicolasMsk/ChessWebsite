@echo off
cd /d "%~dp0"
echo Tableau de bord : http://127.0.0.1:4317
echo Gardez cette fenetre ouverte pendant la consultation.
node server.mjs
pause
