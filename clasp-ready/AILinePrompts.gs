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
    
    var apiKey = getConfig('GEMINI_API_KEY') || getConfig('GOOGLE_AI_API_KEY') || getConfig('GOOGLE_GEMINI_API_KEY') || getConfig('GEMINI_KEY') || '';
    if (!apiKey) {
      return createTextMessage(buildAILineFallbackReply_(role, text, 'ยังไม่ได้ตั้งค่า Gemini สำหรับ AI Agent'));
    }
    
    var response = UrlFetchApp.fetch(
      getGeminiApiUrl_(apiKey),
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
    if (response.getResponseCode() < 200 || response.getResponseCode() >= 300 || result.error) {
      return createTextMessage(buildAILineFallbackReply_(role, text, result.error && result.error.message || 'Gemini API error'));
    }
    var reply = result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0] && result.candidates[0].content.parts[0].text;
    
    if (!reply) {
      return createTextMessage(buildAILineFallbackReply_(role, text, 'Gemini returned empty content'));
    }
    
    return createTextMessage(reply.substring(0, 5000));
    
  } catch (error) {
    Logger.log('processWithAILineAgent error: ' + error);
    return createTextMessage(buildAILineFallbackReply_('', text, error.toString()));
  }
}

function buildAILineFallbackReply_(role, text, reason) {
  var normalized = String(text || '').toLowerCase();
  var lines = ['COMPHONE AI พร้อมใช้งาน แต่โหมดวิเคราะห์อัตโนมัติสะดุดชั่วคราว'];
  if (reason) lines.push('สาเหตุ: ' + String(reason).substring(0, 120));

  try {
    if (role === 'SALES_ANALYST' || normalized.indexOf('ขาย') > -1 || normalized.indexOf('sales') > -1) {
      var dashboard = typeof getDashboardData === 'function' ? getDashboardData() : {};
      var summary = dashboard.summary || dashboard.kpi || dashboard.stats || {};
      lines.push('สรุปฝ่ายขายเบื้องต้น:');
      lines.push('- งานในระบบ: ' + (summary.total_jobs || summary.totalJobs || (dashboard.jobs && dashboard.jobs.length) || 0));
      lines.push('- ลูกค้า: ' + (summary.total_customers || summary.totalCustomers || (dashboard.customers && dashboard.customers.length) || 0));
      lines.push('- บิล/รายได้ให้ดูใน Dashboard > Reports เพื่อยืนยันตัวเลขล่าสุด');
      lines.push('คำสั่งที่ใช้ได้ทันที: สรุป, เช็คงาน, เช็คบิล J0020, /groupid');
      return lines.join('\n');
    }

    var jobs = [];
    if (typeof getDashboardData === 'function') {
      var data = getDashboardData();
      jobs = data && data.jobs || [];
    }
    lines.push('สรุปงานเบื้องต้น: ' + jobs.length + ' รายการ');
    if (jobs.length) {
      for (var i = 0; i < Math.min(jobs.length, 3); i++) {
        lines.push('- ' + (jobs[i].id || jobs[i].job_id || '-') + ' ' + (jobs[i].customer || jobs[i].customer_name || ''));
      }
    }
    lines.push('คำสั่งที่ใช้ได้ทันที: เช็คงาน, สรุป, /groupid');
    return lines.join('\n');
  } catch (fallbackError) {
    return lines.concat([
      'ยังตอบด้วยข้อมูลสดไม่ได้ในตอนนี้',
      'คำสั่งที่ใช้ได้ทันที: /groupid, เช็คงาน, สรุป'
    ]).join('\n');
  }
}

/**
 * ตรวจสอบ Role จาก Group ID
 */
// Sprint 186 override: keep LINE replies readable even when Gemini is unavailable.
function buildAILineFallbackReply_(role, text, reason) {
  var normalized = String(text || '').toLowerCase();
  var lines = ['COMPHONE AI พร้อมใช้งาน แต่โหมดวิเคราะห์อัตโนมัติสะดุดชั่วคราว'];
  if (reason) lines.push('สาเหตุ: ' + String(reason).substring(0, 120));

  try {
    if (role === 'SALES_ANALYST' || normalized.indexOf('ขาย') > -1 || normalized.indexOf('sales') > -1) {
      var dashboard = typeof getDashboardData === 'function' ? getDashboardData() : {};
      var summary = dashboard.summary || dashboard.kpi || dashboard.stats || {};
      lines.push('สรุปฝ่ายขายเบื้องต้น:');
      lines.push('- งานในระบบ: ' + (summary.total_jobs || summary.totalJobs || (dashboard.jobs && dashboard.jobs.length) || 0));
      lines.push('- ลูกค้า: ' + (summary.total_customers || summary.totalCustomers || (dashboard.customers && dashboard.customers.length) || 0));
      lines.push('- ตรวจตัวเลขล่าสุดได้ที่ Dashboard > Reports');
      lines.push('คำสั่งที่ใช้ได้ทันที: สรุป, เช็คงาน, เช็คบิล J0020, /groupid');
      return lines.join('\n');
    }

    var jobs = [];
    if (typeof getDashboardData === 'function') {
      var data = getDashboardData();
      jobs = data && data.jobs || [];
    }
    lines.push('สรุปงานเบื้องต้น: ' + jobs.length + ' รายการ');
    for (var i = 0; i < Math.min(jobs.length, 3); i++) {
      lines.push('- ' + (jobs[i].id || jobs[i].job_id || '-') + ' ' + (jobs[i].customer || jobs[i].customer_name || ''));
    }
    lines.push('คำสั่งที่ใช้ได้ทันที: เช็คงาน, สรุป, /groupid');
    return lines.join('\n');
  } catch (fallbackError) {
    return lines.concat([
      'ยังตอบด้วยข้อมูลสดไม่ได้ในตอนนี้',
      'คำสั่งที่ใช้ได้ทันที: /groupid, เช็คงาน, สรุป'
    ]).join('\n');
  }
}

function detectRoleFromGroupId_(groupId) {
  if (typeof detectLineRoomNameV55_ !== 'function') return groupId ? 'DISPATCHER' : 'PRIVATE_ASSISTANT';
  var room = detectLineRoomNameV55_(groupId);
  if (room === 'ACCOUNTING') return 'ACCOUNTING_ANALYST';
  if (room === 'SALES') return 'SALES_ANALYST';
  if (room === 'PROCUREMENT') return 'PROCUREMENT_ASSISTANT';
  if (room === 'EXECUTIVE') return 'BI';
  return room === 'TECHNICIAN' ? 'DISPATCHER' : 'PRIVATE_ASSISTANT';
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
// Sprint 187 room-intelligence overrides.
function detectRoleFromGroupId_(groupId) {
  if (typeof detectLineRoomNameV55_ === 'function') {
    var room = detectLineRoomNameV55_(groupId);
    if (room === 'TECHNICIAN') return 'DISPATCHER';
    if (room === 'ACCOUNTING') return 'ACCOUNTING_ANALYST';
    if (room === 'SALES') return 'SALES_ANALYST';
    if (room === 'PROCUREMENT') return 'PROCUREMENT_ASSISTANT';
    if (room === 'EXECUTIVE') return 'BI';
  }
  return 'PRIVATE_ASSISTANT';
}

function getPromptByRole_(role) {
  var sharedRules = [
    'ตอบเป็นภาษาไทย กระชับ ไม่เกิน 6 บรรทัด เว้นแต่ผู้ใช้ขอรายละเอียด',
    'ห้ามเดาตัวเลข รายชื่อลูกค้า ยอดเงิน หรือสถานะงานที่ไม่มีในบริบท',
    'ถ้าข้อมูลไม่พอ ให้บอกข้อมูลที่ต้องการเพิ่ม เช่น JobID, เลขบิล, ชื่อลูกค้า, หรือรูปหลักฐาน',
    'ใช้คำตอบให้สัมพันธ์กับห้อง LINE ปัจจุบันเท่านั้น และอย่าโยนงานข้ามแผนกโดยไม่มีเหตุผล'
  ].join('\n- ');

  var prompts = {
    DISPATCHER: 'คุณคือ COMPHONE Dispatcher สำหรับห้องช่าง\nโฟกัส: สถานะงาน, JobID, รูปหน้างาน, ความคืบหน้า, อุปกรณ์ที่ต้องใช้, ปัญหาหน้างาน\nอย่าตอบเรื่องยอดขายหรือบัญชี เว้นแต่ผู้ใช้ถามเพื่อประสานงานและมี JobID ชัดเจน',
    ACCOUNTING_ANALYST: 'คุณคือ COMPHONE Accounting Assistant สำหรับห้องบัญชี\nโฟกัส: สลิป, ยอดชำระ, บิล, ใบเสร็จ, คงค้าง, การผูกหลักฐานกับ JobID\nถ้าได้รับรูปหรือข้อความที่ไม่มี JobID ให้แนะนำให้ผูกกับ JobID/บิล แต่ไม่ปฏิเสธหลักฐาน',
    SALES_ANALYST: 'คุณคือ COMPHONE Sales Assistant สำหรับห้องขาย\nโฟกัส: ลูกค้าใหม่, โอกาสขาย, ใบเสนอราคา, ติดตามลูกค้า, สรุปงานขาย\nอย่าตอบยืนยันชำระเงินแทนบัญชี และอย่าเปลี่ยนสถานะงานแทนช่าง',
    PROCUREMENT_ASSISTANT: 'คุณคือ COMPHONE Procurement Assistant สำหรับห้องจัดซื้อ\nโฟกัส: อะไหล่, สต็อก, ของขาด, รูปสินค้า, การสั่งซื้อ, การรับของ\nถ้าข้อมูลสินค้าไม่ครบ ให้ถามรหัสสินค้า จำนวน หรือรูปเพิ่ม',
    BI: 'คุณคือ COMPHONE Business Intelligence สำหรับห้องผู้บริหาร\nโฟกัส: ภาพรวมงาน รายได้ ความเสี่ยง คิวค้าง จุดติดขัด และ next action\nสรุปเป็น insight พร้อมข้อเสนอแนะ ไม่ใช่แค่รายการดิบ',
    PRIVATE_ASSISTANT: 'คุณคือ COMPHONE Bot Assistant ในแชทส่วนตัว\nโฟกัส: อธิบายคำสั่งที่ใช้ได้ และขอให้ผู้ใช้ทำงานหลักในห้องที่ถูกต้อง'
  };

  return (prompts[role] || prompts.PRIVATE_ASSISTANT) + '\n\nกฎร่วม:\n- ' + sharedRules;
}

function buildAILineFallbackReply_(role, text, reason) {
  var roomLabel = {
    DISPATCHER: 'ห้องช่าง',
    ACCOUNTING_ANALYST: 'ห้องบัญชี',
    SALES_ANALYST: 'ห้องขาย',
    PROCUREMENT_ASSISTANT: 'ห้องจัดซื้อ',
    BI: 'ห้องผู้บริหาร',
    PRIVATE_ASSISTANT: 'แชทส่วนตัว'
  }[role] || 'ห้องทั่วไป';

  var lines = ['COMPHONE AI พร้อมช่วย (' + roomLabel + ')'];
  if (reason) lines.push('หมายเหตุ: โหมดวิเคราะห์สดยังไม่สมบูรณ์ - ' + String(reason).substring(0, 100));

  if (role === 'ACCOUNTING_ANALYST') {
    lines.push('ใช้ได้ทันที: เช็คบิล J0020, ส่งสลิป/หลักฐาน, ผูกหลักฐานกับ JobID');
    lines.push('ถ้ายังไม่มี JobID ระบบจะรับเป็นคิวบัญชีรอตรวจสอบ');
  } else if (role === 'DISPATCHER') {
    lines.push('ใช้ได้ทันที: เช็คงาน J0020, สรุป, อัปเดตสถานะ, ส่งรูปหน้างานพร้อม JobID');
  } else if (role === 'SALES_ANALYST') {
    lines.push('ใช้ได้ทันที: สรุปลูกค้า/งานขาย, เช็คงาน J0020, บันทึก lead พร้อมชื่อลูกค้า');
  } else if (role === 'PROCUREMENT_ASSISTANT') {
    lines.push('ใช้ได้ทันที: เช็คสต็อก, ส่งรูปสินค้า/อะไหล่, ระบุรหัสหรือจำนวนที่ต้องการ');
  } else if (role === 'BI') {
    lines.push('ใช้ได้ทันที: สรุป, วิเคราะห์คิวค้าง, วิเคราะห์รายได้, จุดเสี่ยงวันนี้');
  } else {
    lines.push('ใช้คำสั่งในกลุ่มที่เกี่ยวข้อง เช่น /groupid, เช็คงาน J0020, สรุป');
  }
  lines.push('ถ้าต้องการให้ AI วิเคราะห์ ให้ขึ้นต้นด้วย "ai" หรือ "วิเคราะห์"');
  return lines.join('\n');
}

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
