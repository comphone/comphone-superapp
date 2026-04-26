// ============================================================
// COMPHONE SUPER APP v5.9.0-phase2d
// BusinessMetrics.gs — PHASE 28: AI Business Metrics Engine
// Measure real impact of AI (not just logs)
// ============================================================

/**
 * getAIMetrics_ — ดึง metrics รวมของ AI ระบบ
 * @param {Object} payload — { period: 'today'|'7d'|'30d' }
 * @returns {Object} v17 schema — { success, data, error, meta }
 */
function getAIMetrics_(payload) {
  try {
    payload = payload || {};
    var period = String(payload.period || 'today');
    var ss = getComphoneSheet();
    if (!ss) return _wrapError_('ไม่พบ Spreadsheet');

    var now = new Date();
    var cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); // default today
    if (period === '7d') cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (period === '30d') cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // ── 1. AI Usage Count from DB_AI_METRICS ──
    var usageSheet = findSheetByName(ss, 'DB_AI_METRICS');
    var usageCount = 0;
    var avgImpact = 0;
    var impactSum = 0;
    var actionBreakdown = {};
    if (usageSheet) {
      var rows = usageSheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        var ts = rows[i][2] instanceof Date ? rows[i][2] : null;
        if (ts && ts >= cutoff) {
          usageCount++;
          var imp = parseFloat(rows[i][3] || 0);
          impactSum += imp;
          var act = String(rows[i][0] || 'unknown');
          actionBreakdown[act] = (actionBreakdown[act] || 0) + 1;
        }
      }
      avgImpact = usageCount > 0 ? Math.round((impactSum / usageCount) * 100) / 100 : 0;
    }

    // ── 2. Jobs Assigned by AI (smartAssignV2) ──
    var jobSheet = findSheetByName(ss, 'DBJOBS');
    var jobsAssignedByAI = 0;
    var avgAssignTime = 0;
    var assignTimes = [];
    if (jobSheet) {
      var jobs = jobSheet.getDataRange().getValues();
      var jHdr = jobs[0];
      var jIdx = {};
      for (var h = 0; h < jHdr.length; h++) jIdx[String(jHdr[h]).toLowerCase().trim()] = h;
      var jTech = jIdx['ช่างผู้รับผิดชอบ'] !== undefined ? jIdx['ช่างผู้รับผิดชอบ'] : 4;
      var jCreated = jIdx['วันที่สร้าง'] !== undefined ? jIdx['วันที่สร้าง'] : -1;
      var jAssigned = jIdx['วันที่มอบหมาย'] !== undefined ? jIdx['วันที่มอบหมาย'] : -1;
      var jSource = jIdx['แหล่งที่มา'] !== undefined ? jIdx['แหล่งที่มา'] : -1;

      for (var r = 1; r < jobs.length; r++) {
        var created = jCreated >= 0 && jobs[r][jCreated] instanceof Date ? jobs[r][jCreated] : null;
        if (!created || created < cutoff) continue;
        // Check if assigned by AI (source column says 'AI' or assigned quickly after creation)
        var source = jSource >= 0 ? String(jobs[r][jSource] || '') : '';
        if (source.toLowerCase().indexOf('ai') > -1 || source.toLowerCase().indexOf('smart') > -1) {
          jobsAssignedByAI++;
          if (jAssigned >= 0 && jobs[r][jAssigned] instanceof Date && created) {
            var mins = (jobs[r][jAssigned].getTime() - created.getTime()) / (60 * 1000);
            if (mins > 0 && mins < 1440) assignTimes.push(mins); // max 24h
          }
        }
        // Fallback: if no source column, check if assigned within 5 min (likely auto)
        else if (jAssigned >= 0 && jobs[r][jAssigned] instanceof Date && created) {
          var mins2 = (jobs[r][jAssigned].getTime() - created.getTime()) / (60 * 1000);
          if (mins2 > 0 && mins2 <= 5) {
            jobsAssignedByAI++;
            assignTimes.push(mins2);
          }
        }
      }
    }
    avgAssignTime = assignTimes.length > 0
      ? Math.round((assignTimes.reduce(function(a,b){return a+b;}, 0) / assignTimes.length) * 10) / 10
      : 0;

    // ── 3. CSAT from DB_CSAT ──
    var csatSheet = findSheetByName(ss, 'DB_CSAT');
    var csatAvg = 0;
    var csatResponseRate = 0;
    var csatTotal = 0;
    var csatCompleted = 0;
    if (csatSheet) {
      var cRows = csatSheet.getDataRange().getValues();
      var sumScore = 0;
      for (var c = 1; c < cRows.length; c++) {
        var sent = cRows[c][6] instanceof Date ? cRows[c][6] : null;
        if (sent && sent >= cutoff) {
          csatTotal++;
          var sc = parseInt(cRows[c][3] || 0, 10);
          if (sc > 0) {
            sumScore += sc;
            csatCompleted++;
          }
        }
      }
      csatAvg = csatCompleted > 0 ? Math.round((sumScore / csatCompleted) * 100) / 100 : 0;
      csatResponseRate = csatTotal > 0 ? Math.round((csatCompleted / csatTotal) * 1000) / 10 : 0;
    }

    // ── 4. TOR Generated from DB_TOR ──
    var torSheet = findSheetByName(ss, 'DB_TOR');
    var torGenerated = 0;
    if (torSheet) {
      var tRows = torSheet.getDataRange().getValues();
      for (var t = 1; t < tRows.length; t++) {
        var tc = tRows[t][8] instanceof Date ? tRows[t][8] : null;
        if (tc && tc >= cutoff) torGenerated++;
      }
    }

    // ── 5. Revenue Impact (from BILLING where source = AI) ──
    var billingSheet = findSheetByName(ss, 'BILLING');
    var revenueFromAI = 0;
    if (billingSheet) {
      var bRows = billingSheet.getDataRange().getValues();
      var bHdr = bRows[0];
      var bIdx = {};
      for (var bh = 0; bh < bHdr.length; bh++) bIdx[String(bHdr[bh]).toLowerCase().trim()] = bh;
      var bTotal = bIdx['total'] !== undefined ? bIdx['total'] : 4;
      var bCreated = bIdx['created_at'] !== undefined ? bIdx['created_at'] : -1;
      var bSource = bIdx['source'] !== undefined ? bIdx['source'] : -1;
      for (var br = 1; br < bRows.length; br++) {
        var bc = bCreated >= 0 && bRows[br][bCreated] instanceof Date ? bRows[br][bCreated] : null;
        if (!bc || bc < cutoff) continue;
        var src = bSource >= 0 ? String(bRows[br][bSource] || '') : '';
        if (src.toLowerCase().indexOf('ai') > -1 || src.toLowerCase().indexOf('smart') > -1 || src.toLowerCase().indexOf('tor') > -1) {
          revenueFromAI += Number(bRows[br][bTotal] || 0);
        }
      }
    }

    return _wrapSuccess_({
      period: period,
      jobsAssignedByAI: jobsAssignedByAI,
      avgAssignTime: avgAssignTime,
      csatAvg: csatAvg,
      csatResponseRate: csatResponseRate,
      torGenerated: torGenerated,
      aiUsageCount: usageCount,
      avgImpactScore: avgImpact,
      revenueFromAI: Math.round(revenueFromAI),
      actionBreakdown: actionBreakdown,
      generatedAt: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss')
    });

  } catch (err) {
    return _wrapError_(err);
  }
}

/**
 * logAIUsage_ — บันทึกการใช้ AI ที่ละลายเวลา
 * @param {Object} payload — { action, user, impact, detail }
 * @returns {Object} v17 schema
 */
function logAIUsage_(payload) {
  try {
    payload = payload || {};
    var action = String(payload.action || payload.decision?.action || 'unknown');
    var user = String(payload.user || payload.decision?.user || 'SYSTEM');
    var impact = parseFloat(payload.impact || payload.impactScore || 0);
    var detail = payload.detail || {};

    var ss = getComphoneSheet();
    if (!ss) return _wrapError_('ไม่พบ Spreadsheet');

    // สร้าง sheet ถ้ายังไม่มี
    _ensureAIMetricsSheet_();
    var sheet = findSheetByName(ss, 'DB_AI_METRICS');
    if (!sheet) return _wrapError_('ไม่สามารถสร้าง DB_AI_METRICS');

    var ts = new Date();
    sheet.appendRow([
      action,
      user,
      ts,
      impact,
      JSON.stringify(detail).substring(0, 500),
      Utilities.formatDate(ts, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss')
    ]);

    return _wrapSuccess_({
      action: action,
      user: user,
      impact: impact,
      loggedAt: Utilities.formatDate(ts, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss')
    });

  } catch (err) {
    return _wrapError_(err);
  }
}

/**
 * getAIMetricsSummary_ — สรุปรวมใน dashboard (today only, lightweight)
 * @returns {Object} v17 schema
 */
function getAIMetricsSummary_() {
  return getAIMetrics_({ period: 'today' });
}

/* ── Helpers ── */

function _ensureAIMetricsSheet_() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DB_AI_METRICS');
    if (!sh) {
      sh = ss.insertSheet('DB_AI_METRICS');
      sh.appendRow(['action', 'user', 'timestamp', 'impact_score', 'detail_json', 'formatted_time']);
      sh.getRange(1, 1, 1, 6).setFontWeight('bold').setBackground('#EDE7F6');
      // ปรับความกว้างของคอลัมน์
      sh.setColumnWidth(1, 140);  // action
      sh.setColumnWidth(2, 100);  // user
      sh.setColumnWidth(3, 160);  // timestamp
      sh.setColumnWidth(4, 80);   // impact
      sh.setColumnWidth(5, 300);  // detail
      sh.setColumnWidth(6, 140);  // formatted
    }
    return sh;
  } catch (e) { return null; }
}
