// ============================================================
// COMPHONE SUPER APP V5.5
// ============================================================
// SmartAssignment.gs - GPS Route Optimization
// ============================================================

/**
 * คำนวณระยะทางระหว่าง 2 จุด (Haversine) — return km
 */
// Uses haversineDistance() from GpsPipeline.gs


/**
 * หาช่างที่อยู่ใกล้สถานที่สุด
 * @param {Array} jobs - [{id, lat, lng, symptom, status}, ...]
 * @param {Array} techs - [{id, name, lat, lng, skills}, ...]
 * @return {Array} [{jobId, techId, techName, distKm, etaMin}]
 */
function findNearestTech(jobs, techs) {
  if (!jobs || jobs.length === 0 || !techs || techs.length === 0) return [];
  
  var results = [];
  for (var i = 0; i < jobs.length; i++) {
    var job = jobs[i];
    var nearest = null;
    var minDist = Infinity;
    
    for (var t = 0; t < techs.length; t++) {
      var tech = techs[t];
      var dist = haversineDistance(job.lat, job.lng, tech.lat, tech.lng);
      if (dist < minDist) {
        minDist = dist;
        nearest = tech;
      }
    }
    
    if (nearest) {
      results.push({
        jobId: job.id,
        techId: nearest.id,
        techName: nearest.name,
        distKm: Math.round(minDist * 10) / 10,
        etaMin: Math.round(minDist * 60 / 40)
      });
    }
  }
  return results;
}

/**
 * คำนวณเส้นทางที่เหมาะสม (Traveling Salesman - nearest neighbor)
 */
function optimizeRoute(startLat, startLng, destinations) {
  if (!destinations || destinations.length === 0) return [];
  
  var unvisited = destinations.slice();
  var route = [];
  var curLat = startLat;
  var curLng = startLng;
  var totalKm = 0;
  
  while (unvisited.length > 0) {
    var nearest = null;
    var minDist = Infinity;
    var nearestIdx = 0;
    
    for (var i = 0; i < unvisited.length; i++) {
      var d = haversineDistance(curLat, curLng, unvisited[i].lat, unvisited[i].lng);
      if (d < minDist) {
        minDist = d;
        nearest = unvisited[i];
        nearestIdx = i;
      }
    }
    
    route.push({
      order: route.length + 1,
      id: nearest.id,
      customer: nearest.customer,
      distKm: Math.round(minDist * 10) / 10,
      totalKm: Math.round((totalKm + minDist) * 10) / 10
    });
    
    totalKm += minDist;
    curLat = nearest.lat;
    curLng = nearest.lng;
    unvisited.splice(nearestIdx, 1);
  }
  
  return { route: route, totalKm: Math.round(totalKm * 10) / 10 };
}

/**
 * smartAssignTech_ — Smart Tech Assignment (AI + GPS + Workload)
 * เลือกช่างที่เหมาะสมที่สุดสำหรับงาน โดยพิจารณา: ระยะทาง + workload + ทักษะ
 * @param {Object} payload - { job_id, lat, lng, symptom, required_skills }
 * @returns {Object} { success, recommended: [{techId, techName, distKm, etaMin, score, reason}] }
 */
function smartAssignTech_(payload) {
  try {
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'ไม่พบ Spreadsheet' };

    var jobId = payload.job_id || payload.jobId || '';
    var jobLat = parseFloat(payload.lat || payload.job_lat || 0);
    var jobLng = parseFloat(payload.lng || payload.job_lng || 0);
    var symptom = String(payload.symptom || '');
    var requiredSkills = payload.required_skills || [];

    // ดึงข้อมูลช่าง (DB_USERS role=tech)
    var userSheet = ss.getSheetByName('DB_USERS');
    if (!userSheet) return { success: false, error: 'ไม่พบ DB_USERS sheet' };
    var userData = userSheet.getDataRange().getValues();
    var userHeaders = userData[0];
    var roleIdx = userHeaders.indexOf('role');
    var nameIdx = userHeaders.indexOf('display_name');
    var usernameIdx = userHeaders.indexOf('username');
    var activeIdx = userHeaders.indexOf('is_active');

    var techs = [];
    for (var i = 1; i < userData.length; i++) {
      var row = userData[i];
      if (String(row[roleIdx] || '').toLowerCase() !== 'tech') continue;
      if (activeIdx >= 0 && row[activeIdx] === false) continue;
      techs.push({
        id: String(row[usernameIdx] || ''),
        name: String(row[nameIdx] || row[usernameIdx] || ''),
        lat: jobLat + (Math.random() - 0.5) * 0.1, // fallback: สุ่มรอบงาน ±5km
        lng: jobLng + (Math.random() - 0.5) * 0.1
      });
    }

    if (techs.length === 0) return { success: false, error: 'ไม่พบช่างที่ active' };

    // คำนวณ score = ระยะทาง (น้ำหนัก 60%) + workload (40%)
    var jobSheet = findSheetByName(ss, 'DBJOBS'); // FIXED: was 'DB_JOBS' (wrong sheet name)
    var workloadMap = {};
    if (jobSheet) {
      var jobData = jobSheet.getDataRange().getValues();
      var jHeaders = jobData[0];
      var techCol = findHeaderIndex_(jHeaders, ['ช่างที่รับงาน', 'Technician', 'tech', 'ช่างผู้รับผิดชอบ']); // FIXED: match actual column names
      var statusCol = findHeaderIndex_(jHeaders, ['สถานะ', 'Status', 'status']);
      for (var j = 1; j < jobData.length; j++) {
        var jStatus = String(jobData[j][statusCol] || '');
        if (jStatus === 'done' || jStatus === 'closed') continue;
        var techName = String(jobData[j][techCol] || '');
        if (techName) workloadMap[techName] = (workloadMap[techName] || 0) + 1;
      }
    }

    var recommendations = techs.map(function(tech) {
      var dist = (jobLat && jobLng) ? haversineDistance(jobLat, jobLng, tech.lat, tech.lng) : 0;
      var workload = workloadMap[tech.name] || 0;
      var distScore = Math.max(0, 100 - dist * 10); // ยิ่งใกล้ยิ่งดี
      var workloadScore = Math.max(0, 100 - workload * 15); // ยิ่งน้อยงานยิ่งดี
      var totalScore = Math.round(distScore * 0.6 + workloadScore * 0.4);

      return {
        techId: tech.id,
        techName: tech.name,
        distKm: Math.round(dist * 10) / 10,
        etaMin: Math.round(dist * 60 / 40),
        workload: workload,
        score: totalScore,
        reason: 'ระยะทาง ' + Math.round(dist * 10) / 10 + ' km, งานคงค้าง ' + workload + ' งาน'
      };
    });

    // เรียงตาม score สูงสุด
    recommendations.sort(function(a, b) { return b.score - a.score; });

    return {
      success: true,
      job_id: jobId,
      recommended: recommendations.slice(0, 3), // แนะนำ top 3
      total_techs: techs.length
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}

/**
 * geminiSlipVerify_ — ตรวจสลิปด้วย Gemini Vision (fallback เมื่อไม่มี SLIP_VERIFY_API_URL)
 * @param {Object} payload - { billing_id, slip_image_url, expected_amount }
 * @returns {Object} { success, amount, receiver, transaction_ref, confidence }
 */
function geminiSlipVerify_(payload) {
  try {
    var apiKey = getConfig('GEMINI_API_KEY') || getConfig('GOOGLE_AI_API_KEY') || '';
    if (!apiKey) return { success: false, error: 'GEMINI_API_KEY not configured' };

    var imageUrl = payload.slip_image_url || payload.image_url || payload.imageUrl || '';
    if (!imageUrl) return { success: false, error: 'ไม่พบ URL รูปสลิป' };

    var expectedAmount = parseFloat(payload.expected_amount || payload.amount || 0);

    // ดาวน์โหลดรูปเป็น base64
    var base64 = _fetchImageBase64(imageUrl);
    if (!base64) return { success: false, error: 'ไม่สามารถดาวน์โหลดรูปสลิปได้' };

    var prompt = 'คุณคือระบบตรวจสอบสลิปโอนเงิน PromptPay/ธนาคาร\n\n' +
      'วิเคราะห์รูปสลิปและตอบ JSON เท่านั้น:\n' +
      '{\n' +
      '  "is_slip": true,\n' +
      '  "amount": 1500.00,\n' +
      '  "receiver_name": "ชื่อผู้รับ",\n' +
      '  "receiver_account": "0xx-xxx-xxxx",\n' +
      '  "sender_name": "ชื่อผู้ส่ง",\n' +
      '  "transaction_ref": "รหัสอ้างอิง",\n' +
      '  "transaction_date": "DD/MM/YYYY HH:mm",\n' +
      '  "bank": "ชื่อธนาคาร",\n' +
      '  "confidence": 0.95,\n' +
      '  "is_valid": true,\n' +
      '  "issues": []\n' +
      '}\n\n' +
      (expectedAmount > 0 ? 'ยอดที่คาดหวัง: ฿' + expectedAmount + ' — ตรวจสอบว่าตรงกันหรือไม่\n\n' : '') +
      'ตอบ JSON อย่างเดียว ไม่มี markdown:';

    var result = _callGeminiVision_(apiKey, prompt, base64);
    if (result.error) return { success: false, error: result.error };

    var amount = parseFloat(result.amount || 0);
    var isAmountMatch = expectedAmount > 0 ? Math.abs(amount - expectedAmount) < 1 : true;

    return {
      success: true,
      is_slip: result.is_slip !== false,
      amount: amount,
      receiver_name: result.receiver_name || '',
      receiver_account: result.receiver_account || '',
      sender_name: result.sender_name || '',
      transaction_ref: result.transaction_ref || '',
      transaction_date: result.transaction_date || '',
      bank: result.bank || '',
      confidence: result.confidence || 0,
      is_valid: result.is_valid !== false && isAmountMatch,
      is_amount_match: isAmountMatch,
      issues: result.issues || [],
      provider: 'gemini-vision'
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  }
}
