const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_DIR = path.join(ROOT, 'test_reports');
const JSON_REPORT = path.join(REPORT_DIR, 'vision_capability_latest.json');
const MD_REPORT = path.join(REPORT_DIR, 'vision_capability_latest.md');

function read(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) return '';
  return fs.readFileSync(file, 'utf8');
}

function has(text, needle) {
  return typeof needle === 'string' ? text.includes(needle) : needle.test(text);
}

function any(texts, needle) {
  return texts.some(text => has(text, needle));
}

function rel(file) {
  return file.replace(/\\/g, '/');
}

function check(id, label, ok, details, files, severity = 'required') {
  return { id, label, ok: !!ok, severity, details, files: files.map(rel) };
}

const files = {
  visionPipeline: 'clasp-ready/VisionPipeline.gs',
  visionAnalysis: 'clasp-ready/VisionAnalysis.gs',
  visionLearning: 'clasp-ready/VisionLearning.gs',
  photoQueue: 'clasp-ready/PhotoQueue.gs',
  routerSplit: 'clasp-ready/RouterSplit.gs',
  agentGateway: 'clasp-ready/AgentGateway.gs',
  config: 'clasp-ready/Config.gs',
  app: 'pwa/app.js',
  appActions: 'pwa/app_actions.js',
  billingSlip: 'pwa/billing_slip_verify.js',
  apiContract: 'pwa/api_contract.js',
  sectionVision: 'pwa/section_vision.js',
  indexHtml: 'pwa/index.html',
  dashboardPc: 'pwa/dashboard_pc.html',
  assetManifest: 'pwa/pwa_asset_manifest.js',
};

const text = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));
const allGas = [
  text.visionPipeline,
  text.visionAnalysis,
  text.visionLearning,
  text.photoQueue,
  text.routerSplit,
  text.agentGateway,
  text.config,
  read('clasp-ready/BillingPayment.gs'),
  read('clasp-ready/GpsPipeline.gs'),
  read('clasp-ready/LineBot.gs'),
  read('clasp-ready/Notify.gs'),
].join('\n');

const requiredRoutes = [
  'getVisionDashboardStats',
  'getVisionPipelineVersion',
  'getVisionLearningVersion',
  'getVisionFieldContext',
  'getVisionActionSuggestions',
  'previewVisionSuggestion',
  'getVisionReviewQueue',
  'handleProcessPhotos',
  'uploadPhoto',
  'runQCPipeline',
  'runSlipVerifyPipeline',
  'runVisionPipeline',
  'submitHumanReview',
  'linkVisionToJobTimeline',
  'executeVisionSuggestion',
  'verifyPaymentSlip',
  'getPhotoGalleryData',
];

const checks = [
  check(
    'vision-pipeline-core',
    'Core Vision pipeline supports SLIP/QC/PRODUCT analysis with validation, cache, tiered AI, logging, and dashboard stats.',
    has(text.visionPipeline, 'function runVisionPipeline') &&
      has(text.visionPipeline, 'VP_TYPES') &&
      has(text.visionPipeline, '_vpTieredAI_') &&
      has(text.visionPipeline, '_vpValidateInput_') &&
      has(text.visionPipeline, 'function getVisionDashboardStats'),
    'VisionPipeline.gs is the production AI Vision orchestration layer.',
    [files.visionPipeline]
  ),
  check(
    'gemini-vision-analysis',
    'Gemini work-photo analysis can classify job photos and produce QC hints.',
    has(text.visionAnalysis, 'function analyzeWorkImageFromBase64') &&
      has(text.visionAnalysis, '_callGeminiVision_') &&
      has(text.visionAnalysis, 'gemini-2.0-flash') &&
      has(text.visionAnalysis, 'function qualityCheck'),
    'VisionAnalysis.gs provides the low-level Gemini Vision adapter and image quality logic.',
    [files.visionAnalysis]
  ),
  check(
    'photo-queue-drive-flow',
    'Photo queue can analyze uploaded work photos, file them to Drive, update jobs, and expose gallery data.',
    has(text.photoQueue, 'function _processSinglePhoto') &&
      has(text.photoQueue, 'function _analyzeQueuedPhoto') &&
      has(text.photoQueue, 'function getPhotoGalleryData') &&
      has(text.photoQueue, 'function createBeforeAfterCollage'),
    'PhotoQueue.gs connects mobile/LINE/PC photo capture to Drive, job records, gallery, and collage generation.',
    [files.photoQueue]
  ),
  check(
    'vision-routes',
    'RouterSplit exposes the AI Vision actions used by PWA, smoke tests, and agent gateway.',
    requiredRoutes.every(action => text.routerSplit.includes(`'${action}'`)),
    `Required Vision routes: ${requiredRoutes.join(', ')}`,
    [files.routerSplit]
  ),
  check(
    'pwa-photo-capture',
    'Mobile PWA can capture photos, queue offline writes, upload online, and read the photo gallery.',
    has(text.appActions, 'function handlePhoto') &&
      has(text.appActions, "callAPI('handleProcessPhotos'") &&
      has(text.appActions, 'saveOfflineAction') &&
      has(text.appActions, "callAPI('getPhotoGalleryData'"),
    'app_actions.js is the mobile Vision entry point for camera/file capture.',
    [files.appActions]
  ),
  check(
    'payment-slip-vision-ui',
    'Billing slip verification UI is wired to the backend verifyPaymentSlip action.',
    has(text.billingSlip, 'function verifySlipWithAI') &&
      has(text.billingSlip, "callAPI('verifyPaymentSlip'") &&
      has(text.billingSlip, 'openSlipUploadModal'),
    'billing_slip_verify.js supports AI-assisted payment slip verification.',
    [files.billingSlip]
  ),
  check(
    'vision-operations-ui',
    'PC and mobile expose an AI Vision operations panel backed by the same protected actions.',
    has(text.sectionVision, 'function renderVisionSection') &&
      has(text.sectionVision, 'function renderMobileVisionPage') &&
      has(text.sectionVision, "visionApi('getVisionDashboardStats'") &&
      has(text.sectionVision, "visionApi('runVisionPipeline'") &&
      has(text.sectionVision, "visionApi('getVisionFieldContext'") &&
      has(text.sectionVision, "visionApi('getVisionActionSuggestions'") &&
      has(text.sectionVision, "visionApi('previewVisionSuggestion'") &&
      has(text.sectionVision, "visionApi('getVisionReviewQueue'") &&
      has(text.sectionVision, "visionApi('submitHumanReview'") &&
      has(text.sectionVision, "visionApi('linkVisionToJobTimeline'") &&
      has(text.sectionVision, "visionApi('executeVisionSuggestion'") &&
      has(text.sectionVision, 'buildFieldContext') &&
      has(text.sectionVision, 'buildActionSuggestions') &&
      has(text.sectionVision, 'runVisionSuggestion') &&
      has(text.sectionVision, 'EXECUTE_VISION_SUGGESTION') &&
      has(text.sectionVision, 'formatVisionPreviewText') &&
      has(text.indexHtml, 'page-vision') &&
      has(text.dashboardPc, "loadSection('vision')") &&
      has(text.assetManifest, 'section_vision.js'),
    'section_vision.js must be loaded on PC/mobile and expose stats, version, camera, and guarded analysis actions.',
    [files.sectionVision, files.indexHtml, files.dashboardPc, files.assetManifest]
  ),
  check(
    'api-contract-vision-workflow',
    'API contract documents protected Vision reads and destructive Vision writes.',
    has(text.apiContract, 'vision_ai') &&
      has(text.apiContract, 'getVisionDashboardStats') &&
      has(text.apiContract, 'getVisionFieldContext') &&
      has(text.apiContract, 'getVisionActionSuggestions') &&
      has(text.apiContract, 'previewVisionSuggestion') &&
      has(text.apiContract, 'linkVisionToJobTimeline') &&
      has(text.apiContract, 'executeVisionSuggestion') &&
      has(text.apiContract, 'runVisionPipeline') &&
      has(text.apiContract, 'verifyPaymentSlip') &&
      has(text.apiContract, 'smoke: false'),
    'api_contract.js must make Vision part of the same menu/workflow contract as PC and mobile.',
    [files.apiContract]
  ),
  check(
    'read-action-classification',
    'Mobile callAPI classifies Vision read actions as read-only so failures do not become offline writes.',
    has(text.app, 'getVisionDashboardStats') &&
      has(text.app, 'getVisionPipelineVersion') &&
      has(text.app, 'getVisionLearningVersion') &&
      has(text.app, 'getVisionFieldContext') &&
      has(text.app, 'getVisionActionSuggestions') &&
      has(text.app, 'getPhotoGalleryData'),
    'app.js READ_ACTIONS must know Vision dashboard/version/gallery calls are read-only.',
    [files.app]
  ),
  check(
    'secret-config-surface',
    'Config surface supports Gemini and production notification keys without storing secret values in repo.',
    has(text.config, 'GEMINI_API_KEY') &&
      any([allGas], 'GOOGLE_AI_API_KEY') &&
      has(text.config, 'LINE_CHANNEL_ACCESS_TOKEN'),
    'Only key names should exist in repo; real Gemini/LINE secrets must remain in GAS Script Properties or a private vault.',
    [files.config, files.visionPipeline, files.visionAnalysis, files.photoQueue]
  ),
  check(
    'learning-human-review',
    'Human review and learning loop are present for correcting Vision decisions over time.',
    has(text.visionPipeline, 'function submitHumanReview') &&
    has(text.visionPipeline, 'function getVisionReviewQueue') &&
      has(text.visionPipeline, 'function getVisionFieldContext') &&
      has(text.visionPipeline, 'function getVisionActionSuggestions') &&
      has(text.visionPipeline, 'function previewVisionSuggestion') &&
      has(text.visionPipeline, 'function linkVisionToJobTimeline') &&
      has(text.visionPipeline, 'function executeVisionSuggestion') &&
      has(text.visionLearning, 'function processFeedbackLoop') &&
      has(text.visionLearning, 'function getLearningDashboard') &&
      has(text.visionLearning, 'function getVisionLearningVersion'),
    'VisionLearning.gs and submitHumanReview() provide the feedback path after AI decisions.',
    [files.visionPipeline, files.visionLearning]
  ),
  check(
    'agent-gateway-vision',
    'AgentGateway can expose Vision analysis, slip, QC, review, and dashboard roles to approved agents.',
    has(text.agentGateway, "'vision.analyze'") &&
      has(text.agentGateway, "'vision.slip'") &&
      has(text.agentGateway, "'vision.qc'") &&
      has(text.agentGateway, "'vision.review'") &&
      has(text.agentGateway, "'vision.dashboard'"),
    'AgentGateway.gs is ready for controlled AI-agent access to Vision capabilities.',
    [files.agentGateway]
  ),
  check(
    'field-safety-integrations',
    'Vision photo flow is connected to geofence validation and LINE notification helpers.',
    any([allGas], 'function validatePhotoGeofence') &&
      any([allGas], 'function sendLineNotify'),
    'Geofence and LINE notification helpers let Vision output become useful field operations, not just analysis text.',
    ['clasp-ready/GpsPipeline.gs', 'clasp-ready/LineBot.gs', 'clasp-ready/Notify.gs']
  ),
];

const failures = checks.filter(item => !item.ok && item.severity === 'required');
const score = Math.round(checks.reduce((sum, item) => sum + (item.ok ? 100 : 0), 0) / checks.length);
const tokenStatus = process.env.COMPHONE_AUTH_TOKEN ? 'present' : 'missing';

const capabilities = [
  'Classify job photos as Before/After/Survey/Equipment with Gemini Vision fallback.',
  'Queue mobile/LINE/PC photos, process them, file to Drive, update job records, and build before/after collage data.',
  'Run QC and product/slip Vision pipelines with validation, cache, confidence, decision, and log output.',
  'Support AI-assisted billing slip verification from the PWA billing UI.',
  'Expose Vision dashboard stats, learning version, human review, and AgentGateway vision roles.',
  'Link approved or reviewed Vision results back to job timeline context for field operations.',
  'Suggest next actions from Vision decisions while keeping writes behind human confirmation.',
  'Execute selected Vision suggestions through a server whitelist and explicit confirmation gate.',
  'Preview controlled execution writes and LINE rooms before committing production changes.',
  'Keep real Gemini/LINE/API keys out of the repo; only Script Property key names are tracked.',
];

const gaps = [];
if (!process.env.COMPHONE_AUTH_TOKEN) {
  gaps.push('Runtime protected Vision API calls were not executed because COMPHONE_AUTH_TOKEN is not set in this process.');
}
if (!has(text.apiContract, 'vision_ai')) {
  gaps.push('Vision workflow is missing from api_contract.js.');
}
if (!has(text.app, 'getVisionDashboardStats')) {
  gaps.push('Mobile read-action classification does not include Vision dashboard/version reads.');
}
if (!has(text.billingSlip, "callAPI('verifyPaymentSlip'")) {
  gaps.push('Payment slip UI is not wired to the protected verifyPaymentSlip action.');
}

const report = {
  generated_at: new Date().toISOString(),
  version: 'vision-audit-1.0.0',
  score,
  token_status: tokenStatus,
  required_routes: requiredRoutes,
  capabilities,
  gaps,
  checks,
};

fs.mkdirSync(REPORT_DIR, { recursive: true });
fs.writeFileSync(JSON_REPORT, JSON.stringify(report, null, 2));
fs.writeFileSync(MD_REPORT, [
  '# COMPHONE AI Vision Capability Audit',
  '',
  `- Generated: ${report.generated_at}`,
  `- Score: ${score}/100`,
  `- Auth token for runtime protected checks: ${tokenStatus}`,
  '',
  '## Capabilities',
  ...capabilities.map(item => `- ${item}`),
  '',
  '## Checks',
  ...checks.map(item => `- ${item.ok ? 'OK' : 'FAIL'} ${item.id}: ${item.label}`),
  '',
  '## Gaps',
  ...(gaps.length ? gaps.map(item => `- ${item}`) : ['- No local structural gaps detected.']),
  '',
].join('\n'));

if (failures.length) {
  console.error('[Vision Capability Audit] FAILED');
  failures.forEach(item => console.error(`- ${item.id}: ${item.details}`));
  console.error(`[Vision Capability Audit] report: ${rel(path.relative(ROOT, JSON_REPORT))}`);
  process.exit(1);
}

console.log(`[Vision Capability Audit] OK ${score}/100`);
console.log(`[Vision Capability Audit] report: ${rel(path.relative(ROOT, JSON_REPORT))}`);
