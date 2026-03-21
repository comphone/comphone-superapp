function processTelegramUpdate(msg) {
  const chatId = msg.chat.id;

  // รับ Location
  if (msg.location) {
    const txt = "📍 Telegram AI รับพิกัดมาแล้ว:\nLat: " + msg.location.latitude + "\nLng: " + msg.location.longitude;
    sendTelegramMessageLocal(chatId, txt);
    return;
  }

  // รับรูปภาพ
  if (msg.photo && msg.photo.length > 0) {
    sendTelegramMessageLocal(chatId, "📸 รับรูปภาพแล้วครับ!\n👉 กรุณาอัปโหลดผ่าน Web App แทนนะครับ เพื่อความชัดเจนและไม่สับสน!");
    return;
  }

  // รับข้อความ
  if (msg.text) {
    const text = msg.text.trim();
    if (text.startsWith('ค้นหา') || text.startsWith('หางาน') || text.startsWith('?')) {
      let keyword = text.replace(/ค้นหา|หางาน|\?/g, '').trim();
      if (!keyword) return sendTelegramMessageLocal(chatId, "พิมพ์คำค้นหาต่อท้ายด้วยครับ เช่น '? แม่นาง'");
      sendTelegramMessageLocal(chatId, `🔍 กำลังค้นหา: ${keyword}\nกดลิงก์นี้เพื่อดูคิวงาน: ${WEB_APP_URL}`);
    }
    else if (text.startsWith('#ปิดงาน')) {
      const args = text.split(' ');
      if (args.length < 2) return sendTelegramMessageLocal(chatId, "ระบุรหัสด้วยค้าบ เช่น '#ปิดงาน JOB-0321-1234'");
      let res = updateJobFields(args[1], {"สถานะ": "Completed"});
      if (res.success) sendTelegramMessageLocal(chatId, "✅ สั่งปิดจ๊อบงาน *" + args[1] + "* เรียบร้อย!");
      else sendTelegramMessageLocal(chatId, "❌ หารหัสงานนี้ไม่เจอฮะ (" + args[1] + ")");
    }
    else if (text === 'สถานะ' || text.toLowerCase() === 'status') {
      let aiReport = getAIPanelData();
      if (aiReport.success) {
        sendTelegramMessageLocal(chatId, "🤖 รายงานสถานะ:\n" + aiReport.alertMsg + "\nมีคิวรออยู่ " + aiReport.pending + " งานครับ");
      }
    }
  }
}

function sendTelegramMessageLocal(chatId, text) {
  const props = PropertiesService.getScriptProperties();
  const botToken = props.getProperty('TELEGRAM_BOT_TOKEN');
  if (!botToken) return;
  const url = "https://api.telegram.org/bot" + botToken + "/sendMessage";
  const payload = { chat_id: String(chatId), text: text };
  const opt = { method: "post", contentType: "application/json", muteHttpExceptions: true, payload: JSON.stringify(payload) };
  try { UrlFetchApp.fetch(url, opt); } catch (e) { }
}