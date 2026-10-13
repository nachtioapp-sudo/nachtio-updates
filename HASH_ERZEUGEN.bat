@echo off
title Nachtio - Pruefsumme erzeugen
color 0A

cd /d "%~dp0"

echo.
echo  ====================================================
echo   NACHTIO - Pruefsumme (SHA-256) fuer den Installer
echo  ====================================================
echo.

node --version >nul 2>&1
if errorlevel 1 goto nonode

if not exist nachtio-release.js goto noscript

:: Wenn du die Nachtio-Setup.exe (z.B. aus dem dist-Ordner) auf diese BAT-Datei ziehst,
:: wird sie in diesen Ordner kopiert und danach geprueft. Ohne Ziehen: die Datei muss schon hier liegen.
if "%~1"=="" goto ohnepfad
node nachtio-release.js hash "%~1"
goto nachhash

:ohnepfad
node nachtio-release.js hash

:nachhash
if errorlevel 1 goto fail

echo.
echo  [INFO] Pruefe alles gegeneinander...
node nachtio-release.js check
if errorlevel 3 goto fail
if errorlevel 2 goto warn
if errorlevel 1 goto fail

echo.
echo  ====================================================
echo   Fertig! Jetzt PUSH_GITHUB.bat ausfuehren.
echo  ====================================================
echo.
pause
exit /b 0

:warn
echo.
echo  Pruefsumme wurde eingetragen, aber es gibt Warnungen (siehe oben).
echo.
pause
exit /b 0

:nonode
echo  [FEHLER] Node.js nicht gefunden! Bitte installieren: https://nodejs.org
pause
exit /b 1

:noscript
echo  [FEHLER] nachtio-release.js liegt nicht in diesem Ordner!
echo  Beide Dateien (HASH_ERZEUGEN.bat und nachtio-release.js) muessen zusammen im Ordner liegen.
pause
exit /b 1

:fail
echo.
echo  [STOPP] Es ist ein Fehler aufgetreten (siehe oben). Es wurde nichts hochgeladen.
echo.
pause
exit /b 1
