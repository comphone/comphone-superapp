#!/usr/bin/env node
/*
 * Ensure deploy-root GAS files and clasp-ready GAS files stay aligned.
 * This prevents local/API deploy paths from silently using different code.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'gas_source_alignment_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'gas_source_alignment_latest.md');
const BLOCKING = [
  'Router.gs',
  'Auth.gs',
  'Config.gs',
  'CustomerManager.gs',
  'JobsHandler.gs',
  'RouterSplit.gs',
  'LineCommandCenter.gs',
  'VisionPipeline.gs',
];
const WARN_ONLY = [];

function hash(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function exists(file) {
  return fs.existsSync(file);
}

function main() {
  const rows = BLOCKING.concat(WARN_ONLY).map(name => {
    const rootFile = path.join(ROOT, name);
    const readyFile = path.join(ROOT, 'clasp-ready', name);
    const rootExists = exists(rootFile);
    const readyExists = exists(readyFile);
    const rootHash = rootExists ? hash(rootFile) : '';
    const readyHash = readyExists ? hash(readyFile) : '';
    return {
      file: name,
      rootExists,
      readyExists,
      blocking: BLOCKING.includes(name),
      aligned: rootExists && readyExists && rootHash === readyHash,
      rootHash: rootHash.slice(0, 12),
      readyHash: readyHash.slice(0, 12),
    };
  });

  const issues = rows.filter(row => !row.aligned && row.blocking);
  const warnings = rows.filter(row => !row.aligned && !row.blocking);
  const report = {
    generatedAt: new Date().toISOString(),
    status: issues.length ? 'fail' : 'ok',
    rows,
    issues,
    warnings,
  };
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# GAS Source Alignment',
    '',
    `- Status: ${report.status}`,
    `- Files checked: ${rows.length}`,
    `- Warnings: ${warnings.length}`,
    '',
    '| File | Result | Root | clasp-ready |',
    '|---|---|---|---|',
    ...rows.map(row => `| ${row.file} | ${row.aligned ? 'OK' : row.blocking ? 'FAIL' : 'WARN'} | ${row.rootHash || '-'} | ${row.readyHash || '-'} |`),
    '',
  ].join('\n'), 'utf8');

  console.log(`[GAS Alignment] status=${report.status} checked=${rows.length}`);
  for (const issue of issues) {
    console.log(`- FAIL ${issue.file}: root=${issue.rootHash || 'missing'} clasp-ready=${issue.readyHash || 'missing'}`);
  }
  for (const warning of warnings) {
    console.log(`- WARN ${warning.file}: root=${warning.rootHash || 'missing'} clasp-ready=${warning.readyHash || 'missing'}`);
  }
  if (issues.length) process.exit(1);
}

main();
