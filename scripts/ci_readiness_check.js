#!/usr/bin/env node
/*
 * Static CI/CD readiness check. It validates workflow references, required
 * guard files, deploy-path assumptions, and documented secrets without reading
 * any secret values.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'ci_readiness_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'ci_readiness_latest.md');

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function findRefs(text) {
  return [...text.matchAll(/(?:node|bash|python3?|chmod \+x)\s+([A-Za-z0-9_./-]+\.(?:js|sh|py))/g)]
    .map(match => match[1])
    .filter(ref => ref.startsWith('scripts/'));
}

function main() {
  const workflowDir = path.join(ROOT, '.github', 'workflows');
  const workflows = fs.readdirSync(workflowDir)
    .filter(name => /\.(ya?ml)$/i.test(name))
    .map(name => `.github/workflows/${name}`);

  const requiredFiles = [
    'scripts/pwa_static_guard.js',
    'scripts/pwa_api_smoke.js',
    'scripts/pwa_ui_write_contract.js',
    'scripts/regression-guard.sh',
    'scripts/drift-guard.sh',
    'scripts/guard-self-test.sh',
    'scripts/browser-smoke-test.py',
    'scripts/build_code_index.js',
    'scripts/pages_deploy_verify.js',
    'scripts/ci_readiness_check.js',
    'scripts/gas_source_alignment.js',
  ];

  const issues = [];
  const checks = [];
  function check(name, ok, detail, severity = 'P1') {
    checks.push({ name, ok: !!ok, detail, severity });
    if (!ok) issues.push({ name, detail, severity });
  }

  for (const file of requiredFiles) check(`required:${file}`, exists(file), file, 'P0');

  for (const workflow of workflows) {
    const text = read(workflow);
    for (const ref of findRefs(text)) {
      check(`workflow-ref:${workflow}:${ref}`, exists(ref), ref, 'P0');
    }
  }

  const autoDeploy = read('.github/workflows/auto-deploy.yml');
  const deployGas = read('.github/workflows/deploy-gas.yml');
  check('workflow:auto-deploy-name', exists('.github/workflows/auto-deploy.yml'), 'auto-deploy.yml exists', 'P0');
  check('workflow:auto-deploy-pages-verify', autoDeploy.includes('pages_deploy_verify.js'), 'Pages verification runs after deploy', 'P1');
  check('workflow:auto-deploy-ci-readiness', autoDeploy.includes('ci_readiness_check.js'), 'CI readiness check runs in validate', 'P1');
  check('workflow:deploy-gas-source-alignment', deployGas.includes('gas_source_alignment.js'), 'GAS source alignment runs before deploy', 'P1');
  check('workflow:deploy-gas-secret', deployGas.includes('CLASPRC_JSON'), 'CLASPRC_JSON documented/validated', 'P0');
  check('clasp-ready-config', exists('clasp-ready/.clasp.json'), 'clasp-ready/.clasp.json exists for CI deploy', 'P0');

  const checksumText = read('scripts/.guard-checksums.md5');
  for (const file of ['scripts/regression-guard.sh', 'scripts/drift-guard.sh', 'scripts/guard-self-test.sh']) {
    check(`checksum:${file}`, checksumText.includes(file), `${file} tracked in checksum file`, 'P1');
  }

  const status = issues.some(issue => issue.severity === 'P0') ? 'fail' : issues.length ? 'warn' : 'ok';
  const report = { generatedAt: new Date().toISOString(), status, checks, issues };
  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# CI Readiness Check',
    '',
    `- Status: ${status}`,
    `- Issues: ${issues.length}`,
    '',
    '| Check | Result | Detail |',
    '|---|---|---|',
    ...checks.map(item => `| ${item.name} | ${item.ok ? 'OK' : item.severity} | ${item.detail} |`),
    '',
  ].join('\n'), 'utf8');

  console.log(`[CI Readiness] status=${status} issues=${issues.length}`);
  for (const issue of issues) console.log(`- [${issue.severity}] ${issue.name}: ${issue.detail}`);
  if (status === 'fail') process.exit(1);
}

main();
