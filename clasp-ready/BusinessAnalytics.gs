// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a
// BusinessAnalytics.gs — PHASE 29: AI Business Intelligence
// Rule-based analysis + actionable recommendations
// ============================================================

/**
 * analyzeBusiness_ — Analyze KPIs and generate actionable insights
 * @param {Object} payload — { period: 'today'|'7d'|'30d', metrics?: {...} }
 * @returns {Object} v17 schema — { success, data: { alerts, recommendations, predictions }, error, meta }
 */
function analyzeBusiness_(payload) {
  try {
    payload = payload || {};
    var period = String(payload.period || 'today');
    
    // Get metrics if not provided
    var metrics;
    if (payload.metrics && typeof payload.metrics === 'object') {
      metrics = payload.metrics;
    } else {
      var mRes = getAIMetrics_({ period: period });
      if (!mRes.success || !mRes.data) {
        return _wrapError_('ไม่สามารถดึง metrics ได้: ' + (mRes.error || 'unknown'));
      }
      metrics = mRes.data;
    }

    var alerts = [];
    var recommendations = [];
    var predictions = {};

    // ── THRESHOLDS (configurable via Script Properties or defaults) ──
    var CSAT_THRESHOLD = parseFloat(getConfig('ANALYTICS_CSAT_MIN', '3.5'));
    var REVENUE_TARGET = parseFloat(getConfig('ANALYTICS_REVENUE_TARGET', '50000'));
    var MAX_JOBS_PER_TECH = parseInt(getConfig('ANALYTICS_MAX_JOBS_PER_TECH', '8'), 10);
    var MIN_AI_USAGE = parseInt(getConfig('ANALYTICS_MIN_AI_USAGE', '5'), 10);
    var CSAT_RESPONSE_MIN = parseFloat(getConfig('ANALYTICS_CSAT_RESPONSE_MIN', '30'));

    // ── 1. CSAT Analysis ──
    if (metrics.csatAvg > 0 && metrics.csatAvg < CSAT_THRESHOLD) {
      alerts.push({
        severity: 'high',
        category: 'csat',
        title: 'คะแนนความพึงพอใจต่ำ',
        message: 'CSAT เฉลี่ย ' + metrics.csatAvg.toFixed(1) + ' (เกณฑ์ ' + CSAT_THRESHOLD + ')',
        metric: metrics.csatAvg,
        threshold: CSAT_THRESHOLD
      });
      recommendations.push({
        priority: 1,
        category: 'csat',
        title: 'ตรวจสอบงานล่าสุด + อบรมทีม',
        action: 'review_low_csat_jobs',
        detail: 'ดูงานที่คะแนน ≤ 2 และทำ retrospective กับทีม',
        estimatedImpact: 'วันละ ' + (CSAT_THRESHOLD - metrics.csatAvg).toFixed(1) + ' คะแนน'
      });
    }

    if (metrics.csatResponseRate > 0 && metrics.csatResponseRate < CSAT_RESPONSE_MIN) {
      alerts.push({
        severity: 'medium',
        category: 'csat',
        title: 'อัตราการตอบกลับ CSAT ต่ำ',
        message: 'ลูกค้าตอบ ' + metrics.csatResponseRate + '% (เกณฑ์ ' + CSAT_RESPONSE_MIN + '%)',
        metric: metrics.csatResponseRate,
        threshold: CSAT_RESPONSE_MIN
      });
      recommendations.push({
        priority: 3,
        category: 'csat',
        title: 'ปรับข้อความแบบสอบถาม',
        action: 'improve_csat_wording',
        detail: 'ทดลองส่งผ่าน LINE พร้อม quick-reply buttons',
        estimatedImpact: '+15-25% อัตราการตอบกลับ'
      });
    }

    // ── 2. Workload Analysis ──
    if (metrics.jobsAssignedByAI > 0) {
      var activeTechs = Math.max(1, metrics.totalTechs || 3);
      var avgJobsPerTech = metrics.jobsAssignedByAI / activeTechs;
      
      if (avgJobsPerTech > MAX_JOBS_PER_TECH) {
        alerts.push({
          severity: 'high',
          category: 'workload',
          title: 'งานค้างเกินกำลัง',
          message: 'งานเฉลี่ยละ ' + avgJobsPerTech.toFixed(1) + ' งาน/ช่าง (เกิน ' + MAX_JOBS_PER_TECH + ')',
          metric: avgJobsPerTech,
          threshold: MAX_JOBS_PER_TECH
        });
        recommendations.push({
          priority: 1,
          category: 'workload',
          title: 'รับสมัครทีมเพิ่ม หรือ redistribute งาน',
          action: 'hire_or_redistribute',
          detail: 'ทีมมี ' + activeTechs + ' คน แต่ละคนมีงาน ' + avgJobsPerTech.toFixed(1) + ' งาน',
          estimatedImpact: 'ลด SLA breach 50%'
        });
      } else if (avgJobsPerTech < 2) {
        recommendations.push({
          priority: 4,
          category: 'workload',
          title: 'ทีมว่าง ควรหางานใหม่',
          action: 'sales_push',
          detail: 'ช่างแต่ละคนมีงานเฉลี่ย ' + avgJobsPerTech.toFixed(1) + ' งาน',
          estimatedImpact: '+20% โอกาสทำงาน'
        });
      }
    }

    // ── 3. Revenue Analysis ──
    if (metrics.revenueFromAI < REVENUE_TARGET && metrics.revenueFromAI >= 0) {
      var gap = REVENUE_TARGET - metrics.revenueFromAI;
      var gapPercent = Math.round((gap / REVENUE_TARGET) * 100);
      alerts.push({
        severity: gapPercent > 50 ? 'high' : 'medium',
        category: 'revenue',
        title: 'รายได้ต่ำกว่าเป้าหมาย',
        message: 'รายได้ ฿' + Number(metrics.revenueFromAI).toLocaleString() + ' (เป้าา ฿' + Number(REVENUE_TARGET).toLocaleString() + ') ขาด ' + gapPercent + '%',
        metric: metrics.revenueFromAI,
        threshold: REVENUE_TARGET
      });
      recommendations.push({
        priority: 2,
        category: 'revenue',
        title: 'เพิ่ม conversion rate / upsell',
        action: 'upsell_strategy',
        detail: 'ทดลอง upsell อุปกรณ์เสริม หลังงานเสร็จ',
        estimatedImpact: 'เพิ่ม ฿' + Number(gap * 0.3).toLocaleString() + ' ต่อเดือน'
      });
    }

    // ── 4. AI Adoption Analysis ──
    if (metrics.aiUsageCount < MIN_AI_USAGE) {
      alerts.push({
        severity: 'low',
        category: 'adoption',
        title: 'ทีมใช้ AI น้อย',
        message: 'ใช้ AI ' + metrics.aiUsageCount + ' ครั้ง (เกณฑ์ ' + MIN_AI_USAGE + ')',
        metric: metrics.aiUsageCount,
        threshold: MIN_AI_USAGE
      });
      recommendations.push({
        priority: 3,
        category: 'adoption',
        title: 'อบรมทีมให้ใช้ AI มากขึ้น',
        action: 'ai_training',
        detail: 'จัด workshop Smart Assign + AI Companion ให้ทีม',
        estimatedImpact: '+40% ประสิทธิภาพทำงาน'
      });
    }

    // ── 5. Assignment Efficiency ──
    if (metrics.avgAssignTime > 30) {
      recommendations.push({
        priority: 2,
        category: 'efficiency',
        title: 'ลดเวลามอบหมาย',
        action: 'optimize_assignment',
        detail: 'เวลาเฉลี่ย ' + metrics.avgAssignTime + ' นาที (เกิน 30 นาที) ใช้ Smart Assign V2 ช่วยได้',
        estimatedImpact: 'ลดเหลือ 50%'
      });
    }

    // ── 6. Predictions (Rule-based forecasting) ──
    if (metrics.aiUsageCount > 0) {
      // Trend: if usage increasing, predict growth
      var dailyAvg = metrics.aiUsageCount;
      predictions.nextWeekUsage = Math.round(dailyAvg * 7 * 1.1); // +10% growth assumption
      predictions.nextWeekRevenue = Math.round((metrics.revenueFromAI || 0) * 7 * 1.05);
    }
    if (metrics.csatAvg > 0) {
      predictions.csatTrend = metrics.csatAvg >= 4 ? 'upward' : (metrics.csatAvg >= 3 ? 'stable' : 'downward');
    }

    // Sort recommendations by priority
    recommendations.sort(function(a, b) { return a.priority - b.priority; });

    return _wrapSuccess_({
      period: period,
      metricsSnapshot: {
        csatAvg: metrics.csatAvg,
        jobsAssignedByAI: metrics.jobsAssignedByAI,
        revenueFromAI: metrics.revenueFromAI,
        aiUsageCount: metrics.aiUsageCount,
        avgAssignTime: metrics.avgAssignTime
      },
      alertCount: alerts.length,
      recommendationCount: recommendations.length,
      alerts: alerts,
      recommendations: recommendations,
      predictions: predictions,
      analyzedAt: Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss')
    });

  } catch (err) {
    return _wrapError_(err);
  }
}

/**
 * getBusinessAlerts_ — ดึง alerts ล่าสุด (ใช้ใน notification)
 * @returns {Object} v17 schema
 */
function getBusinessAlerts_(payload) {
  try {
    var analysis = analyzeBusiness_(payload || {});
    if (!analysis.success || !analysis.data) {
      return _wrapError_(analysis.error || 'analyzeBusiness failed');
    }
    var alerts = analysis.data.alerts || [];
    var highAlerts = alerts.filter(function(a) { return a.severity === 'high'; });
    
    return _wrapSuccess_({
      highAlertCount: highAlerts.length,
      totalAlerts: alerts.length,
      alerts: alerts,
      hasCritical: highAlerts.length > 0,
      summary: highAlerts.length > 0 
        ? 'พบ ' + highAlerts.length + ' ปัญหาวิกฤติ'
        : 'ไม่มีปัญหาวิกฤติ'
    });
  } catch (err) {
    return _wrapError_(err);
  }
}
