#!/usr/bin/env node
/*
 * Sprint 188 guard: per-room LINE bot reply toggles.
 * This is a static safety guard; it does not call LINE or Apps Script.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT = path.join(ROOT, 'test_reports', 'sprint188_line_bot_reply_toggle_guard_latest.json');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function has(text, value) {
  return text.includes(value);
}

function check(id, ok, detail) {
  return { id, ok: !!ok, detail: detail || '' };
}

function main() {
  const line = read('LineBot.gs');
  const lineReady = read('clasp-ready/LineBot.gs');
  const center = read('LineCommandCenter.gs');
  const centerReady = read('clasp-ready/LineCommandCenter.gs');
  const router = read('Router.gs');
  const routerReady = read('clasp-ready/Router.gs');
  const split = read('RouterSplit.gs');
  const splitReady = read('clasp-ready/RouterSplit.gs');
  const ui = read('pwa/section_line_center.js');
  const blueprint = read('BLUEPRINT.md');

  const checks = [
    check('linebot-root-suppresses-replies', has(line, 'isLineBotReplyEnabledV55_') && has(line, 'reply_suppressed') && has(line, 'LINE_BOT_REPLY_')),
    check('linebot-clasp-suppresses-replies', has(lineReady, 'isLineBotReplyEnabledV55_') && has(lineReady, 'reply_suppressed') && has(lineReady, 'LINE_BOT_REPLY_')),
    check('center-root-settings-api', has(center, 'function updateLineBotReplySettings') && has(center, '_lineCenterBotReplyKey_') && has(center, 'botReplyEnabled')),
    check('center-clasp-settings-api', has(centerReady, 'function updateLineBotReplySettings') && has(centerReady, '_lineCenterBotReplyKey_') && has(centerReady, 'botReplyEnabled')),
    check('private-and-unknown-reply-scopes', has(center, "id: 'PRIVATE'") && has(center, "id: 'UNKNOWN'") && has(centerReady, "id: 'PRIVATE'") && has(centerReady, "id: 'UNKNOWN'")),
    check('router-root-allows-action', has(router, "'updateLineBotReplySettings': 1") && has(split, "'updateLineBotReplySettings': function")),
    check('router-clasp-allows-action', has(routerReady, "'updateLineBotReplySettings': 1") && has(splitReady, "'updateLineBotReplySettings': function")),
    check('ui-exposes-bot-toggle', has(ui, 'toggleLineBotReply') && has(ui, 'updateLineBotReplySettings') && has(ui, 'Bot Off') && has(ui, 'botReplyEnabled')),
    check('ui-confirms-toggle-state', has(ui, 'line-center-status') && has(ui, 'setLineCenterStatus') && has(ui, 'bot replies are now') && has(ui, 'Could not save bot reply setting')),
    check('ui-explains-processing-continues', has(ui, 'Backend processing, Vision logs, queues, and audit records will continue.')),
    check('blueprint-documents-contract', has(blueprint, 'LINE_BOT_REPLY_') && has(blueprint, 'Bot reply toggles suppress webhook replies only')),
  ];

  const failures = checks.filter(item => !item.ok);
  const report = {
    generated_at: new Date().toISOString(),
    mode: 'line-bot-reply-toggle-static-guard',
    status: failures.length ? 'fail' : 'ok',
    score: Math.round(((checks.length - failures.length) / checks.length) * 100),
    checks,
  };

  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));
  console.log(`[Sprint 188 LINE Bot Reply Toggle Guard] status=${report.status} checks=${checks.length - failures.length}/${checks.length}`);
  console.log(`[Sprint 188 LINE Bot Reply Toggle Guard] report: ${path.relative(ROOT, REPORT)}`);
  if (failures.length) {
    failures.forEach(item => console.error(`- ${item.id}: ${item.detail || 'failed'}`));
    process.exit(1);
  }
}

main();
