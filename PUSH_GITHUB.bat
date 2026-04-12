@echo off
title Nachtio - GitHub Upload
color 0A

cd /d "C:\Users\spiri\Desktop\Nachtio Daten"

echo.
echo  ====================================================
echo   NACHTIO - GitHub Upload
echo  ====================================================
echo.

:: Welche Dateien sollen hochgeladen werden?
echo  Welche Dateien moechtest du hochladen?
echo.
echo  [1] FW-Beta.html
echo  [2] FW-Update.html
echo  [3] version.json + version-beta.json
echo  [4] Installer (.exe)
echo  [5] ALLES hochladen
echo.
set /p choice="Auswahl (1-5): "

if "%choice%"=="1" goto beta
if "%choice%"=="2" goto update
if "%choice%"=="3" goto versions
if "%choice%"=="4" goto installer
if "%choice%"=="5" goto alles
echo  [FEHLER] Ungueltige Auswahl!
pause & exit /b 1

:beta
echo.
echo  [INFO] Lade FW-Beta.html hoch...
git rm --cached FW-Beta.html >nul 2>&1
git add -f FW-Beta.html
git commit -m "Update FW-Beta.html" --allow-empty
goto push

:update
echo.
echo  [INFO] Lade FW-Update.html hoch...
git rm --cached FW-Update.html >nul 2>&1
git add -f FW-Update.html
git commit -m "Update FW-Update.html" --allow-empty
goto push

:versions
echo.
echo  [INFO] Lade version.json + version-beta.json hoch...
git rm --cached version.json version-beta.json >nul 2>&1
git add -f version.json version-beta.json
git commit -m "Update version files" --allow-empty
goto push

:installer
echo.
echo  [INFO] Suche Installer...
for %%f in ("Nachtio Abrechnung Setup*.exe") do (
    echo  Gefunden: %%f
    git rm --cached "%%f" >nul 2>&1
    git add -f "%%f"
)
git commit -m "Update installer" --allow-empty
goto push

:alles
echo.
echo  [INFO] Lade alle Dateien hoch...
git add .
git commit -m "Update alle Dateien"
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