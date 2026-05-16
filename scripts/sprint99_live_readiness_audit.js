#!/usr/bin/env node
/*
 * Sprint 99 Live Readiness Audit
 *
 * Guards the production browser risks found during live PC/mobile review:
 * stale GitHub Pages cache-bust values, service-worker cache drift, saved
 * legacy mobile quick actions, and PC command-center deployment freshness.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint99_live_readiness_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint99_live_readiness_latest.md');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

function extract(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1] : '';
}

function collectQueryTimestamps(html) {
  return Array.from(html.matchAll(/[?&]t=([0-9]{8}_[0-9]{4})/g)).map(match => match[1]);
}

function main() {
  const files = {
    index: read('pwa/index.html'),
    pc: read('pwa/dashboard_pc.html'),
    version: read('pwa/version_config.js'),
    sw: read('pwa/sw.js'),
    app: read('pwa/app.js'),
    dashboard: read('pwa/dashboard.js'),
    regression: read('scripts/regression-guard.sh'),
    workflow: read('.github/workflows/auto-deploy.yml'),
  };

  const buildTimestamp = extract(files.version, /buildTimestamp:\s*'([^']+)'/);
  const buildConst = extract(files.version, /const BUILD_TIMESTAMP\s*=\s*'([^']+)'/);
  const cacheVersion = extract(files.version, /cacheVersion:\s*'([^']+)'/);
  const cacheConst = extract(files.version, /const CACHE_VERSION\s*=\s*'([^']+)'/);
  const swCache = extract(files.sw, /const CACHE_V\s*=\s*'([^']+)'/);
  const indexTimestamps = collectQueryTimestamps(files.index);
  const pcTimestamps = collectQueryTimestamps(files.pc);

  const checks = [];
  const issues = [];

  function check(area, name, ok, detail, severity = 'P1') {
    const item = { area, name, ok: !!ok, severity, detail };
    checks.push(item);
    if (!item.ok) issues.push(item);
  }

  check('cache_freshness', 'single-build-timestamp',
    !!buildTimestamp &&
      buildTimestamp === buildConst &&
      indexTimestamps.length > 0 &&
      pcTimestamps.length > 0 &&
      indexTimestamps.every(item => item === buildTimestamp) &&
      pcTimestamps.every(item => item === buildTimestamp),
    'Mobile and PC asset query strings must use the same build timestamp as version_config.js.',
    'P0');

  check('cache_freshness', 'service-worker-cache-aligned',
    !!cacheVersion &&
      cacheVersion === cacheConst &&
      cacheVersion === swCache &&
      cacheVersion.endsWith(buildTimestamp),
    'Service-worker cache version must match version_config.js and include the current build timestamp.',
    'P0');

  check('cache_freshness', 'old-live-build-removed',
    !Object.values(files).some(text => text.includes('20260513_2005')),
    'The stale live build timestamp from the browser audit must not remain in production PWA assets.',
    'P0');

  check('mobile_field', 'legacy-quick-actions-migration',
    has(files.app, 'LEGACY_QUICK_ACTION_DEFAULTS') &&
      has(files.app, 'isLegacyDefault') &&
      has(files.app, 'localStorage.setItem(QUICK_ACTIONS_KEY, JSON.stringify(ids))'),
    'Mobile should migrate the old default quick actions to Jobs/Billing/Vision/LINE without overwriting custom user choices.',
    'P1');

  check('pc_dashboard', 'command-center-live-surface',
    has(files.dashboard, 'executive-command-center') &&
      has(files.dashboard, 'openDashboardCommand') &&
      has(files.dashboard, 'renderCommandTile') &&
      ['jobs', 'billing', 'po', 'inventory', 'vision', 'line-center'].every(key => files.dashboard.includes(`renderCommandTile('${key}'`)),
    'PC dashboard should expose the live operator command center after cache refresh.',
    'P0');

  check('ci_guard', 'sprint99-regression-wired',
    has(files.regression, 'sprint99_live_readiness_audit.js') &&
      has(files.workflow, 'sprint99_live_readiness_audit.js'),
    'Sprint 99 live readiness audit should run in local regression guard and GitHub Actions syntax checks.',
    'P1');

  const p0 = issues.filter(item => item.severity === 'P0').length;
  const score = Math.round((checks.filter(item => item.ok).length / checks.length) * 100);
  const status = p0 ? 'fail' : issues.length ? 'warn' : 'ok';
  const report = {
    generatedAt: new Date().toISOString(),
    sprint: 99,
    focus: 'live browser cache and operator readiness',
    status,
    score,
    buildTimestamp,
    cacheVersion,
    checksTotal: checks.length,
    checksPassed: checks.filter(item => item.ok).length,
    issues,
    checks,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# Sprint 99 Live Readiness Audit',
    '',
    `- Status: ${status}`,
    `- Score: ${score}/100`,
    `- Build timestamp: ${buildTimestamp || 'unknown'}`,
    `- Cache version: ${cacheVersion || 'unknown'}`,
    `- Checks: ${report.checksPassed}/${checks.length}`,
    `- Issues: ${issues.length}`,
    '',
    '| Area | Check | Result | Detail |',
    '|---|---|---|---|',
    ...checks.map(item => `| ${item.area} | ${item.name} | ${item.ok ? 'OK' : item.severity} | ${item.detail} |`),
    '',
  ].join('\n'), 'utf8');

  console.log(`[Sprint 99 Live Readiness Audit] status=${status} score=${score}/100 checks=${report.checksPassed}/${checks.length}`);
  for (const issue of issues) console.log(`- [${issue.severity}] ${issue.area}/${issue.name}: ${issue.detail}`);
  if (p0) process.exit(1);
}

main();
