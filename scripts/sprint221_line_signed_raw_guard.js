#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');

async function main() {
  const workerPath = path.join(ROOT, 'workers', 'line-webhook', 'src', 'index.js');
  const workerSource = read('workers/line-webhook/src/index.js');
  const lineBot = read('clasp-ready/LineBot.gs');
  const lineBotV2 = read('clasp-ready/LineBotV2.gs');
  const photoQueue = read('clasp-ready/PhotoQueue.gs');
  const config = read('clasp-ready/Config.gs');
  const activeLineSources = [
    lineBot, lineBotV2, config,
    read('clasp-ready/AILinePrompts.gs'),
    read('clasp-ready/LineBotQuota.gs'),
    read('clasp-ready/Notify.gs'),
    read('clasp-ready/DeployGuide.gs')
  ].join('\n');
  const packageJson = JSON.parse(read('workers/line-webhook/package.json'));
  const packageLock = JSON.parse(read('workers/line-webhook/package-lock.json'));
  const deployWorkflow = read('.github/workflows/deploy-line-worker.yml');
  const productionVerifier = read('workers/line-webhook/scripts/verify-production.mjs');

  const checks = [
    ['worker-version', packageJson.version === '1.0.6-sprint221' && workerSource.includes("WORKER_VERSION = '1.0.6-sprint221'")],
    ['wrangler-version-locked', packageJson.devDependencies.wrangler === '4.112.0' && packageLock.lockfileVersion === 3],
    ['deploy-uses-clean-install', deployWorkflow.includes('run: npm ci') && deployWorkflow.includes('cache-dependency-path: workers/line-webhook/package-lock.json')],
    ['deploy-secret-preflight', deployWorkflow.includes('Verify Cloudflare deploy credential') && deployWorkflow.includes('Missing Cloudflare credential')],
    ['deploy-production-verification', deployWorkflow.includes('npm run verify:production') && productionVerifier.includes('deployed-version-current')],
    ['production-verifier-rejects-unsigned', productionVerifier.includes('unsigned-webhook-rejected') && productionVerifier.includes('status === 401')],
    ['gas-signature-fail-closed', lineBot.includes('LINE_CHANNEL_SECRET is not configured') && !lineBot.includes('if (!secret) return true')],
    ['legacy-signature-fail-closed', lineBotV2.includes("getConfig('LINE_CHANNEL_SECRET') || ''") && !lineBotV2.includes('Signature mismatch. Expected:')],
    ['legacy-credential-setup-removed', !/setConfig\('LINE_CHANNEL_(?:ACCESS_TOKEN|SECRET)'/.test(lineBotV2)],
    ['active-line-identifiers-property-only', !/["'](?:C|U)[0-9a-f]{32}["']/i.test(activeLineSources)],
    ['room-fallbacks-property-only', !/getConfig\('LINE_GROUP_[A-Z]+',\s*'[^']+'/g.test(config)],
    ['worker-requires-signature', workerSource.includes("error: 'Missing LINE signature'")],
    ['worker-keeps-signed-body', workerSource.includes('exact signed request body') && !workerSource.includes('delete next.replyToken') && !workerSource.includes('bodyText: JSON.stringify(payload)')],
    ['worker-optional-edge-hmac', workerSource.includes('crypto.subtle.verify') && workerSource.includes('LINE_CHANNEL_SECRET')],
    ['photo-source-schema', photoQueue.includes("'CollageURL', 'Source'") && photoQueue.includes("source: 'LINE'") && photoQueue.includes("source: 'PC'")],
    ['ingress-requires-channel-secret', photoQueue.includes('line_channel_secret: lineSecretConfigured') && photoQueue.includes('checks.line_channel_secret;')],
    ['pc-upload-normalized-keys', photoQueue.includes('fileUrl: file.getUrl()') && photoQueue.includes("jobPhotoUrl: ''")],
    ['backend-version-current', Number((config.match(/VERSION:\s*'5\.18\.(\d+)/) || [])[1] || 0) >= 23]
  ];

  const moduleUrl = `${pathToFileURL(workerPath).href}?guard=${Date.now()}`;
  const worker = (await import(moduleUrl)).default;
  const secret = 'sprint221-test-secret';
  const rawBody = JSON.stringify({
    destination: 'test-destination',
    events: [{
      type: 'message',
      replyToken: 'reply-token-must-remain-signed',
      source: { type: 'group', groupId: 'test-group', userId: 'test-user' },
      message: { id: 'test-image', type: 'image' }
    }]
  });
  const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
  const originalFetch = global.fetch;
  let forwardedBody = '';
  global.fetch = async (_url, options = {}) => {
    forwardedBody = String(options.body || '');
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const missing = await worker.fetch(new Request('https://worker.test/line/webhook', { method: 'POST', body: rawBody }), { GAS_URL: 'https://gas.test/exec', LINE_CHANNEL_SECRET: secret }, { waitUntil() {} });
    checks.push(['missing-signature-rejected', missing.status === 401]);

    const invalid = await worker.fetch(new Request('https://worker.test/line/webhook', { method: 'POST', body: rawBody, headers: { 'X-Line-Signature': 'ZmFrZQ==' } }), { GAS_URL: 'https://gas.test/exec', LINE_CHANNEL_SECRET: secret }, { waitUntil() {} });
    checks.push(['invalid-signature-rejected', invalid.status === 401]);

    let pending;
    const valid = await worker.fetch(new Request('https://worker.test/line/webhook', { method: 'POST', body: rawBody, headers: { 'X-Line-Signature': signature } }), { GAS_URL: 'https://gas.test/exec', LINE_CHANNEL_SECRET: secret }, { waitUntil(promise) { pending = promise; } });
    if (pending) await pending;
    checks.push(['valid-signature-forwarded', valid.status === 200]);
    checks.push(['forwarded-body-byte-equivalent', forwardedBody === rawBody]);
    checks.push(['reply-token-preserved-for-gas-toggle', forwardedBody.includes('reply-token-must-remain-signed')]);
  } finally {
    global.fetch = originalFetch;
  }

  const failed = checks.filter(([, ok]) => !ok);
  if (failed.length) {
    console.error('[Sprint 221] FAILED');
    failed.forEach(([id]) => console.error(` - ${id}`));
    process.exit(1);
  }
  console.log(`[Sprint 221] OK ${checks.length}/${checks.length} - LINE signed raw forwarding guard passed`);
}

main().catch(error => {
  console.error('[Sprint 221] FAILED', error);
  process.exit(1);
});
