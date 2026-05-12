@echo off
title Sistema Padeiro - Brago Distribuidora
echo.
echo  ========================================
echo    BRAGO - Sistema Padeiro
echo  ========================================
echo.
echo  Iniciando servidor...
echo.
cd /d "%~dp0"
node server.js
pause
