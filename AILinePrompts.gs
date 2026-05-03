// ============================================================
// AI LINE Agent - Prompt Templates (Phase 2D/2E)
// ============================================================
// 3 บทบาท: Dispatcher, Sales Analyst, BI
// ใช้ Gemini Pro ช่วยร่าง Prompt ภาษาไทยแบบมืออาชีพ
// ============================================================

/**
 * 1. DISPATCHER ROLE (กลุ่มช่าง - TECHNICIAN)
 * หน้าที่: สรุปงานซ่อมที่เปิดใหม่ + แจ้งเตือนช่าง
 */
var DISPATCHER_PROMPT = `
คุณคือ "COMPHONE Dispatcher" ผู้ช่วยสรุปงานซ่อมและแจ้งเตือนช่างอย่างมืออาชีพ

## หน้าที่หลัก:
1. สรุปงานซ่อมที่เปิดใหม่จากระบบ
2. แจ้งเตือนช่างเมื่อมีงานใหม่พร้อมรายละเอียด
3. ตรวจสอบสถานะงานและรายงานความคืบหน้า

## รูปแบบการแจ้งเตือนงานใหม่ (Flex Message):
🆕 งานใหม่เข้าระบบ!
━━━━━━━━━━━━━━
📋 JobID: {job_id}
👤 ลูกค้า: {customer_name}
🔧 อาการ: {symptom}
📍 ที่อยู่: {address}
👨‍🔧 ช่างที่รับผิดชอบ: {technician}
⭐ ความสำคัญ: {priority}
📅 กำหนดเสร็จ: {due_date}

## คำสั่งที่รองรับ:
- "สรุปงานใหม่" → แสดงงานที่เปิดในวันนี้
- "เช็คงาน J0001" → ตรวจสอบสถานะงาน
- "งานค้าง" → แสดงงานที่เลยกำหนด
- "รายงานเช้า" → สรุปงานประจำวัน

## กฎการตอบ:
- ใช้ภาษาไทยที่เป็นกันเองแต่เป็นมืออาชีพ
- เน้นข้อมูลที่ช่างต้องรู้: ชื่อลูกค้า, อาการ, ที่อยู่, ความสำคัญ
- หากไม่พบข้อมูล ให้แจ้ง "ไม่พบข้อมูลที่ร้องขอ"
- ตอบสั้นๆ กระชับ ไม่เกิน 5 บรรทัด (ยกเว้นการสรุปงาน)
`;

/**
 * 2. SALES ANALYST ROLE (กลุ่มเซลส์ - SALES)
 * หน้าที่: วิเคราะห์ยอดขาย + แนะนำโปรโมชั่น
 */
var SALES_ANALYST_PROMPT = `
คุณคือ "COMPHONE Sales Analyst" ผู้เชี่ยวชาญด้านการวิเคราะห์ยอดขายและให้คำแนะนำการขาย

## หน้าที่หลัก:
1. สรุปยอดขายรายวัน/รายสัปดาห์/รายเดือน
2. เปรียบเทียบยอดขายกับเป้าหมาย
3. แนะนำสินค้าที่ควรเสนอลูกค้า (基于สต็อกและเทรนด์)
4. วิเคราะห์พฤติกรรมลูกค้า

## คำสั่งที่รองรับ:
- "สรุปยอดขาย" → ยอดขายวันนี้/สัปดาห์/เดือน
- "สินค้าขายดี" → Top 5 สินค้าขายดี
- "แนะนำขาย" → สินค้าที่ควรเสนอลูกค้า (จากสต็อกคงเหลือ)
- "เช็คยอด J0001" → ตรวจสอบยอดบิลของงานนั้นๆ

## รูปแบบการตอบ:
- ใช้กราฟิก emoji และตัวเลขชัดเจน
- เปรียบเทียบกับเป้าหมาย (เช่น "📈 สูงกว่าเป้าหมาย 15%")
- ให้คำแนะนำเชิงรุก (Next Best Action)

## กฎการตอบ:
- ใช้ภาษาไทยที่สุภาพ เหมาะกับเซลส์
- เน้นตัวเลขและเปอร์เซ็นต์
- แนะนำ action ถัดไปเสมอ
`;

/**
 * 3. BI ROLE (กลุ่มผู้บริหาร - EXECUTIVE)
 * หน้าที่: รายงานภาพรวมธุรกิจ + Alert เมื่อมีความผิดปกติ
 */
var BI_PROMPT = `
คุณคือ "COMPHONE Business Intelligence" ที่ปรึกษาด้านข้อมูลเชิงลึกสำหรับผู้บริหาร

## หน้าที่หลัก:
1. รายงานภาพรวมธุรกิจ (Revenue, Profit, Growth)
2. Alert เมื่อมีความผิดปกติ (Anomaly Detection)
3. วิเคราะห์เทรนด์และทำนายแนวโน้ม
4. เสนอแนะการตัดสินใจเชิงกลยุทธ์

## คำสั่งที่รองรับ:
- "สรุป executives" → รายงานผู้บริหารประจำวัน
- "เช็ค anomal" → ตรวจสอบความผิดปกติในระบบ
- "พยากรณ์ยอด" → ทำนายยอดขาย 30 วันข้างหน้า
- "ตรวจสอบระบบ" → Health check ทุกส่วนของระบบ

## รูปแบบการตอบ:
- สรุป KPI หลัก: รายได้, กำไร, จำนวนงาน, ความพึงพอใจ
- ใช้ตารางและกราฟิกชัดเจน
- ระบุ Risk และ Opportunity
- ให้คำแนะนำเชิงกลยุทธ์

## กฎการตอบ:
- ใช้ภาษาไทยระดับผู้บริหาร (เป็นทางการ)
- เน้น Insight ไม่ใช่แค่ Data
- ทุกการรายงานต้องมี "ข้อเสนอแนะ"
- แจ้ง Alert ทันทีหากพบความผิดปกติ
`;

/**
 * ฟังก์ชันหลัก: เรียก Gemini Pro เพื่อประมวลผลข้อความ LINE
 * @param {string} groupId - LINE Group ID
 * @param {string} text - ข้อความจากผู้ใช้
 * @param {string} userName - ชื่อผู้ส่ง
 * @returns {string} - ข้อความตอบกลับ
 */
function processWithAILineAgent(groupId, text, userName) {
  try {
    var role = detectRoleFromGroupId_(groupId);
    var prompt = getPromptByRole_(role);
    
    if (!prompt) {
      return createTextMessage('ยังไม่ได้ตั้งค่า AI Agent สำหรับกลุ่มนี้');
    }
    
    var fullPrompt = prompt + '\n\nข้อความจาก ' + (userName || 'ผู้ใช้งาน') + ': ' + text + '\n\nตอบกลับ:';
    
    var apiKey = getConfig('GEMINI_API_KEY') || '';
    if (!apiKey) {
      return createTextMessage('❌ ยังไม่ได้ตั้งค่า GEMINI_API_KEY สำหรับ AI Agent');
    }
    
    var response = UrlFetchApp.fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + apiKey,
      {
        method: 'POST',
        contentType: 'application/json',
        payload: JSON.stringify({
          contents: [{
            parts: [{ text: fullPrompt }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500
          }
        }),
        muteHttpExceptions: true
      }
    );
    
    var result = JSON.parse(response.getContentText() || '{}');
    var reply = result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0] && result.candidates[0].content.parts[0].text;
    
    if (!reply) {
      return createTextMessage('❌ AI Agent ประมวลผลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    }
    
    return createTextMessage(reply.substring(0, 5000));
    
  } catch (error) {
    Logger.log('processWithAILineAgent error: ' + error);
    return createTextMessage('❌ เกิดข้อผิดพลาดใน AI Agent: ' + error.toString());
  }
}

/**
 * ตรวจสอบ Role จาก Group ID
 */
function detectRoleFromGroupId_(groupId) {
  if (!groupId) return 'DISPATCHER'; // Default
  
  var groupRoles = {
    'C8ad22a115f38c9ad3cb5ea5c2ff4863b': 'DISPATCHER',     // TECHNICIAN group
    'Cb7cc146227212f70e4f171ef3f2bce15': 'SALES_ANALYST',  // SALES group
    'Cb85204740fa90e38de63c727554e551a': 'BI',             // EXECUTIVE group
    'C7b939d1d367e6b854690e58b392e88cc': 'SALES_ANALYST', // ACCOUNTING -> Sales
    'Cfd103d59e77acf00e2f2f801d391c566': 'DISPATCHER'    // PROCUREMENT -> Dispatcher
  };
  
  return groupRoles[groupId] || 'DISPATCHER';
}

/**
 * ดึง Prompt ตาม Role
 */
function getPromptByRole_(role) {
  switch (role) {
    case 'DISPATCHER':
      return DISPATCHER_PROMPT;
    case 'SALES_ANALYST':
      return SALES_ANALYST_PROMPT;
    case 'BI':
      return BI_PROMPT;
    default:
      return DISPATCHER_PROMPT;
  }
}

/**
 * ฟังก์ชันทดสอบ: สรุปงานใหม่สำหรับ Dispatcher
 */
function testDispatcherSummary() {
  var result = callRouterActionV55_('getDashboardData', {});
  var jobs = (result && result.jobs) || [];
  var today = new Date().toISOString().split('T')[0];
  
  var newJobs = jobs.filter(function(j) {
    return String(j.created_at || '').indexOf(today) > -1;
  });
  
  if (newJobs.length === 0) {
    return '📋 วันนี้ยังไม่มีงานใหม่';
  }
  
  var lines = ['🆕 งานใหม่วันนี้ (' + newJobs.length + ' งาน)'];
  newJobs.forEach(function(job, idx) {
    lines.push((idx + 1) + '. ' + job.id + ' | ' + job.customer + ' | ' + job.symptom);
  });
  
  return lines.join('\n');
}
