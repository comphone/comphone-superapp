// ============================================================
// LineBot.gs โ€” Complete Integration (V313)
// LINE Bot โ” Super App GAS API
// GAS-compatible: no Node.js syntax, no async/await
// ============================================================

var LINE_GAS_URL = 'https://script.google.com/macros/s/AKfycbxO23P_kz2uUXsHbtUhn6gflOjE0ZZNV6bf3K8JDy7IK0PGdEJe_UtyYiqO_oY_WXqnvg/exec';

// ============================================================================
// SMART FILTER
// ============================================================================

var WORK_KEYWORDS = [
  'เธ•เธดเธ”เธ•เธฑเนเธ', 'เธเนเธญเธก', 'เน€เธเธฅเธตเนเธขเธ', 'เธ•เธฑเนเธเธเนเธฒ', 'เน€เธ”เธดเธเธชเธฒเธข', 'เน€เธเธฒเธฐ', 'เธขเธถเธ”', 'เธเธฃเธฐเธเธญเธ',
  'เธเธฅเนเธญเธ', 'cctv', 'wifi', 'เน€เธฃเธฒเน€เธ•เธญเธฃเน', 'extender', 'เธชเธฒเธขlan', 'poe', 'nvr', 'dvr',
  'switch', 'access point', 'fiber', 'sfp',
  'เน€เธชเธฃเนเธ', 'เน€เธฃเธตเธขเธเธฃเนเธญเธข', 'เธเธณเธฅเธฑเธเธ—เธณ', 'เธ–เธถเธ', 'เน€เธฃเธดเนเธกเธเธฒเธ',
  'เน€เธเธดเธ”เธเธฒเธ', 'เธเธดเธ”เธเธฒเธ', 'เน€เธเนเธเธเธฒเธ', 'เน€เธเนเธเธชเธ•เนเธญเธ', 'เธชเธฃเธธเธ', 'เธฃเธฑเธเธเธฒเธ', 'เธกเธญเธเธซเธกเธฒเธข',
  'เธเธดเธเธฑเธ”', 'location', 'gps', 'เธฃเธนเธ', 'เธ เธฒเธ',
  'เธฅเธนเธเธเนเธฒ', 'เน€เธเธญเธฃเน', 'เธ—เธตเนเธญเธขเธนเน', 'เธญเธณเน€เธ เธญ', 'เธเธฑเธเธซเธงเธฑเธ”',
  'เน€เธเธดเธ”เนเธกเนเธ•เธดเธ”', 'เธ เธฒเธเนเธกเนเธเธถเนเธ', 'เธชเธฑเธเธเธฒเธ“เธเธฒเธ”', 'เน€เธเนเธ•เธซเธฅเธธเธ”',
  'เธเนเธญเธกเธเธณเธฃเธธเธ', 'ma', 'preventive', 'เธชเธณเธฃเธงเธ'
];

var CASUAL_KEYWORDS = [
  '555', '5555', '55555', 'เธฎเนเธฒ', 'เธญเธดเธญเธด', 'ok', 'เนเธญเน€เธ', 'เธฃเธฑเธเธ—เธฃเธฒเธ',
  'เธเธดเธ', 'เธเนเธฒเธง', 'เน€เธ—เธตเนเธขเธ', 'เน€เธขเนเธ', 'เธเธฑเธ',
  'เธเธเธ•เธ', 'เธฃเนเธญเธ', 'เธซเธเธฒเธง', 'เธญเธฒเธเธฒเธจ',
  'เธเธฑเธเธฃเธ–', 'เธฃเธ–เธ•เธดเธ”', 'เธ–เธถเธเธขเธฑเธ', 'เนเธซเธเนเธฅเนเธง'
];

function classifyMessage(text, hasImage, hasLocation) {
  if (!text) text = '';
  var t = text.toLowerCase().trim();
  var jobIdMatch = t.match(/j\d{3,4}/i);
  var jobId = jobIdMatch ? jobIdMatch[0].toUpperCase() : null;

  // 1. Commands
  var cmds = {
    'เน€เธเธดเธ”เธเธฒเธ': /^(เน€เธเธดเธ”เธเธฒเธ|#เน€เธเธดเธ”เธเธฒเธ)/,
    'เธเธดเธ”เธเธฒเธ': /^(เธเธดเธ”เธเธฒเธ|#เธเธดเธ”เธเธฒเธ)/,
    'เน€เธเนเธเธเธฒเธ': /^(เน€เธเนเธเธเธฒเธ|#เน€เธเนเธเธเธฒเธ)/,
    'เน€เธเนเธเธชเธ•เนเธญเธ': /^(เน€เธเนเธเธชเธ•เนเธญเธ|#เน€เธเนเธเธชเธ•เนเธญเธ)/,
    'เธชเธฃเธธเธ': /^เธชเธฃเธธเธ/
  };
  var cmdKeys = Object.keys(cmds);
  for (var ci = 0; ci < cmdKeys.length; ci++) {
    if (cmds[cmdKeys[ci]].test(t)) return { type: 'command', command: cmdKeys[ci], jobId: jobId };
  }

  // 2. Location message โ’ GPS update
  if (hasLocation) return { type: 'location_share', jobId: jobId };

  // 3. Image โ’ always work report
  if (hasImage) return { type: 'work_report', subType: 'photo', jobId: jobId };

  // 4. Status updates
  if (t.match(/เน€เธชเธฃเนเธ|เน€เธฃเธตเธขเธเธฃเนเธญเธข|done/i)) return { type: 'status_update', status: 'Completed', jobId: jobId };
  if (t.match(/เธ–เธถเธ|เนเธเธ–เธถเธ|เธญเธขเธนเนเธซเธเนเธฒเธเธฒเธ/i)) return { type: 'status_update', status: 'เธ–เธถเธเธชเธ–เธฒเธเธ—เธตเน', jobId: jobId };
  if (t.match(/เธเธณเธฅเธฑเธเน€เธ”เธดเธเธ—เธฒเธ|on the way/i)) return { type: 'status_update', status: 'เธเธณเธฅเธฑเธเน€เธ”เธดเธเธ—เธฒเธ', jobId: jobId };
  if (t.match(/เน€เธฃเธดเนเธก|start|เธเธณเธฅเธฑเธเธ—เธณ/i)) return { type: 'status_update', status: 'InProgress', jobId: jobId };

  // 5. Count keywords
  var ws = 0, cs = 0;
  for (var wi = 0; wi < WORK_KEYWORDS.length; wi++) if (t.indexOf(WORK_KEYWORDS[wi]) > -1) ws++;
  for (var wj = 0; wj < CASUAL_KEYWORDS.length; wj++) if (t.indexOf(CASUAL_KEYWORDS[wj]) > -1) cs++;

  if (ws >= 1 && cs < ws) return { type: 'work_note', jobId: jobId };
  if (cs >= 2 && cs > ws) return { type: 'casual' };
  if (ws >= 1) return { type: 'work_note', jobId: jobId };

  if (t.length < 15) return { type: 'casual' };
  return { type: 'work_note', jobId: jobId };
}

// ============================================================================
// MAIN PROCESSOR (sync โ€” GAS เนเธกเนเธฃเธญเธเธฃเธฑเธ async/await)
// ============================================================================

/**
 * เธเธฃเธฐเธกเธงเธฅเธเธฅเธเนเธญเธเธงเธฒเธกเธเธฒเธ LINE
 * @param {object} message - LINE message object
 * @param {string} userId - LINE user ID
 * @param {string} userName - display name
 * @return {object|null} - LINE response (text/flex) เธซเธฃเธทเธญ null (silent)
 */
function processLineMessage(message, userId, userName) {
  var type = message.type;
  var text = message.text || '';
  var hasImage = type === 'image';
  var hasLocation = type === 'location';

  // 1. Classify
  var cls = classifyMessage(text, hasImage, hasLocation);

  // 2. SILENT for casual
  if (cls.type === 'casual') return null;

  // 3. Route
  switch (cls.type) {
    case 'command':
      return handleCommand(cls, text, userId, userName);
    case 'location_share':
      return handleLocation(message, cls, userId, userName);
    case 'work_report':
      return handlePhotoReport(message, cls, userId, userName);
    case 'status_update':
      // เพิ่มการผูกรูปย้อนหลังเมื่อระบุ JobID ใน Status Update
      if (cls.jobId) {
        reassignPendingPhotos(userName || '', cls.jobId);
      }
      return handleStatus(cls, text, userId, userName);
    case 'work_note':
      // เพิ่มการผูกรูปย้อนหลังเมื่อระบุ JobID ใน Work Note
      if (cls.jobId) {
        reassignPendingPhotos(userName || '', cls.jobId);
      }
      return handleWorkNote(cls, text, userId, userName);
    default:
      return null;
  }
}

// ============================================================================
// COMMAND HANDLER
// ============================================================================

function handleCommand(cls, text, userId, userName) {
  switch (cls.command) {
    case 'เน€เธเธดเธ”เธเธฒเธ':
      return handleOpenJob(text, userId);
    case 'เธเธดเธ”เธเธฒเธ':
      return handleCloseJob(text);
    case 'เน€เธเนเธเธเธฒเธ':
      var search = text.replace(/เน€เธเนเธเธเธฒเธ|#เน€เธเนเธเธเธฒเธ/g, '').trim() || '';
      return callAndFormat('เน€เธเนเธเธเธฒเธ', { search: search }, formatJobList);
    case 'เน€เธเนเธเธชเธ•เนเธญเธ':
      var item = text.replace(/เน€เธเนเธเธชเธ•เนเธญเธ|#เน€เธเนเธเธชเธ•เนเธญเธ/g, '').trim() || '';
      return callAndFormat('เน€เธเนเธเธชเธ•เนเธญเธ', { search: item }, formatStock);
    case 'เธชเธฃเธธเธ':
      return callAndFormat('เธชเธฃเธธเธเธเธฒเธ', {}, formatSummary);
    default:
      return null;
  }
}

// ============================================================================
// PHOTO + VISION + DRIVE PIPELINE
// ============================================================================

function handlePhotoReport(message, cls, userId, userName) {
  // V325: Accept All Photos - บันทึกลง Queue ก่อนเสมอ แม้ไม่มี JobID
  var jobId = cls.jobId || '';
  var imageId = message.id || '';

  // ส่งเข้า Queue ทันที (JobID อาจเป็นค่าว่าง)
  var queueResult = queuePhotoFromLINE(imageId, jobId, userName || '');

  if (!queueResult || queueResult.error) {
    return createTextMessage('❌ เกิดข้อผิดพลาดในการบันทึกรูป: ' + (queueResult ? queueResult.error : 'unknown'));
  }

  // ข้อความตอบกลับตามสถานะ JobID
  var reply = '';
  if (!jobId) {
    reply = '📸 รับรูปเข้าคิวชั่วคราวแล้ว!\n\n';
    reply += '⚠️ ยังไม่พบ JobID กรุณาพิมพ์ JobID หรือแจ้งรายละเอียดลูกค้า\n';
    reply += 'เพื่อให้ AI ช่วยผูกรูปเข้ากับงานให้อัตโนมัติครับ';
  } else {
    reply = '✅ ' + queueResult.message + '\n\n';
    reply += '🆔 JobID: ' + jobId + '\n';
    if (userName) reply += '👤 ' + userName + '\n';
    reply += '📦 Queue ID: ' + queueResult.queueId + '\n\n';
    reply += '🤖 AI กำลังวิเคราะห์และจัดหมวดหมู่รูปภาพให้ใน 1 นาที...';
  }

  return createTextMessage(reply);
}

/**
 * เธ”เธฒเธงเธเนเนเธซเธฅเธ”เธฃเธนเธเธเธฒเธ LINE โ’ เนเธเธฅเธ base64
 */
function _downloadLineImage(imageId, imageUrl) {
  try {
    var channelToken = getConfig('LINE_CHANNEL_ACCESS_TOKEN') || '';
    
    // เธงเธดเธเธตเธ—เธตเน 1: เธ–เนเธฒเธกเธต channel token โ’ เธ”เธฒเธงเธเนเนเธซเธฅเธ”เธเนเธฒเธ LINE API
    if (channelToken && imageId) {
      var options = {
        method: 'get',
        headers: { 'Authorization': 'Bearer ' + channelToken },
        muteHttpExceptions: true
      };
      var resp = UrlFetchApp.fetch('https://api-data.line.me/v2/bot/message/' + imageId + '/content', options);
      var blob = resp.getBlob();
      if (blob && blob.getBytes().length > 100) {
        return Utilities.base64Encode(blob.getBytes());
      }
    }
    
    // เธงเธดเธเธตเธ—เธตเน 2: เธ–เนเธฒเนเธกเนเธกเธต token เนเธ•เนเธกเธต URL โ’ เธฅเธญเธเนเธซเธฅเธ”เธ•เธฃเธ
    if (imageUrl && imageUrl.indexOf('http') === 0) {
      var resp2 = UrlFetchApp.fetch(imageUrl, { muteHttpExceptions: true });
      var blob2 = resp2.getBlob();
      if (blob2 && blob2.getBytes().length > 100) {
        return Utilities.base64Encode(blob2.getBytes());
      }
    }
    
    return '';
  } catch(e) {
    Logger.log('Download image failed: ' + e);
    return '';
  }
}

/**
 * เธงเธดเน€เธเธฃเธฒเธฐเธซเนเธฃเธนเธเธเธฒเธ base64 เนเธ”เธขเธ•เธฃเธ (เนเธกเนเธ•เนเธญเธเธเนเธฒเธ URL)
 */
function analyzeWorkImageFromBase64(base64, context) {
  var apiKey = getConfig('GEMINI_API_KEY') || getConfig('GOOGLE_AI_API_KEY') || '';
  if (!apiKey) {
    return { error: 'GEMINI_API_KEY not configured' };
  }

  var prompt = 'เธเธธเธ“เธเธทเธญเธเธนเนเธเนเธงเธข AI เธเธญเธเธฃเนเธฒเธ Comphone & Electronics เน€เธเธตเนเธขเธงเธเธฒเธเธ”เนเธฒเธ CCTV, เธฃเธฐเธเธเน€เธเธฃเธทเธญเธเนเธฒเธข, WiFi\n\n' +
    'เธเธฃเธดเธเธ—เธเธฒเธ: ' + (context || 'เนเธกเนเธฃเธฐเธเธธ') + '\n\n' +
    'เธงเธดเน€เธเธฃเธฒเธฐเธซเนเธฃเธนเธเธ เธฒเธเธเธฒเธเนเธฅเธฐเธ•เธญเธเธเธฅเธฑเธเน€เธเนเธ JSON เน€เธ—เนเธฒเธเธฑเนเธ:\n' +
    '{\n' +
    '  "auto_label": "เธชเธฃเธธเธเธชเธฑเนเธเน เธงเนเธฒเธฃเธนเธเธเธตเนเนเธชเธ”เธเธญเธฐเนเธฃ เน€เธเนเธ เธ เธฒเธเธเธฅเนเธญเธเธงเธเธเธฃเธเธดเธ” 2 เธ•เธฑเธงเธ•เธดเธ”เธ•เธฑเนเธเธเธเน€เธชเธฒเธเธญเธเธเธฃเธตเธ•",\n' +
    '  "detected_equipment": ["เธเธฅเนเธญเธเธงเธเธเธฃเธเธดเธ” 2 เธ•เธฑเธง", "เธชเธฒเธข LAN 1 เธกเนเธงเธ"],\n' +
    '  "location_type": "เธเธฃเธฐเน€เธ เธ—เธชเธ–เธฒเธเธ—เธตเน",\n' +
    '  "installation_quality": "เธ”เธต/เธเธญเนเธเน/เธ•เนเธญเธเธเธฃเธฑเธเธเธฃเธธเธ",\n' +
    '  "quality_issues": ["เธเธฑเธเธซเธฒเธ—เธตเนเธเธ"],\n' +
    '  "is_ready_to_close": true,\n' +
    '  "suggestions": ["เธเธณเนเธเธฐเธเธณ"],\n' +
    '  "estimated_effort": "เธเนเธฒเธข/เธเธฒเธเธเธฅเธฒเธ/เธขเธฒเธ",\n' +
    '  "confidence": 0.85\n' +
    '}\n\n' +
    'เธ•เธญเธ JSON เธญเธขเนเธฒเธเน€เธ”เธตเธขเธง เนเธกเนเธกเธตเธเนเธญเธเธงเธฒเธกเธญเธทเนเธ เนเธกเนเธกเธต markdown:';

  try {
    var bodyObj = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: base64 } }
        ]
      }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 }
    };

    var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;
    var options = {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify(bodyObj), muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(url, options);
    var result = JSON.parse(response.getContentText());

    if (result.error) return { error: 'Gemini API Error: ' + JSON.stringify(result.error) };

    var content = '';
    if (result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts) {
      content = result.candidates[0].content.parts[0].text || '';
    }

    var jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      var parsed = JSON.parse(jsonMatch[0]);
      parsed.provider = 'gemini-2.0-flash';
      return parsed;
    }
    return { error: 'Invalid response', raw: content };
  } catch(e) {
    return { error: 'Vision analysis failed: ' + e.toString() };
  }
}

/**
 * Phase auto-detect เธเธฒเธเธเธฅเธเธฒเธฃเธงเธดเน€เธเธฃเธฒเธฐเธซเนเธ เธฒเธ
 */
function detectPhase(analysis) {
  if (!analysis || typeof analysis !== 'string') return '00_เธชเธณเธฃเธงเธ';
  var t = analysis.toLowerCase();

  if (t.indexOf('เธ•เธดเธ”เธ•เธฑเน') > -1 || t.indexOf('install') > -1 || t.indexOf('mount') > -1 || t.indexOf('เธงเธฒเธ') > -1) {
    return '01_เธ•เธดเธ”เธ•เธฑเนเธ';
  }
  if (t.indexOf('เน€เธชเธฃเนเธ') > -1 || t.indexOf('complete') > -1 || t.indexOf('done') > -1 || t.indexOf('เน€เธฃเธตเธขเธเธฃเนเธญเธข') > -1) {
    return '02_เน€เธชเธฃเนเธเธชเธกเธเธนเธฃเธ“เน';
  }
  if (t.indexOf('เธเนเธญเธก') > -1 || t.indexOf('repair') > -1 || t.indexOf('ma') > -1 || t.indexOf('เธเธณเธฃเธธเธ') > -1) {
    return '03_MA_เธเนเธญเธกเธเธณเธฃเธธเธ';
  }
  return '00_เธชเธณเธฃเธงเธ';
}

// ============================================================================
// LOCATION HANDLER
// ============================================================================

function handleLocation(message, cls, userId, userName) {
  var lat = message.latitude;
  var lng = message.longitude;

  if (!lat || !lng) {
    return createTextMessage('โ เนเธกเนเนเธ”เนเธฃเธฑเธเธเธดเธเธฑเธ” โ€” เธเธฃเธธเธ“เธฒเธฅเธญเธเธชเนเธ Location เนเธซเธกเนเธญเธตเธเธเธฃเธฑเนเธ');
  }

  // 1. เธเธฑเธเธ—เธถเธเธเธดเธเธฑเธ”เธเนเธฒเธ
  callGAS({
    action: 'เธญเธฑเธเน€เธ”เธ—เธชเธ–เธฒเธเธฐ',
    job_id: cls.jobId || '',
    status: '',
    technician: userName || '',
    lat: lat,
    lng: lng,
    note: '๐“ เธเธดเธเธฑเธ”: ' + lat.toFixed(6) + ', ' + lng.toFixed(6)
  });

  // 2. เธ•เธฃเธงเธเธชเธญเธเธงเนเธฒเธเนเธฒเธเธญเธขเธนเนเนเธเธฅเนเธเธฑเธเธเธฒเธเนเธซเธ
  var area = getAreaFromLocation(lat, lng);
  var nearestJob = findNearestPendingJobs(lat, lng);

  var msg = '๐“ เธเธฑเธเธ—เธถเธเธเธดเธเธฑเธ”เนเธฅเนเธง!\n\n';
  msg += '๐‘ท ' + (userName || 'เธเนเธฒเธ') + '\n';
  msg += '๐“ ' + area.area + '\n';
  msg += '๐—บ๏ธ เธเธดเธเธฑเธ”: ' + lat.toFixed(4) + ', ' + lng.toFixed(4) + '\n';

  if (nearestJob && nearestJob.job) {
    var dist = haversineDistance(lat, lng, parseFloat(nearestJob.lat || 0), parseFloat(nearestJob.lng || 0));
    msg += '\n๐“ เนเธเธฅเนเธเธฑเธเธเธฒเธ: ' + nearestJob.job.job_id + ' โ€” ' + nearestJob.job.customer + '\n';
    msg += '๐“ เธฃเธฐเธขเธฐเธ—เธฒเธ: ' + dist.toFixed(1) + ' km\n';
    msg += '\nเธ•เนเธญเธเธเธฒเธฃเธฃเธฑเธเธเธฒเธเธเธตเนเนเธซเธกเธเธฃเธฑเธ?';
  }

  return createTextMessage(msg);
}

/**
 * เธซเธฒเธเธฒเธ pending เธ—เธตเนเนเธเธฅเนเธเธดเธเธฑเธ”เธกเธฒเธเธ—เธตเนเธชเธธเธ”
 */
function findNearestPendingJobs(lat, lng) {
  try {
    var result = callGAS({ action: 'เน€เธเนเธเธเธฒเธ', search: '' });
    if (!result || !result.success || !result.data || !result.data.jobs) return null;

    var jobs = result.data.jobs;
    var pending = [];
    for (var i = 0; i < jobs.length; i++) {
      if (jobs[i].status === 'เธฃเธญเธ”เธณเน€เธเธดเธเธเธฒเธฃ' || jobs[i].status === 'InProgress') {
        pending.push(jobs[i]);
      }
    }
    if (pending.length === 0) return null;

    return { job: pending[0], distance: 'N/A' };
  } catch (e) {
    return null;
  }
}

// ============================================================================
// STATUS UPDATE HANDLER
// ============================================================================

function handleStatus(cls, text, userId, userName) {
  var jobId = cls.jobId || extractJobId(text);
  var activeJob = findActiveJob(userId, jobId);

  if (!activeJob) {
    return createTextMessage('โ เนเธกเนเธเธเธเธฒเธ โ€” เธเธฃเธธเธ“เธฒเธฃเธฐเธเธธ JobID เธซเธฃเธทเธญ #เน€เธเธดเธ”เธเธฒเธ เธเนเธญเธ');
  }

  callGAS({
    action: 'เธญเธฑเธเน€เธ”เธ—เธชเธ–เธฒเธเธฐ',
    job_id: activeJob.job_id,
    status: cls.status || activeJob.status,
    technician: userName || activeJob.technician,
    note: text
  });

  return createTextMessage(
    'โ… เธญเธฑเธเน€เธ”เธ•เธเธฒเธ ' + activeJob.job_id + '\n' +
    '๐“ เธชเธ–เธฒเธเธฐ: ' + cls.status + '\n' +
    '๐“ "' + text + '"\n\n' +
    '๐“ เนเธเธฅเน€เธ”เธญเธฃเน: ' + (activeJob.folder_url || 'เธขเธฑเธเนเธกเนเธชเธฃเนเธฒเธ') + '\n' +
    'โ• [๐“ธ เธชเนเธเธฃเธนเธ] [โ… เธเธดเธ”เธเธฒเธ] [๐“ เธเธดเธเธฑเธ”]'
  );
}

// ============================================================================
// WORK NOTE HANDLER
// ============================================================================

function handleWorkNote(cls, text, userId, userName) {
  var jobId = cls.jobId || extractJobId(text);
  var activeJob = findActiveJob(userId, jobId);

  if (!activeJob) {
    if (text.length > 20) return handleOpenJob(text, userId);
    return null;
  }

  callGAS({
    action: 'เธญเธฑเธเน€เธ”เธ—เธชเธ–เธฒเธเธฐ',
    job_id: activeJob.job_id,
    status: activeJob.status,
    technician: userName || activeJob.technician,
    note: text
  });

  return createTextMessage(
    '๐“ เธเธฑเธเธ—เธถเธเธซเธกเธฒเธขเน€เธซเธ•เธธเธเธฒเธ ' + activeJob.job_id + '\n"' + text + '"\n๐“ ' + (activeJob.folder_url || '')
  );
}

// ============================================================================
// OPEN/CLOSE JOB
// ============================================================================

function handleOpenJob(text, userId) {
  var parts = text.replace(/เน€เธเธดเธ”เธเธฒเธ|#เน€เธเธดเธ”เธเธฒเธ/g, '').trim().split(/\s+/);
  if (parts.length < 2) {
    return createTextMessage(
      'โ เนเธเนเธเธณเธชเธฑเนเธ: #เน€เธเธดเธ”เธเธฒเธ [เธเธทเนเธญ] [เน€เธเธญเธฃเน] [เธญเธฒเธเธฒเธฃ]\nเธ•เธฑเธงเธญเธขเนเธฒเธ: #เน€เธเธดเธ”เธเธฒเธ เธฃเธฃ.เธชเธงเนเธฒเธ 081xxx เธ•เธดเธ”เธ•เธฑเนเธเธเธฅเนเธญเธ 3 เธเธธเธ”'
    );
  }

  var name = parts[0];
  var phone = parts[1];
  var symptom = parts.slice(2).join(' ') || 'เนเธกเนเธฃเธฐเธเธธ';

  var result = callGAS({
    action: 'เน€เธเธดเธ”เธเธฒเธ',
    name: name,
    phone: phone,
    symptom: symptom
  });

  if (!result || !result.success) return createTextMessage('โ เน€เธเธดเธ”เธเธฒเธเธฅเนเธกเน€เธซเธฅเธง: ' + (result ? result.error : 'unknown'));

  var jd = result.data;
  return createTextMessage(
    'โ… เน€เธเธดเธ”เธเธฒเธเธชเธณเน€เธฃเนเธ!\n\n' +
    '๐“ ' + jd.job_id + ' โ€” ' + jd.customer + '\n' +
    '๐”ง เธญเธฒเธเธฒเธฃ: ' + symptom + '\n' +
    '๐“ เธชเธ–เธฒเธเธฐ: ' + jd.status + '\n\n' +
    '๐“ธ เธชเนเธเธฃเธนเธเธชเธณเธฃเธงเธเนเธ”เนเธ—เธฑเธเธ—เธต\n' +
    '๐“ เธเธ”เนเธเธฃเน Location เน€เธเธทเนเธญเธฃเธฐเธเธธเธ•เธณเนเธซเธเนเธ\n' +
    '๐“ #เน€เธเนเธเธเธฒเธ ' + jd.job_id + ' เน€เธเธทเนเธญเธ”เธนเธชเธ–เธฒเธเธฐ'
  );
}

function handleCloseJob(text) {
  var parts = text.replace(/เธเธดเธ”เธเธฒเธ|#เธเธดเธ”เธเธฒเธ/g, '').trim().split(/\s+/);
  if (parts.length < 2) {
    return createTextMessage(
      'โ เนเธเนเธเธณเธชเธฑเนเธ: #เธเธดเธ”เธเธฒเธ [JobID] [เธญเธฐเนเธซเธฅเน:เธเธณเธเธงเธ] [เธเนเธฒเนเธฃเธ]\nเธ•เธฑเธงเธญเธขเนเธฒเธ: #เธเธดเธ”เธเธฒเธ J0018 เธชเธฒเธขLAN:5,CCTV:3 500'
    );
  }

  var jobId = parts[0];
  var partsUsed = parts[1];
  var labor = parseInt(parts[2]) || 0;

  var result = callGAS({
    action: 'เธเธดเธ”เธเธฒเธ',
    job_id: jobId,
    parts: partsUsed,
    labor_cost: labor
  });

  if (!result || !result.success) return createTextMessage('โ เธเธดเธ”เธเธฒเธเธฅเนเธกเน€เธซเธฅเธง: ' + (result ? result.error : 'unknown'));

  return createTextMessage(
    'โ… เธเธดเธ”เธเธฒเธ ' + jobId + ' เธชเธณเน€เธฃเนเธ!\n\n' +
    '๐”ง เธญเธฐเนเธซเธฅเน: ' + partsUsed + '\n' +
    '๐‘ท เธเนเธฒเนเธฃเธ: ' + labor.toLocaleString() + ' เธเธฒเธ—\n' +
    '๐’ฐ เธ•เธฑเธ”เธชเธ•เนเธญเธ + เธชเธฃเนเธฒเธเธเธดเธฅเนเธฅเนเธง'
  );
}

function handleAcceptJob(jobId, userName) {
  if (!jobId) return createTextMessage('โ เธฃเธฐเธเธธ JobID เธ”เนเธงเธข เน€เธเนเธ J0018');

  callGAS({
    action: 'เธญเธฑเธเน€เธ”เธ—เธชเธ–เธฒเธเธฐ',
    job_id: jobId,
    status: 'InProgress',
    technician: userName || 'เธเนเธฒเธ',
    note: 'เธฃเธฑเธเธเธฒเธเนเธฅเนเธง เธเธณเธฅเธฑเธเนเธเธชเธ–เธฒเธเธ—เธตเน'
  });

  return createTextMessage('๐‘ท เธฃเธฑเธเธเธฒเธ ' + jobId + ' เนเธฅเนเธง! เธเธณเธฅเธฑเธเนเธเธชเธ–เธฒเธเธ—เธตเนเธเธฃเธฑเธ\n\n๐“ เธชเนเธ Location เน€เธเธทเนเธญเธญเธฑเธเน€เธ”เธ•เธ•เธณเนเธซเธเนเธ');
}

// ============================================================================
// HELPERS
// ============================================================================

function extractJobId(text) {
  var match = text ? text.match(/j\d{3,4}/i) : null;
  return match ? match[0].toUpperCase() : null;
}

function findActiveJob(userId, jobId) {
  if (jobId) {
    var result = callGAS({ action: 'เน€เธเนเธเธเธฒเธ', search: jobId });
    if (result && result.success && result.data && result.data.jobs && result.data.jobs.length > 0) return result.data.jobs[0];
  }
  var byUser = callGAS({ action: 'เน€เธเนเธเธเธฒเธ', search: userId });
  if (byUser && byUser.success && byUser.data && byUser.data.jobs && byUser.data.jobs.length > 0) {
    var jobs = byUser.data.jobs;
    for (var i = 0; i < jobs.length; i++) {
      if (jobs[i].status !== 'Completed' && jobs[i].status !== 'Archived') return jobs[i];
    }
    return jobs[0];
  }
  var all = callGAS({ action: 'เน€เธเนเธเธเธฒเธ', search: '' });
  if (all && all.success && all.data && all.data.jobs && all.data.jobs.length > 0) {
    var allJobs = all.data.jobs;
    for (var j = 0; j < allJobs.length; j++) {
      if (allJobs[j].status === 'เธฃเธญเธ”เธณเน€เธเธดเธเธเธฒเธฃ') return allJobs[j];
    }
    return allJobs[0];
  }
  return null;
}

/**
 * เน€เธฃเธตเธขเธ GAS API (เนเธเน UrlFetchApp เนเธ—เธ https module)
 */
function callGAS(body) {
  try {
    var payload = JSON.stringify(body);
    var options = {
      method: 'post',
      contentType: 'application/json',
      payload: payload,
      muteHttpExceptions: true
    };
    var response = UrlFetchApp.fetch(LINE_GAS_URL, options);
    return JSON.parse(response.getContentText());
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function callAndFormat(action, params, formatter) {
  try {
    var body = { action: action };
    var keys = Object.keys(params);
    for (var i = 0; i < keys.length; i++) {
      body[keys[i]] = params[keys[i]];
    }
    var result = callGAS(body);
    if (result && result.success && result.data) return formatter(result.data);
    return createTextMessage('โ เนเธกเนเธชเธฒเธกเธฒเธฃเธ–เธ”เธถเธเธเนเธญเธกเธนเธฅเนเธ”เน');
  } catch (e) {
    return createTextMessage('โ ๏ธ Error: ' + e.toString());
  }
}

function createTextMessage(text) {
  return { type: 'text', text: text };
}

function createQuickReply(jobId) {
  return {
    type: 'quick',
    items: [
      { type: 'action', action: { type: 'location', label: '๐“ เธชเนเธเธเธดเธเธฑเธ”' } },
      { type: 'action', action: { type: 'message', label: '๐“ธ เธชเนเธเธฃเธนเธ', text: 'เธชเนเธเธฃเธนเธเธเธฒเธ ' + jobId } },
      { type: 'action', action: { type: 'message', label: 'โ… เธเธดเธ”เธเธฒเธ', text: '#เธเธดเธ”เธเธฒเธ ' + jobId } }
    ]
  };
}

function getStatusEmoji(s) {
  if (!s) return '๐“';
  if (s === 'เธฃเธญเธ”เธณเน€เธเธดเธเธเธฒเธฃ') return 'โณ';
  if (s === 'InProgress' || s === 'เธเธณเธฅเธฑเธเธ—เธณ') return '๐”';
  if (s === 'Completed' || s === 'เน€เธชเธฃเนเธเนเธฅเนเธง') return 'โ…';
  if (s === 'เธขเธเน€เธฅเธดเธ') return 'โ';
  return '๐“';
}

function formatJobList(data) {
  if (!data.jobs || data.jobs.length === 0) return createTextMessage('๐“ เนเธกเนเธกเธตเธเธฒเธ');
  var lines = [];
  var max = Math.min(data.jobs.length, 10);
  for (var i = 0; i < max; i++) {
    var j = data.jobs[i];
    lines.push(j.job_id + ' | ' + j.customer + ' | ' + getStatusEmoji(j.status) + ' ' + j.status);
  }
  return createTextMessage('๐“ เธเธฒเธ ' + data.count + ' เธฃเธฒเธขเธเธฒเธฃ:\n\n' + lines.join('\n'));
}

function formatSummary(data) {
  return createTextMessage(
    '๐“ เธชเธฃเธธเธเธเธฒเธเธงเธฑเธเธเธตเน\n\n' +
    '๐“ เธ—เธฑเนเธเธซเธกเธ”: ' + (data.total || 0) + '\nโณ เธฃเธญเธ”เธณเน€เธเธดเธเธเธฒเธฃ: ' + (data.pending || 0) + '\n๐” เธเธณเธฅเธฑเธเธ—เธณ: ' + (data.inProgress || 0) + '\nโ… เน€เธชเธฃเนเธเนเธฅเนเธง: ' + (data.completed || 0)
  );
}

function formatStock(data) {
  if (!data.items || data.items.length === 0) return createTextMessage('๐“ฆ เนเธกเนเธกเธตเธเนเธญเธกเธนเธฅ');
  var lines = [];
  var max = Math.min(data.items.length, 10);
  for (var i = 0; i < max; i++) {
    var it = data.items[i];
    lines.push((it.qty < 5 ? '๐”ด' : 'โ…') + ' ' + it.name + ' โ€” ' + it.qty + ' เธเธดเนเธ');
  }
  return createTextMessage('๐“ฆ เธชเธ•เนเธญเธ:\n\n' + lines.join('\n'));
}

function createJobReportCard(jobData, photoUrl, analysis) {
  return createTextMessage(
    '๐“ ' + jobData.job_id + ' โ€” ' + jobData.customer + '\n' +
    '๐”ง ' + (jobData.symptom || '-') + '\n' +
    '๐“ ' + getStatusEmoji(jobData.status) + ' ' + jobData.status + '\n' +
    '๐‘ท ' + (jobData.technician || '-') + '\n' +
    '๐“ธ ' + (photoUrl || 'เนเธกเนเธกเธตเธฃเธนเธเธ เธฒเธ') + '\n' +
    '๐“ ' + (jobData.folder_url || '-') + '\n' +
    (analysis ? '\n๐ค– ' + analysis : '')
  );
}
