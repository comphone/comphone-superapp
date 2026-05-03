/**
 * LineBotV3.gs — Phase 34: AI Chatbot V2 (Advanced AI Chat)
 * Features: Context-Aware Conversations, Smart Intent Recognition, Session Memory
 * Version: v5.12.0-phase34
 * Date: 2026-05-01
 */

// Session-based context memory (CacheService - 6 hours TTL)
var CHAT_CONTEXT_CACHE = CacheService.getScriptCache();
var CONTEXT_TTL = 21600; // 6 hours in seconds

/**
 * วิเคราะห์ Intent จากข้อความ (Smart Intent Recognition)
 * รองรับ: แจ้งปัญหา, เช็คสถานะ, ขอราคา, สอบถามทั่วไป
 */
function analyzeIntentV3(message, userId) {
  var msg = message.trim().toLowerCase();
  
  // 1. แจ้งปัญหา/แจ้งซ่อม
  var problemKeywords = ['เสีย', 'พัง', 'ไม่ทำงาน', 'อาการ', 'ปัญหา', 'ซ่อม', 'แจ้งซ่อม', 'ส่งซ่อม'];
  var isProblem = problemKeywords.some(function(kw) { return msg.indexOf(kw) >= 0; });
  
  // 2. เช็คสถานะ/ตรวจสอบ
  var statusKeywords = ['สถานะ', 'ตรวจสอบ', 'ถึงไหนแล้ว', 'คืบหน้า', 'อัปเดต', 'เช็ค'];
  var isStatus = statusKeywords.some(function(kw) { return msg.indexOf(kw) >= 0; });
  
  // 3. ขอราคา/สอบถามราคา
  var priceKeywords = ['ราคา', 'ค่าซ่อม', 'เท่าไหร่', 'เสียค่าใช้จ่าย', 'ประเมินราคา', 'ใบเสนอราคา'];
  var isPrice = priceKeywords.some(function(kw) { return msg.indexOf(kw) >= 0; });
  
  // 4. สอบถามทั่วไป
  var infoKeywords = ['ข้อมูล', 'รายละเอียด', 'สอบถาม', 'ถาม', 'รู้จัก', 'บริการ'];
  var isInfo = infoKeywords.some(function(kw) { return msg.indexOf(kw) >= 0; });
  
  var intents = [];
  if (isProblem) intents.push('REPORT_PROBLEM');
  if (isStatus) intents.push('CHECK_STATUS');
  if (isPrice) intents.push('REQUEST_PRICE');
  if (isInfo) intents.push('INQUIRY');
  
  // ถ้าไม่เจอ intent ที่ชัดเจน
  if (intents.length === 0) intents.push('GENERAL_CHAT');
  
  return {
    primary_intent: intents[0],
    all_intents: intents,
    confidence: intents.length > 0 ? 'high' : 'low',
    message: message,
    user_id: userId
  };
}

/**
 * โหลดบริบทการสนทนา (Context-Aware)
 * จำประวัติการสนทนาได้ถึง 10 ข้อความล่าสุด
 */
function loadChatContextV3(userId) {
  try {
    var cacheKey = 'chat_context_' + userId;
    var cached = CHAT_CONTEXT_CACHE.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // ถ้าไม่มีใน cache ให้โหลดจาก Sheet (long-term memory)
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('LineChatHistory');
    if (!sheet) {
      // สร้าง Sheet ใหม่ถ้ายังไม่มี
      sheet = ss.insertSheet('LineChatHistory');
      sheet.getRange(1, 1, 1, 4).setValues([['UserId', 'Timestamp', 'Message', 'Intent']]);
    }
    
    var data = sheet.getDataRange().getValues();
    var userHistory = data.slice(1).filter(function(row) {
      return row[0] === userId;
    }).slice(-10); // 10 ข้อความล่าสุด
    
    var context = {
      user_id: userId,
      history: userHistory.map(function(row) {
        return {
          timestamp: row[1],
          message: row[2],
          intent: row[3]
        };
      }),
      last_intent: userHistory.length > 0 ? userHistory[userHistory.length-1][3] : null,
      session_start: new Date().toISOString()
    };
    
    // Cache บริบท (6 ชั่วโมง)
    CHAT_CONTEXT_CACHE.put(cacheKey, JSON.stringify(context), CONTEXT_TTL);
    
    return context;
    
  } catch (e) {
    return {
      user_id: userId,
      history: [],
      last_intent: null,
      session_start: new Date().toISOString(),
      error: e.toString()
    };
  }
}

/**
 * บันทึกบริบทการสนทนา
 */
function saveChatContextV3(userId, message, intent) {
  try {
    // 1. บันทึกลง Sheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('LineChatHistory');
    if (!sheet) {
      sheet = ss.insertSheet('LineChatHistory');
      sheet.getRange(1, 1, 1, 4).setValues([['UserId', 'Timestamp', 'Message', 'Intent']]);
    }
    
    sheet.appendRow([userId, new Date().toISOString(), message, intent]);
    
    // 2. อัปเดต Cache
    var context = loadChatContextV3(userId);
    context.history.push({
      timestamp: new Date().toISOString(),
      message: message,
      intent: intent
    });
    
    // เก็บแค่ 10 ข้อความล่าสุด
    if (context.history.length > 10) {
      context.history = context.history.slice(-10);
    }
    
    context.last_intent = intent;
    
    var cacheKey = 'chat_context_' + userId;
    CHAT_CONTEXT_CACHE.put(cacheKey, JSON.stringify(context), CONTEXT_TTL);
    
    return { success: true, context: context };
    
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * สร้าง Quick Reply Buttons ตาม Intent
 */
function generateQuickRepliesV3(intent) {
  var replies = {
    'REPORT_PROBLEM': [
      { label: '📷 ส่งรูปอาการ', data: 'action=send_photo' },
      { label: '📍 แจ้งที่อยู่', data: 'action=send_location' },
      { label: '📞 โทรหาเรา', data: 'action=call_us' }
    ],
    'CHECK_STATUS': [
      { label: '📱 เช็คสถานะงาน', data: 'action=check_job' },
      { label: '📋 ดูประวัติงาน', data: 'action=job_history' },
      { label: '🔔 แจ้งเตือนเมื่อเสร็จ', data: 'action=set_notification' }
    ],
    'REQUEST_PRICE': [
      { label: '📊 ดูราคาค่าซ่อม', data: 'action=price_list' },
      { label: '🧾 ขอใบเสนอราคา', data: 'action=request_quote' },
      { label: '💬 สอบถามเพิ่มเติม', data: 'action=chat_agent' }
    ],
    'INQUIRY': [
      { label: '🕐 เวลาทำการ', data: 'action=opening_hours' },
      { label: '📍 ตำแหน่งร้าน', data: 'action=location' },
      { label: '📞 ติดต่อเรา', data: 'action=contact' }
    ],
    'GENERAL_CHAT': [
      { label: '🔧 บริการของเรา', data: 'action=services' },
      { label: '💬 พูดกับเจ้าหน้าที่', data: 'action=chat_staff' },
      { label: '📱 เช็คสถานะงาน', data: 'action=check_job' }
    ]
  };
  
  return replies[intent] || replies['GENERAL_CHAT'];
}

/**
 * สร้าง Rich Menu แบบ Dynamic ตาม Role ของลูกค้า
 */
function getDynamicRichMenuV3(userId) {
  // TODO: ตรวจสอบ role ของลูกค้า (VIP, Corporate, Walk-in) จาก Customer Sheet
  // ตอนนี้ใช้ default menu
  
  return {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: 'Comphone_Dynamic_Menu_V3',
    chatBarText: 'เลือกบริการ',
    areas: [
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: 'message', text: 'แจ้งซ่อม' }
      },
      {
        bounds: { x: 834, y: 0, width: 833, height: 843 },
        action: { type: 'message', text: 'เช็คสถานะ' }
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: 'message', text: 'ขอราคา' }
      },
      {
        bounds: { x: 0, y: 844, width: 833, height: 842 },
        action: { type: 'message', text: 'สอบถาม' }
      },
      {
        bounds: { x: 834, y: 844, width: 833, height: 842 },
        action: { type: 'message', text: 'สิทธิพิเศษ' }
      },
      {
        bounds: { x: 1667, y: 844, width: 833, height: 842 },
        action: { type: 'uri', uri: 'https://comphone.github.io/comphone-superapp/pwa/' }
      }
    ]
  };
}

/**
 * ประมวลผลข้อความจาก LINE Webhook (V3 - Enhanced)
 */
function handleLineWebhookV3(event) {
  var userId = event.source.userId;
  var message = event.message ? event.message.text : '';
  
  if (!message) {
    return { success: false, error: 'No message text' };
  }
  
  try {
    // 1. โหลดบริบทการสนทนา
    var context = loadChatContextV3(userId);
    
    // 2. วิเคราะห์ Intent
    var intentResult = analyzeIntentV3(message, userId);
    var intent = intentResult.primary_intent;
    
    // 3. บันทึกบริบท
    saveChatContextV3(userId, message, intent);
    
    // 4. สร้างการตอบกลับตาม Intent
    var replyMessage = '';
    var quickReplies = generateQuickRepliesV3(intent);
    
    switch (intent) {
      case 'REPORT_PROBLEM':
        replyMessage = 'ได้รับแจ้งปัญหาเรียบร้อยแล้วครับ! 📝\n\nกรุณาระบุ:\n1. ประเภทอุปกรณ์ (มือถือ, คอมพิวเตอร์, กล้อง ฯลฯ)\n2. อาการเสียเบื้องต้น\n3. หมายเลขติดต่อกลับ';
        break;
        
      case 'CHECK_STATUS':
        replyMessage = 'เช็คสถานะงานซ่อมครับ! 🔍\n\nกรุณาส่งหมายเลขงาน (Job ID) มาให้เราหน่อยครับ\nหรือพิมพ์ "ดูประวัติ" เพื่อดูงานล่าสุด';
        break;
        
      case 'REQUEST_PRICE':
        replyMessage = 'สอบถามราคาค่าบริการครับ! 💰\n\nประเมินราคาเบื้องต้น:\n• เปลี่ยนกระจกมือถือ: เริ่มต้น 500฿\n• ลงวินโดวส์: 300-500฿\n• ซ่อมเมนบอร์ด: ประเมินตามอาการ\n\n*ส่งอุปกรณ์มาตรวจวินิจฉัยฟรี!';
        break;
        
      case 'INQUIRY':
        replyMessage = 'สอบถามข้อมูลเพิ่มเติมครับ! ℹ️\n\nจิตร electronics - บริการซ่อม IT และมือถือมืออาชีพ\n📍 ที่ตั้ง: อ.โพนทอง จ.ร้อยเอ็ด\n⏰ เวลาทำการ: จ-ศ 08:30-17:30 น.\n📞 โทร: 043-123456';
        break;
        
      default:
        replyMessage = 'สวัสดีครับ! ยินดีให้บริการครับ 😊\n\nผมสามารถช่วยคุณได้:\n• แจ้งซ่อมอุปกรณ์\n• เช็คสถานะงาน\n• สอบถามราคา\n• ดูข้อมูลร้าน\n\nมีอะไรให้ช่วยไหมครับ?';
    }
    
    return {
      success: true,
      reply_message: replyMessage,
      quick_replies: quickReplies,
      intent: intent,
      context: context
    };
    
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * API Endpoint สำหรับ LINE Webhook V3
 * Called from Router.gs: action = 'lineWebhookV3'
 */
function lineWebhookV3(params) {
  try {
    var event = params.event || JSON.parse(params.event_json || '{}');
    var result = handleLineWebhookV3(event);
    
    if (result.success) {
      // TODO: ส่งข้อความกลับไป LINE ผ่าน LIne Bot API
      // LineBot.gs → sendReplyMessage(replyToken, result.reply_message, result.quick_replies);
    }
    
    return result;
    
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
