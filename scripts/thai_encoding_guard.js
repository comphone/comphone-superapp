#!/usr/bin/env node
// ============================================================
// COMPHONE SUPER APP — THAI ENCODING GUARD
// Purpose: prevent corrupted (mojibake) Thai text from shipping
//          in PWA JS that the browser actually loads.
// Context: commit 9749fef once double-encoded all Thai in
//          section_revenue.js / dashboard_pc_core.js, so the
//          Revenue menu and PC dashboard rendered garbled text
//          while every structural guard still passed. This guard
//          closes that blind spot.
// Exit: 0 = clean, 1 = mojibake detected.
// ============================================================

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PWA = path.join(ROOT, 'pwa');

// Files the browser loads. We scan the union referenced by the two
// shells plus any *.js they pull, but a static list of the entry HTML
// is enough because every menu script is referenced there.
const ENTRY_HTML = ['index.html', 'dashboard_pc.html'];

function readUtf8(file) {
  return fs.readFileSync(file, 'utf8');
}

function loadedScripts() {
  const set = new Set();
  for (const html of ENTRY_HTML) {
    const p = path.join(PWA, html);
    if (!fs.existsSync(p)) continue;
    const text = readUtf8(p);
    const re = /src="([^"?]+\.js)/g;
    let m;
    while ((m = re.exec(text))) {
      // normalize to bare filename within pwa/
      const file = m[1].replace(/^\.?\//, '').split('/').pop();
      if (file) set.add(file);
    }
  }
  return [...set];
}

// "เธ" (U+0E40 U+0E18) is the hallmark bigram produced when UTF-8 Thai
// lead bytes (E0 B8 ...) are misread as Windows-874 and re-encoded.
// Legitimate Thai almost never repeats this bigram; the corrupted files
// carried it hundreds of times. A small threshold avoids false positives
// on the rare legitimate word while catching wholesale corruption.
const MOJIBAKE_BIGRAM = /เธ/g;
const MOJIBAKE_THRESHOLD = 3;
// C1 control characters (U+0080–U+009F) are never valid in source text;
// the lossy corruption left lone bytes like U+0099 where "น" belonged.
const C1_CONTROL = /[\u0080-\u009F]/;

const findings = [];

const scanList = loadedScripts();
for (const file of scanList) {
  const p = path.join(PWA, file);
  if (!fs.existsSync(p)) continue;
  const text = readUtf8(p);

  const bigramMatches = (text.match(MOJIBAKE_BIGRAM) || []).length;
  if (bigramMatches >= MOJIBAKE_THRESHOLD) {
    findings.push(`${file}: ${bigramMatches} "เธ" mojibake bigrams (threshold ${MOJIBAKE_THRESHOLD})`);
  }

  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (C1_CONTROL.test(line)) {
      findings.push(`${file}:${i + 1}: C1 control character in source line`);
    }
  });
}

if (findings.length) {
  console.error('[Thai Encoding Guard] FAILED — corrupted Thai in loaded PWA files');
  for (const f of findings) console.error(`- ${f}`);
  process.exit(1);
}

console.log(`[Thai Encoding Guard] OK — ${scanList.length} loaded PWA scripts clean`);
