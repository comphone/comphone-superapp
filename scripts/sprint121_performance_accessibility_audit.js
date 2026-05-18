#!/usr/bin/env node
/*
 * Sprint 121 Performance + Accessibility Audit
 *
 * Guards UI responsiveness primitives for PC/mobile menus: loading watchdogs,
 * aria-busy state, focus-visible rings, touch targets, and reduced motion.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint121_performance_accessibility_latest.json');

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}

function has(text, needle) {
  return typeof needle === 'string' ? text.includes(needle) : needle.test(text);
}

function main() {
  const files = {
    app: read('pwa/app.js'),
    pcCore: read('pwa/dashboard_pc_core.js'),
    mobileGlass: read('pwa/mobile_glass.css'),
    dashboardCss: read('pwa/dashboard_shared.css'),
    staticGuard: read('scripts/pwa_static_guard.js'),
    regression: read('scripts/regression-guard.sh'),
    workflow: read('.github/workflows/auto-deploy.yml'),
    blueprint: read('BLUEPRINT.md'),
  };

  const checks = [];
  const issues = [];
  function check(area, name, ok, detail, severity = 'P0') {
    const row = { area, name, ok: !!ok, severity, detail };
    checks.push(row);
    if (!row.ok) issues.push(row);
  }

  check('mobile-runtime', 'page-loading-watchdog',
    has(files.app, 'function markPageLoading') &&
      has(files.app, "setAttribute('aria-busy', 'true')") &&
      has(files.app, "setAttribute('data-page-state', 'loading')") &&
      has(files.app, 'data-loading-skeleton="true"') &&
      has(files.app, 'page-load-diagnostic') &&
      has(files.app, 'No visible content was rendered yet') &&
      has(files.app, 'function markPageReady'),
    'Mobile page routing must expose aria-busy, loading skeleton, and a no-blank diagnostic fallback.');

  check('pc-runtime', 'pc-section-busy-state',
    has(files.pcCore, '__PC_SECTION_LOAD_TOKEN') &&
      has(files.pcCore, "setAttribute('aria-busy', 'true')") &&
      has(files.pcCore, "setAttribute('data-section-state', 'loading')") &&
      has(files.pcCore, "setAttribute('data-section-state', 'ready')"),
    'PC section routing must mark sections busy/ready so operators and assistive tech get state feedback.');

  check('mobile-css', 'touch-focus-reduced-motion',
    has(files.mobileGlass, 'Sprint 121: Runtime Accessibility + Performance Guardrails') &&
      has(files.mobileGlass, 'min-height: 44px') &&
      has(files.mobileGlass, 'touch-action: manipulation') &&
      has(files.mobileGlass, ':focus-visible') &&
      has(files.mobileGlass, 'prefers-reduced-motion: reduce') &&
      has(files.mobileGlass, '.page-loading-watchdog') &&
      has(files.mobileGlass, '.page-load-diagnostic'),
    'Mobile CSS must keep tap targets, focus rings, reduced motion, and loading diagnostic styles.');

  check('pc-css', 'pc-focus-reduced-motion',
    has(files.dashboardCss, 'Sprint 121: Accessibility + reduced-motion guardrails for PC surfaces') &&
      has(files.dashboardCss, 'touch-action: manipulation') &&
      has(files.dashboardCss, ':focus-visible') &&
      has(files.dashboardCss, 'prefers-reduced-motion: reduce') &&
      has(files.dashboardCss, '.dashboard-section[aria-busy="true"]'),
    'PC shared CSS must keep focus rings, touch manipulation, reduced motion, and busy-state cursor.');

  check('ci', 'sprint121-wired',
    has(files.staticGuard, 'sprint121_performance_accessibility_audit.js') &&
      has(files.regression, 'sprint121_performance_accessibility_audit.js') &&
      has(files.workflow, 'sprint121_performance_accessibility_audit.js'),
    'Sprint 121 audit must run in static guard, regression guard, and Actions syntax checks.');

  check('blueprint', 'blueprint-documents-sprint121',
    has(files.blueprint, 'Phase 121 Performance/Accessibility Pass') &&
      has(files.blueprint, 'sprint121_performance_accessibility_audit.js') &&
      has(files.blueprint, 'loading watchdog'),
    'BLUEPRINT must document Sprint 121 performance/accessibility hardening.');

  const p0 = issues.filter(item => item.severity === 'P0').length;
  const score = Math.round((checks.filter(item => item.ok).length / checks.length) * 100);
  const report = {
    generated_at: new Date().toISOString(),
    version: 'sprint121-performance-accessibility-1.0.0',
    status: p0 ? 'fail' : 'ok',
    score,
    checks,
    issues,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[Sprint 121 Performance/Accessibility] status=${report.status} score=${score}/100`);
  console.log(`[Sprint 121 Performance/Accessibility] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  if (p0) {
    issues.forEach(item => console.error(`- [${item.severity}] ${item.area}/${item.name}: ${item.detail}`));
    process.exit(1);
  }
}

main();
