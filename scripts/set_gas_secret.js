#!/usr/bin/env node
/*
 * Set one allowed GAS Script Property through the existing protected admin API.
 *
 * Usage (PowerShell):
 *   $env:COMPHONE_AUTH_TOKEN='session_token'
 *   $env:GEMINI_API_KEY='real_key'
 *   node scripts/set_gas_secret.js GEMINI_API_KEY
 *
 * The secret value is read from an environment variable and is never written to
 * repo files or reports.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOKEN = process.env.COMPHONE_AUTH_TOKEN || '';
const SECRET_NAME = process.argv[2] || process.env.COMPHONE_SECRET_NAME || 'GEMINI_API_KEY';
const SECRET_VALUE = process.env[SECRET_NAME] || '';
const ALLOWED = new Set([
  'GEMINI_API_KEY',
  'GOOGLE_AI_API_KEY',
  'GOOGLE_GEMINI_API_KEY',
  'GEMINI_KEY',
  'LINE_CHANNEL_ACCESS_TOKEN',
  'LINE_CHANNEL_SECRET',
  'LINE_GROUP_TECHNICIAN',
  'LINE_GROUP_ACCOUNTING',
  'LINE_GROUP_PROCUREMENT',
  'LINE_GROUP_SALES',
  'LINE_GROUP_EXECUTIVE',
]);

function gasUrl() {
  const gasConfig = fs.readFileSync(path.join(ROOT, 'pwa', 'gas_config.js'), 'utf8');
  const match = gasConfig.match(/url:\s*'([^']+)'/);
  return process.env.COMPHONE_GAS_URL || (match && match[1]);
}

async function main() {
  if (!ALLOWED.has(SECRET_NAME)) {
    throw new Error(`Secret name is not allowed by this helper: ${SECRET_NAME}`);
  }
  if (!TOKEN) throw new Error('COMPHONE_AUTH_TOKEN is required.');
  if (!SECRET_VALUE) throw new Error(`${SECRET_NAME} environment variable is required.`);

  const url = gasUrl();
  if (!url) throw new Error('GAS URL is not configured.');

  const payload = {
    action: 'setScriptProperties',
    token: TOKEN,
    properties: JSON.stringify({ [SECRET_NAME]: SECRET_VALUE }),
    _t: String(Date.now()),
  };
  const qs = new URLSearchParams(payload);
  const res = await fetch(`${url}?${qs.toString()}`, { redirect: 'follow' });
  const body = await res.json();
  if (res.status !== 200 || !body || body.success === false) {
    throw new Error(`setScriptProperties failed: ${res.status} ${(body && (body.error || body.message)) || ''}`);
  }

  const set = body.set || [];
  if (!set.includes(SECRET_NAME)) {
    throw new Error(`Backend did not report ${SECRET_NAME} as set. skipped=${JSON.stringify(body.skipped || [])}`);
  }
  console.log(`[GAS Secret] ${SECRET_NAME} set successfully via protected admin API.`);
}

main().catch(err => {
  console.error('[GAS Secret] FAILED:', err.message);
  process.exit(1);
});
