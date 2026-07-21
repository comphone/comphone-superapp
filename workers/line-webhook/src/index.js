/**
 * COMPHONE LINE Webhook Worker
 *
 * Returns quickly to LINE and forwards the exact signed request body to GAS.
 * The body must never be rewritten before GAS verifies X-Line-Signature.
 */

const WORKER_VERSION = '1.0.6-sprint221';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      const activeGasUrl = env.GAS_URL || '';
      return json({
        status: 'ok',
        service: 'COMPHONE LINE Webhook Worker',
        version: WORKER_VERSION,
        signature_mode: env.LINE_CHANNEL_SECRET ? 'worker-and-gas' : 'gas-final-validation',
        gas_url: activeGasUrl ? activeGasUrl.substring(0, 72) + '...' : '',
        timestamp: new Date().toISOString()
      });
    }

    if (url.pathname === '/diag/gas') return runGasDiagnostic(env.GAS_URL, env);
    if (url.pathname !== '/line/webhook' && url.pathname !== '/webhook') {
      return json({ error: 'Not Found', available_paths: ['/health', '/line/webhook'] }, 404);
    }
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const bodyText = await request.text();
    const signature = request.headers.get('X-Line-Signature') || '';
    if (!signature) return json({ success: false, error: 'Missing LINE signature' }, 401);
    if (env.LINE_CHANNEL_SECRET && !(await verifyLineSignature(bodyText, signature, env.LINE_CHANNEL_SECRET))) {
      return json({ success: false, error: 'Invalid LINE signature' }, 401);
    }

    if (await handlePrivateGreeting(bodyText, env)) {
      return json({ success: true, source: 'comphone-worker', version: WORKER_VERSION, handled: 'private-greeting' });
    }

    const summary = summarizeForwardPolicy(bodyText);
    ctx.waitUntil(forwardToGAS(env.GAS_URL, bodyText, signature, summary));
    return json({ success: true, source: 'comphone-worker', version: WORKER_VERSION, reply_policy: summary });
  }
};

async function runGasDiagnostic(gasUrl, env) {
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
      worker_version: WORKER_VERSION,
      signature_mode: env.LINE_CHANNEL_SECRET ? 'worker-and-gas' : 'gas-final-validation',
      gas_status: response.status,
      gas_ok: response.ok,
      gas_health_status: body.status || '',
      gemini_ok: !!(body.checks && body.checks.config && body.checks.config.gemini_ok),
      line_ok: !!(body.checks && body.checks.config && body.checks.config.line_ok),
      gas_url_prefix: gasUrl.substring(0, 72) + '...'
    }, response.ok ? 200 : 502);
  } catch (error) {
    return json({ success: false, worker_version: WORKER_VERSION, error: error && error.message || String(error) }, 502);
  }
}

function summarizeForwardPolicy(bodyText) {
  let payload;
  try { payload = JSON.parse(bodyText || '{}'); }
  catch (_) { return { mode: 'signed-raw-forward', group_events: 0, image_events: 0, reply_control: 'gas-room-toggle' }; }

  const events = Array.isArray(payload.events) ? payload.events : [];
  let groupEvents = 0;
  let imageEvents = 0;
  events.forEach(event => {
    const source = event && event.source || {};
    const message = event && event.message || {};
    const isGroup = !!(source.groupId || source.roomId || source.type === 'group' || source.type === 'room');
    if (isGroup) groupEvents++;
    if (message.type === 'image') imageEvents++;
  });
  return {
    mode: 'signed-raw-forward',
    group_events: groupEvents,
    image_events: imageEvents,
    reply_control: 'gas-room-toggle'
  };
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
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
          'หากต้องการถาม AI ให้ขึ้นต้นด้วย "ai" หรือ "วิเคราะห์"'
        ].join('\n')
      }]
    })
  });
  return true;
}

async function forwardToGAS(gasUrl, bodyText, signature, replyPolicy) {
  if (!gasUrl) {
    console.error('[GAS Forward Error] GAS_URL binding is missing');
    return;
  }
  try {
    const targetUrl = new URL(gasUrl);
    targetUrl.searchParams.set('X-Line-Signature', signature);
    const response = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Line-Signature': signature,
        'X-Forwarded-By': `comphone-worker/${WORKER_VERSION}`,
        'X-Comphone-Reply-Policy': JSON.stringify(replyPolicy || {})
      },
      body: bodyText,
      redirect: 'follow'
    });
    const responseText = await response.text();
    console.log('[GAS Forward] Status:', response.status, 'ReplyPolicy:', JSON.stringify(replyPolicy || {}), 'Body:', responseText.substring(0, 200));
  } catch (error) {
    console.error('[GAS Forward Error]', error && error.message || String(error));
  }
}

async function verifyLineSignature(bodyText, signature, secret) {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const signatureBytes = Uint8Array.from(atob(signature), char => char.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(bodyText));
  } catch (_) {
    return false;
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { 'Content-Type': 'application/json' } });
}
