// openclaw-line-hook.js — OpenClaw LINE Bot Integration Hook
// 
// ฟังก์ชันหลักที่ OpenClaw เรียกเพื่อประมวลผลข้อความจาก LINE
// - ตรวจจับข้อความ/รูปจากห้องช่าง
// - เรียก processLineMessage() จาก line-gas-bridge.js
// - ส่ง reply กลับ LINE
//
// วิธีใช้: เรียก `handleLineEvent(payload)` จาก OpenClaw webhook handler
// หรือเรียก `handleIncomingMessage(msg, userId, userName)` จาก OpenClaw session

const path = require('path');

// Load line-gas-bridge (Node.js compatible)
const { processLineMessage } = require(path.join(__dirname, 'line-gas-bridge.js'));

// LINE Room IDs (from MEMORY.md)
const LINE_ROOMS = {
  TECHNICIAN: 'C8ad22a115f38c9ad3cb5ea5c2ff4863b',
  ACCOUNTING: 'C7b939d1d367e6b854690e58b392e88cc',
  PROCUREMENT: 'Cfd103d59e77acf00e2f2f801d391c566',
  SALES: 'Cb7cc146227212f70e4f171ef3f2bce15'
};

const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

/**
 * ประมวลผล LINE message event จาก webhook
 * @param {object} event - LINE webhook event object
 * @returns {object|null} - Response สำหรับ reply
 */
async function handleLineEvent(event) {
  try {
    const sourceType = event.source?.type; // 'user' | 'group' | 'room'
    const sourceId = event.source?.groupId || event.source?.roomId || event.source?.userId;
    const userId = event.source?.userId;
    const message = event.message;

    if (!message) return null;

    // จำกัดเฉพาะห้องช่าง + direct chat
    if (sourceType === 'group' && sourceId !== LINE_ROOMS.TECHNICIAN) {
      return null; // ไม่ใช่ห้องช่าง → ไม่สนใจ
    }

    // เรียก processLineMessage (Smart Filter + Pipeline)
    const response = await processLineMessage(message, userId, '');

    // null = casual chat → ไม่ตอบ
    if (!response) return null;

    // ส่ง reply กลับ LINE
    if (event.replyToken) {
      await replyLineMessage(event.replyToken, response);
    }

    return response;

  } catch (e) {
    console.error('[LINE Hook] Error:', e);
    // ไม่ reply error กลับช่าง (silent)
    return null;
  }
}

/**
 * ประมวลผลข้อความที่ OpenClaw รับ (ไม่ผ่าน webhook โดยตรง)
 * ใช้เมื่อ OpenClaw อ่านข้อความจาก session
 * @param {string} textOrType - ข้อความ หรือ message type
 * @param {string} userId - LINE user ID
 * @param {string} userName - ชื่อผู้ใช้
 * @param {object} extra - เพิ่มข้อมูล: image, location, etc
 * @returns {string|null} - ข้อความตอบกลับ หรือ null (silent)
 */
async function handleIncomingMessage(textOrType, userId, userName, extra = {}) {
  // สร้าง message object ตาม format ของ LINE
  const message = {
    type: extra.type || 'text',
    text: typeof textOrType === 'string' ? textOrType : undefined,
    id: extra.messageId,
    contentProvider: extra.contentProvider,
    latitude: extra.latitude,
    longitude: extra.longitude,
    imageType: extra.imageType,
    duration: extra.duration
  };

  const response = await processLineMessage(message, userId, userName);

  if (!response) return null; // casual → silent

  // Convert response object เป็น text ที่ OpenClaw ส่งได้
  if (response.type === 'text') return response.text;
  if (response.type === 'flex') return response.altText || 'Job Card';
  
  return response.text || String(response);
}

/**
 * ส่ง reply กลับ LINE
 * @param {string} replyToken - LINE reply token
 * @param {object} message - LINE message object
 */
async function replyLineMessage(replyToken, message) {
  if (!CHANNEL_ACCESS_TOKEN || !replyToken) return;

  const https = require('https');
  const postData = JSON.stringify({
    replyToken: replyToken,
    messages: [message]
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.line.me',
      path: '/v2/bot/message/reply',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: data, status: res.statusCode });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/**
 * ดาวน์โหลดรูปจาก LINE (สำหรับ OpenClaw ที่รับรูปมา)
 * @param {string} messageId - LINE message ID
 * @returns {Promise<Buffer>} - Image buffer
 */
async function downloadLineImage(messageId) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api-data.line.me',
      path: `/v2/bot/message/${messageId}/content`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${CHANNEL_ACCESS_TOKEN}` }
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * วิเคราะห์รูปภาพด้วย OpenClaw image tool (Qwen-VL)
 * นี่คือฟังก์ชัน wrapper สำหรับ OpenClaw — ใช้งานผ่าน OpenClaw session
 * 
 * วิธีใช้ (ใน OpenClaw session):
 * 1. รับรูปจาก LINE → temp file
 * 2. เรียก image tool: await image({ prompt: "...", image: tempPath })
 * 3. ส่งผลลัพธ์ไป `detectPhase()` + `saveJobPhoto()`
 * 
 * @param {string} imagePath - Path ของรูป
 * @param {string} context - บริบทงาน (ชื่อลูกค้า, อาการ)
 * @returns {object} - ผลวิเคราะห์
 */
async function analyzeImageWithOpenClaw(imagePath, context) {
  // นี่ต้องเรียกผ่าน OpenClaw image tool — ไม่ใช่ HTTP
  // OpenClaw session จะเรียกโดยตรง:
  //   const result = await image({ 
  //     prompt: `CCTV installation analysis: ${context}`, 
  //     image: imagePath 
  //   });
  
  return {
    note: 'Call OpenClaw image tool directly in session',
    context: context,
    imagePath: imagePath
  };
}

module.exports = {
  handleLineEvent,
  handleIncomingMessage,
  replyLineMessage,
  downloadLineImage,
  analyzeImageWithOpenClaw,
  LINE_ROOMS
};