#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
//  nachtio-release.js — Release-Helfer (Prüfsumme + Prüfung vor dem Upload)
//
//  Aufruf (im Ordner, in dem Nachtio-Setup.exe, version.json und changelog.json liegen):
//    node nachtio-release.js hash [Pfad\zur\Nachtio-Setup.exe]
//        Berechnet den SHA-256 des Installers und schreibt ihn als "installerSha256" in version.json.
//        Mit Pfad: die Datei wird vorher in diesen Ordner kopiert (als Nachtio-Setup.exe).
//        Entfernt außerdem das veraltete Feld "htmlUrl".
//    node nachtio-release.js check [changelog]
//        Prüft alles, was vor dem Hochladen stimmen muss. "changelog" prüft nur changelog.json.
//
//  Rückgabecode:  0 = alles in Ordnung,  1 = Fehler (NICHT hochladen),  2 = nur Warnungen
//  Benötigt nur Node.js (hast du für den Build ohnehin).
// ════════════════════════════════════════════════════════════════════
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cp = require('child_process');

const DIR = process.cwd();
const EXE = 'Nachtio-Setup.exe';
const VJ = 'version.json';
const CJ = 'changelog.json';
const MIN_EXE_SIZE = 1000000; // wie in der App (_checkInstallerFile)

const errors = [];
const warnings = [];

function p(f) { return path.join(DIR, f); }
function readJson(file) {
  let txt = fs.readFileSync(p(file), 'utf8');
  if (txt.charCodeAt(0) === 0xFEFF) txt = txt.slice(1); // BOM tolerieren
  return JSON.parse(txt);
}
function sha256File(file) {
  return new Promise(function(resolve, reject) {
    const h = crypto.createHash('sha256');
    const st = fs.createReadStream(file);
    st.on('error', reject);
    st.on('data', function(c) { h.update(c); });
    st.on('end', function() { resolve(h.digest('hex')); });
  });
}
function exeProblem(file) {
  let st;
  try { st = fs.statSync(file); } catch (e) { return EXE + ' nicht gefunden in: ' + DIR; }
  if (!st.isFile()) return EXE + ' ist keine Datei';
  if (st.size < MIN_EXE_SIZE) {
    let head = '';
    try { head = fs.readFileSync(file, 'latin1').slice(0, 60); } catch (e) {}
    if (/git-lfs/i.test(head)) return EXE + ' ist nur ein Git-LFS-Platzhalter (' + st.size + ' Bytes), nicht der echte Installer';
    return EXE + ' ist zu klein (' + st.size + ' Bytes) - das ist kein fertiger Installer';
  }
  const fd = fs.openSync(file, 'r');
  try {
    const b = Buffer.alloc(2);
    fs.readSync(fd, b, 0, 2, 0);
    if (b.toString('latin1') !== 'MZ') return EXE + ' ist keine Windows-Programmdatei (MZ-Kopf fehlt)';
  } finally { fs.closeSync(fd); }
  return null;
}
function writeVersionJson(obj) {
  // feste, lesbare Reihenfolge; htmlUrl wird nicht mehr geschrieben
  const out = {};
  out.version = obj.version;
  if (obj.installerUrl !== undefined) out.installerUrl = obj.installerUrl;
  if (obj.installerSha256 !== undefined) out.installerSha256 = obj.installerSha256;
  Object.keys(obj).forEach(function(k) { if (k !== 'htmlUrl' && !(k in out)) out[k] = obj[k]; });
  const tmp = p(VJ + '.tmp');
  fs.writeFileSync(tmp, JSON.stringify(out, null, 2) + '\n', 'utf8'); // UTF-8 ohne BOM
  fs.renameSync(tmp, p(VJ));
}

async function cmdHash(arg) {
  if (arg) {
    const src = path.resolve(arg);
    if (!fs.existsSync(src)) { console.log('  [FEHLER] Datei nicht gefunden: ' + src); return 1; }
    if (path.resolve(p(EXE)).toLowerCase() !== src.toLowerCase()) {
      console.log('  [INFO] Kopiere ' + src + ' -> ' + p(EXE));
      fs.copyFileSync(src, p(EXE));
    }
  }
  const prob = exeProblem(p(EXE));
  if (prob) { console.log('  [FEHLER] ' + prob); return 1; }
  let v;
  try { v = readJson(VJ); } catch (e) { console.log('  [FEHLER] ' + VJ + ' ist kein gueltiges JSON: ' + e.message); return 1; }
  if (!v || typeof v.version !== 'string' || !v.version.trim()) { console.log('  [FEHLER] ' + VJ + ' enthaelt keine Version'); return 1; }
  console.log('  [INFO] Berechne SHA-256 (kann bei grossen Dateien einen Moment dauern)...');
  const sha = await sha256File(p(EXE));
  const size = fs.statSync(p(EXE)).size;
  const hadHtml = 'htmlUrl' in v;
  v.installerSha256 = sha;
  writeVersionJson(v);
  console.log('');
  console.log('  Installer : ' + EXE + ' (' + (size / 1048576).toFixed(1) + ' MB)');
  console.log('  Version   : ' + v.version);
  console.log('  SHA-256   : ' + sha);
  console.log('  [OK] ' + VJ + ' wurde aktualisiert (installerSha256' + (hadHtml ? ', veraltetes htmlUrl entfernt' : '') + ').');
  return 0;
}

function checkChangelog(versionStr) {
  let c;
  try { c = readJson(CJ); } catch (e) { errors.push(CJ + ' ist kein gueltiges JSON: ' + e.message); return; }
  if (!Array.isArray(c) || !c.length) { errors.push(CJ + ' muss eine nicht-leere Liste sein'); return; }
  c.forEach(function(e, i) {
    if (!e || typeof e.version !== 'string' || typeof e.date !== 'string' || !Array.isArray(e.changelog)) {
      errors.push(CJ + ': Eintrag ' + (i + 1) + ' braucht "version", "date" und "changelog" (Liste)');
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date)) {
      warnings.push(CJ + ': Eintrag ' + (i + 1) + ' hat ein ungewoehnliches Datum "' + e.date + '" (erwartet JJJJ-MM-TT)');
    }
  });
  if (versionStr) {
    const upd = c.filter(function(e) { return e && typeof e.version === 'string' && /^Update/i.test(e.version); })[0];
    if (!upd || upd.version.indexOf(versionStr) < 0) {
      warnings.push(CJ + ': der neueste "Update"-Eintrag nennt nicht die Version ' + versionStr + ' (vergessen, den Changelog zu ergaenzen?)');
    }
  }
}

async function cmdCheck(mode) {
  if (mode === 'changelog') {
    checkChangelog(null);
  } else {
    let v = null;
    try { v = readJson(VJ); } catch (e) { errors.push(VJ + ' ist kein gueltiges JSON: ' + e.message); }
    if (v) {
      if (typeof v.version !== 'string' || !/^[0-9A-Za-z][0-9A-Za-z.\-_]{0,30}$/.test(v.version)) errors.push('version.json: "version" fehlt oder hat ein ungueltiges Format');
      else if (!/^\d+\.\d+\.\d+$/.test(v.version)) warnings.push('version.json: Version "' + v.version + '" ist nicht im Format 1.2.3');
      if (typeof v.installerUrl !== 'string' || !/^https:\/\//i.test(v.installerUrl)) errors.push('version.json: "installerUrl" fehlt oder beginnt nicht mit https://');
      const sha = (typeof v.installerSha256 === 'string') ? v.installerSha256.trim().toLowerCase() : '';
      if (!/^[0-9a-f]{64}$/.test(sha)) {
        errors.push('version.json: "installerSha256" fehlt oder ist ungueltig - bitte HASH_ERZEUGEN.bat ausfuehren (ohne Pruefsumme installiert die App kein Update)');
      }
      if ('htmlUrl' in v) warnings.push('version.json: "htmlUrl" ist veraltet und wird nicht mehr verwendet (HASH_ERZEUGEN.bat entfernt es)');
      if (!Array.isArray(v.changelog) || !v.changelog.length || v.changelog.some(function(x) { return typeof x !== 'string'; })) {
        warnings.push('version.json: "changelog" sollte eine Liste von Texten sein');
      }

      const prob = exeProblem(p(EXE));
      if (prob) {
        errors.push(prob);
      } else if (/^[0-9a-f]{64}$/.test(sha)) {
        const real = await sha256File(p(EXE));
        if (real !== sha) errors.push('Die Pruefsumme in version.json passt NICHT zur ' + EXE + ' in diesem Ordner (neuer Build? dann HASH_ERZEUGEN.bat nochmal ausfuehren)');
      }

      // Vergleich mit dem zuletzt eingecheckten Stand: Version vergessen zu erhoehen?
      try {
        const old = JSON.parse(cp.execFileSync('git', ['show', 'HEAD:' + VJ], { cwd: DIR, stdio: ['ignore', 'pipe', 'ignore'] }).toString('utf8').replace(/^﻿/, ''));
        if (old && old.version === v.version && old.installerSha256 && sha && old.installerSha256.toLowerCase() !== sha) {
          warnings.push('Die Version ist unveraendert (' + v.version + '), aber der Installer ist ein anderer - Kunden bekommen so KEIN Update angezeigt. Version erhoehen (package.json UND version.json)!');
        }
      } catch (e) { /* kein Git / noch kein Commit: Vergleich entfaellt */ }

      checkChangelog(v.version);
    }
  }

  console.log('');
  if (errors.length) { console.log('  FEHLER:'); errors.forEach(function(e) { console.log('   [X] ' + e); }); }
  if (warnings.length) { console.log('  WARNUNGEN:'); warnings.forEach(function(w) { console.log('   [!] ' + w); }); }
  if (!errors.length && !warnings.length) console.log('  [OK] Alles in Ordnung - Hochladen kann losgehen.');
  return errors.length ? 1 : (warnings.length ? 2 : 0);
}

(async function main() {
  const cmd = process.argv[2];
  let code;
  try {
    if (cmd === 'hash') code = await cmdHash(process.argv[3]);
    else if (cmd === 'check') code = await cmdCheck(process.argv[3]);
    else { console.log('Aufruf: node nachtio-release.js hash [Pfad] | check [changelog]'); code = 1; }
  } catch (e) {
    console.log('  [FEHLER] ' + (e && e.message ? e.message : e));
    code = 1;
  }
  process.exit(code);
})();
