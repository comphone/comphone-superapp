#!/usr/bin/env node
/*
 * Sprint 126 AI Vision + Role Readiness Audit
 *
 * Documents and guards the production readiness boundary:
 * - role-based PC/mobile dashboard widgets are present
 * - AI Vision read surfaces are available and token-aware
 * - real image analysis remains behind explicit safety gates
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'test_reports', 'sprint126_ai_vision_role_readiness_latest.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, needle) {
  return typeof needle === 'string' ? text.includes(needle) : needle.test(text);
}

const checks = [];
function check(name, pass, detail, readiness = 'required') {
  checks.push({ name, pass: Boolean(pass), detail, readiness });
}

const files = {
  dashboard: read('pwa/dashboard.js'),
  appHome: read('pwa/app_home.js'),
  sectionVision: read('pwa/section_vision.js'),
  apiContract: read('pwa/api_contract.js'),
  versionConfig: read('pwa/version_config.js'),
  visionRuntimeSmoke: read('scripts/vision_runtime_smoke.js'),
  visionE2eSmoke: read('scripts/vision_e2e_smoke.js'),
  visionCapability: read('scripts/vision_capability_audit.js'),
  sprint124: read('scripts/sprint124_protected_visual_menu_qa.js'),
  sprint125: read('scripts/sprint125_role_based_dashboard_widgets_audit.js'),
  staticGuard: read('scripts/pwa_static_guard.js'),
  regressionGuard: read('scripts/regression-guard.sh'),
  autoDeploy: read('.github/workflows/auto-deploy.yml'),
  blueprint: read('BLUEPRINT.md'),
  visionPipeline: read('clasp-ready/VisionPipeline.gs'),
  visionAnalysis: read('clasp-ready/VisionAnalysis.gs'),
  routerSplit: read('clasp-ready/RouterSplit.gs'),
  config: read('clasp-ready/Config.gs'),
};

check(
  'role-dashboard-surfaces',
  has(files.dashboard, 'function renderRoleFocusWidget') &&
    has(files.appHome, 'function renderMobileRoleFocus') &&
    ['tech', 'admin', 'acct', 'exec'].every(role => has(files.sprint125, role)) &&
    has(files.sprint124, 'Mobile AI Vision'),
  'PC/mobile dashboard role widgets and protected visual menu QA must stay connected.'
);

check(
  'vision-ui-readiness',
  has(files.sectionVision, 'function renderVisionSection') &&
    has(files.sectionVision, 'function renderMobileVisionPage') &&
    has(files.sectionVision, "visionApi('getVisionDashboardStats'") &&
    has(files.sectionVision, "visionApi('getVisionFieldContext'") &&
    has(files.sectionVision, "visionApi('getVisionReviewQueue'") &&
    has(files.apiContract, 'vision_ai'),
  'AI Vision must remain a first-class PC/mobile surface with read-ready protected actions.'
);

check(
  'vision-analysis-gated',
  has(files.sectionVision, "confirm('Run AI Vision analysis") &&
    has(files.visionE2eSmoke, "COMPHONE_VISION_E2E === '1'") &&
    has(files.visionE2eSmoke, "COMPHONE_VISION_E2E_CONFIRM === 'RUN_VISION_ANALYSIS'") &&
    has(files.visionPipeline, 'function runVisionPipeline') &&
    has(files.visionAnalysis, 'function analyzeWorkImageFromBase64'),
  'Real image analysis must require operator confirmation and explicit smoke-test gates.'
);

check(
  'gemini-secret-contract',
  has(files.config, 'GEMINI_API_KEY') &&
    has(files.config, 'GOOGLE_AI_API_KEY') &&
    has(files.visionPipeline, "getConfigSafe_('GEMINI_API_KEY'") &&
    has(files.visionAnalysis, "getConfig('GEMINI_API_KEY'"),
  'Repo stores only Gemini key names; real secret values must stay in Apps Script Properties/private vault.'
);

check(
  'runtime-smoke-boundary',
  has(files.visionRuntimeSmoke, 'Vision Runtime Smoke') &&
    has(files.visionRuntimeSmoke, 'getVisionDashboardStats') &&
    has(files.visionRuntimeSmoke, 'getVisionPipelineVersion') &&
    has(files.visionRuntimeSmoke, 'getVisionActionSuggestions') &&
    has(files.visionRuntimeSmoke, 'Gemini key is not configured'),
  'Vision runtime smoke must be read-only, token-aware, and able to explain Gemini readiness.'
);

check(
  'router-contract',
  [
    'getVisionDashboardStats',
    'getVisionPipelineVersion',
    'getVisionLearningVersion',
    'getVisionFieldContext',
    'getVisionActionSuggestions',
    'getVisionReviewQueue',
    'runVisionPipeline',
    'executeVisionSuggestion',
  ].every(action => has(files.routerSplit, `'${action}'`)),
  'RouterSplit must expose the Vision read and controlled execution actions used by PWA and smoke tests.'
);

check(
  'operator-version-notes',
  has(files.versionConfig, 'AI Vision runtime smoke and browser self-test') &&
    has(files.versionConfig, 'AI Vision E2E safety gate and human review queue') &&
    has(files.versionConfig, 'Sprint 125 role-based dashboard widgets'),
  'Version notes should tell future agents that Vision and role dashboards are release contracts.'
);

check(
  'ci-wiring',
  has(files.staticGuard, 'SPRINT126_AI_VISION_ROLE_READINESS') &&
    has(files.regressionGuard, 'sprint126_ai_vision_role_readiness_audit.js') &&
    has(files.autoDeploy, 'scripts/sprint126_ai_vision_role_readiness_audit.js'),
  'Sprint 126 audit must be wired into static guard, regression guard, and GitHub Actions.'
);

check(
  'blueprint-current',
  has(files.blueprint, 'Phase 126 AI Vision + Role Readiness') &&
    has(files.blueprint, 'sprint126_ai_vision_role_readiness_audit.js') &&
    has(files.blueprint, 'AI Vision read-runtime ready; real image analysis remains confirmation-gated'),
  'BLUEPRINT.md must document the current AI Vision operating boundary.'
);

const failed = checks.filter(item => !item.pass);
const report = {
  generated_at: new Date().toISOString(),
  sprint: 126,
  title: 'AI Vision + Role Readiness Audit',
  token_present: !!process.env.COMPHONE_AUTH_TOKEN,
  ai_vision_status: {
    read_runtime: 'ready when COMPHONE_AUTH_TOKEN is supplied',
    real_image_analysis: 'available only with COMPHONE_AUTH_TOKEN plus COMPHONE_VISION_E2E=1 and COMPHONE_VISION_E2E_CONFIRM=RUN_VISION_ANALYSIS',
    secret_policy: 'GEMINI_API_KEY stays in Apps Script Properties/private vault; repo stores key names only',
  },
  score: `${checks.length - failed.length}/${checks.length}`,
  checks,
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf8');

console.log('Sprint 126 AI Vision + Role Readiness Audit');
console.log(`Score: ${report.score}`);
for (const item of checks) {
  console.log(`${item.pass ? 'OK ' : 'FAIL'} ${item.name} - ${item.detail}`);
}
console.log(`[Sprint 126] report: ${path.relative(ROOT, REPORT_PATH).replace(/\\/g, '/')}`);

if (failed.length) process.exitCode = 1;
