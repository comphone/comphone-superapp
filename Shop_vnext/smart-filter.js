// smart-filter.js — AI Message Classification for LINE Bot
// วิเคราะห์ข้อความ → งานทั่วไป / รายงานผล / คุยเล่น / สรุป

const WORK_KEYWORDS = [
  // งาน/ติดตั้ง
  'ติดตั้ง', 'ซ่อม', 'เปลี่ยน', 'ตั้งค่า', 'เดินสาย', 'เจาะ', 'ยึด', 'ประกอบ',
  'กล้อง', 'cctv', 'wifi', 'เราเตอร์', 'extender', 'สายlan', 'sfp', 'poe',
  'nvr', 'dvr', 'access point', 'switch', 'ตู้ rack',
  // สถานะ
  'เสร็จ', 'เสร็จแล้ว', 'เรียบร้อย', 'กำลังทำ', 'กำลังเดินทาง', 'ไปถึงแล้ว', 'เริ่มงาน',
  'รอดำเนินการ', 'ยกเลิก', 'เลื่อน', 'รออะไหล่', 'รอคิว',
  // คำสั่ง
  'เปิดงาน', 'ปิดงาน', 'เช็คงาน', 'เช็คสต๊อก', 'สรุป', 'รับงาน', 'มอบหมาย',
  'พิกัด', 'location', 'gps', 'lat', 'lng', 'รูป', 'ภาพ', 'photo',
  // ข้อมูลลูกค้า
  'ลูกค้า', 'เบอร์โทร', 'ที่อยู่', 'อำเภอ', 'จังหวัด',
  // อาการ
  'เปิดไม่ติด', 'ภาพไม่ขึ้น', 'สัญญาณขาด', 'เน็ตหลุด', 'ไฟดับ',
  'ซ่อมบำรุง', 'ma', 'preventive', 'ตรวจเช็ค'
];

const CASUAL_KEYWORDS = [
  '555', '5555', '55555', 'ฮ่า', 'อิอิ', 'ok', 'โอเค', 'ครับ', 'ค่ะ',
  'ดีครับ', 'ดีค่ะ', 'สวัสดี', 'ขอบคุณ', 'ยินดี', 'รับทราบ',
  'กิน', 'ข้าว', 'อาหาร', 'เที่ยง', 'เย็น', 'เช้า', 'พัก',
  'ฝนตก', 'ร้อน', 'หนาว', 'อากาศ',
  'ขับรถ', 'รถติด', 'ทาง', 'ถนน', 'ถึงยัง', 'ไหนแล้ว',
  '👍', '👋', '❤️', '😊', '🙏'
];

/**
 * Classify LINE message type
 * @param {string} text - Message text
 * @param {boolean} hasImage - Has image attachment
 * @param {boolean} hasSticker - Has sticker
 * @returns {object} { type, confidence, jobId, action }
 */
function classifyMessage(text, hasImage, hasSticker) {
  if (!text) text = '';
  const textLower = text.toLowerCase().trim();

  // 1. Check for JobID pattern first (J0001-J9999)
  const jobIdMatch = textLower.match(/j\d{3,4}/i);
  const jobId = jobIdMatch ? jobIdMatch[0].toUpperCase() : null;

  // 2. Check for command patterns
  const commandPatterns = {
    'เปิดงาน': /^(เปิดงาน|#เปิดงาน)/,
    'ปิดงาน': /^(ปิดงาน|#ปิดงาน)/,
    'เช็คงาน': /^(เช็คงาน|#เช็คงาน)/,
    'เช็คสต๊อก': /^(เช็คสต๊อก|#เช็คสต๊อก)/,
    'สรุปงาน': /^(สรุปงาน|#สรุปงาน)/,
    'สรุปช่าง': /^(สรุปช่าง|#สรุปช่าง)/,
    'รับงาน': /^(รับงาน|#รับงาน)/,
    'มอบหมาย': /^(มอบหมาย|#มอบหมาย)/,
    'อัพเดท': /^(อัพเดท|อัปเดต|#อัพเดท)/,
  };

  for (const [cmd, pattern] of Object.entries(commandPatterns)) {
    if (pattern.test(textLower)) {
      return {
        type: 'command',
        command: cmd,
        confidence: 1.0,
        jobId: jobId,
        rawText: text
      };
    }
  }

  // 3. Check for image/media reports
  if (hasImage || hasSticker) {
    // If there's a jobId or work keywords → work report
    const hasWorkKw = checkWorkKeywords(textLower);
    if (jobId || hasWorkKw) {
      return {
        type: 'work_report',
        subType: 'photo_report',
        confidence: 0.9,
        jobId: jobId,
        rawText: text
      };
    }
    // Image without context → likely work report (ช่างส่งรูป = รายงาน)
    return {
      type: 'work_report',
      subType: 'photo_only',
      confidence: 0.7,
      jobId: jobId,
      rawText: text
    };
  }

  // 4. Check for status update patterns
  const statusPatterns = [
    { pattern: /เสร็จ|เรียบร้อย|done|complete/i, status: 'เสร็จงาน' },
    { pattern: /ถึง|ไปถึง|อยู่หน้างาน|at site/i, status: 'ถึงสถานที่' },
    { pattern: /กำลังเดินทาง|on the way|ออกแล้ว/i, status: 'กำลังเดินทาง' },
    { pattern: /เริ่ม|start|กำลังทำ|working/i, status: 'เริ่มงาน' },
    { pattern: /รอ|wait|เลื่อน|cancel|ยกเลิก/i, status: 'รอ/เลื่อน' },
  ];

  for (const sp of statusPatterns) {
    if (sp.pattern.test(textLower)) {
      return {
        type: 'status_update',
        status: sp.status,
        confidence: 0.85,
        jobId: jobId,
        rawText: text
      };
    }
  }

  // 5. Check if it's a summary request
  if (textLower.includes('สรุป') || textLower.includes('report') || textLower.includes('รายงาน')) {
    return {
      type: 'command',
      command: textLower.includes('ช่าง') ? 'สรุปช่าง' : 'สรุปงาน',
      confidence: 0.9,
      jobId: jobId,
      rawText: text
    };
  }

  // 6. Count work keywords vs casual keywords
  const workScore = checkWorkKeywords(textLower).score;
  const casualScore = checkCasualKeywords(textLower).score;

  if (workScore > casualScore && workScore >= 2) {
    return {
      type: 'work_note',
      confidence: Math.min(0.9, 0.5 + workScore * 0.1),
      jobId: jobId,
      rawText: text
    };
  }

  if (casualScore > workScore && casualScore >= 2) {
    return {
      type: 'casual_chat',
      confidence: Math.min(0.9, 0.5 + casualScore * 0.1),
      jobId: jobId,
      rawText: text
    };
  }

  // Default: if has work keyword at all → work (conservative)
  if (workScore > 0) {
    return {
      type: 'work_note',
      confidence: 0.6,
      jobId: jobId,
      rawText: text
    };
  }

  // Unknown short message → casual
  if (text.length < 15) {
    return {
      type: 'casual_chat',
      confidence: 0.5,
      jobId: jobId,
      rawText: text
    };
  }

  // Long unknown message → work note (conservative)
  return {
    type: 'work_note',
    confidence: 0.4,
    jobId: jobId,
    rawText: text
  };
}

/**
 * Check text for work-related keywords
 */
function checkWorkKeywords(text) {
  let score = 0;
  let found = [];

  for (const kw of WORK_KEYWORDS) {
    if (text.includes(kw)) {
      score++;
      found.push(kw);
    }
  }

  return { score, found };
}

/**
 * Check text for casual chat keywords
 */
function checkCasualKeywords(text) {
  let score = 0;
  let found = [];

  for (const kw of CASUAL_KEYWORDS) {
    if (text.includes(kw)) {
      score++;
      found.push(kw);
    }
  }

  return { score, found };
}

/**
 * Extract job context from text
 */
function extractJobContext(text) {
  const ctx = {};

  // Phone number
  const phoneMatch = text.match(/0[689]\d[-\s]?\d{3}[-\s]?\d{4}/);
  if (phoneMatch) ctx.phone = phoneMatch[0].replace(/[-\s]/g, '');

  // GPS coordinates
  const gpsMatch = text.match(/lat[:\s]?([\d.]+)[,\s]+lng[:\s]?([\d.]+)/i);
  if (gpsMatch) {
    ctx.lat = parseFloat(gpsMatch[1]);
    ctx.lng = parseFloat(gpsMatch[2]);
  }

  // Customer name (after "เปิดงาน" or at start)
  const openMatch = text.match(/เปิดงาน\s+([^\s,]{2,20})/);
  if (openMatch) ctx.customer = openMatch[1];

  return ctx;
}

module.exports = {
  classifyMessage,
  checkWorkKeywords,
  checkCasualKeywords,
  extractJobContext
};
