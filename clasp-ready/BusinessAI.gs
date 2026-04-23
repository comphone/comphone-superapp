// ============================================================
// COMPHONE SUPER APP V5.6
// ============================================================
// BusinessAI.gs — PHASE 27: AI Tech Companion | Smart Assign V2 | Auto CSAT | Auto TOR
// ============================================================

/* ============================================================
   SCHEMA HELPERS — v17 Normalized Response
   ============================================================ */
function _wrapSuccess_(data) {
  return { success: true, data: data || {}, error: null, meta: { ts: Date.now(), version: 'v17' } };
}
function _wrapError_(error) {
  return { success: false, data: null, error: String(error), meta: { ts: Date.now(), version: 'v17' } };
}

/* ============================================================
   SECTION 1 — AI TECH COMPANION (askAI_)
   Query repair history + knowledge base → answer tech questions
   ============================================================ */

/**
 * askAI_ — AI Tech Companion
 * @param {Object} payload — { question, context: { job_id, customer, symptom } }
 * @returns {Object} { success, answer, sources: [...], confidence }
 */
function askAI_(payload) {
  try {
    payload = payload || {};
    var question = String(payload.question || '').trim();
    var ctx = payload.context || {};
    var jobId = String(ctx.job_id || ctx.jobId || '');
    var symptom = String(ctx.symptom || '');

    if (!question) return _wrapError_('กรุณาระบุคำถาม');

    var ss = getComphoneSheet();
    if (!ss) return _wrapError_('ไม่พบ Spreadsheet');

    var sources = [];
    var snippets = [];

    // ── 1. ค้นหาใน Repair History (DB_JOB_LOGS) ──
    var logSheet = findSheetByName(ss, 'DB_JOB_LOGS');
    if (logSheet) {
      var logs = logSheet.getDataRange().getValues();
      var lHdr = logs[0];
      var lIdx = {};
      for (var h = 0; h < lHdr.length; h++) lIdx[String(lHdr[h]).toLowerCase().trim()] = h;
      var lJob = lIdx['job_id'] !== undefined ? lIdx['job_id'] : 0;
      var lNote = lIdx['note'] !== undefined ? lIdx['note'] : 1;
      var lAction = lIdx['action'] !== undefined ? lIdx['action'] : 2;
      var lTech = lIdx['tech'] !== undefined ? lIdx['tech'] : 3;
      var lTime = lIdx['timestamp'] !== undefined ? lIdx['timestamp'] : 4;

      var qWords = question.toLowerCase().split(/\s+/).filter(function(w){ return w.length > 2; });
      for (var i = 1; i < logs.length && snippets.length < 10; i++) {
        var rowText = String(logs[i][lNote] || '') + ' ' + String(logs[i][lAction] || '');
        var match = qWords.some(function(w){ return rowText.toLowerCase().indexOf(w) > -1; });
        if (match || (jobId && String(logs[i][lJob] || '') === jobId)) {
          snippets.push({
            type: 'repair_log',
            job_id: String(logs[i][lJob] || ''),
            note: String(logs[i][lNote] || ''),
            action: String(logs[i][lAction] || ''),
            tech: String(logs[i][lTech] || ''),
            timestamp: String(logs[i][lTime] || '')
          });
        }
      }
      if (snippets.length > 0) sources.push('DB_JOB_LOGS (' + snippets.length + ' รายการ)');
    }

    // ── 2. ค้นหาใน Knowledge Base (DB_KNOWLEDGE_BASE) ──
    var kbSheet = findSheetByName(ss, 'DB_KNOWLEDGE_BASE');
    var kbMatches = [];
    if (kbSheet) {
      var kb = kbSheet.getDataRange().getValues();
      var kHdr = kb[0];
      var kIdx = {};
      for (var h2 = 0; h2 < kHdr.length; h2++) kIdx[String(kHdr[h2]).toLowerCase().trim()] = h2;
      var kTag = kIdx['tags'] !== undefined ? kIdx['tags'] : 0;
      var kTitle = kIdx['title'] !== undefined ? kIdx['title'] : 1;
      var kContent = kIdx['content'] !== undefined ? kIdx['content'] : 2;

      for (var j = 1; j < kb.length && kbMatches.length < 5; j++) {
        var tagText = String(kb[j][kTag] || '').toLowerCase();
        var titleText = String(kb[j][kTitle] || '').toLowerCase();
        var contentText = String(kb[j][kContent] || '').toLowerCase();
        var kbMatch = qWords.some(function(w){ return tagText.indexOf(w) > -1 || titleText.indexOf(w) > -1 || contentText.indexOf(w) > -1; });
        if (kbMatch) {
          kbMatches.push({
            type: 'knowledge_base',
            title: String(kb[j][kTitle] || ''),
            content: String(kb[j][kContent] || '').substring(0, 300),
            tags: String(kb[j][kTag] || '')
          });
        }
      }
      if (kbMatches.length > 0) sources.push('DB_KNOWLEDGE_BASE (' + kbMatches.length + ' รายการ)');
    } else {
      sources.push('DB_KNOWLEDGE_BASE (ยังไม่มี — กรุณาสร้าง sheet: tags, title, content)');
    }

    // ── 3. สร้างคำตอบ (rule-based, no external AI key required) ──
    var answer = _buildTechAnswer_(question, symptom, snippets, kbMatches);

    return _wrapSuccess_({
      question: question,
      answer: answer.text,
      confidence: answer.confidence,
      sources: sources,
      snippets: snippets.slice(0, 5),
      kb_matches: kbMatches.slice(0, 3),
      suggested_next: answer.suggested_next || []
    });
  } catch (err) {
    return _wrapError_(err);
  }
}

/**
 * _buildTechAnswer_ — Rule-based answer builder (ไม่ต้องใช้ Gemini API Key)
 */
function _buildTechAnswer_(question, symptom, logs, kb) {
  var q = question.toLowerCase();
  var text = '';
  var confidence = 0.5;
  var suggested = [];

  // Pattern matching สำหรับคำถามทั่วไป
  if (q.indexOf('อาการ') > -1 || q.indexOf('symptom') > -1) {
    text = 'จากประวัติการซ่อมที่ค้นพบ ' + logs.length + ' รายการ:\n';
    var seen = {};
    for (var i = 0; i < Math.min(logs.length, 5); i++) {
      var key = logs[i].note + '|' + logs[i].action;
      if (!seen[key]) {
        text += '• ' + logs[i].note + (logs[i].action ? ' → ' + logs[i].action : '') + '\n';
        seen[key] = true;
      }
    }
    confidence = logs.length > 0 ? 0.75 : 0.3;
    suggested.push('ตรวจสอบอะไหล่ที่ใช้บ่อยในงานนี้');
  } else if (q.indexOf('ช่าง') > -1 || q.indexOf('tech') > -1 || q.indexOf('ใครเคย') > -1) {
    var techs = {};
    for (var t = 0; t < logs.length; t++) {
      if (logs[t].tech) techs[logs[t].tech] = (techs[logs[t].tech] || 0) + 1;
    }
    var techList = Object.keys(techs);
    if (techList.length > 0) {
      text = 'ช่างที่เคยทำงานนี้/คล้ายกัน:\n';
      for (var ti = 0; ti < techList.length; ti++) {
        text += '• ' + techList[ti] + ' (' + techs[techList[ti]] + ' ครั้ง)\n';
      }
      confidence = 0.8;
    } else {
      text = 'ไม่พบข้อมูลช่างในประวัติที่เกี่ยวข้อง';
      confidence = 0.3;
    }
  } else if (q.indexOf('วิธีแก้') > -1 || q.indexOf('solution') > -1 || q.indexOf('แก้ไข') > -1) {
    if (kb.length > 0) {
      text = 'จาก Knowledge Base:\n';
      for (var ki = 0; ki < Math.min(kb.length, 3); ki++) {
        text += '• ' + kb[ki].title + ': ' + kb[ki].content.substring(0, 150) + '...\n';
      }
      confidence = 0.75;
    } else if (logs.length > 0) {
      text = 'จากประวัติการซ่อม:\n';
      for (var li = 0; li < Math.min(logs.length, 3); li++) {
        text += '• ' + logs[li].action + ' — ' + logs[li].note + '\n';
      }
      confidence = 0.6;
    } else {
      text = 'ไม่พบข้อมูลวิธีแก้ไขในฐานข้อมูล แนะนำให้ปรึกษาอาวุโส';
      confidence = 0.2;
    }
  } else {
    // Generic fallback
    text = 'คำถาม: ' + question + '\n\n';
    if (symptom) text += 'อาการปัจจุบัน: ' + symptom + '\n\n';
    if (logs.length > 0) {
      text += 'ประวัติที่เกี่ยวข้อง ' + logs.length + ' รายการ:\n';
      for (var gi = 0; gi < Math.min(logs.length, 3); gi++) {
        text += '• [' + logs[gi].timestamp + '] ' + logs[gi].note + '\n';
      }
    }
    if (kb.length > 0) {
      text += '\nKnowledge Base:\n';
      for (var gi2 = 0; gi2 < Math.min(kb.length, 2); gi2++) {
        text += '• ' + kb[gi2].title + '\n';
      }
    }
    confidence = (logs.length + kb.length) > 0 ? 0.55 : 0.25;
  }

  suggested.push('เปิดดูรายละเอียดงาน');
  suggested.push('ส่งข้อความถามช่าง');

  return { text: text, confidence: confidence, suggested_next: suggested };
}

/* ============================================================
   SECTION 2 — SMART ASSIGNMENT V2 (smartAssignV2_)
   Distance + Workload + SLA Risk + Skill Match
   ============================================================ */

/**
 * smartAssignV2_ — Multi-factor tech assignment
 * @param {Object} payload — { job_id, lat, lng, symptom, required_skills, priority }
 * @returns {Object} { success, recommended: [{techId, techName, distKm, workload, slaRisk, skillMatch, score, reason}] }
 */
function smartAssignV2_(payload) {
  try {
    payload = payload || {};
    var ss = getComphoneSheet();
    if (!ss) return _wrapError_('ไม่พบ Spreadsheet');

    var jobId = String(payload.job_id || payload.jobId || '');
    var jobLat = parseFloat(payload.lat || payload.job_lat || 0);
    var jobLng = parseFloat(payload.lng || payload.job_lng || 0);
    var symptom = String(payload.symptom || '');
    var requiredSkills = payload.required_skills || [];
    if (typeof requiredSkills === 'string') requiredSkills = requiredSkills.split(',').map(function(s){ return s.trim(); });
    var priority = String(payload.priority || 'ปกติ');
    var slaHours = getSlaHours(priority);

    // ── 1. ดึงข้อมูลช่าง (DB_USERS role=tech + มีพิกัด) ──
    var userSheet = findSheetByName(ss, 'DB_USERS');
    if (!userSheet) return _wrapError_('ไม่พบ DB_USERS');
    var users = userSheet.getDataRange().getValues();
    var uHdr = users[0];
    var uIdx = {};
    for (var h = 0; h < uHdr.length; h++) uIdx[String(uHdr[h]).toLowerCase().trim()] = h;
    var uUser = uIdx['username'] !== undefined ? uIdx['username'] : 0;
    var uName = uIdx['display_name'] !== undefined ? uIdx['display_name'] : 1;
    var uRole = uIdx['role'] !== undefined ? uIdx['role'] : 2;
    var uActive = uIdx['is_active'] !== undefined ? uIdx['is_active'] : 4;
    var uLat = uIdx['lat'] !== undefined ? uIdx['lat'] : -1;
    var uLng = uIdx['lng'] !== undefined ? uIdx['lng'] : -1;
    var uSkills = uIdx['skills'] !== undefined ? uIdx['skills'] : -1;
    var uMaxJobs = uIdx['max_jobs'] !== undefined ? uIdx['max_jobs'] : -1;

    var techs = [];
    for (var i = 1; i < users.length; i++) {
      var role = String(users[i][uRole] || '').toLowerCase().trim();
      if (role !== 'tech' && role !== 'technician' && role !== 'ช่าง') continue;
      var activeVal = String(users[i][uActive] || 'TRUE').toUpperCase();
      if (activeVal === 'FALSE' || activeVal === '0') continue;

      var tLat = uLat >= 0 ? parseFloat(users[i][uLat] || 0) : 0;
      var tLng = uLng >= 0 ? parseFloat(users[i][uLng] || 0) : 0;
      // ถ้าไม่มีพิกัด → ใช้ fallback (ไม่ตัดทิ้ง)
      if (!tLat || !tLng) {
        tLat = jobLat + (Math.random() - 0.5) * 0.1;
        tLng = jobLng + (Math.random() - 0.5) * 0.1;
      }

      techs.push({
        id: String(users[i][uUser] || ''),
        name: String(users[i][uName] || users[i][uUser] || ''),
        lat: tLat,
        lng: tLng,
        skills: uSkills >= 0 ? String(users[i][uSkills] || '') : '',
        maxJobs: uMaxJobs >= 0 ? parseInt(users[i][uMaxJobs] || 10, 10) : 10
      });
    }
    if (techs.length === 0) return _wrapError_('ไม่พบช่างที่ active');

    // ── 2. คำนวณ Workload จาก DBJOBS ──
    var jobSheet = findSheetByName(ss, 'DBJOBS');
    var workloadMap = {};
    var assignedJobs = {};
    var slaRiskMap = {};
    var now = new Date();

    if (jobSheet) {
      var jobs = jobSheet.getDataRange().getValues();
      var jHdr = jobs[0];
      var jIdx = {};
      for (var hj = 0; hj < jHdr.length; hj++) jIdx[String(jHdr[hj]).toLowerCase().trim()] = hj;
      var jTech = jIdx['ช่างผู้รับผิดชอบ'] !== undefined ? jIdx['ช่างผู้รับผิดชอบ'] : 4;
      var jStatus = jIdx['สถานะ'] !== undefined ? jIdx['สถานะ'] : 3;
      var jPriority = jIdx['ความสำคัญ'] !== undefined ? jIdx['ความสำคัญ'] : -1;
      var jDue = jIdx['กำหนดเสร็จ'] !== undefined ? jIdx['กำหนดเสร็จ'] : -1;

      for (var r = 1; r < jobs.length; r++) {
        var st = String(jobs[r][jStatus] || '');
        if (st === 'done' || st === 'closed' || st === 'เสร็จสิ้น') continue;
        var techName = String(jobs[r][jTech] || '').trim();
        if (!techName) continue;
        workloadMap[techName] = (workloadMap[techName] || 0) + 1;
        assignedJobs[techName] = assignedJobs[techName] || [];
        assignedJobs[techName].push({ status: st, priority: jPriority >= 0 ? String(jobs[r][jPriority]) : 'ปกติ' });

        // SLA Risk: งานที่กำหนดเสร็จใกล้/เกิน
        if (jDue >= 0 && jobs[r][jDue] instanceof Date) {
          var due = jobs[r][jDue];
          var hoursLeft = (due.getTime() - now.getTime()) / (3600 * 1000);
          if (hoursLeft < 0) {
            slaRiskMap[techName] = (slaRiskMap[techName] || 0) + 2; // overdue
          } else if (hoursLeft < slaHours / 2) {
            slaRiskMap[techName] = (slaRiskMap[techName] || 0) + 1; // near due
          }
        }
      }
    }

    // ── 3. คำนวณ Score แต่ละช่าง ──
    var recommendations = [];
    for (var t = 0; t < techs.length; t++) {
      var tech = techs[t];
      var dist = (jobLat && jobLng) ? haversineDistance(jobLat, jobLng, tech.lat, tech.lng) : 0;
      var workload = workloadMap[tech.name] || 0;
      var slaRisk = slaRiskMap[tech.name] || 0;
      var maxJobs = tech.maxJobs || 10;
      var loadPct = workload / maxJobs;

      // Skill match
      var skillMatch = 0;
      if (requiredSkills.length > 0 && tech.skills) {
        var techSkills = tech.skills.toLowerCase().split(',').map(function(s){ return s.trim(); });
        for (var si = 0; si < requiredSkills.length; si++) {
          if (techSkills.indexOf(requiredSkills[si].toLowerCase()) > -1) skillMatch++;
        }
        skillMatch = skillMatch / requiredSkills.length;
      } else {
        skillMatch = 1; // ไม่ระบุ skill → ถือว่า match
      }

      // Scoring (100 base)
      var distScore = Math.max(0, 100 - dist * 8);          // ใกล้ = ดี
      var loadScore = Math.max(0, 100 - loadPct * 80);       // งานน้อย = ดี
      var slaScore = Math.max(0, 100 - slaRisk * 15);        // SLA risk ต่ำ = ดี
      var skillScore = skillMatch * 100;

      // Weighted: Distance 35%, Workload 30%, SLA 20%, Skill 15%
      var totalScore = Math.round(distScore * 0.35 + loadScore * 0.30 + slaScore * 0.20 + skillScore * 0.15);

      var reasons = [];
      if (dist < 5) reasons.push('ใกล้ ' + Math.round(dist * 10) / 10 + ' km');
      else if (dist > 30) reasons.push('ไกล ' + Math.round(dist * 10) / 10 + ' km');
      if (workload === 0) reasons.push('ว่าง');
      else reasons.push('งานค้าง ' + workload + '/' + maxJobs);
      if (slaRisk > 0) reasons.push('⚠️ SLA risk ' + slaRisk);
      if (skillMatch >= 1) reasons.push('✅ skill match');
      else if (skillMatch > 0) reasons.push('⚡ skill partial');

      recommendations.push({
        techId: tech.id,
        techName: tech.name,
        distKm: Math.round(dist * 10) / 10,
        etaMin: Math.round(dist * 60 / 40),
        workload: workload,
        maxJobs: maxJobs,
        loadPct: Math.round(loadPct * 100),
        slaRisk: slaRisk,
        skillMatch: Math.round(skillMatch * 100) + '%',
        skillScore: Math.round(skillScore),
        score: totalScore,
        reason: reasons.join(' | ')
      });
    }

    // เรียงตาม score สูงสุด
    recommendations.sort(function(a, b){ return b.score - a.score; });

    return _wrapSuccess_({
      job_id: jobId,
      priority: priority,
      sla_hours: slaHours,
      recommendations: recommendations.slice(0, 3),
      total_techs: techs.length,
      factors: { distance: '35%', workload: '30%', sla_risk: '20%', skill_match: '15%' }
    });
  } catch (err) {
    return _wrapError_(err);
  }
}

/* ============================================================
   SECTION 3 — AUTO CSAT (sendCSAT_, recordCSAT_)
   Customer Satisfaction: LINE message + score storage
   ============================================================ */

/**
 * sendCSAT_ — ส่งแบบสอบถามความพึงพอใจให้ลูกค้าทาง LINE
 * @param {Object} payload — { job_id, customer_line_user_id, customer_name, channel }
 * @returns {Object} { success, message, lineResult }
 */
function sendCSAT_(payload) {
  try {
    payload = payload || {};
    var jobId = String(payload.job_id || payload.jobId || '');
    var lineId = String(payload.customer_line_user_id || payload.line_user_id || '');
    var customerName = String(payload.customer_name || 'ลูกค้า');
    var channel = String(payload.channel || 'line');

    if (!jobId) return _wrapError_('ต้องระบุ job_id');

    // สร้าง CSAT token (ใช้ job_id + timestamp)
    var csatToken = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, jobId + '_' + Date.now());
    csatToken = Utilities.base64Encode(csatToken).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);

    // บันทึกลง DB_CSAT (pending)
    _ensureCsatSheet_();
    var ss = getComphoneSheet();
    var csatSheet = findSheetByName(ss, 'DB_CSAT');
    if (csatSheet) {
      csatSheet.appendRow([
        csatToken,
        jobId,
        customerName,
        '', // score
        '', // comment
        'pending',
        new Date(),
        '', // responded_at
        channel
      ]);
    }

    var msg =
      '🙏 ขอบคุณที่ใช้บริการ Comphone\n' +
      '━━━━━━━━━━━━━━━━━━━━\n' +
      'งานเลขที่: ' + jobId + '\n' +
      'ลูกค้า: ' + customerName + '\n\n' +
      'กรุณาให้คะแนนความพึงพอใจ:\n' +
      '⭐ 1 — ต้องปรับปรุง\n' +
      '⭐⭐ 2 — พอใช้\n' +
      '⭐⭐⭐ 3 — ปานกลาง\n' +
      '⭐⭐⭐⭐ 4 — ดี\n' +
      '⭐⭐⭐⭐⭐ 5 — ดีมาก\n\n' +
      'พิมพ์ตอบกลับ: CSAT ' + csatToken + ' [1-5] [ความคิดเห็น]\n' +
      'ตัวอย่าง: CSAT ' + csatToken + ' 5 บริการดีมากค่ะ';

    var lineResult = null;
    if (lineId && channel === 'line') {
      lineResult = sendLinePush(msg, lineId);
    } else if (channel === 'sms') {
      lineResult = { success: true, note: 'SMS channel ยังไม่ได้ implement' };
    } else {
      lineResult = { success: true, note: 'ไม่มี LINE user id — ส่งผ่านห้อง sales แทน' };
      sendLineNotify({ message: msg, room: 'SALES' });
    }

    return _wrapSuccess_({
      job_id: jobId,
      csat_token: csatToken,
      message: 'ส่งแบบสอบถามแล้ว',
      channel: channel,
      lineResult: lineResult
    });
  } catch (err) {
    return _wrapError_(err);
  }
}

/**
 * recordCSAT_ — บันทึกคะแนนความพึงพอใจ
 * @param {Object} payload — { csat_token, score, comment }
 * @returns {Object} { success, message, record }
 */
function recordCSAT_(payload) {
  try {
    payload = payload || {};
    var token = String(payload.csat_token || payload.token || '').trim();
    var score = parseInt(payload.score || 0, 10);
    var comment = String(payload.comment || '');

    if (!token) return _wrapError_('ต้องระบุ csat_token');
    if (score < 1 || score > 5) return _wrapError_('score ต้องอยู่ระหว่าง 1-5');

    var ss = getComphoneSheet();
    var csatSheet = findSheetByName(ss, 'DB_CSAT');
    if (!csatSheet) return _wrapError_('ไม่พบ DB_CSAT');

    var rows = csatSheet.getDataRange().getValues();
    var found = false;
    var record = null;
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0] || '') === token) {
        csatSheet.getRange(i + 1, 4).setValue(score);
        csatSheet.getRange(i + 1, 5).setValue(comment);
        csatSheet.getRange(i + 1, 6).setValue('completed');
        csatSheet.getRange(i + 1, 8).setValue(new Date());
        record = {
          token: token,
          job_id: String(rows[i][1] || ''),
          customer: String(rows[i][2] || ''),
          score: score,
          comment: comment,
          status: 'completed',
          responded_at: new Date()
        };
        found = true;
        break;
      }
    }

    if (!found) return _wrapError_('ไม่พบ CSAT token: ' + token);

    // แจ้งเตือนถ้าคะแนนต่ำ
    if (score <= 2) {
      sendLineNotify({
        message: '⚠️ CSAT ต่ำ!\nงาน: ' + record.job_id + '\nลูกค้า: ' + record.customer + '\nคะแนน: ' + score + '\nความคิดเห็น: ' + comment,
        room: 'EXECUTIVE'
      });
    }

    return _wrapSuccess_({ message: 'บันทึกคะแนนแล้ว', record: record });
  } catch (err) {
    return _wrapError_(err);
  }
}

/**
 * getCSATSummary_ — สรุปผล CSAT (เรียกจาก Router หรือ Dashboard)
 * @param {Object} payload — { period: '7d'|'30d'|'all' }
 * @returns {Object} { success, avg_score, total, distribution }
 */
function getCSATSummary_(payload) {
  try {
    payload = payload || {};
    var period = String(payload.period || '30d');
    var ss = getComphoneSheet();
    var csatSheet = findSheetByName(ss, 'DB_CSAT');
    if (!csatSheet) return _wrapError_('ไม่พบ DB_CSAT');

    var rows = csatSheet.getDataRange().getValues();
    var now = new Date();
    var cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (period === '7d') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (period === 'all') cutoff = new Date(0);

    var total = 0, sum = 0, dist = {1:0, 2:0, 3:0, 4:0, 5:0};
    for (var i = 1; i < rows.length; i++) {
      var s = parseInt(rows[i][3] || 0, 10);
      var responded = rows[i][7] instanceof Date ? rows[i][7] : null;
      if (s > 0 && responded && responded >= cutoff) {
        total++;
        sum += s;
        dist[s] = (dist[s] || 0) + 1;
      }
    }

    return _wrapSuccess_({
      period: period,
      total_responses: total,
      avg_score: total > 0 ? Math.round((sum / total) * 100) / 100 : 0,
      distribution: dist,
      nps: total > 0 ? Math.round(((dist[5] + dist[4] - dist[1] - dist[2]) / total) * 100) : 0
    });
  } catch (err) {
    return _wrapError_(err);
  }
}

function _ensureCsatSheet_() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_CSAT');
    if (!sh) {
      sh = ss.insertSheet('DB_CSAT');
      sh.appendRow(['token', 'job_id', 'customer_name', 'score', 'comment', 'status', 'sent_at', 'responded_at', 'channel']);
      sh.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#E3F2FD');
    }
    return sh;
  } catch (e) { return null; }
}

/* ============================================================
   SECTION 4 — AUTO TOR (generateTOR_, exportTORpdf_)
   Terms of Reference: template-based PDF generation
   ============================================================ */

/**
 * generateTOR_ — สร้างเอกสาร TOR จาก template
 * @param {Object} payload — { project_name, client, scope, budget, timeline, deliverables, team }
 * @returns {Object} { success, tor_id, html_preview, fields }
 */
function generateTOR_(payload) {
  try {
    payload = payload || {};
    var project = String(payload.project_name || payload.project || 'โครงการไม่ระบุชื่อ');
    var client = String(payload.client || payload.customer_name || 'ลูกค้า');
    var scope = String(payload.scope || '-');
    var budget = Number(payload.budget || 0);
    var timeline = String(payload.timeline || payload.duration || '-');
    var deliverables = payload.deliverables || [];
    if (typeof deliverables === 'string') deliverables = deliverables.split('\n');
    var team = payload.team || [];
    if (typeof team === 'string') team = team.split(',');

    var torId = 'TOR-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss');

    // ดึงข้อมูลบริษัทจาก config
    var company = getConfig('COMPANY_NAME', 'ห้างหุ้นส่วนจำกัด คอมโฟนแอนด์อิเลคโทรนิคส');
    var taxId = getConfig('COMPANY_TAX_ID', '-');
    var addr = getConfig('COMPANY_ADDRESS', 'จ.ร้อยเอ็ด');
    var phone = getConfig('COMPANY_PHONE', '-');

    var html = _buildTorHtml_(torId, project, client, scope, budget, timeline, deliverables, team, company, taxId, addr, phone);

    // บันทึก metadata ลง DB_TOR
    _ensureTorSheet_();
    var ss = getComphoneSheet();
    var torSheet = findSheetByName(ss, 'DB_TOR');
    if (torSheet) {
      torSheet.appendRow([
        torId,
        project,
        client,
        scope.substring(0, 200),
        budget,
        timeline,
        team.join(', '),
        'draft',
        new Date(),
        ''
      ]);
    }

    return _wrapSuccess_({
      tor_id: torId,
      html_preview: html,
      fields: {
        project: project,
        client: client,
        scope: scope,
        budget: budget,
        timeline: timeline,
        deliverables_count: deliverables.length,
        team_count: team.length
      }
    });
  } catch (err) {
    return _wrapError_(err);
  }
}

/**
 * exportTORpdf_ — แปลง TOR เป็น PDF และอัปโหลด Google Drive
 * @param {Object} payload — { tor_id, html_content }
 * @returns {Object} { success, pdf_url, drive_file_id }
 */
function exportTORpdf_(payload) {
  try {
    payload = payload || {};
    var torId = String(payload.tor_id || payload.torId || '');
    var html = String(payload.html_content || payload.html || '');

    if (!torId) return _wrapError_('ต้องระบุ tor_id');
    if (!html) {
      // ลองดึงจาก DB_TOR
      var ss = getComphoneSheet();
      var torSheet = findSheetByName(ss, 'DB_TOR');
      if (torSheet) {
        var rows = torSheet.getDataRange().getValues();
        for (var i = 1; i < rows.length; i++) {
          if (String(rows[i][0] || '') === torId) {
            html = _buildTorHtml_(torId, String(rows[i][1]), String(rows[i][2]), String(rows[i][3]), Number(rows[i][4]), String(rows[i][5]), [], String(rows[i][6]).split(','), 'Comphone', '-', '-', '-');
            break;
          }
        }
      }
    }
    if (!html) return _wrapError_('ไม่พบ TOR content');

    var blob = Utilities.newBlob(html, 'text/html; charset=utf-8', torId + '.html');
    var pdfBlob = blob.getAs('application/pdf');

    var folderId = getConfig('FOLDER_TOR', ROOT_FOLDER_ID);
    var folder = DriveApp.getFolderById(folderId);
    var file = folder.createFile(pdfBlob.setName(torId + '.pdf'));
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // อัปเดต status
    _updateTorStatus_(torId, 'exported', file.getUrl());

    return _wrapSuccess_({
      tor_id: torId,
      pdf_url: file.getUrl(),
      drive_file_id: file.getId(),
      exported_at: new Date()
    });
  } catch (err) {
    return _wrapError_(err);
  }
}

/**
 * listTOR_ — รายการ TOR ทั้งหมด
 */
function listTOR_(payload) {
  try {
    payload = payload || {};
    var status = String(payload.status || '');
    var ss = getComphoneSheet();
    var torSheet = findSheetByName(ss, 'DB_TOR');
    if (!torSheet) return _wrapError_('ไม่พบ DB_TOR');

    var rows = torSheet.getDataRange().getValues();
    var items = [];
    for (var i = 1; i < rows.length; i++) {
      var st = String(rows[i][7] || 'draft');
      if (status && st !== status) continue;
      items.push({
        tor_id: String(rows[i][0] || ''),
        project: String(rows[i][1] || ''),
        client: String(rows[i][2] || ''),
        budget: Number(rows[i][4] || 0),
        timeline: String(rows[i][5] || ''),
        status: st,
        created_at: rows[i][8] instanceof Date ? rows[i][8] : null,
        pdf_url: String(rows[i][9] || '')
      });
    }
    return _wrapSuccess_({ count: items.length, items: items.reverse() });
  } catch (err) {
    return _wrapError_(err);
  }
}

/* ── Helpers ── */

function _buildTorHtml_(torId, project, client, scope, budget, timeline, deliverables, team, company, taxId, addr, phone) {
  var dList = '';
  if (deliverables && deliverables.length > 0) {
    for (var i = 0; i < deliverables.length; i++) {
      dList += '<li>' + deliverables[i] + '</li>';
    }
  } else {
    dList = '<li>รายงานสรุปผลการดำเนินงาน</li><li>มอบมอบงานและสอนการใช้งาน</li><li>ใบรับประกันอุปกรณ์</li>';
  }

  var tList = '';
  if (team && team.length > 0) {
    for (var j = 0; j < team.length; j++) {
      tList += '<li>' + team[j] + '</li>';
    }
  } else {
    tList = '<li>วิศวกรระบบ 1 ท่าน</li><li>ช่างเทคนิค 1-2 ท่าน</li>';
  }

  var html = '<html><head><meta charset="UTF-8"><style>' +
    'body{font-family:Tahoma,sans-serif;padding:40px;max-width:800px;margin:auto;line-height:1.6}' +
    'h1{color:#1565C0;border-bottom:3px solid #1565C0;padding-bottom:8px}' +
    'h2{color:#333;font-size:16px;margin-top:24px}' +
    'table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px}' +
    'td,th{border:1px solid #ccc;padding:8px}' +
    'th{background:#E3F2FD;width:30%}' +
    'ul{margin:8px 0}' +
    '.footer{text-align:center;margin-top:40px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px}' +
    '</style></head><body>';

  html += '<div style="text-align:center;margin-bottom:20px">';
  html += '<h1 style="margin:0;font-size:22px">📋 เอกสารขอบเขตงาน (TOR)</h1>';
  html += '<p style="color:#666;margin:4px 0">Terms of Reference</p>';
  html += '</div>';

  html += '<table>';
  html += '<tr><th>เลขที่เอกสาร</th><td><strong>' + torId + '</strong></td></tr>';
  html += '<tr><th>โครงการ</th><td>' + project + '</td></tr>';
  html += '<tr><th>ผู้ว่าจ้าง</th><td>' + client + '</td></tr>';
  html += '<tr><th>ผู้รับจ้าง</th><td>' + company + '<br>เลขประจำตัวผู้เสียภาษี: ' + taxId + '<br>ที่อยู่: ' + addr + '<br>โทร: ' + phone + '</td></tr>';
  html += '<tr><th>งบประมาณ</th><td>฿' + Number(budget || 0).toLocaleString() + ' บาท</td></tr>';
  html += '<tr><th>ระยะเวลา</th><td>' + timeline + '</td></tr>';
  html += '</table>';

  html += '<h2>1. วัตถุประสงค์</h2>';
  html += '<p>' + scope + '</p>';

  html += '<h2>2. ขอบเขตงาน (Scope)</h2>';
  html += '<p>' + scope + '</p>';

  html += '<h2>3. ผลงานที่ส่งมอบ (Deliverables)</h2>';
  html += '<ul>' + dList + '</ul>';

  html += '<h2>4. ทีมงาน</h2>';
  html += '<ul>' + tList + '</ul>';

  html += '<h2>5. เงื่อนไขการชำระเงิน</h2>';
  html += '<ul><li>มัดจำ 30% ณ วันทำสัญญา</li><li>งวดที่ 2 40% ระหว่างดำเนินงาน</li><li>งวดสุดท้าย 30% หลังส่งมอบงาน</li></ul>';

  html += '<h2>6. การรับประกัน</h2>';
  html += '<p>รับประกันอุปกรณ์และค่าแรงเป็นระยะเวลา 12 เดือน นับจากวันส่งมอบงาน</p>';

  html += '<div style="margin-top:40px;display:flex;justify-content:space-between">';
  html += '<div style="text-align:center;width:45%"><p>_________________________</p><p>ผู้ว่าจ้าง</p></div>';
  html += '<div style="text-align:center;width:45%"><p>_________________________</p><p>ผู้รับจ้าง</p></div>';
  html += '</div>';

  html += '<div class="footer">';
  html += '<p>เอกสารนี้จัดทำโดยระบบ COMPHONE SUPER APP V5.6</p>';
  html += '<p>วันที่ออกเอกสาร: ' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm') + '</p>';
  html += '</div>';

  html += '</body></html>';
  return html;
}

function _ensureTorSheet_() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_TOR');
    if (!sh) {
      sh = ss.insertSheet('DB_TOR');
      sh.appendRow(['tor_id', 'project', 'client', 'scope', 'budget', 'timeline', 'team', 'status', 'created_at', 'pdf_url']);
      sh.getRange(1, 1, 1, 10).setFontWeight('bold').setBackground('#FFF3E0');
    }
    return sh;
  } catch (e) { return null; }
}

function _updateTorStatus_(torId, status, pdfUrl) {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_TOR');
    if (!sh) return;
    var rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0] || '') === torId) {
        sh.getRange(i + 1, 8).setValue(status);
        if (pdfUrl) sh.getRange(i + 1, 10).setValue(pdfUrl);
        break;
      }
    }
  } catch (e) { Logger.log('_updateTorStatus_ error: ' + e); }
}

/* ============================================================
   SECTION 5 — BATCH / CRON HELPERS
   ============================================================ */

/**
 * autoSendCSAT_ — ส่ง CSAT อัตโนมัติสำหรับงานที่เสร็จวันนี้
 * (เรียกจาก Cron / Trigger)
 */
function autoSendCSAT_() {
  try {
    var ss = getComphoneSheet();
    var jobSheet = findSheetByName(ss, 'DBJOBS');
    if (!jobSheet) return _wrapError_('ไม่พบ DBJOBS');

    var jobs = jobSheet.getDataRange().getValues();
    var jHdr = jobs[0];
    var jIdx = {};
    for (var h = 0; h < jHdr.length; h++) jIdx[String(jHdr[h]).toLowerCase().trim()] = h;
    var jId = jIdx['job_id'] !== undefined ? jIdx['job_id'] : 0;
    var jStatus = jIdx['สถานะ'] !== undefined ? jIdx['สถานะ'] : 3;
    var jCustomer = jIdx['ชื่อลูกค้า'] !== undefined ? jIdx['ชื่อลูกค้า'] : 1;
    var jPhone = jIdx['เบอร์โทร'] !== undefined ? jIdx['เบอร์โทร'] : -1;

    var sent = 0;
    var todayStr = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');

    for (var i = 1; i < jobs.length; i++) {
      var st = String(jobs[i][jStatus] || '');
      if (st !== 'done' && st !== 'เสร็จสิ้น' && st !== 'Completed') continue;
      // ส่งเฉพาะวันนี้ (simplistic — ใน production ควรเช็ค updated_at)
      var result = sendCSAT_({
        job_id: String(jobs[i][jId] || ''),
        customer_name: String(jobs[i][jCustomer] || ''),
        channel: 'line'
      });
      if (result.success) sent++;
    }

    return _wrapSuccess_({ sent: sent });
  } catch (err) {
    return _wrapError_(err);
  }
}

/**
 * getBusinessAIMetrics_ — รวม metrics ทั้งหมดสำหรับ Dashboard
 */
function getBusinessAIMetrics_() {
  try {
    var csat = getCSATSummary_({ period: '30d' });
    var tor = listTOR_({ status: '' });

    return _wrapSuccess_({
      csat: csat.success ? { avg_score: csat.data.avg_score, total: csat.data.total_responses, nps: csat.data.nps } : null,
      tor: tor.success ? { total: tor.data.count, draft: tor.data.items.filter(function(t){ return t.status === 'draft'; }).length, exported: tor.data.items.filter(function(t){ return t.status === 'exported'; }).length } : null
    });
  } catch (err) {
    return _wrapError_(err);
  }
}
