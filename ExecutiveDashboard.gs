// COMPHONE SUPER APP v5.9.0-phase31a
// ============================================================
// ExecutiveDashboard.gs
// ============================================================

/**
 * ExecutiveDashboard.gs — COMPHONE V5.5.8
 * KPI Dashboard สำหรับผู้บริหาร
 * ดึงข้อมูลจากทุก module แล้วรวมเป็น response เดียว
 */

// ============================================================
// getExecutiveDashboard() — Main API
// ============================================================
function getExecutiveDashboard(params) {
  var start = Date.now();
  params = params || {};
  var forceRefresh = params._nocache || params.force;

  // ── CacheService: cache 60 วินาที ──
  var CACHE_KEY = 'exec_dashboard_v558';
  if (!forceRefresh) {
    try {
      var cache = CacheService.getScriptCache();
      var cached = cache.get(CACHE_KEY);
      if (cached) {
        var parsed = JSON.parse(cached);
        parsed._cached = true;
        parsed._elapsed_ms = Date.now() - start;
        return parsed;
      }
    } catch(e) { /* cache miss */ }
  }

  // ── Fetch all data ──
  var revenue    = _getExecRevenue_();
  var operations = _getExecOperations_();
  var inventory  = _getExecInventory_();
  var customers  = _getExecCustomers_();
  var system     = _getExecSystem_();
  var alerts     = _getExecAlerts_(revenue, operations, inventory, system);
  var trends     = _getExecTrends_();
  var comparison = _getExecComparison_(revenue, operations);
  var targets    = _getExecTargets_(revenue, operations);
  var forecast   = _getExecForecast_(trends);

  var result = {
    success: true,
    generated_at: new Date().toISOString(),
    revenue: revenue,
    operations: operations,
    inventory: inventory,
    customers: customers,
    system: system,
    alerts: alerts,
    trends: trends,
    comparison: comparison,
    targets: targets,
    forecast: forecast,
    _cached: false,
    _elapsed_ms: Date.now() - start
  };

  // ── Store in cache ──
  try {
    var cache2 = CacheService.getScriptCache();
    cache2.put(CACHE_KEY, JSON.stringify(result), 60);
  } catch(e) { /* ok */ }

  Logger.log('[getExecutiveDashboard] elapsed=' + result._elapsed_ms + 'ms');
  return result;
}

// ============================================================
// Revenue Section
// ============================================================
function _getExecRevenue_() {
  try {
    var today   = getRevenueReport('today');
    var week    = getRevenueReport('week');
    var month   = getRevenueReport('month');

    // Revenue trend (last 7 days)
    var trend = [];
    var now = new Date();
    for (var d = 6; d >= 0; d--) {
      var dt = new Date(now.getTime() - d * 86400000);
      var label = Utilities.formatDate(dt, 'Asia/Bangkok', 'dd/MM');
      var dayRev = 0;
      try {
        var dayData = getRevenueReport('today'); // simplified — use today for all
        dayRev = d === 0 ? (today.paid_revenue || 0) : 0; // placeholder
      } catch(e) {}
      trend.push({ label: label, value: dayRev });
    }
    // Use real today value for last point
    if (trend.length > 0) trend[trend.length - 1].value = today.paid_revenue || 0;

    return {
      today_revenue:   Math.round((today.paid_revenue   || 0) * 100) / 100,
      today_total:     Math.round((today.total_revenue  || 0) * 100) / 100,
      today_unpaid:    Math.round((today.unpaid_revenue || 0) * 100) / 100,
      today_bills:     today.bill_count  || 0,
      week_revenue:    Math.round((week.paid_revenue    || 0) * 100) / 100,
      month_revenue:   Math.round((month.paid_revenue   || 0) * 100) / 100,
      month_total:     Math.round((month.total_revenue  || 0) * 100) / 100,
      collection_rate: today.total_revenue > 0
        ? Math.round((today.paid_revenue / today.total_revenue) * 100)
        : 0,
      trend: trend
    };
  } catch(e) {
    return { error: e.message, today_revenue: 0, week_revenue: 0, month_revenue: 0, trend: [] };
  }
}

// ============================================================
// Operations Section
// ============================================================
function _getExecOperations_() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh || sh.getLastRow() < 2) {
      return { total_jobs: 0, today_jobs: 0, pending: 0, in_progress: 0, done_today: 0, sla_pct: 100, overdue: 0, jobs_by_status: [] };
    }

    var rows = sh.getDataRange().getValues();
    var headers = rows[0];
    var iStatus   = findHeaderIndex_(headers, ['Status', 'status', 'สถานะ']);
    var iCreated  = findHeaderIndex_(headers, ['Created_At', 'created_at', 'วันที่รับ']);
    var iDue      = findHeaderIndex_(headers, ['Due_Date', 'due_date', 'กำหนดส่ง']);
    var iPriority = findHeaderIndex_(headers, ['Priority', 'priority', 'ความสำคัญ']);

    var now = new Date();
    var todayStr = Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM-dd');

    var total = 0, todayJobs = 0, pending = 0, inProgress = 0, doneToday = 0, overdue = 0;
    var statusMap = {};

    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row[0]) continue;
      total++;

      var status = String(iStatus > -1 ? row[iStatus] || '' : '').toUpperCase();
      statusMap[status] = (statusMap[status] || 0) + 1;

      // Today jobs
      if (iCreated > -1) {
        var created = row[iCreated];
        if (created instanceof Date) {
          var createdStr = Utilities.formatDate(created, 'Asia/Bangkok', 'yyyy-MM-dd');
          if (createdStr === todayStr) todayJobs++;
        }
      }

      // Status counts
      if (['1','RECEIVED','รับงาน'].indexOf(status) > -1 || status === '1') pending++;
      if (['3','4','5','IN_PROGRESS','กำลังซ่อม','รอชิ้นส่วน'].indexOf(status) > -1) inProgress++;
      if (['8','9','DONE','DELIVERED','ส่งมอบแล้ว','เสร็จแล้ว'].indexOf(status) > -1) {
        // Check if done today
        if (iCreated > -1) {
          var cr = row[iCreated];
          if (cr instanceof Date) {
            var crStr = Utilities.formatDate(cr, 'Asia/Bangkok', 'yyyy-MM-dd');
            if (crStr === todayStr) doneToday++;
          }
        }
      }

      // Overdue
      if (iDue > -1) {
        var due = row[iDue];
        if (due instanceof Date && due < now && !['8','9','DONE','DELIVERED','10','11','12'].some(s => status.includes(s))) {
          overdue++;
        }
      }
    }

    // SLA %
    var active = total - (statusMap['8'] || 0) - (statusMap['9'] || 0) - (statusMap['10'] || 0);
    var sla_pct = active > 0 ? Math.max(0, Math.round(((active - overdue) / active) * 100)) : 100;

    // Jobs by status array
    var jobsByStatus = Object.keys(statusMap).slice(0, 8).map(function(s) {
      return { status: s, count: statusMap[s] };
    });

    return {
      total_jobs:    total,
      today_jobs:    todayJobs,
      pending:       pending,
      in_progress:   inProgress,
      done_today:    doneToday,
      overdue:       overdue,
      sla_pct:       sla_pct,
      jobs_by_status: jobsByStatus
    };
  } catch(e) {
    return { error: e.message, total_jobs: 0, today_jobs: 0, sla_pct: 100, jobs_by_status: [] };
  }
}

// ============================================================
// Inventory Section
// ============================================================
function _getExecInventory_() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBINVENTORY') || findSheetByName(ss, 'DB_INVENTORY');
    if (!sh || sh.getLastRow() < 2) {
      return { total_items: 0, low_stock_count: 0, out_of_stock: 0, total_value: 0, low_stock_items: [] };
    }

    var rows = sh.getDataRange().getValues();
    var headers = rows[0];
    var iName    = findHeaderIndex_(headers, ['item_name', 'Item_Name', 'ชื่อสินค้า', 'name']);
    var iQty     = findHeaderIndex_(headers, ['qty', 'quantity', 'จำนวน', 'Qty']);
    var iMinQty  = findHeaderIndex_(headers, ['min_qty', 'reorder_point', 'Min_Qty']);
    var iPrice   = findHeaderIndex_(headers, ['price', 'unit_price', 'Price', 'ราคา']);

    var total = 0, lowStock = 0, outOfStock = 0, totalValue = 0;
    var lowStockItems = [];

    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      if (!row[0]) continue;
      total++;
      var qty    = Number(iQty   > -1 ? row[iQty]   || 0 : 0);
      var minQty = Number(iMinQty > -1 ? row[iMinQty] || 5 : 5);
      var price  = Number(iPrice  > -1 ? row[iPrice]  || 0 : 0);
      totalValue += qty * price;

      if (qty === 0) outOfStock++;
      else if (qty <= minQty) {
        lowStock++;
        if (lowStockItems.length < 5) {
          lowStockItems.push({
            name: String(iName > -1 ? row[iName] || '' : ''),
            qty: qty,
            min_qty: minQty
          });
        }
      }
    }

    return {
      total_items:    total,
      low_stock_count: lowStock,
      out_of_stock:   outOfStock,
      total_value:    Math.round(totalValue * 100) / 100,
      low_stock_items: lowStockItems
    };
  } catch(e) {
    return { error: e.message, total_items: 0, low_stock_count: 0, total_value: 0, low_stock_items: [] };
  }
}

// ============================================================
// Customers Section
// ============================================================
function _getExecCustomers_() {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBCUSTOMERS') || findSheetByName(ss, 'DB_CUSTOMERS');
    var totalCustomers = 0;
    if (sh && sh.getLastRow() > 1) {
      totalCustomers = sh.getLastRow() - 1;
    }

    // CRM metrics
    var crm = getCRMMetrics_();

    return {
      total_customers:   totalCustomers,
      followup_today:    crm.today || 0,
      overdue_followup:  crm.overdue_yesterday || 0,
      done_this_week:    crm.done_this_week || 0,
      overdue_7days:     (crm.overdue_7days || []).length
    };
  } catch(e) {
    return { error: e.message, total_customers: 0, followup_today: 0 };
  }
}

// ============================================================
// System Section
// ============================================================
function _getExecSystem_() {
  try {
    var metrics = getSystemMetrics ? getSystemMetrics() : {};
    var health = healthCheck ? healthCheck() : {};
    return {
      version:       metrics.version || '5.5.8',
      health_status: health.status || 'unknown',
      trigger_count: (metrics.triggers || []).length,
      response_ms:   metrics.response_ms || 0,
      health_score:  health.score || 0,
      last_check:    new Date().toISOString()
    };
  } catch(e) {
    return { version: '5.5.8', health_status: 'unknown', trigger_count: 0, health_score: 0 };
  }
}

// ============================================================
// Alerts Section
// ============================================================
function _getExecAlerts_(revenue, operations, inventory, system) {
  var alerts = [];
  // SLA alert
  if (operations.sla_pct < 80) {
    alerts.push({ type: 'critical', category: 'operations', message: 'SLA ต่ำมาก: ' + operations.sla_pct + '%', value: operations.sla_pct });
  } else if (operations.sla_pct < 90) {
    alerts.push({ type: 'warning', category: 'operations', message: 'SLA ต่ำกว่าเป้า: ' + operations.sla_pct + '%', value: operations.sla_pct });
  }
  // Overdue jobs
  if (operations.overdue > 5) {
    alerts.push({ type: 'critical', category: 'operations', message: 'งานเกินกำหนด: ' + operations.overdue + ' รายการ', value: operations.overdue });
  } else if (operations.overdue > 0) {
    alerts.push({ type: 'warning', category: 'operations', message: 'งานเกินกำหนด: ' + operations.overdue + ' รายการ', value: operations.overdue });
  }
  // Low stock
  if (inventory.out_of_stock > 0) {
    alerts.push({ type: 'critical', category: 'inventory', message: 'สินค้าหมด: ' + inventory.out_of_stock + ' รายการ', value: inventory.out_of_stock });
  }
  if (inventory.low_stock_count > 3) {
    alerts.push({ type: 'warning', category: 'inventory', message: 'สินค้าใกล้หมด: ' + inventory.low_stock_count + ' รายการ', value: inventory.low_stock_count });
  }
  // Health score
  if (system.health_score > 0 && system.health_score < 80) {
    alerts.push({ type: 'critical', category: 'system', message: 'System Health ต่ำ: ' + system.health_score + '%', value: system.health_score });
  }
  // Unpaid revenue
  if (revenue.today_unpaid > 10000) {
    alerts.push({ type: 'warning', category: 'revenue', message: 'ยอดค้างชำระวันนี้: ฿' + revenue.today_unpaid.toLocaleString(), value: revenue.today_unpaid });
  }
  return alerts;
}

// ============================================================
// Comparison Section — vs yesterday / last week / last month
// ============================================================
function _getExecComparison_(revenue, operations) {
  try {
    // Revenue comparison
    var yesterday = 0, lastWeekRev = 0, lastMonthRev = 0;
    try {
      var yd = getRevenueReport('yesterday');
      yesterday = yd ? (yd.paid_revenue || 0) : 0;
    } catch(e) {}
    try {
      var lw = getRevenueReport('last_week');
      lastWeekRev = lw ? (lw.paid_revenue || 0) : 0;
    } catch(e) {}
    try {
      var lm = getRevenueReport('last_month');
      lastMonthRev = lm ? (lm.paid_revenue || 0) : 0;
    } catch(e) {}

    var todayRev = revenue.today_revenue || 0;
    var weekRev  = revenue.week_revenue  || 0;
    var monthRev = revenue.month_revenue || 0;

    function pctChange(current, previous) {
      if (!previous || previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    }

    // Jobs comparison — use trend data
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    var todayJobs = operations.today_jobs || 0;
    var yesterdayJobs = 0;
    try {
      if (sh && sh.getLastRow() > 1) {
        var rows = sh.getDataRange().getValues();
        var headers = rows[0];
        var iCreated = findHeaderIndex_(headers, ['Created_At', 'created_at', 'วันที่รับ']);
        var now = new Date();
        var ydStr = Utilities.formatDate(new Date(now.getTime() - 86400000), 'Asia/Bangkok', 'yyyy-MM-dd');
        if (iCreated > -1) {
          for (var i = 1; i < rows.length; i++) {
            var cr = rows[i][iCreated];
            if (cr instanceof Date) {
              var crStr = Utilities.formatDate(cr, 'Asia/Bangkok', 'yyyy-MM-dd');
              if (crStr === ydStr) yesterdayJobs++;
            }
          }
        }
      }
    } catch(e) {}

    return {
      revenue_vs_yesterday:  { value: pctChange(todayRev, yesterday),  direction: todayRev >= yesterday ? 'up' : 'down' },
      revenue_vs_last_week:  { value: pctChange(weekRev, lastWeekRev), direction: weekRev >= lastWeekRev ? 'up' : 'down' },
      revenue_vs_last_month: { value: pctChange(monthRev, lastMonthRev), direction: monthRev >= lastMonthRev ? 'up' : 'down' },
      jobs_vs_yesterday:     { value: pctChange(todayJobs, yesterdayJobs), direction: todayJobs >= yesterdayJobs ? 'up' : 'down' },
      yesterday_revenue:     yesterday,
      yesterday_jobs:        yesterdayJobs
    };
  } catch(e) {
    return { revenue_vs_yesterday: { value: 0, direction: 'flat' }, jobs_vs_yesterday: { value: 0, direction: 'flat' } };
  }
}

// ============================================================
// Targets Section — monthly targets
// ============================================================
function _getExecTargets_(revenue, operations) {
  // Default targets — สามารถ override ได้จาก Config sheet
  var targets = {
    monthly_revenue: 500000,
    monthly_jobs:    200,
    sla_pct:         90,
    health_score:    95
  };
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'CONFIG') || findSheetByName(ss, 'DBCONFIG');
    if (sh) {
      var rows = sh.getDataRange().getValues();
      for (var i = 0; i < rows.length; i++) {
        var key = String(rows[i][0] || '').toLowerCase();
        var val = Number(rows[i][1] || 0);
        if (key === 'target_monthly_revenue' && val > 0) targets.monthly_revenue = val;
        if (key === 'target_monthly_jobs'    && val > 0) targets.monthly_jobs    = val;
        if (key === 'target_sla_pct'         && val > 0) targets.sla_pct         = val;
        if (key === 'target_health_score'    && val > 0) targets.health_score    = val;
      }
    }
  } catch(e) {}

  var monthRev  = revenue.month_revenue  || 0;
  var monthJobs = operations.total_jobs  || 0;
  var sla       = operations.sla_pct     || 100;

  function progress(current, target) {
    return target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  }

  return {
    monthly_revenue: { target: targets.monthly_revenue, current: monthRev,  progress: progress(monthRev, targets.monthly_revenue) },
    monthly_jobs:    { target: targets.monthly_jobs,    current: monthJobs, progress: progress(monthJobs, targets.monthly_jobs) },
    sla_pct:         { target: targets.sla_pct,         current: sla,       progress: progress(sla, targets.sla_pct) }
  };
}

// ============================================================
// Forecast Section — simple linear regression on 7-day trend
// ============================================================
function _getExecForecast_(trends) {
  try {
    var revData  = trends.revenue || [];
    var jobData  = trends.jobs    || [];
    var labels   = trends.labels  || [];

    function linearForecast(data, steps) {
      var n = data.length;
      if (n < 2) return data.concat(Array(steps).fill(0));
      var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (var i = 0; i < n; i++) {
        sumX  += i;
        sumY  += data[i];
        sumXY += i * data[i];
        sumX2 += i * i;
      }
      var slope     = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      var intercept = (sumY - slope * sumX) / n;
      var result = data.slice();
      for (var s = 0; s < steps; s++) {
        var pred = Math.max(0, Math.round(slope * (n + s) + intercept));
        result.push(pred);
      }
      return result;
    }

    var FORECAST_DAYS = 3;
    var now = new Date();
    var forecastLabels = labels.slice();
    for (var d = 1; d <= FORECAST_DAYS; d++) {
      var dt = new Date(now.getTime() + d * 86400000);
      forecastLabels.push(Utilities.formatDate(dt, 'Asia/Bangkok', 'dd/MM') + '*');
    }

    var revForecast  = linearForecast(revData,  FORECAST_DAYS);
    var jobForecast  = linearForecast(jobData,  FORECAST_DAYS);

    // Monthly forecast
    var avgDailyRev  = revData.reduce(function(a,b){ return a+b; }, 0) / Math.max(1, revData.filter(function(v){ return v>0; }).length);
    var daysLeft     = 30 - (new Date().getDate());
    var monthForecast = Math.round(avgDailyRev * daysLeft);

    return {
      labels:           forecastLabels,
      revenue:          revForecast,
      jobs:             jobForecast,
      month_revenue_forecast: monthForecast,
      forecast_days:    FORECAST_DAYS
    };
  } catch(e) {
    return { labels: [], revenue: [], jobs: [], month_revenue_forecast: 0, forecast_days: 3 };
  }
}

// ============================================================
// Trends Section (simplified 7-day)
// ============================================================
function _getExecTrends_() {
  try {
    var now = new Date();
    var labels = [];
    for (var d = 6; d >= 0; d--) {
      var dt = new Date(now.getTime() - d * 86400000);
      labels.push(Utilities.formatDate(dt, 'Asia/Bangkok', 'dd/MM'));
    }
    // Revenue trend — try to get real data
    var revTrend = labels.map(function(l) { return 0; });
    try {
      var monthData = getRevenueReport('month');
      if (monthData && monthData.items) {
        monthData.items.forEach(function(item) {
          if (!item.date) return;
          var itemDate = new Date(item.date);
          var itemLabel = Utilities.formatDate(itemDate, 'Asia/Bangkok', 'dd/MM');
          var idx = labels.indexOf(itemLabel);
          if (idx > -1) revTrend[idx] += (item.amount_paid || item.total_amount || 0);
        });
      }
    } catch(e) {}

    // Jobs trend — count by created date
    var jobTrend = labels.map(function(l) { return 0; });
    try {
      var ss = getComphoneSheet();
      var sh = findSheetByName(ss, 'DBJOBS');
      if (sh && sh.getLastRow() > 1) {
        var rows = sh.getDataRange().getValues();
        var headers = rows[0];
        var iCreated = findHeaderIndex_(headers, ['Created_At', 'created_at', 'วันที่รับ']);
        if (iCreated > -1) {
          for (var i = 1; i < rows.length; i++) {
            var cr = rows[i][iCreated];
            if (cr instanceof Date) {
              var crLabel = Utilities.formatDate(cr, 'Asia/Bangkok', 'dd/MM');
              var idx2 = labels.indexOf(crLabel);
              if (idx2 > -1) jobTrend[idx2]++;
            }
          }
        }
      }
    } catch(e) {}

    return {
      labels: labels,
      revenue: revTrend,
      jobs: jobTrend
    };
  } catch(e) {
    return { labels: [], revenue: [], jobs: [] };
  }
}
