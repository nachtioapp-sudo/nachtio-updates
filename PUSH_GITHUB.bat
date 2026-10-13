@echo off
title Nachtio - GitHub Upload
color 0A

cd /d "C:\Users\spiri\Desktop\Nachtio Daten"

echo.
echo  ====================================================
echo   NACHTIO - GitHub Upload
echo  ====================================================
echo.

:: Sicherheitspruefung braucht Node.js und nachtio-release.js (im selben Ordner)
node --version >nul 2>&1
if errorlevel 1 goto nonode
if not exist nachtio-release.js goto noscript

echo  Was moechtest du hochladen?
echo.
echo  [1] Nachtio-Setup.exe  (neuer Installer)
echo  [2] version.json       (Versionsnummer + Changelog)
echo  [3] changelog.json     (News-Seite Website)
echo  [4] Alles hochladen
echo  [5] Nur pruefen (nichts hochladen)
echo.
set /p choice="Auswahl (1-5): "

if "%choice%"=="1" goto pre_installer
if "%choice%"=="2" goto pre_version
if "%choice%"=="3" goto pre_changelog
if "%choice%"=="4" goto pre_alles
if "%choice%"=="5" goto nurpruefen
echo  [FEHLER] Ungueltige Auswahl!
pause & exit /b 1

:: ---------- Pruefung vor dem Hochladen ----------
:: Installer/Version/Alles: Pruefsumme in version.json muss zur Nachtio-Setup.exe passen.
:: Ohne gueltige Pruefsumme installiert die App kein Update - deshalb wird dann gar nicht erst hochgeladen.
:pre_installer
set NEXT=installer
goto precheck_full
:pre_version
set NEXT=version
goto precheck_full
:pre_alles
set NEXT=alles
goto precheck_full
:pre_changelog
set NEXT=changelog
node nachtio-release.js check changelog
goto checkresult

:precheck_full
echo.
echo  [INFO] Pruefe Installer, version.json und changelog.json...
node nachtio-release.js check

:checkresult
if errorlevel 3 goto prefail
if errorlevel 2 goto prewarn
if errorlevel 1 goto prefail
goto %NEXT%

:prewarn
echo.
set /p cont="  Es gibt Warnungen. Trotzdem hochladen? (J/N): "
if /i "%cont%"=="J" goto %NEXT%
echo  Abgebrochen - es wurde nichts hochgeladen.
pause & exit /b 1

:prefail
echo.
echo  [STOPP] Pruefung fehlgeschlagen - es wurde NICHTS hochgeladen.
echo  Tipp: Nach einem neuen Build zuerst HASH_ERZEUGEN.bat ausfuehren.
pause & exit /b 1

:nurpruefen
echo.
node nachtio-release.js check
echo.
pause & exit /b 0

:nonode
echo  [FEHLER] Node.js nicht gefunden - ohne Pruefung wird nichts hochgeladen!
echo  Bitte installieren: https://nodejs.org
pause & exit /b 1

:noscript
echo  [FEHLER] nachtio-release.js fehlt in diesem Ordner - ohne Pruefung wird nichts hochgeladen!
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

:changelog
echo.
echo  [INFO] Lade changelog.json hoch...
git rm --cached changelog.json >nul 2>&1
git add -f changelog.json
git commit -m "Update changelog.json" --allow-empty
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
