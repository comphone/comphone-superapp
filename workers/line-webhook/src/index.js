/**
 * COMPHONE LINE Webhook Worker
 *
 * Fast proxy for LINE Messaging API webhooks. LINE receives an immediate 200,
 * while the raw webhook body and X-Line-Signature are forwarded to the active
 * Google Apps Script backend for final signature validation and processing.
 * A tiny deterministic private-chat greeting guard lives here to avoid routing
 * simple one-to-one greetings into stale GAS AI code during deployments.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      const activeGasUrl = env.GAS_URL || '';
      return json({
        status: 'ok',
        service: 'COMPHONE LINE Webhook Worker',
        version: '1.0.4-sprint186',
        gas_url: activeGasUrl ? activeGasUrl.substring(0, 72) + '...' : '',
        timestamp: new Date().toISOString()
      });
    }

    if (url.pathname === '/diag/gas') {
      return runGasDiagnostic(env.GAS_URL);
    }

    if (url.pathname !== '/line/webhook' && url.pathname !== '/webhook') {
      return json({ error: 'Not Found', available_paths: ['/health', '/line/webhook'] }, 404);
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const bodyText = await request.text();
    const signature = request.headers.get('X-Line-Signature') || '';
    if (await handlePrivateGreeting(bodyText, env)) {
      return json({ success: true, source: 'comphone-worker', version: '1.0.4-sprint186', handled: 'private-greeting' });
    }
    ctx.waitUntil(forwardToGAS(env.GAS_URL, bodyText, signature));

    return json({ success: true, source: 'comphone-worker', version: '1.0.4-sprint186' });
  }
};

async function runGasDiagnostic(gasUrl) {
  if (!gasUrl) return json({ success: false, error: 'GAS_URL binding is missing' }, 500);
  try {
    const targetUrl = new URL(gasUrl);
    targetUrl.searchParams.set('action', 'health');
    targetUrl.searchParams.set('_worker_diag', Date.now().toString());
    const response = await fetch(targetUrl.toString(), { method: 'GET', redirect: 'follow' });
    const responseText = await response.text();
    let body = {};
    try { body = JSON.parse(responseText); } catch (_) {}
    return json({
      success: response.ok && body.success !== false,
      worker_version: '1.0.4-sprint186',
      gas_status: response.status,
      gas_ok: response.ok,
      gas_health_status: body.status || '',
      gemini_ok: !!(body.checks && body.checks.config && body.checks.config.gemini_ok),
      line_ok: !!(body.checks && body.checks.config && body.checks.config.line_ok),
      gas_url_prefix: gasUrl.substring(0, 72) + '...'
    }, response.ok ? 200 : 502);
  } catch (error) {
    return json({ success: false, worker_version: '1.0.4-sprint186', error: error && error.message || String(error) }, 502);
  }
}

async function handlePrivateGreeting(bodyText, env) {
  let payload;
  try { payload = JSON.parse(bodyText || '{}'); } catch (_) { return false; }
  const events = Array.isArray(payload.events) ? payload.events : [];
  if (events.length !== 1) return false;

  const event = events[0] || {};
  const source = event.source || {};
  const message = event.message || {};
  const text = String(message.text || '').trim().toLowerCase();
  const isPrivate = source.type === 'user' && !source.groupId && !source.roomId;
  const isGreeting = message.type === 'text' && /^(สวัสดี|hello|hi|หวัดดี)$/i.test(text);
  if (!isPrivate || !isGreeting) return false;

  const token = env.LINE_CHANNEL_ACCESS_TOKEN || env.LINE_ACCESS_TOKEN || '';
  if (!token || !event.replyToken) return true;

  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      replyToken: event.replyToken,
      messages: [{
        type: 'text',
        text: [
          'สวัสดีครับ COMPHONE Bot พร้อมใช้งาน',
          'คำสั่งที่ใช้ได้:',
          '- /groupid ใช้ในกลุ่มเพื่อดู Group ID',
          '- เช็คงาน J0020',
          '- สรุป',
          '- ส่งรูปงานในกลุ่มพร้อม JobID เพื่อเข้า AI Vision',
          'ถ้าต้องการถาม AI ให้ขึ้นต้นด้วย "ai" หรือ "วิเคราะห์"'
        ].join('\n')
      }]
    })
  });
  return true;
}

async function forwardToGAS(gasUrl, bodyText, signature) {
  if (!gasUrl) {
    console.error('[GAS Forward Error] GAS_URL binding is missing');
    return;
  }

  try {
    const targetUrl = new URL(gasUrl);
    if (signature) targetUrl.searchParams.set('X-Line-Signature', signature);

    const response = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': signature,
        'X-Forwarded-By': 'comphone-worker/1.0.4-sprint186'
      },
      body: bodyText,
      redirect: 'follow'
    });
    const responseText = await response.text();
    console.log('[GAS Forward] Status:', response.status, 'Body:', responseText.substring(0, 200));
  } catch (error) {
    console.error('[GAS Forward Error]', error && error.message || String(error));
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
