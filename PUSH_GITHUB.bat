@echo off
title Nachtio - GitHub Upload
color 0A

cd /d "C:\Users\spiri\Desktop\Nachtio Daten"

echo.
echo  ====================================================
echo   NACHTIO - GitHub Upload
echo  ====================================================
echo.

echo  Was moechtest du hochladen?
echo.
echo  [1] Nachtio-Setup.exe  (neuer Installer)
echo  [2] version.json       (Versionsnummer + Changelog)
echo  [3] Alles hochladen
echo.
set /p choice="Auswahl (1-3): "

if "%choice%"=="1" goto installer
if "%choice%"=="2" goto version
if "%choice%"=="3" goto alles
echo  [FEHLER] Ungueltige Auswahl!
pause & exit /b 1

:installer
echo.
echo  [INFO] Lade Nachtio-Setup.exe hoch...
git rm --cached Nachtio-Setup.exe >nul 2>&1
git add -f Nachtio-Setup.exe
git commit -m "Update installer" --allow-empty
goto push

:version
echo.
echo  [INFO] Lade version.json hoch...
git rm --cached version.json >nul 2>&1
git add -f version.json
git commit -m "Update version.json" --allow-empty
goto push

:alles
echo.
echo  [INFO] Lade alle Dateien hoch...
git add .
git commit -m "Update" --allow-empty
goto push

:push
echo.
echo  [INFO] Push zu GitHub...
git push
if %errorlevel% neq 0 (
    echo  [FEHLER] Push fehlgeschlagen!
    pause & exit /b 1
)

echo.
echo  ====================================================
echo   Fertig! Dateien sind auf GitHub hochgeladen.
echo   https://github.com/nachtioapp-sudo/nachtio-updates
echo  ====================================================
echo.
pause
