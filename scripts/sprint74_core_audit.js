#!/usr/bin/env node
/*
 * COMPHONE Sprint 74 core system audit.
 *
 * This audit is intentionally broad. It does not replace the focused guards;
 * it reads the production source tree and checks that the major contracts still
 * line up after recovery work: version/source of truth, API/auth contract,
 * PC/mobile menu surfaces, write-flow safety, AI/LINE readiness, CI/CD guards,
 * and the current technical-debt register.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PWA = path.join(ROOT, 'pwa');
const GAS = path.join(ROOT, 'clasp-ready');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const REPORT_JSON = path.join(REPORT_DIR, 'sprint74_core_audit_latest.json');
const REPORT_MD = path.join(REPORT_DIR, 'sprint74_core_audit_latest.md');
const ROOT_REPORT_MD = path.join(ROOT, 'SPRINT_74_CORE_AUDIT.md');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function extract(text, regex, fallback = '') {
  const match = text.match(regex);
  return match ? match[1] : fallback;
}

function allMatches(text, regex) {
  return [...text.matchAll(regex)].map(match => match[1]).filter(Boolean);
}

function localScripts(html) {
  return [...html.matchAll(/<script\s+src=["']([^"']+)["']/g)]
    .map(match => match[1].split('?')[0])
    .filter(src => !/^https?:\/\//.test(src) && !src.startsWith('//'));
}

function unique(items) {
  return [...new Set(items.filter(Boolean))].sort();
}

function has(text, pattern) {
  return pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
}

function loadJsonIfExists(rel) {
  if (!exists(rel)) return null;
  try {
    return JSON.parse(read(rel));
  } catch (err) {
    return { parse_error: err.message };
  }
}

function readIfExists(rel) {
  return exists(rel) ? read(rel) : '';
}

function scoreFromIssues(issues) {
  const penalty = issues.reduce((sum, issue) => {
    if (issue.severity === 'P0') return sum + 30;
    if (issue.severity === 'P1') return sum + 8;
    return sum + 3;
  }, 0);
  return Math.max(0, 100 - penalty);
}

function statusFromScore(score, issues) {
  if (issues.some(issue => issue.severity === 'P0')) return 'fail';
  if (issues.some(issue => issue.severity === 'P1')) return 'warn';
  if (score < 95) return 'watch';
  return 'ok';
}

function mdEscape(value) {
  return String(value || '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

async function main() {
  const now = new Date().toISOString();
  const checks = [];
  const issues = [];

  function check(area, name, ok, severity, detail, remediation = '') {
    const row = { area, name, ok: !!ok, severity, detail, remediation };
    checks.push(row);
    if (!row.ok) issues.push(row);
  }

  const files = {
    version: read('pwa/version_config.js'),
    gasConfig: read('pwa/gas_config.js'),
    sw: read('pwa/sw.js'),
    mobileHtml: read('pwa/index.html'),
    pcHtml: read('pwa/dashboard_pc.html'),
    app: read('pwa/app.js'),
    appActions: readIfExists('pwa/app_actions.js'),
    pcCore: read('pwa/dashboard_pc_core.js'),
    apiClient: read('pwa/api_client.js'),
    apiContractText: read('pwa/api_contract.js'),
    runtimeSelfTest: readIfExists('pwa/runtime_self_test.js'),
    settings: readIfExists('pwa/section_settings.js'),
    lineCenter: readIfExists('pwa/section_line_center.js'),
    visionSection: readIfExists('pwa/section_vision.js'),
    router: read('clasp-ready/Router.gs'),
    routerSplit: read('clasp-ready/RouterSplit.gs'),
    auth: readIfExists('clasp-ready/Auth.gs'),
    config: read('clasp-ready/Config.gs'),
    deployWorkflow: readIfExists('.github/workflows/auto-deploy.yml'),
    gasWorkflow: readIfExists('.github/workflows/deploy-gas.yml'),
    driveWorkflow: readIfExists('.github/workflows/drive-sync.yml'),
    regressionGuard: readIfExists('scripts/regression-guard.sh'),
  };

  const apiContract = require(path.join(PWA, 'api_contract.js'));
  const appVersion = extract(files.version, /version:\s*['"]([^'"]+)['"]/);
  const buildTimestamp = extract(files.version, /buildTimestamp:\s*['"]([^'"]+)['"]/);
  const cacheVersion = extract(files.version, /cacheVersion:\s*['"]([^'"]+)['"]/);
  const gasUrl = extract(files.gasConfig, /url:\s*['"]([^'"]+)['"]/);
  const gasDeployVersion = extract(files.gasConfig, /version:\s*['"]([^'"]+)['"]/);
  const swCache = extract(files.sw, /CACHE_V\s*=\s*['"]([^'"]+)['"]/);
  const mobileScripts = localScripts(files.mobileHtml);
  const pcScripts = localScripts(files.pcHtml);

  check('source-of-truth', 'frontend-version-present',
    appVersion && buildTimestamp && cacheVersion,
    'P0',
    `version=${appVersion || 'missing'} build=${buildTimestamp || 'missing'} cache=${cacheVersion || 'missing'}`,
    'Keep pwa/version_config.js as the single version source.');
  check('source-of-truth', 'service-worker-cache-matches-version-config',
    swCache === cacheVersion,
    'P0',
    `sw=${swCache || 'missing'} version_config=${cacheVersion || 'missing'}`,
    'Update pwa/sw.js and pwa/version_config.js together.');
  check('source-of-truth', 'mobile-cache-bust-build-timestamp',
    files.mobileHtml.includes(`t=${buildTimestamp}`),
    'P1',
    'Mobile shell should include the current build timestamp on local assets.',
    'Run the version/cache-buster update script before deploy.');
  check('source-of-truth', 'pc-cache-bust-build-timestamp',
    files.pcHtml.includes(`t=${buildTimestamp}`),
    'P1',
    'PC shell should include the current build timestamp on local assets.',
    'Run the version/cache-buster update script before deploy.');
  check('source-of-truth', 'gas-url-single-production-value',
    gasUrl && files.mobileHtml.includes('gas_config.js') && files.pcHtml.includes('gas_config.js') &&
      !files.apiClient.includes('script.google.com/macros/s/') &&
      !files.app.includes('script.google.com/macros/s/'),
    'P1',
    `production GAS URL=${gasUrl || 'missing'}`,
    'Keep production URL in pwa/gas_config.js only; frontend modules must read window.COMPHONE_GAS_URL.');
  check('source-of-truth', 'blueprint-runtime-snapshot-current',
    exists('BLUEPRINT.md') && read('BLUEPRINT.md').includes(appVersion) && read('BLUEPRINT.md').includes(gasUrl),
    'P2',
    'BLUEPRINT should mention the current app version and GAS URL.',
    'Update BLUEPRINT after each production deployment or audit sprint.');

  const publicActions = (apiContract.publicActions || []).map(item => item.action).sort();
  const publicAllowed = ['getVersion', 'health'];
  const extraPublic = publicActions.filter(action => !publicAllowed.includes(action));
  check('backend-contract', 'api-contract-public-actions-minimal',
    extraPublic.length === 0,
    'P0',
    `publicActions=${publicActions.join(', ') || 'none'}`,
    'Only health/getVersion should be public in the frontend API contract.');
  check('backend-contract', 'router-auth-contract-accepts-valid-or-success',
    has(files.router, 'auth.success || auth.valid') && has(files.router, 'auth.session || auth'),
    'P0',
    'Router auth gate must accept the Auth.gs { valid, session } contract and legacy { success } contract.',
    'Keep Router.gs auth gate compatible with verifySession() response shape.');
  check('backend-contract', 'router-public-whitelist-not-sensitive',
    !/var PUBLIC_ACTIONS[\s\S]{0,1200}'listCustomers'/.test(files.router) &&
      !/var PUBLIC_ACTIONS[\s\S]{0,1200}'getSecurityStatus'/.test(files.router) &&
      !/var PUBLIC_ACTIONS[\s\S]{0,1200}'listBillings'/.test(files.router),
    'P0',
    'PUBLIC_ACTIONS must not expose customer, billing, inventory, reports, or security data.',
    'Move internal read-only actions behind token verification.');
  const requiredActions = unique((apiContract.menus || [])
    .flatMap(menu => (menu.actions || []).filter(action => action.required).map(action => action.action)));
  const missingRequiredActions = requiredActions.filter(action => !files.routerSplit.includes(`'${action}'`) && !files.routerSplit.includes(`"${action}"`));
  check('backend-contract', 'required-menu-actions-routed',
    missingRequiredActions.length === 0,
    'P0',
    missingRequiredActions.length ? `missing=${missingRequiredActions.join(', ')}` : `${requiredActions.length} required actions routed`,
    'Every required menu action in pwa/api_contract.js needs a RouterSplit route.');
  check('backend-contract', 'line-room-push-confirmation-gated',
    has(files.routerSplit, 'sendLineRoomMessage') && has(readIfExists('clasp-ready/LineCommandCenter.gs'), 'SEND_LINE_ROOM_MESSAGE'),
    'P1',
    'LINE room sends must require explicit confirmation.',
    'Keep sendLineRoomMessage behind confirmation and backend role checks.');

  const requiredMobileScripts = [
    'version_config.js', 'gas_config.js', 'api_contract.js', 'api_client.js', 'auth_guard.js',
    'app.js', 'app_actions.js', 'section_vision.js', 'section_line_center.js',
    'reports.js', 'menu_health.js', 'runtime_self_test.js', 'pwa_install.js',
  ];
  const requiredPcScripts = [
    'version_config.js', 'gas_config.js', 'api_contract.js', 'api_client.js',
    'section_jobs.js', 'section_po.js', 'section_inventory.js', 'section_crm.js',
    'section_billing.js', 'section_tax.js', 'section_vision.js', 'section_line_center.js',
    'section_settings.js', 'reports.js', 'section_reports.js', 'menu_health.js',
    'runtime_self_test.js', 'dashboard_pc_core.js',
  ];
  const missingMobileScripts = requiredMobileScripts.filter(script => !mobileScripts.includes(script));
  const missingPcScripts = requiredPcScripts.filter(script => !pcScripts.includes(script));
  check('frontend-runtime', 'mobile-critical-scripts-loaded',
    missingMobileScripts.length === 0,
    'P0',
    missingMobileScripts.length ? `missing=${missingMobileScripts.join(', ')}` : `${requiredMobileScripts.length} critical mobile scripts loaded`,
    'Mobile shell must load API client, route modules, diagnostics, and PWA install support.');
  check('frontend-runtime', 'pc-critical-scripts-loaded',
    missingPcScripts.length === 0,
    'P0',
    missingPcScripts.length ? `missing=${missingPcScripts.join(', ')}` : `${requiredPcScripts.length} critical PC scripts loaded`,
    'PC shell must load all production section renderers and diagnostics.');
  check('frontend-runtime', 'mobile-last-page-restore',
    has(files.app, 'LAST_PAGE_KEY') && has(files.app, 'restoreLastPage') && has(files.app, 'localStorage.setItem(LAST_PAGE_KEY'),
    'P1',
    'Mobile should restore the last active page after reload/reopen.',
    'Keep last-page persistence in app.js for mobile workflows.');
  check('frontend-runtime', 'pc-last-section-restore',
    has(files.pcCore, 'LAST_SECTION_KEY') && has(files.pcCore, 'localStorage.getItem(LAST_SECTION_KEY') &&
      has(files.pcCore, 'localStorage.setItem(LAST_SECTION_KEY'),
    'P1',
    'PC should restore the last active section after reload/reopen.',
    'Keep last-section persistence in dashboard_pc_core.js.');
  check('frontend-runtime', 'safe-service-worker-repair',
    has(files.sw, 'NAVIGATION_FALLBACK') && has(readIfExists('pwa/pwa_install.js'), 'repairServiceWorker') &&
      has(readIfExists('pwa/pwa_install.js'), 'unregister'),
    'P1',
    'PWA install path should repair stale service workers and avoid stale navigation caching.',
    'Keep pwa_install.js repair flow and sw.js navigation fallback hardening.');
  check('frontend-runtime', 'grouped-mobile-more-menu',
    has(files.app, 'MENU_GROUPS') && has(files.app, 'renderMoreMenu') && has(files.app, 'data-menu-page') &&
      has(files.mobileHtml, 'more-menu-overlay'),
    'P1',
    'Mobile More menu should be grouped, scrollable, and data driven.',
    'Add future menu items to MENU_GROUPS instead of hard-coding scattered buttons.');

  const functionalReport = loadJsonIfExists('test_reports/pwa_functional_menu_audit_latest.json');
  const menuJourneyReport = loadJsonIfExists('test_reports/pwa_menu_journey_latest.json') ||
    loadJsonIfExists('test_reports/pwa_menu_journey_audit_latest.json');
  const systemReport = loadJsonIfExists('test_reports/system_integrity_latest.json');
  check('menu-data-reality', 'functional-menu-audit-report-healthy',
    functionalReport && !functionalReport.parse_error && functionalReport.score === 100,
    'P1',
    functionalReport ? `score=${functionalReport.score || 'unknown'}` : 'missing report',
    'Run node scripts/pwa_functional_menu_audit.js after menu changes.');
  check('menu-data-reality', 'system-integrity-report-healthy',
    systemReport && !systemReport.parse_error && ((systemReport.score || (systemReport.summary && systemReport.summary.score)) === 100),
    'P1',
    systemReport ? `score=${systemReport.score || (systemReport.summary && systemReport.summary.score) || 'unknown'}` : 'missing report',
    'Run node scripts/system_integrity_audit.js after route/API changes.');
  check('menu-data-reality', 'menu-journey-report-healthy',
    menuJourneyReport && !menuJourneyReport.parse_error && menuJourneyReport.score === 100,
    'P1',
    menuJourneyReport ? `score=${menuJourneyReport.score || 'unknown'}` : 'missing report',
    'Run node scripts/pwa_menu_journey_audit.js after navigation changes.');
  check('menu-data-reality', 'pc-reports-real-renderer',
    has(files.pcCore, 'renderReportsSection') && has(readIfExists('pwa/section_reports.js') + readIfExists('pwa/reports.js'), 'getReportData'),
    'P1',
    'PC reports must route to the real report renderer and backend data action.',
    'Do not replace production report pages with placeholder shells.');
  check('menu-data-reality', 'mobile-quick-actions-configurable',
    has(files.app, 'showQuickActionSettings') && has(files.app, 'QUICK_ACTIONS_KEY') && has(files.mobileHtml, 'showQuickActionSettings'),
    'P1',
    'Mobile profile/settings should let operators configure dashboard quick actions.',
    'Keep quick-action settings available from the mobile profile/settings surface.');

  const writeSource = [
    files.apiClient, files.appActions, readIfExists('pwa/billing_section.js'),
    readIfExists('pwa/purchase_order.js'), readIfExists('pwa/section_crm.js'),
  ].join('\n');
  check('write-flow-safety', 'idempotent-write-request-ids',
    has(writeSource, 'createWriteRequestId') && has(writeSource, 'client_request_id') &&
      has(readIfExists('clasp-ready/JobsHandler.gs') + readIfExists('clasp-ready/CustomerManager.gs') +
        readIfExists('clasp-ready/InventoryPO.gs'), 'client_request_id') &&
      has(readIfExists('clasp-ready/JobsHandler.gs'), 'getIdempotentReplay_') &&
      has(readIfExists('clasp-ready/JobsHandler.gs'), 'rememberIdempotentResult_'),
    'P0',
    'Create flows must carry client_request_id into backend writes.',
    'Keep client_request_id on openJob/createCustomer/createBilling/createPurchaseOrder payloads.');
  check('write-flow-safety', 'double-submit-guards-present',
    has(writeSource, 'dataset.submitting') && has(writeSource, 'disabled = true'),
    'P1',
    'Write buttons should prevent double submit while requests are pending.',
    'Keep submit buttons disabled until API result/failure completes.');
  check('write-flow-safety', 'destructive-actions-confirmed',
    has(readIfExists('pwa/job_workflow.js') + readIfExists('pwa/billing_section.js') + readIfExists('pwa/purchase_order.js'), 'confirm(') &&
      has(files.visionSection, 'EXECUTE_VISION_SUGGESTION') &&
      has(files.lineCenter, 'SEND_LINE_ROOM_MESSAGE'),
    'P1',
    'Destructive job/billing/PO/Vision/LINE actions should require operator confirmation.',
    'Keep explicit confirmation phrases for AI/LINE and confirm dialogs for manual destructive actions.');

  check('ai-line-readiness', 'vision-capability-surface-present',
    exists('clasp-ready/VisionPipeline.gs') && has(files.visionSection, 'getVisionDashboardStats') &&
      has(files.visionSection, 'previewVisionSuggestion') && has(files.visionSection, 'executeVisionSuggestion'),
    'P1',
    'Vision backend and PC/mobile UI should expose stats, preview, and controlled execution.',
    'Keep Vision actions in RouterSplit/API contract/UI aligned.');
  check('ai-line-readiness', 'gemini-secret-warning-not-hard-block',
    has(files.runtimeSelfTest, 'Gemini') && has(files.runtimeSelfTest, 'warn'),
    'P2',
    'Missing Gemini key should show warning but not block login/menu runtime.',
    'Restore GEMINI_API_KEY in Apps Script Properties for real Gemini analysis.');
  check('ai-line-readiness', 'line-command-center-present',
    exists('clasp-ready/LineCommandCenter.gs') && has(files.lineCenter, 'getLineCommandCenter') &&
      has(files.lineCenter, 'previewLineRoomMessage'),
    'P1',
    'LINE Center should expose room status, queue, preview, and safe send flow.',
    'Keep room IDs/tokens backend-only and use preview before send.');

  const secretLikePatterns = [
    /AIza[0-9A-Za-z_-]{25,}/,
    /xox[baprs]-[0-9A-Za-z-]{20,}/,
    /LINE_CHANNEL_ACCESS_TOKEN\s*[:=]\s*['"][^'"]{20,}/,
    /GEMINI_API_KEY\s*[:=]\s*['"][^'"]{20,}/,
  ];
  const scannedForSecrets = [
    'pwa/gas_config.js', 'pwa/version_config.js', 'pwa/api_client.js',
    'pwa/index.html', 'pwa/dashboard_pc.html', 'clasp-ready/Config.gs',
    'clasp-ready/LineCommandCenter.gs', 'clasp-ready/VisionPipeline.gs',
  ].map(rel => readIfExists(rel)).join('\n');
  const leakedSecret = secretLikePatterns.some(pattern => pattern.test(scannedForSecrets));
  check('security-secrets', 'no-obvious-real-secrets-in-repo',
    !leakedSecret,
    'P0',
    leakedSecret ? 'secret-like token detected in tracked source' : 'no obvious Gemini/LINE/Slack token pattern detected in audited source set',
    'Keep real secrets in Apps Script Properties or GitHub Secrets only.');

  check('ci-cd-recovery', 'github-actions-critical-scripts-exist',
    [
      'scripts/pwa_static_guard.js', 'scripts/pwa_api_smoke.js',
      'scripts/regression-guard.sh', 'scripts/guard-self-test.sh',
      'scripts/build_code_index.js', 'scripts/pages_deploy_verify.js',
    ].every(exists),
    'P0',
    'GitHub workflow referenced scripts must exist in repo.',
    'Do not merge workflow references without committing the scripts.');
  check('ci-cd-recovery', 'auto-deploy-watches-runtime-critical-paths',
    has(files.deployWorkflow, "'pwa/**'") && has(files.deployWorkflow, "'*.gs'") &&
      has(files.deployWorkflow, "'clasp-ready/**'") && has(files.deployWorkflow, "'scripts/**'"),
    'P1',
    'Auto deploy should trigger when PWA, GAS, clasp-ready, or guard scripts change.',
    'Keep workflow path filters broad enough for deploy-critical changes.');
  check('ci-cd-recovery', 'regression-guard-runs-focused-audits',
    [
      'build_code_index.js', 'system_integrity_audit.js', 'pwa_functional_menu_audit.js',
      'vision_capability_audit.js', 'pwa_ui_write_contract.js', 'pwa_menu_journey_audit.js',
    ].every(name => has(files.regressionGuard, name)),
    'P1',
    'Regression guard should run core focused audits before deploy.',
    'Add new high-value audits to scripts/regression-guard.sh.');
  check('ci-cd-recovery', 'recovery-audit-documented',
    exists('RECOVERY_AUDIT_20260513.md') && has(read('RECOVERY_AUDIT_20260513.md'), 'stable'),
    'P2',
    'Recovery baseline should remain documented for rollback reasoning.',
    'Keep recovery report and pre-recovery stash/branch references in BLUEPRINT.');

  const cleanupPlan = loadJsonIfExists('test_reports/pwa_smoke_cleanup_plan_latest.json');
  const cleanupCandidates = cleanupPlan && Array.isArray(cleanupPlan.candidates) ? cleanupPlan.candidates.length : null;
  check('technical-debt', 'smoke-test-data-review-tracked',
    cleanupCandidates !== null,
    'P2',
    cleanupCandidates === null ? 'cleanup planner report missing' : `${cleanupCandidates} smoke/test records currently marked for review`,
    'Review smoke-created records before enabling destructive cleanup mode.');

  const areaSummary = checks.reduce((acc, row) => {
    if (!acc[row.area]) acc[row.area] = { total: 0, ok: 0, issues: 0 };
    acc[row.area].total += 1;
    if (row.ok) acc[row.area].ok += 1;
    else acc[row.area].issues += 1;
    return acc;
  }, {});
  const score = scoreFromIssues(issues);
  const status = statusFromScore(score, issues);
  const report = {
    name: 'COMPHONE Sprint 74 Core System Audit',
    generated_at: now,
    app_version: appVersion,
    build_timestamp: buildTimestamp,
    cache_version: cacheVersion,
    gas_url: gasUrl,
    gas_deploy_version: gasDeployVersion,
    api_contract_version: apiContract.version,
    score,
    status,
    totals: {
      checks: checks.length,
      passed: checks.filter(row => row.ok).length,
      issues: issues.length,
      p0: issues.filter(row => row.severity === 'P0').length,
      p1: issues.filter(row => row.severity === 'P1').length,
      p2: issues.filter(row => row.severity === 'P2').length,
    },
    area_summary: areaSummary,
    checks,
    issues,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2));

  const md = [
    '# Sprint 74 Core System Audit',
    '',
    `Generated: ${now}`,
    '',
    `Score: **${score}/100**`,
    `Status: **${status.toUpperCase()}**`,
    `App: \`${appVersion}\` / build \`${buildTimestamp}\``,
    `GAS: \`${gasDeployVersion}\` / ${gasUrl}`,
    '',
    '## Area Summary',
    '',
    '| Area | Passed | Issues | Total |',
    '|---|---:|---:|---:|',
    ...Object.entries(areaSummary).map(([area, row]) => `| ${mdEscape(area)} | ${row.ok} | ${row.issues} | ${row.total} |`),
    '',
    '## Findings',
    '',
    issues.length
      ? '| Severity | Area | Finding | Detail | Remediation |\n|---|---|---|---|---|\n' +
        issues.map(row => `| ${row.severity} | ${mdEscape(row.area)} | ${mdEscape(row.name)} | ${mdEscape(row.detail)} | ${mdEscape(row.remediation)} |`).join('\n')
      : 'No P0/P1/P2 findings. Core system contracts are aligned.',
    '',
    '## Passed Checks',
    '',
    '| Area | Check | Detail |',
    '|---|---|---|',
    ...checks.filter(row => row.ok).map(row => `| ${mdEscape(row.area)} | ${mdEscape(row.name)} | ${mdEscape(row.detail)} |`),
    '',
    '## Next Operator Actions',
    '',
    '- Restore Gemini secret in Apps Script Properties if AI Vision real analysis must be fully online.',
    '- Review smoke-created records from the cleanup planner before enabling destructive cleanup mode.',
    '- Re-run this audit after any Hermes/agent-assisted bulk edit before deploy.',
    '',
  ].join('\n');

  fs.writeFileSync(REPORT_MD, md);
  fs.writeFileSync(ROOT_REPORT_MD, md);

  console.log(`[Sprint 74 Core Audit] score=${score}/100 status=${status} checks=${checks.length} issues=${issues.length}`);
  console.log(`[Sprint 74 Core Audit] report: ${path.relative(ROOT, REPORT_JSON).replace(/\\/g, '/')}`);
  if (issues.length) {
    for (const issue of issues) {
      console.log(`[${issue.severity}] ${issue.area}/${issue.name}: ${issue.detail}`);
    }
  }

  if (issues.some(issue => issue.severity === 'P0')) {
    process.exitCode = 1;
  }
}

main().catch(err => {
  console.error('[Sprint 74 Core Audit] FAILED:', err.stack || err.message);
  process.exitCode = 1;
});
