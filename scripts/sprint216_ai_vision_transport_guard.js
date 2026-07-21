#!/usr/bin/env node
/**
 * Sprint 216 Current Gemini Model & Large Payload Guard
 * Prevents retired-model regressions and false-positive AI Vision acceptance.
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint216_ai_vision_transport_guard_latest.json');
const read = relative => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const digest = source => crypto.createHash('sha256').update(source).digest('hex');

function aligned(file) {
  return digest(read(file)) === digest(read(path.join('clasp-ready', file)));
}

function main() {
  const config = read('clasp-ready/Config.gs');
  const analysis = read('clasp-ready/VisionAnalysis.gs');
  const pipeline = read('clasp-ready/VisionPipeline.gs');
  const line = read('clasp-ready/AILinePrompts.gs');
  const reorder = read('clasp-ready/InventoryReorderAI.gs');
  const router = read('clasp-ready/Router.gs');
  const apiClient = read('pwa/api_client.js');
  const samplePilot = read('scripts/sprint163_ai_vision_real_sample_pilot.js');
  const visionSmoke = read('scripts/vision_e2e_smoke.js');
  const regression = read('scripts/regression-guard.sh');
  const staticGuard = read('scripts/pwa_static_guard.js');
  const workflow = read('.github/workflows/auto-deploy.yml');
  const blueprint = read('BLUEPRINT.md');
  const fixture = path.join(ROOT, 'test_fixtures', 'vision', 'cracked_phone_workbench_640.jpg');
  const realReportPath = path.join(ROOT, 'test_reports', 'sprint163_ai_vision_real_sample_evidence_latest.json');
  const realReport = fs.existsSync(realReportPath) ? JSON.parse(fs.readFileSync(realReportPath, 'utf8')) : {};
  const realCheck = (realReport.checks || []).find(check => check.id === 'live-real-sample-analysis') || {};

  const checks = [
    {
      id: 'central-current-model',
      ok: config.includes("GEMINI_DEFAULT_MODEL = 'gemini-3.5-flash'") &&
        config.includes("'GEMINI_MODEL'") && config.includes('function getGeminiApiUrl_')
    },
    {
      id: 'retired-model-removed-from-runtime',
      ok: ![analysis, pipeline, line, reorder].some(source => source.includes('gemini-2.0-flash'))
    },
    {
      id: 'all-ai-callers-use-central-endpoint',
      ok: analysis.includes('getGeminiApiUrl_(apiKey)') &&
        line.includes('getGeminiApiUrl_(apiKey)') && reorder.includes('getGeminiApiUrl_(apiKey)')
    },
    {
      id: 'vision-provider-observability',
      ok: pipeline.includes("result._aiStatus = 'analyzed'") &&
        pipeline.includes('_fallbackReason') && analysis.includes("parsed.provider = 'google-gemini'")
    },
    {
      id: 'vision-errors-are-not-cached',
      ok: pipeline.includes("normalized._aiStatus !== 'error'") &&
        pipeline.includes("'vp_cache_' + VP_VERSION")
    },
    {
      id: 'domain-aware-comphone-prompt',
      ok: pipeline.includes('งานซ่อมโทรศัพท์') && pipeline.includes('asset_type') &&
        pipeline.includes('repair_recommendation') && pipeline.includes('ห้ามเดา')
    },
    {
      id: 'large-payload-post-transport',
      ok: [apiClient, samplePilot, visionSmoke].every(source =>
        source.includes('7000') && source.includes('text/plain;charset=UTF-8') && source.includes('JSON.stringify'))
    },
    {
      id: 'router-accepts-json-post',
      ok: router.includes('parsePostPayloadV55_(e)') && router.includes('large payloads arrive as JSON through doPost')
    },
    {
      id: 'real-pilot-requires-semantic-ai-evidence',
      ok: samplePilot.includes("semanticEvidence.ai_status === 'analyzed'") &&
        samplePilot.includes("semanticEvidence.provider === 'google-gemini'") &&
        samplePilot.includes('semanticEvidence.confidence > 0')
    },
    {
      id: 'safe-real-image-fixture',
      ok: fs.existsSync(fixture) && fs.statSync(fixture).size > 1000 && fs.statSync(fixture).size < 100000,
      detail: fs.existsSync(fixture) ? { bytes: fs.statSync(fixture).size } : { missing: true }
    },
    {
      id: 'production-real-sample-evidence',
      ok: realReport.status === 'ok' && realCheck.ok === true &&
        realCheck.ai_status === 'analyzed' && realCheck.provider === 'google-gemini' &&
        realCheck.model === 'gemini-3.5-flash' && Number(realCheck.confidence) > 0,
      detail: {
        visionLogId: realCheck.visionLogId || '',
        model: realCheck.model || '',
        confidence: Number(realCheck.confidence || 0),
        asset_type: realCheck.asset_type || '',
        decision: realCheck.decision || ''
      }
    },
    {
      id: 'deploy-source-pairs-aligned',
      ok: ['Config.gs', 'Router.gs', 'VisionAnalysis.gs', 'VisionPipeline.gs', 'AILinePrompts.gs', 'InventoryReorderAI.gs']
        .every(aligned)
    },
    {
      id: 'completion-gates-wired',
      ok: regression.includes('sprint216_ai_vision_transport_guard') &&
        staticGuard.includes('sprint216_ai_vision_transport_guard.js') &&
        workflow.includes('sprint216_ai_vision_transport_guard.js')
    },
    {
      id: 'blueprint-current',
      ok: blueprint.includes('Sprint 216') && blueprint.includes('gemini-3.5-flash') && blueprint.includes('@629')
    }
  ];

  const failures = checks.filter(check => !check.ok);
  const report = {
    sprint: 216,
    name: 'Current Gemini Model & Large Payload Guard',
    generated_at: new Date().toISOString(),
    score: Math.round(((checks.length - failures.length) / checks.length) * 100),
    checks,
    failures
  };
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n', 'utf8');
  if (failures.length) {
    console.error(`[Sprint 216] FAILED ${report.score}/100`);
    failures.forEach(failure => console.error(` - ${failure.id}`));
    process.exit(1);
  }
  console.log('[Sprint 216] OK 100/100 - Current Gemini model and large-payload Vision guard passed');
}

main();
