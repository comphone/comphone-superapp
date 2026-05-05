// ============================================================
// COMPHONE SUPER APP
// ============================================================
// TelegramBot.gs - Telegram Bot API webhook + helpers
// Token is read from Script Properties: TELEGRAM_BOT_TOKEN
// ============================================================

function isTelegramWebhookPayload_(payload) {
  payload = payload || {};
  return payload.update_id !== undefined && !!(payload.message || payload.edited_message || payload.callback_query);
}

function handleTelegramWebhook(e, payload) {
  try {
    payload = payload || parsePostPayloadV55_(e);
    var secret = getConfig('TELEGRAM_WEBHOOK_SECRET', '');
    if (secret) {
      var headerSecret = _getTelegramWebhookSecretFromEvent_(e);
      if (headerSecret !== secret) {
        return { success: false, error: 'Invalid Telegram webhook secret' };
      }
    }

    var msg = payload.message || payload.edited_message || (payload.callback_query && payload.callback_query.message) || {};
    var chat = msg.chat || {};
    var from = msg.from || (payload.callback_query && payload.callback_query.from) || {};
    var chatId = chat.id ? String(chat.id) : '';
    var text = String(msg.text || (payload.callback_query && payload.callback_query.data) || '').trim();

    if (!chatId) return { success: true, skipped: true, reason: 'No chat id' };

    _rememberTelegramChat_(chatId, chat, from);
    var reply = _buildTelegramReply_(text, chatId);
    if (reply) sendTelegramMessage(reply, chatId);

    return {
      success: true,
      platform: 'telegram',
      update_id: payload.update_id,
      chat_id: chatId,
      command: text || ''
    };
  } catch (err) {
    try { _logNotifyFallback('TG_WEBHOOK_ERROR', '', err.toString()); } catch (_ignored) {}
    return { success: false, error: err.toString() };
  }
}

function _getTelegramWebhookSecretFromEvent_(e) {
  try {
    var headers = (e && e.headers) || {};
    return (e && e.parameter && (e.parameter.tg_secret || e.parameter.telegram_secret)) ||
      headers['X-Telegram-Bot-Api-Secret-Token'] ||
      headers['x-telegram-bot-api-secret-token'] ||
      '';
  } catch (_ignored) {
    return '';
  }
}

function _rememberTelegramChat_(chatId, chat, from) {
  try {
    var props = PropertiesService.getScriptProperties();
    props.setProperty('TELEGRAM_LAST_CHAT_ID', String(chatId));
    props.setProperty('TELEGRAM_LAST_CHAT_META', JSON.stringify({
      chat_id: chatId,
      type: chat.type || '',
      title: chat.title || '',
      username: chat.username || '',
      from_username: from.username || '',
      from_name: [from.first_name || '', from.last_name || ''].join(' ').trim(),
      updated_at: new Date().toISOString()
    }));
  } catch (_ignored) {}
}

function _buildTelegramReply_(text, chatId) {
  var lower = String(text || '').toLowerCase();
  if (!lower || lower === '/start') {
    return 'COMPHONE Telegram connected\nChat ID: ' + chatId + '\nType /help for commands';
  }
  if (lower === '/help') {
    return 'COMPHONE commands\n/status - system status\n/jobs - jobs summary\n/chatid - show Chat ID\n/ping - test bot';
  }
  if (lower === '/chatid') return 'Chat ID: ' + chatId;
  if (lower === '/ping') return 'pong';
  if (lower === '/status') {
    var health = (typeof healthCheckV55_ === 'function') ? healthCheckV55_() : { status: 'unknown' };
    return 'System status: ' + (health.status || 'unknown') + '\nVersion: ' + (health.version || CONFIG.VERSION);
  }
  if (lower === '/jobs') {
    var jobs = (typeof checkJobs === 'function') ? checkJobs({ limit: 10 }) : null;
    if (!jobs || jobs.success === false) return 'Cannot read jobs right now';
    var count = jobs.count || jobs.total || (jobs.jobs && jobs.jobs.length) || (jobs.data && jobs.data.length) || 0;
    return 'Latest jobs: ' + count + ' items';
  }
  return '';
}

function getTelegramBotInfo() {
  return _telegramApiRequest_('getMe', {});
}

function setupTelegramWebhook(params) {
  params = params || {};
  var webAppUrl = String(params.webhook_url || params.url || getConfig('WEB_APP_URL', '') || '').trim();
  if (!webAppUrl) return { success: false, error: 'WEB_APP_URL is required' };

  var secret = String(params.secret || getConfig('TELEGRAM_WEBHOOK_SECRET', '') || '').trim();
  if (secret) webAppUrl = _appendTelegramSecretParam_(webAppUrl, secret);
  var body = {
    url: webAppUrl,
    allowed_updates: ['message', 'edited_message', 'callback_query']
  };
  if (secret) body.secret_token = secret;
  return _telegramApiRequest_('setWebhook', body);
}

function _appendTelegramSecretParam_(url, secret) {
  if (!secret || url.indexOf('tg_secret=') > -1 || url.indexOf('telegram_secret=') > -1) return url;
  return url + (url.indexOf('?') > -1 ? '&' : '?') + 'tg_secret=' + encodeURIComponent(secret);
}

function deleteTelegramWebhook() {
  return _telegramApiRequest_('deleteWebhook', {});
}

function testTelegramMessage(params) {
  params = params || {};
  var chatId = params.chat_id || params.chatId || params.telegram_chat_id || getConfig('TELEGRAM_LAST_CHAT_ID', '');
  var message = params.message || params.text || 'COMPHONE Telegram test OK';
  return sendTelegramMessage(message, chatId);
}

function _telegramApiRequest_(methodName, payload) {
  try {
    var token = getConfig('TELEGRAM_BOT_TOKEN', '');
    if (!token) return { success: false, error: 'TELEGRAM_BOT_TOKEN not configured' };

    var resp = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/' + methodName, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload || {}),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    var body = resp.getContentText();
    var parsed = {};
    try { parsed = JSON.parse(body || '{}'); } catch (_ignored) { parsed = { raw: body }; }
    return {
      success: code >= 200 && code < 300 && parsed.ok !== false,
      code: code,
      result: parsed.result || null,
      detail: parsed
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}
