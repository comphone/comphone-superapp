/**
 * Comphone SuperApp AI — Cloudflare Worker: LINE Webhook Async Proxy
 *
 * Architecture:
 *   LINE Platform → Cloudflare Worker (<50ms ตอบกลับ)
 *                 → Cloudflare Queue (async)
 *                 → GAS WebApp (forward)
 *
 * Secrets (ตั้งค่าด้วย wrangler secret put):
 *   LINE_CHANNEL_SECRET  — สำหรับ HMAC-SHA256 signature verification
 *   GAS_WEBHOOK_URL      — URL ของ GAS Web App ที่ deploy แล้ว
 *
 * @version 1.0.0
 */

export default {
  /**
   * HTTP fetch handler — รับ POST จาก LINE Platform
   * ตอบ 200 ทันที แล้ว enqueue event แบบ async
   *
   * @param {Request} request
   * @param {Object} env — environment bindings (secrets + queue)
   * @param {ExecutionContext} ctx — execution context สำหรับ waitUntil
   * @returns {Response}
   */
  async fetch(request, env, ctx) {
    // รับเฉพาะ POST method เท่านั้น
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    let bodyText;
    try {
      bodyText = await request.text();
    } catch (e) {
      handleError(e, env, 'read_body');
      return new Response('Bad Request', { status: 400 });
    }

    // ── ตรวจสอบ LINE Signature ──
    const signature = request.headers.get('X-Line-Signature');
    if (!signature) {
      return new Response('Unauthorized: Missing signature', { status: 401 });
    }

    const isValid = await verifyLineSignature(bodyText, signature, env.LINE_CHANNEL_SECRET);
    if (!isValid) {
      return new Response('Unauthorized: Invalid signature', { status: 401 });
    }

    // ── ตอบ LINE ทันที 200 OK (ต้องตอบภายใน 50ms) ──
    const immediateResponse = new Response('OK', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });

    // ── ส่ง event ไปยัง Queue แบบ async (ไม่บล็อก response) ──
    ctx.waitUntil(
      enqueueEvent(bodyText, env, ctx).catch(err => {
        handleError(err, env, 'enqueue_event');
      })
    );

    return immediateResponse;
  },

  /**
   * Queue consumer handler — รับ batch จาก Cloudflare Queue
   * แล้ว forward ไปยัง GAS WebApp
   *
   * @param {MessageBatch} batch
   * @param {Object} env
   */
  async queue(batch, env) {
    const promises = batch.messages.map(async (message) => {
      try {
        await forwardToGAS(message.body, env.GAS_WEBHOOK_URL);
        message.ack();
      } catch (err) {
        handleError(err, env, 'queue_forward');
        message.retry();
      }
    });

    await Promise.allSettled(promises);
  }
};

// ══════════════════════════════════════════════════════════════
// Helper Functions
// ══════════════════════════════════════════════════════════════

/**
 * ตรวจสอบ LINE Signature ด้วย HMAC-SHA256
 *
 * @param {string} body — raw request body text
 * @param {string} signature — X-Line-Signature header value
 * @param {string} secret — LINE_CHANNEL_SECRET
 * @returns {Promise<boolean>}
 */
async function verifyLineSignature(body, signature, secret) {
  if (!secret) {
    console.error('[verifyLineSignature] LINE_CHANNEL_SECRET is not set');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(body);

    // Import key สำหรับ HMAC-SHA256
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // คำนวณ HMAC
    const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

    // แปลงเป็น Base64
    const signatureBase64 = btoa(
      String.fromCharCode(...new Uint8Array(signatureBuffer))
    );

    // เปรียบเทียบแบบ constant-time เพื่อป้องกัน timing attack
    return timingSafeEqual(signatureBase64, signature);
  } catch (e) {
    console.error('[verifyLineSignature] Error:', e.message);
    return false;
  }
}

/**
 * เปรียบเทียบ string แบบ constant-time (ป้องกัน timing attack)
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * ส่ง event body ไปยัง Queue หรือ fallback ตรงไปยัง GAS
 *
 * @param {string} bodyText — raw LINE event body (JSON string)
 * @param {Object} env
 * @param {ExecutionContext} ctx
 */
async function enqueueEvent(bodyText, env, ctx) {
  // ถ้ามี Queue binding → ส่งเข้า Queue
  if (env.LINE_QUEUE) {
    try {
      await env.LINE_QUEUE.send({
        body: bodyText,
        timestamp: new Date().toISOString(),
        source: 'line-webhook'
      });
      console.log('[enqueueEvent] Event enqueued successfully');
      return;
    } catch (queueErr) {
      console.warn('[enqueueEvent] Queue unavailable, falling back to direct GAS call:', queueErr.message);
    }
  }

  // Fallback: ส่งตรงไปยัง GAS ถ้า Queue ไม่พร้อม
  if (env.GAS_WEBHOOK_URL) {
    await forwardToGAS(bodyText, env.GAS_WEBHOOK_URL);
  } else {
    console.error('[enqueueEvent] GAS_WEBHOOK_URL is not set — event dropped');
  }
}

/**
 * Forward LINE event ไปยัง GAS WebApp
 *
 * @param {string|Object} eventBody — event body (string หรือ object)
 * @param {string} gasUrl — GAS WebApp URL
 * @returns {Promise<Response>}
 */
async function forwardToGAS(eventBody, gasUrl) {
  if (!gasUrl) {
    throw new Error('GAS_WEBHOOK_URL is not configured');
  }

  const body = typeof eventBody === 'string' ? eventBody : JSON.stringify(eventBody);

  const response = await fetch(gasUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-By': 'comphone-cloudflare-worker',
      'X-Worker-Version': '1.0.0'
    },
    body: body
  });

  if (!response.ok) {
    throw new Error(`GAS responded with status ${response.status}: ${await response.text()}`);
  }

  console.log('[forwardToGAS] Forwarded successfully, GAS status:', response.status);
  return response;
}

/**
 * จัดการ error — log เท่านั้น ไม่ throw
 * (เพื่อไม่ให้ error ใน async operation กระทบ response หลัก)
 *
 * @param {Error} error
 * @param {Object} env
 * @param {string} context — ชื่อ context ที่เกิด error
 */
function handleError(error, env, context = 'unknown') {
  const errorInfo = {
    context,
    message: error.message || String(error),
    timestamp: new Date().toISOString(),
    worker: 'comphone-line-webhook'
  };

  // Log ไปยัง Cloudflare Workers Logs (ดูได้ใน Cloudflare Dashboard)
  console.error('[handleError]', JSON.stringify(errorInfo));

  // ในอนาคตสามารถเพิ่ม: ส่งไปยัง Sentry, Datadog, หรือ LINE alert
}
