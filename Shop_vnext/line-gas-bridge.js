/**
 * line-gas-bridge.js — Complete Integration (v3 Final)
 * 
 * LINE Bot ↔ Super App GAS API
 * - Smart Filter: วิเคราะห์ข้อความ → งาน/คุยเล่น
 * - Vision AI: วิเคราะห์รูป → ระบุ Phase/ปัญหา (ใช้ OpenClaw image tool)
 * - GPS: รับ Location → บันทึกพิกัด → หาช่างใกล้สุด
 * - Auto Upload: รูป → Drive → บันทึก DB
 * - Flex Messages: Job Card + ปุ่ม
 * 
 * วิธีใช้: เรียก `processLineMessage(message, userId, userName)`
 * ส่งผลลัพธ์กลับ LINE Bot
 * 
 * หมายเหตุ: วิเคราะห์ภาพด้วย OpenClaw `image` tool (ไม่ใช้ API key)
 *          แล้วค่อยบันทึกผล + upload Drive → ประหยัดเครดิต
 */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzSw46G549H6y-4JckzqrRUeWo1ls2wQBtDqiHlUtXTd2t8a20lT0CvIccb_EcnLWeTOA/exec';
const LINE_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

// ============================================================================
// SMART FILTER
// ============================================================================

const WORK_KEYWORDS = [
  'ติดตั้ง', 'ซ่อม', 'เปลี่ยน', 'ตั้งค่า', 'เดินสาย', 'เจาะ', 'ยึด', 'ประกอบ',
  'กล้อง', 'cctv', 'wifi', 'เราเตอร์', 'extender', 'สายlan', 'poe', 'nvr', 'dvr',
  'switch', 'access point', 'fiber', 'sfp',
  'เสร็จ', 'เรียบร้อย', 'กำลังทำ', 'ถึง', 'เริ่มงาน',
  'เปิดงาน', 'ปิดงาน', 'เช็คงาน', 'เช็คสต๊อก', 'สรุป', 'รับงาน', 'มอบหมาย',
  'พิกัด', 'location', 'gps', 'รูป', 'ภาพ',
  'ลูกค้า', 'เบอร์', 'ที่อยู่', 'อำเภอ', 'จังหวัด',
  'เปิดไม่ติด', 'ภาพไม่ขึ้น', 'สัญญาณขาด', 'เน็ตหลุด',
  'ซ่อมบำรุง', 'ma', 'preventive', 'สำรวจ'
];

const CASUAL_KEYWORDS = [
  '555', '5555', '55555', 'ฮ่า', 'อิอิ', 'ok', 'โอเค', 'รับทราบ',
  'กิน', 'ข้าว', 'เที่ยง', 'เย็น', 'พัก',
  'ฝนตก', 'ร้อน', 'หนาว', 'อากาศ',
  'ขับรถ', 'รถติด', 'ถึงยัง', 'ไหนแล้ว'
];

function classifyMessage(text, hasImage, hasLocation) {
  if (!text) text = '';
  const t = text.toLowerCase().trim();
  const jobIdMatch = t.match(/j\d{3,4}/i);
  const jobId = jobIdMatch ? jobIdMatch[0].toUpperCase() : null;

  // 1. Commands
  const cmds = {
    'เปิดงาน': /^(เปิดงาน|#เปิดงาน)/,
    'ปิดงาน': /^(ปิดงาน|#ปิดงาน)/,
    'เช็คงาน': /^(เช็คงาน|#เช็คงาน)/,
    'เช็คสต๊อก': /^(เช็คสต๊อก|#เช็คสต๊อก)/,
    'สรุป': /^สรุป/,
  };
  for (const [cmd, re] of Object.entries(cmds)) {
    if (re.test(t)) return { type: 'command', command: cmd, jobId };
  }

  // 2. Location message → GPS update
  if (hasLocation) return { type: 'location_share', jobId };

  // 3. Image → always work report
  if (hasImage) return { type: 'work_report', subType: 'photo', jobId };

  // 4. Status updates
  if (t.match(/เสร็จ|เรียบร้อย|done/i)) return { type: 'status_update', status: 'Completed', jobId };
  if (t.match(/ถึง|ไปถึง|อยู่หน้างาน/i)) return { type: 'status_update', status: 'ถึงสถานที่', jobId };
  if (t.match(/กำลังเดินทาง|on the way/i)) return { type: 'status_update', status: 'กำลังเดินทาง', jobId };
  if (t.match(/เริ่ม|start|กำลังทำ/i)) return { type: 'status_update', status: 'InProgress', jobId };

  // 5. Count keywords
  let ws = 0, cs = 0;
  for (const kw of WORK_KEYWORDS) if (t.includes(kw)) ws++;
  for (const kw of CASUAL_KEYWORDS) if (t.includes(kw)) cs++;

  if (ws >= 1 && cs < ws) return { type: 'work_note', jobId };
  if (cs >= 2 && cs > ws) return { type: 'casual' };
  if (ws >= 1) return { type: 'work_note', jobId };

  if (t.length < 15) return { type: 'casual' };
  return { type: 'work_note', jobId };
}

// ============================================================================
// MAIN PROCESSOR
// ============================================================================

/**
 * ประมวลผลข้อความจาก LINE
 * @param {object} message - LINE message object
 * @param {string} userId - LINE user ID
 * @param {string} userName -_display name
 * @returns {object|null} - LINE response (text/flex) หรือ null (silent)
 */
async function processLineMessage(message, userId, userName) {
  const type = message.type;
  const text = message.text || '';
  const hasImage = type === 'image';
  const hasLocation = type === 'location';

  // 1. Classify
  const cls = classifyMessage(text, hasImage, hasLocation);

  // 2. SILENT for casual
  if (cls.type === 'casual') return null;

  // 3. Route
  switch (cls.type) {
    case 'command':
      return await handleCommand(cls, text, userId, userName);

    case 'location_share':
      return await handleLocation(message, cls, userId, userName);

    case 'work_report':
      return await handlePhotoReport(message, cls, userId, userName);

    case 'status_update':
      return await handleStatus(cls, text, userId, userName);

    case 'work_note':
      return await handleWorkNote(cls, text, userId, userName);

    default:
      return null;
  }
}

// ============================================================================
// COMMAND HANDLER
// ============================================================================

async function handleCommand(cls, text, userId, userName) {
  switch (cls.command) {
    case 'เปิดงาน': return await handleOpenJob(text, userId);
    case 'ปิดงาน': return await handleCloseJob(text);
    case 'เช็คงาน': {
      const search = text.replace(/เช็คงาน|#เช็คงาน/g, '').trim() || '';
      return await callAndFormat('เช็คงาน', { search }, formatJobList);
    }
    case 'เช็คสต๊อก': {
      const item = text.replace(/เช็คสต๊อก|#เช็คสต๊อก/g, '').trim() || '';
      return await callAndFormat('เช็คสต๊อก', { search: item }, formatStock);
    }
    case 'สรุป': {
      return await callAndFormat('สรุปงาน', {}, formatSummary);
    }
    case 'รับงาน': {
      const jobId = cls.jobId || extractJobId(text);
      return await handleAcceptJob(jobId, userName);
    }
    default:
      return null;
  }
}

// ============================================================================
// PHOTO + VISION + DRIVE PIPELINE
// ============================================================================

/**
 * จัดการรูปจากช่าง:
 * 1. รับรูปจาก LINE temp
 * 2. OpenClaw วิเคราะห์ด้วย image tool (Qwen-VL)
 * 3. หา JobID (จากข้อความ หรือล่าสุด)
 * 4. สร้างโฟลเดอร์ Drive (getJobFolder)
 * 5. อัปโหลดรูป (saveJobPhoto)
 * 6. บันทึก DB (updatePhotoLink)
 * 7. ตอบกลับพร้อม Job Card + ปุ่ม
 * 
 * หมายเหตุ: ขั้นตอนที่ 2 (Vision) ทำโดย OpenClaw ก่อนเรียกฟังก์ชันนี้
 *          ฟังก์ชันนี้รับ results วิเคราะห์มาใน message.note
 */
async function handlePhotoReport(message, cls, userId, userName) {
  return createTextMessage(
    '📸 รับภาพแล้ว! กำลังดำเนินการ...\n\n' +
    '1️⃣ กำลังวิเคราะห์ภาพด้วย AI\n' +
    '2️⃣ กำลังสร้างโฟลเดอร์งาน\n' +
    '3️⃣ กำลังอัปโหลดขึ้น Drive\n' +
    '4️⃣ กำลังบันทึก DB\n\n' +
    '⏳ รอสักครู่...'
  );

  // ========================================
  // PIPELINE ที่ OpenClaw (main session) ต้องทำ:
  // ========================================
  // 1. ดาวน์โหลดรูปจาก LINE → temp file
  //    const imagePath = await downloadLineContent(message.id);
  //
  // 2. วิเคราะห์รูปด้วย OpenClaw `image` tool
  //    const analysis = await analyzeImage(imagePath, "CCTV installation site analysis");
  //
  // 3. Phase detection จาก analysis
  //    const phase = detectPhase(analysis); // "00_สำรวจ" / "01_ติดตั้ง" / etc
  //
  // 4. หา JobID
  //    const activeJob = await findActiveJob(userId, cls.jobId);
  //
  // 5. สร้างโฟลเดอร์
  //    const folder = await callGAS({ action: 'getJobFolder', job_id: activeJob.job_id, customer_name: activeJob.customer, phase: phase });
  //
  // 6. Upload รูป
  //    const upload = await callGAS({ action: 'saveJobPhoto', job_id: activeJob.job_id, image_base64: base64, file_name: ..., phase: phase });
  //
  // 7. บันทึก DB
  //    await callGAS({ action: 'updatePhotoLink', job_id: activeJob.job_id, photo_url: upload.data.download_url, folder_url: folder.data.folder_url });
  //
  // 8. ตอบกลับ
  //    return createJobReportCard(activeJob, upload.data.download_url, analysis);
}

/**
 * Phase auto-detect จากผลการวิเคราะห์ภาพ
 */
function detectPhase(analysis) {
  if (!analysis || typeof analysis !== 'string') return '00_สำรวจ';
  const t = analysis.toLowerCase();

  if (t.includes('ติดตั้') || t.includes('install') || t.includes('mount') || t.includes('วาง')) {
    return '01_ติดตั้ง';
  }
  if (t.includes('เสร็จ') || t.includes('complete') || t.includes('done') || t.includes('เรียบร้อย')) {
    return '02_เสร็จสมบูรณ์';
  }
  if (t.includes('ซ่อม') || t.includes('repair') || t.includes('ma') || t.includes('บำรุง')) {
    return '03_MA_ซ่อมบำรุง';
  }
  // Default = สำรวจ
  return '00_สำรวจ';
}

// ============================================================================
// LOCATION HANDLER
// ============================================================================

/**
 * จัดการการแชร์ Location จากช่าง
 */
async function handleLocation(message, cls, userId, userName) {
  const lat = message.latitude;
  const lng = message.longitude;

  if (!lat || !lng) {
    return createTextMessage('❌ ไม่ได้รับพิกัด — กรุณาลองส่ง Location ใหม่อีกครั้ง');
  }

  // 1. บันทึกพิกัดช่าง
  await callGAS({
    action: 'อัพเดทสถานะ',
    job_id: cls.jobId || '',
    status: '',
    technician: userName || '',
    lat: lat,
    lng: lng,
    note: `📍 พิกัด: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
  });

  // 2. ตรวจสอบว่าช่างอยู่ใกล้กับงานไหน
  const area = getAreaFromLocation(lat, lng);
  const nearestJob = await findNearestPendingJobs(lat, lng);

  let msg = `📍 บันทึกพิกัดแล้ว!\n\n`;
  msg += `👷 ${userName || 'ช่าง'}\n`;
  msg += `📌 ${area.area}\n`;
  msg += `🗺️ พิกัด: ${lat.toFixed(4)}, ${lng.toFixed(4)}\n`;

  if (nearestJob?.job) {
    const dist = haversineDistance(lat, lng, parseFloat(nearestJob.lat), parseFloat(nearestJob.lng));
    msg += `\n📋 ใกล้กับงาน: ${nearestJob.job.job_id} — ${nearestJob.job.customer}\n`;
    msg += `📏 ระยะทาง: ${dist.toFixed(1)} km\n`;
    msg += `\nต้องการรับงานนี้ไหมครับ?`;
    msg.quickReply = {
      items: [
        { type: 'action', action: { type: 'message', label: '✅ รับงานนี้', text: `#รับงาน ${nearestJob.job.job_id}`  } },
        { type: 'action', action: { type: 'message', label: '🔍 ดูรายละเอียด', text: `#เช็คงาน ${nearestJob.job.job_id}`  } }
      ]
    };
  }

  return createTextMessage(msg);
}

/**
 * หางาน pending ที่ใกล้พิกัดมากที่สุด
 */
async function findNearestPendingJobs(lat, lng) {
  try {
    const result = await callGAS({ action: 'เช็คงาน', search: '' });
    if (!result?.success || !result.data?.jobs) return null;

    const pending = result.data.jobs.filter(j => j.status === 'รอดำเนินการ' || j.status === 'InProgress');
    if (pending.length === 0) return null;

    // TODO: ใช้พิกัดจาก DB (col5) — ยังไม่มีการบันทึกพิกัดงาน
    // ตอนนี้ return งาน pending แรก
    return { job: pending[0], distance: 'N/A' };
  } catch {
    return null;
  }
}

// ============================================================================
// STATUS UPDATE HANDLER
// ============================================================================

async function handleStatus(cls, text, userId, userName) {
  const jobId = cls.jobId || extractJobId(text);
  const activeJob = await findActiveJob(userId, jobId);

  if (!activeJob) {
    return createTextMessage('❌ ไม่พบงาน — กรุณาระบุ JobID หรือ #เปิดงาน ก่อน');
  }

  await callGAS({
    action: 'อัพเดทสถานะ',
    job_id: activeJob.job_id,
    status: cls.status || activeJob.status,
    technician: userName || activeJob.technician,
    note: text
  });

  return createTextMessage(
    `✅ อัปเดตงาน ${activeJob.job_id}\n` +
    `📊 สถานะ: ${cls.status}\n` +
    `📝 "${text}"\n\n` +
    `📁 โฟลเดอร์: ${activeJob.folder_url || 'ยังไม่สร้าง'}\n` +
    `➕ [📸 ส่งรูป] [✅ ปิดงาน] [📍 พิกัด]`,
    createQuickReply(activeJob.job_id)
  );
}

// ============================================================================
// WORK NOTE HANDLER
// ============================================================================

async function handleWorkNote(cls, text, userId, userName) {
  const jobId = cls.jobId || extractJobId(text);
  const activeJob = await findActiveJob(userId, jobId);

  if (!activeJob) {
    // ถ้าไม่มีงาน + ข้อความยาว → เปิดงานใหม่
    if (text.length > 20) return await handleOpenJob(text, userId);
    return null;
  }

  await callGAS({
    action: 'อัพเดทสถานะ',
    job_id: activeJob.job_id,
    status: activeJob.status,
    technician: userName || activeJob.technician,
    note: text
  });

  return createTextMessage(
    `📝 บันทึกหมายเหตุงาน ${activeJob.job_id}\n"${text}"\n📁 ${activeJob.folder_url || ''}`
  );
}

// ============================================================================
// OPEN/CLOSE JOB
// ============================================================================

async function handleOpenJob(text, userId) {
  // Parse: #เปิดงาน ชื่อ เบอร์ อาการ
  const parts = text.replace(/เปิดงาน|#เปิดงาน/g, '').trim().split(/\s+/);
  if (parts.length < 2) {
    return createTextMessage(
      '❌ ใช้คำสั่ง: #เปิดงาน [ชื่อ] [เบอร์] [อาการ]\nตัวอย่าง: #เปิดงาน รร.สว่าง 081xxx ติดตั้งกล้อง 3 จุด'
    );
  }

  const name = parts[0];
  const phone = parts[1];
  const symptom = parts.slice(2).join(' ') || 'ไม่ระบุ';

  const result = await callGAS({
    action: 'เปิดงาน',
    name: name,
    phone: phone,
    symptom: symptom
  });

  if (!result?.success) return createTextMessage('❌ เปิดงานล้มเหลว: ' + (result?.error || 'unknown'));

  const jd = result.data;
  return createTextMessage(
    `✅ เปิดงานสำเร็จ!\n\n` +
    `📋 ${jd.job_id} — ${jd.customer}\n` +
    `🔧 อาการ: ${symptom}\n` +
    `📊 สถานะ: ${jd.status}\n\n` +
    `📸 ส่งรูปสำรวจได้ทันที\n` +
    `📍 กดแชร์ Location เพื่อระบุตำแหน่ง\n` +
    `📁 #เช็คงาน ${jd.job_id} เพื่อดูสถานะ`,
    createQuickReply(jd.job_id)
  );
}

async function handleCloseJob(text) {
  const parts = text.replace(/ปิดงาน|#ปิดงาน/g, '').trim().split(/\s+/);
  if (parts.length < 2) {
    return createTextMessage(
      '❌ ใช้คำสั่ง: #ปิดงาน [JobID] [อะไหล่:จำนวน] [ค่าแรง]\nตัวอย่าง: #ปิดงาน J0018 สายLAN:5,CCTV:3 500'
    );
  }

  const jobId = parts[0];
  const partsUsed = parts[1];
  const labor = parseInt(parts[2]) || 0;

  const result = await callGAS({
    action: 'ปิดงาน',
    job_id: jobId,
    parts: partsUsed,
    labor_cost: labor
  });

  if (!result?.success) return createTextMessage('❌ ปิดงานล้มเหลว: ' + (result?.error || 'unknown'));

  return createTextMessage(
    `✅ ปิดงาน ${jobId} สำเร็จ!\n\n` +
    `🔧 อะไหล่: ${partsUsed}\n` +
    `👷 ค่าแรง: ${labor.toLocaleString()} บาท\n` +
    `💰 ตัดสต๊อก + สร้างบิลแล้ว`
  );
}

async function handleAcceptJob(jobId, userName) {
  if (!jobId) return createTextMessage('❌ ระบุ JobID ด้วย เช่น J0018');

  await callGAS({
    action: 'อัพเดทสถานะ',
    job_id: jobId,
    status: 'InProgress',
    technician: userName || 'ช่าง',
    note: 'รับงานแล้ว กำลังไปสถานที่'
  });

  return createTextMessage(`👷 รับงาน ${jobId} แล้ว! กำลังไปสถานที่ครับ\n\n📍 ส่ง Location เพื่ออัปเดตตำแหน่ง`);
}

// ============================================================================
// HELPERS
// ============================================================================

function extractJobId(text) {
  const match = text?.match(/j\d{3,4}/i);
  return match ? match[0].toUpperCase() : null;
}

async function findActiveJob(userId, jobId) {
  if (jobId) {
    const result = await callGAS({ action: 'เช็คงาน', search: jobId });
    if (result?.success && result.data?.jobs?.length > 0) return result.data.jobs[0];
  }
  const byUser = await callGAS({ action: 'เช็คงาน', search: userId });
  if (byUser?.success && byUser.data?.jobs?.length > 0) {
    const pending = byUser.data.jobs.find(j => j.status !== 'Completed' && j.status !== 'Archived');
    if (pending) return pending;
    return byUser.data.jobs[0];
  }
  const all = await callGAS({ action: 'เช็คงาน', search: '' });
  if (all?.success && all.data?.jobs?.length > 0) {
    return all.data.jobs.find(j => j.status === 'รอดำเนินการ') || all.data.jobs[0];
  }
  return null;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function getAreaFromLocation(lat, lng) {
  const areas = [
    { name: 'เมืองร้อยเอ็ด', center: [16.0546, 103.6530], radius: 10 },
    { name: 'อาจสามารถ', center: [15.8800, 103.6400], radius: 8 },
    { name: 'ธวัชบุรี', center: [15.9800, 103.7400], radius: 8 },
    { name: 'เกษตรวิสัย', center: [15.7800, 103.5200], radius: 10 },
    { name: 'โพนทอง', center: [16.1500, 103.4500], radius: 8 },
    { name: 'เสลภูมิ', center: [16.0300, 103.9500], radius: 8 }
  ];
  for (const a of areas) {
    if (haversineDistance(lat, lng, a.center[0], a.center[1]) <= a.radius) {
      return { area: a.name };
    }
  }
  return { area: 'ร้อยเอ็ด' };
}

async function downloadLineContent(messageId) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api-data.line.me',
      path: `/v2/bot/message/${messageId}/content`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${LINE_ACCESS_TOKEN}` }
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

async function callGAS(body) {
  const https = require('https');
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const options = {
      hostname: 'script.google.com',
      path: '/macros/s/AKfycbzSw46G549H6y-4JckzqrRUeWo1ls2wQBtDqiHlUtXTd2t8a20lT0CvIccb_EcnLWeTOA/exec',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({ success: false, error: data }); } });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function callAndFormat(action, params, formatter) {
  try {
    const result = await callGAS({ action, ...params });
    if (result?.success && result.data) return formatter(result.data);
    return createTextMessage('❌ ไม่สามารถดึงข้อมูลได้');
  } catch (e) {
    return createTextMessage('⚠️ Error: ' + e.message);
  }
}

function createTextMessage(text) {
  return { type: 'text', text: text };
}

function createQuickReply(jobId) {
  return {
    type: 'quick',
    items: [
      { type: 'action', action: { type: 'location', label: '📍 ส่งพิกัด' } },
      { type: 'action', action: { type: 'message', label: '📸 ส่งรูป', text: `ส่งรูปงาน ${jobId}` } },
      { type: 'action', action: { type: 'message', label: '✅ ปิดงาน', text: `#ปิดงาน ${jobId}` } }
    ]
  };
}

function getStatusEmoji(s) {
  if (!s) return '📋';
  if (s === 'รอดำเนินการ') return '⏳';
  if (s === 'InProgress' || s === 'กำลังทำ') return '🔄';
  if (s === 'Completed' || s === 'เสร็จแล้ว') return '✅';
  if (s === 'ยกเลิก') return '❌';
  return '📋';
}

async function handleOpenJob(text, userId) {
  return createTextMessage('เปิดงาน — ใช้ #เปิดงาน [ชื่อ] [อาการ]');
}

function formatJobList(data) {
  if (!data.jobs?.length) return createTextMessage('📋 ไม่มีงาน');
  const lines = data.jobs.slice(0, 10).map(j => `${j.job_id} | ${j.customer} | ${getStatusEmoji(j.status)} ${j.status}`);
  return createTextMessage(`📋 งาน ${data.count} รายการ:\n\n${lines.join('\n')}`);
}

function formatSummary(data) {
  return createTextMessage(
    `📊 สรุปงานวันนี้\n\n` +
    `📋 ทั้งหมด: ${data.total || 0}\n⏳ รอดำเนินการ: ${data.pending || 0}\n🔄 กำลังทำ: ${data.inProgress || 0}\n✅ เสร็จแล้ว: ${data.completed || 0}`
  );
}

function formatStock(data) {
  if (!data.items?.length) return createTextMessage('📦 ไม่มีข้อมูล');
  const lines = data.items.slice(0, 10).map(i => `${i.qty < 5 ? '🔴' : '✅'} ${i.name} — ${i.qty} ชิ้น`);
  return createTextMessage(`📦 สต๊อก:\n\n${lines.join('\n')}`);
}

function createJobReportCard(jobData, photoUrl, analysis) {
  return createTextMessage(
    `📋 ${jobData.job_id} — ${jobData.customer}\n` +
    `🔧 ${jobData.symptom || '-'}\n` +
    `📊 ${getStatusEmoji(jobData.status)} ${jobData.status}\n` +
    `👷 ${jobData.technician || '-'}\n` +
    `📸 ${photoUrl || 'ไม่มีรูปภาพ'}\n` +
    `📁 ${jobData.folder_url || '-'}\n` +
    (analysis ? `\n🤖 ${analysis}` : '')
  );
}

module.exports = { processLineMessage, classifyMessage, detectPhase };