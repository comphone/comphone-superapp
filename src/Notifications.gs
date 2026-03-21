// ==========================================
// Notifications.gs
// COMPHONE SUPER APP - LINE MESSAGING API ENGINE (V2.1)
// ==========================================

/**
 * 📢 ฟังก์ชันหลัก: ส่งแจ้งเตือนงานใหม่เข้ากลุ่ม LINE
 * @param {Object} jobData - ข้อมูลงานซ่อม (JobID, ชื่อลูกค้า, อาการเสีย, สถานะ)
 */
function notifyNewJobToLineGroup(jobData) {
  const token = CONFIG.LINE_CHANNEL_ACCESS_TOKEN;
  const targetId = CONFIG.LINE_GROUP_ID;
  
  // ตรวจสอบความพร้อมของค่า Config
  if (!token || !targetId || targetId.includes('ใส่_')) {
    console.warn("⚠️ LINE Config ไม่ครบถ้วน: ข้ามการส่งแจ้งเตือน");
    return;
  }

  const messageText = buildNewJobLineMessage(jobData);
  
  // เรียกใช้ฟังก์ชันส่งข้อความ
  return sendLinePush(targetId, messageText);
}

/**
 * 📝 ฟังก์ชันสร้างรูปแบบข้อความ (Template)
 */
function buildNewJobLineMessage(d) {
  const jobUrl = WEB_APP_URL + "?job=" + encodeURIComponent(d['JobID']);
  
  // ใช้ Template String เพื่อความสวยงามและอ่านง่าย
  return [
    "🛠️ มีงานใหม่เข้าระบบ!",
    "━━━━━━━━━━━━━━",
    `🆔 รหัส: ${d['JobID']}`,
    `👤 ลูกค้า: ${d['ชื่อลูกค้า'] || 'ไม่ระบุชื่อ'}`,
    `📱 เบอร์: ${d['เบอร์โทร'] || '-'}`,
    `🔧 อาการ: ${d['อาการเสีย'] || '-'}`,
    `🚨 สถานะ: ${d['สถานะ'] || 'Pending'}`,
    "━━━━━━━━━━━━━━",
    "👉 ดูรายละเอียด / บันทึกภาพ:",
    jobUrl
  ].join('\n').trim();
}

/**
 * 🛰️ ฟังก์ชันส่ง Push Message ผ่าน LINE Messaging API
 * @param {string} to - ID ของกลุ่มหรือ User
 * @param {string} text - ข้อความที่ต้องการส่ง
 */
function sendLinePush(to, text) {
  const url = 'https://api.line.me/v2/bot/message/push';
  
  const payload = {
    "to": to,
    "messages": [
      {
        "type": "text",
        "text": text
      }
    ]
  };

  const options = {
    "method": "post",
    "contentType": "application/json",
    "headers": {
      "Authorization": "Bearer " + CONFIG.LINE_CHANNEL_ACCESS_TOKEN
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const result = JSON.parse(response.getContentText());
    
    // บันทึกลง Log เพื่อตรวจสอบภายหลัง
    if (result.message) {
      console.error("LINE API Error: ", result.message);
    } else {
      console.log("✅ LINE Message Sent Successfully");
    }
    
    return result;
  } catch (e) {
    console.error("Critical: Failed to send LINE message: " + e.message);
    return { success: false, error: e.message };
  }
}

/**
 * 🔔 (Optional) ฟังก์ชันสำหรับแจ้งเตือนเมื่อมีการอัปเดตสถานะงาน
 */
function notifyStatusUpdate(jobId, customer, newStatus) {
  const token = CONFIG.LINE_CHANNEL_ACCESS_TOKEN;
  const targetId = CONFIG.LINE_GROUP_ID;
  if (!token || !targetId) return;

  const msg = `🔔 อัปเดตสถานะงาน!\n🆔 รหัส: ${jobId}\n👤 ลูกค้า: ${customer}\n✨ สถานะใหม่: ${newStatus}`;
  return sendLinePush(targetId, msg);
}