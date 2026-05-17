#!/usr/bin/env node
/*
 * Sprint 103 Visual Runtime Walkthrough
 *
 * CI-safe visual/runtime contract audit for PC and Mobile menus.
 * It does not require a headed browser: the script verifies the visible menu
 * map, stable mounts, load order, restore behavior, and known blank-shell
 * recurrence patterns that were found during live browser review.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint103_visual_runtime_walkthrough_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint103_visual_runtime_walkthrough_latest.md');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

function localScripts(html) {
  return [...html.matchAll(/<script\s+src=["']([^"']+)["']/g)]
    .map(match => match[1].split('?')[0])
    .filter(src => !/^https?:\/\//.test(src) && !src.startsWith('//'))
    .map(src => src.replace(/^\/?comphone-superapp\/pwa\//, '').replace(/^\//, ''));
}

function indexOfScript(scripts, name) {
  return scripts.findIndex(src => src === name || src.endsWith('/' + name));
}

async function main() {
  const files = {
    mobileHtml: read('pwa/index.html'),
    pcHtml: read('pwa/dashboard_pc.html'),
    app: read('pwa/app.js'),
    pcCore: read('pwa/dashboard_pc_core.js'),
    dashboard: read('pwa/dashboard.js'),
    reports: read('pwa/reports.js'),
    billing: read('pwa/billing_section.js'),
    jobs: read('pwa/section_jobs.js'),
    vision: read('pwa/section_vision.js'),
    line: read('pwa/section_line_center.js'),
    backup: read('pwa/section_backup.js'),
    settings: read('pwa/section_settings.js'),
    workflow: read('.github/workflows/auto-deploy.yml'),
    regression: read('scripts/regression-guard.sh'),
    staticGuard: read('scripts/pwa_static_guard.js'),
  };

  const pcScripts = localScripts(files.pcHtml);
  const mobileScripts = localScripts(files.mobileHtml);
  const checks = [];
  const issues = [];

  function check(area, name, ok, detail, severity = 'P1') {
    const row = { area, name, ok: !!ok, severity, detail };
    checks.push(row);
    if (!row.ok) issues.push(row);
  }

  const pcSections = [
    ['dashboard', 'Dashboard'],
    ['jobs', 'งานบริการ'],
    ['crm', 'ลูกค้า'],
    ['attendance', 'ลงเวลาทำงาน'],
    ['po', 'สั่งซื้อ'],
    ['inventory', 'สต็อก'],
    ['billing', 'ใบเสร็จ/วางบิล'],
    ['warranty', 'รับประกัน'],
    ['revenue', 'รายรับ'],
    ['tax', 'ภาษี'],
    ['reports', 'รายงาน'],
    ['analytics', 'Analytics'],
    ['performance', 'Performance'],
    ['vision', 'AI Vision'],
    ['line-center', 'LINE Center'],
    ['backup', 'สำรองข้อมูล'],
    ['settings', 'ตั้งค่า'],
  ];

  const mobilePages = [
    ['home', 'หน้าแรก'],
    ['jobs', 'งาน'],
    ['crm', 'ลูกค้า'],
    ['po', 'สั่งซื้อ'],
    ['attendance', 'ลงเวลา'],
    ['vision', 'AI Vision'],
    ['line-center', 'LINE Center'],
    ['profile', 'ตั้งค่า'],
    ['reports', 'รายงาน'],
    ['inventory', 'คลังสินค้า'],
    ['billing', 'วางบิล'],
    ['warranty', 'รับประกัน'],
    ['dashboard', 'Dashboard'],
    ['analytics', 'Analytics'],
    ['revenue', 'รายรับ'],
    ['tax', 'ภาษี'],
    ['performance', 'Performance'],
    ['admin', 'Admin'],
  ];

  check('pc_visual_shell', 'script-execution-order',
    ['version_config.js', 'gas_config.js', 'api_contract.js', 'api_client.js', 'dashboard.js', 'dashboard_pc_core.js'].every(name => indexOfScript(pcScripts, name) >= 0) &&
      indexOfScript(pcScripts, 'api_client.js') < indexOfScript(pcScripts, 'dashboard_pc_core.js') &&
      indexOfScript(pcScripts, 'dashboard.js') < indexOfScript(pcScripts, 'dashboard_pc_core.js'),
    'PC Dashboard must load config/client/renderers before dashboard_pc_core.js.',
    'P0');

  check('pc_visual_shell', 'dashboard-shell-stable',
    has(files.pcHtml, 'id="main-content"') &&
      has(files.pcHtml, 'id="login-overlay"') &&
      has(files.pcHtml, 'id="topbar-title"') &&
      has(files.pcHtml, 'id="version_badge"'),
    'PC shell must keep main content, login overlay, title, and version badge anchors.',
    'P0');

  for (const [section, label] of pcSections) {
    check('pc_visual_section', `${section}:nav-section-content`,
      has(files.pcHtml, `loadSection('${section}')`) || section === 'dashboard',
      `PC sidebar should expose ${label}.`,
      section === 'dashboard' ? 'P1' : 'P0');
    check('pc_visual_section', `${section}:mount`,
      has(files.pcHtml, `id="section-${section}"`) &&
        (section === 'dashboard' || has(files.pcHtml, `id="${section}-content"`)),
      `PC ${label} must have a visible section and content mount.`,
      'P0');
    check('pc_runtime_section', `${section}:renderer-target-safe`,
      has(files.pcCore, `${section}:`) || has(files.pcCore, `'${section}':`) || section === 'dashboard',
      `PC core must route ${label} without blank sidebar navigation.`,
      'P0');
  }

  check('pc_runtime_section', 'no-main-shell-wipe-regression',
    has(files.pcCore, 'getSectionMount') &&
      has(files.pcCore, 'renderMissingSection') &&
      !has(files.pcCore, 'main.innerHTML = global.renderSettingsSection()') &&
      !has(files.pcCore, "main.innerHTML = '<h3>") &&
      has(files.backup, "document.getElementById('backup-content')"),
    'PC renderers must never replace #main-content for ordinary menu pages.',
    'P0');

  check('pc_priority_surfaces', 'service-to-cash-commands-visible',
    has(files.dashboard, 'executive-command-center') &&
      ['jobs', 'billing', 'reports', 'vision', 'line-center'].every(page => has(files.dashboard, `openDashboardCommand('${page}')`) || has(files.dashboard, `renderCommandTile('${page}'`)),
    'Executive Command Center must keep Jobs, Billing, Reports, Vision, and LINE as first-class tiles.',
    'P0');

  check('mobile_visual_shell', 'load-order',
    ['version_config.js', 'gas_config.js', 'api_contract.js', 'mobile_shared.js', 'api_client.js', 'auth_guard.js', 'app.js'].every(name => indexOfScript(mobileScripts, name) >= 0) &&
      indexOfScript(mobileScripts, 'api_client.js') < indexOfScript(mobileScripts, 'app.js'),
    'Mobile PWA must load API client before app.js.',
    'P0');

  check('mobile_visual_shell', 'bottom-nav-and-more-sheet',
    ['nav-home', 'nav-jobs', 'nav-more', 'more-menu-overlay', 'more-menu-content'].every(id => has(files.mobileHtml, `id="${id}"`)) &&
      has(files.mobileHtml, 'nav-camera-btn') &&
      has(files.app, 'renderMoreMenu') &&
      has(files.app, 'more-menu-grid'),
    'Mobile bottom nav, center camera action, and More sheet must be present and data-driven.',
    'P0');

  for (const [page, label] of mobilePages) {
    check('mobile_visual_page', `${page}:page-container`,
      has(files.mobileHtml, `id="page-${page}"`) || ['notifications', 'customer-portal'].includes(page),
      `Mobile page ${label} must have a stable page container.`,
      'P0');
  }

  const expectedThaiLabels = ['งานบริการ', 'งานทั้งหมด', 'เปิดงาน', 'ลูกค้า', 'ลูกค้าใหม่', 'สั่งซื้อ', 'วางบิล', 'รายงาน', 'ตั้งค่า'];
  for (const label of expectedThaiLabels) {
    check('mobile_visual_labels', `label:${label}`,
      has(files.app, `'${label}'`) || has(files.mobileHtml, `>${label}<`) || has(files.mobileHtml, label),
      `Critical Thai label "${label}" must be present as UTF-8 text.`,
      'P1');
  }

  check('mobile_runtime_restore', 'last-page-and-more-active-state',
    has(files.app, 'LAST_PAGE_KEY') &&
      has(files.app, 'RESTORABLE_PAGES') &&
      has(files.app, 'getNavButtonForPage') &&
      has(files.app, 'getNavButtonForPage(savedPage)') &&
      has(files.app, 'getNavButtonForPage(page)') &&
      has(files.app, "document.getElementById('nav-more')"),
    'Mobile must reopen the previous nested page and keep More active instead of falling back to a lost tab state.',
    'P0');

  check('mobile_runtime_restore', 'back-close-protection',
    has(files.app, "window.addEventListener('popstate'") &&
      has(files.app, "window.addEventListener('beforeunload'") &&
      has(files.app, 'protectedPage') &&
      has(files.app, 'closeMoreMenu()'),
    'Mobile must protect operators from accidental close/back while in work pages or sheets.',
    'P0');

  check('priority_runtime_modules', 'real-renderers-not-empty-shells',
    has(files.jobs, 'renderJobsSection') &&
      has(files.billing, 'renderBillingSection') &&
      has(files.reports, 'renderReportModule') &&
      has(files.vision, 'renderMobileVisionPage') &&
      has(files.line, 'renderMobileLineCenterPage') &&
      !/Coming soon|TODO placeholder|ยังไม่พร้อมใช้งาน/i.test(files.reports + files.billing + files.vision + files.line),
    'Priority menus must render real modules and not blank/coming-soon shells.',
    'P0');

  check('visual_ci', 'sprint103-wired',
    has(files.workflow, 'sprint103_visual_runtime_walkthrough.js') &&
      has(files.regression, 'sprint103_visual_runtime_walkthrough.js') &&
      has(files.staticGuard, 'sprint103_visual_runtime_walkthrough.js'),
    'Sprint 103 visual/runtime walkthrough must be wired into CI and static guard.',
    'P1');

  const p0 = issues.filter(item => item.severity === 'P0').length;
  const score = Math.round((checks.filter(item => item.ok).length / checks.length) * 100);
  const status = p0 ? 'fail' : issues.length ? 'warn' : 'ok';
  const report = {
    generatedAt: new Date().toISOString(),
    sprint: 103,
    focus: 'PC/Mobile visual runtime walkthrough contracts',
    status,
    score,
    checksTotal: checks.length,
    checksPassed: checks.filter(item => item.ok).length,
    issues,
    pcScripts,
    mobileScripts,
    checks,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf8');
  fs.writeFileSync(REPORT_MD, [
    '# Sprint 103 Visual Runtime Walkthrough',
    '',
    `- Status: ${status}`,
    `- Score: ${score}/100`,
    `- Checks: ${report.checksPassed}/${checks.length}`,
    `- Issues: ${issues.length}`,
    '',
    '| Area | Check | Result | Detail |',
    '|---|---|---|---|',
    ...checks.map(item => `| ${item.area} | ${item.name} | ${item.ok ? 'OK' : item.severity} | ${item.detail} |`),
    '',
  ].join('\n'), 'utf8');

  console.log(`[Sprint 103 Visual Runtime Walkthrough] status=${status} score=${score}/100 checks=${report.checksPassed}/${checks.length}`);
  for (const issue of issues) console.log(`- [${issue.severity}] ${issue.area}/${issue.name}: ${issue.detail}`);
  if (p0) process.exit(1);
}

main().catch(err => {
  console.error('[Sprint 103 Visual Runtime Walkthrough] FAILED');
  console.error(err);
  process.exit(1);
});
