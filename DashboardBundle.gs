// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a — DashboardBundle.gs
// Phase 1: API Aggregation — getDashboardBundle()
// รวม dashboard + jobs + inventory + report ในการเรียกครั้งเดียว
// เพื่อลด Latency จาก >4000ms → <800ms
// ============================================================

var BUNDLE_CACHE_KEY = 'dashboard_bundle_v61';
var BUNDLE_CACHE_TTL = 90; // seconds — longer TTL for bundle

/**
 * getDashboardBundle — Aggregated API endpoint
 * รวม getDashboardData + checkJobs + inventoryOverview + getReportData
 * ในการ read Spreadsheet ครั้งเดียว (Single Sheet Open)
 */
function getDashboardBundle(params) {
  var start = Date.now();
  params = params || {};
  var forceRefresh = params.force_refresh === true || params.forceRefresh === true;

  // ── Try CacheService first ──
  if (!forceRefresh) {
    try {
      var cache = CacheService.getScriptCache();
      var cached = cache.get(BUNDLE_CACHE_KEY);
      if (cached) {
        var parsed = JSON.parse(cached);
        parsed._cached = true;
        parsed._elapsed_ms = Date.now() - start;
        parsed._source = 'cache';
        return parsed;
      }
    } catch(e) { /* cache miss */ }
  }

  // ── Single Spreadsheet Open ──
  var ss = null;
  try {
    ss = getComphoneSheet();
  } catch(e) {
    return { success: false, error: 'ไม่สามารถเปิด Spreadsheet: ' + e.message };
  }
  if (!ss) return { success: false, error: 'Spreadsheet not found' };

  // ── Read all sheets in one pass ──
  var sheetData = _bundleReadAllSheets_(ss);

  // ── Build each section from shared data ──
  var jobs      = _bundleBuildJobs_(sheetData);
  var inventory = _bundleBuildInventory_(sheetData);
  var summary   = _bundleBuildSummary_(sheetData, jobs, inventory);
  var alerts    = _bundleBuildAlerts_(sheetData, summary);
  var report    = _bundleBuildReport_(sheetData, jobs);
  var retailSales = _bundleBuildRetailSales_(sheetData);
  var statusDist = _bundleBuildStatusDist_(jobs);
  var health    = _bundleBuildHealth_(start, jobs, inventory, alerts);

  var elapsed = Date.now() - start;
  var result = {
    success: true,
    status: 'healthy',
    // Dashboard section
    jobs: jobs,
    inventory: inventory,
    summary: summary,
    status_distribution: statusDist,
    alerts: alerts,
    // Report section
    report: report,
    // Retail Sales section (POS)
    retail_sales: retailSales,
    // Health section
    health: health,
    // Meta
    _cached: false,
    _elapsed_ms: elapsed,
    _source: 'fresh',
    _rows: { jobs: jobs.length, inventory: inventory.length },
    _bundle_version: '6.1'
  };

  // ── Store in CacheService ──
  try {
    var cache2 = CacheService.getScriptCache();
    var serialized = JSON.stringify(result);
    // GAS cache limit is 100KB — truncate jobs if needed
    if (serialized.length > 90000) {
      result.jobs = result.jobs.slice(0, 50);
      result.summary.recentJobs = result.summary.recentJobs ? result.summary.recentJobs.slice(0, 20) : [];
      serialized = JSON.stringify(result);
    }
    cache2.put(BUNDLE_CACHE_KEY, serialized, BUNDLE_CACHE_TTL);
  } catch(e2) { /* cache store failed — ok */ }

  Logger.log('[getDashboardBundle] elapsed=' + elapsed + 'ms jobs=' + jobs.length + ' inv=' + inventory.length);
  return result;
}

/**
 * invalidateBundleCache — เคลียร์ cache เมื่อมีการแก้ไขข้อมูล
 */
function invalidateBundleCache() {
  try {
    var cache = CacheService.getScriptCache();
    cache.remove(BUNDLE_CACHE_KEY);
    cache.remove('dashboard_data_v557'); // invalidate old cache too
    return { success: true, message: 'Bundle cache cleared' };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// ============================================================
// PRIVATE: Read all sheets once
// ============================================================
function _bundleReadAllSheets_(ss) {
  var data = {};
  var sheetNames = ['DBJOBS', 'DBINVENTORY', 'DBBILLING', 'DBCUSTOMER', 'DBATTENDANCE', 'DBRETAILSALES'];
  sheetNames.forEach(function(name) {
    try {
      var sh = findSheetByName(ss, name);
      if (sh && sh.getLastRow() > 1) {
        var lastRow = sh.getLastRow();
        var lastCol = sh.getLastColumn();
        data[name] = {
          headers: sh.getRange(1, 1, 1, lastCol).getValues()[0],
          rows: sh.getRange(2, 1, lastRow - 1, lastCol).getValues(),
          lastRow: lastRow
        };
      } else {
        data[name] = { headers: [], rows: [], lastRow: 1 };
      }
    } catch(e) {
      data[name] = { headers: [], rows: [], lastRow: 1 };
    }
  });
  return data;
}

// ============================================================
// PRIVATE: Build Jobs from shared data
// ============================================================
function _bundleBuildJobs_(sheetData) {
  try {
    var d = sheetData['DBJOBS'];
    if (!d || !d.rows.length) return [];
    var headers = d.headers;
    var rows = d.rows;
    var jobs = [];
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!r[0]) continue; // skip empty rows
      var job = {};
      headers.forEach(function(h, idx) {
        if (h) job[String(h).toLowerCase().replace(/\s+/g, '_')] = r[idx] !== undefined ? r[idx] : '';
      });
      // Normalize key fields
      job.job_id = String(r[0] || '').trim();
      job.status = String(job.status || job['สถานะ'] || '').trim();
      job.customer_name = String(job.customer_name || job['ชื่อลูกค้า'] || job['customer'] || '').trim();
      job.device = String(job.device || job['อุปกรณ์'] || '').trim();
      job.technician = String(job.technician || job['ช่าง'] || '').trim();
      job.created_at = r[1] || '';
      job.updated_at = job.updated_at || job['เวลาอัปเดต'] || '';
      // Overdue check
      var dueDate = job.due_date || job['วันครบกำหนด'] || '';
      if (dueDate) {
        try {
          var due = new Date(dueDate);
          job.is_overdue = due < today && !['เสร็จแล้ว', 'ส่งคืนแล้ว', 'ยกเลิก'].includes(job.status);
        } catch(e) { job.is_overdue = false; }
      }
      jobs.push(job);
    }
    return jobs;
  } catch(e) {
    Logger.log('[_bundleBuildJobs_] error: ' + e.message);
    return [];
  }
}

// ============================================================
// PRIVATE: Build Inventory from shared data
// ============================================================
function _bundleBuildInventory_(sheetData) {
  try {
    var d = sheetData['DBINVENTORY'];
    if (!d || !d.rows.length) return [];
    var headers = d.headers;
    var rows = d.rows;
    var items = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!r[0]) continue;
      var item = {};
      headers.forEach(function(h, idx) {
        if (h) item[String(h).toLowerCase().replace(/\s+/g, '_')] = r[idx] !== undefined ? r[idx] : '';
      });
      item.item_code = String(r[0] || '').trim();
      item.name = String(item.name || item['ชื่อสินค้า'] || item['item_name'] || '').trim();
      item.qty = Number(item.qty || item['จำนวน'] || item['quantity'] || 0);
      item.min_qty = Number(item.min_qty || item['จำนวนขั้นต่ำ'] || item['minimum'] || 5);
      item.price = Number(item.price || item['ราคา'] || 0);
      item.low_stock = item.qty <= item.min_qty;
      items.push(item);
    }
    return items;
  } catch(e) {
    Logger.log('[_bundleBuildInventory_] error: ' + e.message);
    return [];
  }
}

// ============================================================
// PRIVATE: Build Summary from shared data
// ============================================================
function _bundleBuildSummary_(sheetData, jobs, inventory) {
  try {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var activeStatuses = ['รับงาน', 'กำลังซ่อม', 'รอชิ้นส่วน', 'รอลูกค้า', 'รอตรวจสอบ'];
    var doneStatuses = ['เสร็จแล้ว', 'ส่งคืนแล้ว'];

    var totalJobs = jobs.length;
    var activeJobs = jobs.filter(function(j) { return activeStatuses.includes(j.status); }).length;
    var doneToday = jobs.filter(function(j) {
      if (!doneStatuses.includes(j.status)) return false;
      try {
        var d = new Date(j.updated_at || j.created_at || '');
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      } catch(e) { return false; }
    }).length;
    var overdueJobs = jobs.filter(function(j) { return j.is_overdue; }).length;
    var lowStock = inventory.filter(function(i) { return i.low_stock; }).length;

    // Revenue from billing
    var revenue = _bundleCalcRevenue_(sheetData);

    return {
      totalJobs: totalJobs,
      total_jobs: totalJobs,
      activeJobs: activeJobs,
      active_jobs: activeJobs,
      doneToday: doneToday,
      done_today: doneToday,
      overdueJobs: overdueJobs,
      overdue_jobs: overdueJobs,
      lowStock: lowStock,
      low_stock: lowStock,
      revenue: revenue,
      recentJobs: jobs.slice(0, 24)
    };
  } catch(e) {
    Logger.log('[_bundleBuildSummary_] error: ' + e.message);
    return { totalJobs: jobs.length, lowStock: 0, overdueJobs: 0, revenue: { today: 0, week: 0, month: 0 } };
  }
}

// ============================================================
// PRIVATE: Calculate Revenue from Billing sheet
// ============================================================
function _bundleCalcRevenue_(sheetData) {
  try {
    var d = sheetData['DBBILLING'];
    if (!d || !d.rows.length) return { today: 0, week: 0, month: 0 };
    var headers = d.headers;
    var rows = d.rows;
    var amountIdx = -1;
    var dateIdx = -1;
    var statusIdx = -1;
    headers.forEach(function(h, i) {
      var hLow = String(h).toLowerCase();
      if (hLow.includes('amount') || hLow.includes('ยอด') || hLow.includes('total')) amountIdx = i;
      if (hLow.includes('date') || hLow.includes('วันที่')) dateIdx = i;
      if (hLow.includes('status') || hLow.includes('สถานะ')) statusIdx = i;
    });
    if (amountIdx === -1) return { today: 0, week: 0, month: 0 };
    var now = new Date();
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var weekStart = new Date(todayStart.getTime() - 7 * 86400000);
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    var rev = { today: 0, week: 0, month: 0 };
    rows.forEach(function(r) {
      if (statusIdx >= 0) {
        var st = String(r[statusIdx] || '').toLowerCase();
        if (st === 'cancelled' || st === 'ยกเลิก') return;
      }
      var amount = Number(r[amountIdx] || 0);
      if (!amount) return;
      var rowDate = null;
      if (dateIdx >= 0 && r[dateIdx]) {
        try { rowDate = new Date(r[dateIdx]); } catch(e) {}
      }
      if (!rowDate || isNaN(rowDate.getTime())) return;
      if (rowDate >= todayStart) rev.today += amount;
      if (rowDate >= weekStart) rev.week += amount;
      if (rowDate >= monthStart) rev.month += amount;
    });
    return rev;
  } catch(e) {
    return { today: 0, week: 0, month: 0 };
  }
}

// ============================================================
// PRIVATE: Build Alerts
// ============================================================
function _bundleBuildAlerts_(sheetData, summary) {
  var alerts = [];
  if (summary.overdueJobs > 0) {
    alerts.push({ type: 'warning', message: 'มีงานเกินกำหนด ' + summary.overdueJobs + ' งาน', action: 'checkJobs' });
  }
  if (summary.lowStock > 0) {
    alerts.push({ type: 'warning', message: 'สินค้าใกล้หมด ' + summary.lowStock + ' รายการ', action: 'inventoryOverview' });
  }
  if (summary.activeJobs > 20) {
    alerts.push({ type: 'info', message: 'งานในคิวสูง: ' + summary.activeJobs + ' งาน', action: 'checkJobs' });
  }
  return alerts;
}

// ============================================================
// PRIVATE: Build Report summary
// ============================================================
function _bundleBuildReport_(sheetData, jobs) {
  try {
    var now = new Date();
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    var doneStatuses = ['เสร็จแล้ว', 'ส่งคืนแล้ว'];
    var jobsThisMonth = jobs.filter(function(j) {
      try {
        var d = new Date(j.created_at || '');
        return d >= monthStart;
      } catch(e) { return false; }
    });
    var completedThisMonth = jobsThisMonth.filter(function(j) { return doneStatuses.includes(j.status); });
    var revenue = _bundleCalcRevenue_(sheetData);
    return {
      period: 'month',
      total_jobs: jobsThisMonth.length,
      completed_jobs: completedThisMonth.length,
      completion_rate: jobsThisMonth.length > 0
        ? Math.round(completedThisMonth.length / jobsThisMonth.length * 100) : 0,
      revenue: revenue,
      generated_at: now.toISOString()
    };
  } catch(e) {
    return { period: 'month', total_jobs: 0, completed_jobs: 0, completion_rate: 0, revenue: { today: 0, week: 0, month: 0 } };
  }
}

// ============================================================
// PRIVATE: Build Retail Sales from shared data
// Aggregate by product category (CCTV, Computer, IT Devices, etc.)
// ============================================================
function _bundleBuildRetailSales_(sheetData) {
  try {
    var d = sheetData['DBRETAILSALES'];
    if (!d || !d.rows || d.rows.length === 0) {
      return { success: true, total_sales: 0, categories: [], items: [] };
    }
    
    var headers = d.headers;
    var rows = d.rows;
    
    // Dynamic header mapping
    var colMap = { sale_id: 0, created_at: 1, items_json: 3, total: 7 };
    for (var hi = 0; hi < headers.length; hi++) {
      var h = String(headers[hi]).toLowerCase().replace(/_/g,'');
      if (h === 'saleid' || h === 'sale_id') colMap.sale_id = hi;
      else if (h === 'createdat' || h === 'created_at') colMap.created_at = hi;
      else if (h === 'itemsjson' || h === 'items_json') colMap.items_json = hi;
      else if (h === 'total') colMap.total = hi;
    }
    
    // Aggregate by category
    var categoryMap = {};
    var now = new Date();
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    var totalSales = 0;
    var todaySales = 0;
    var monthSales = 0;
    
    rows.forEach(function(row) {
      try {
        var itemsJson = String(row[colMap.items_json] || '');
        if (!itemsJson) return;
        
        var items = JSON.parse(itemsJson);
        if (!Array.isArray(items)) return;
        
        var saleDate = new Date(row[colMap.created_at] || '');
        var isToday = saleDate >= todayStart;
        var isThisMonth = saleDate >= thisMonthStart;
        
        items.forEach(function(item) {
          var name = String(item.name || item.item_name || '');
          var price = Number(item.price || 0);
          var qty = Number(item.qty || 1);
          var amount = price * qty;
          
          totalSales += amount;
          if (isToday) todaySales += amount;
          if (isThisMonth) monthSales += amount;
          
          // Categorize by product name
          var category = 'อื่นๆ';
          var nameUpper = name.toUpperCase();
          if (nameUpper.indexOf('CAMERA') > -1 || nameUpper.indexOf('กล้อง') > -1) category = 'CCTV';
          else if (nameUpper.indexOf('SERVER') > -1) category = 'Server';
          else if (nameUpper.indexOf('DESKTOP') > -1 || nameUpper.indexOf('คอมพิวเตอร์') > -1) category = 'Desktop';
          else if (nameUpper.indexOf('LAPTOP') > -1 || nameUpper.indexOf('โน็ตบุ๊ค') > -1) category = 'Laptop';
          else if (nameUpper.indexOf('ALL_IN_ONE') > -1 || nameUpper.indexOf('AIO') > -1) category = 'All-in-One';
          else if (nameUpper.indexOf('BATTERY') > -1 || nameUpper.indexOf('แบตเตอรี่') > -1) category = 'Battery';
          else if (nameUpper.indexOf('CHARGER') > -1 || nameUpper.indexOf('ชาร์จ') > -1) category = 'Charger';
          else if (nameUpper.indexOf('CABLE') > -1 || nameUpper.indexOf('สาย') > -1) category = 'Cable';
          
          if (!categoryMap[category]) {
            categoryMap[category] = { name: category, total_amount: 0, item_count: 0 };
          }
          categoryMap[category].total_amount += amount;
          categoryMap[category].item_count += qty;
        });
      } catch(e) {}
    });
    
    var categories = Object.values(categoryMap).sort(function(a, b) {
      return b.total_amount - a.total_amount;
    });
    
    return {
      success: true,
      total_sales: totalSales,
      today_sales: todaySales,
      month_sales: monthSales,
      categories: categories,
      total_transactions: rows.length
    };
  } catch(e) {
    return { success: false, error: e.message, categories: [], total_sales: 0 };
  }
}

// ============================================================
// PRIVATE: Build Status Distribution
// ============================================================
function _bundleBuildStatusDist_(jobs) {
  var dist = {};
  jobs.forEach(function(j) {
    var s = j.status || 'ไม่ระบุ';
    dist[s] = (dist[s] || 0) + 1;
  });
  return dist;
}

// ============================================================
// PRIVATE: Build Health Status
// ============================================================
function _bundleBuildHealth_(start, jobs, inventory, alerts) {
  var elapsed = Date.now() - start;
  var criticalAlerts = alerts.filter(function(a) { return a.type === 'critical'; }).length;
  var score = 100;
  if (elapsed > 2000) score -= 20;
  else if (elapsed > 1000) score -= 10;
  if (criticalAlerts > 0) score -= criticalAlerts * 15;
  score = Math.max(0, Math.min(100, score));
  return {
    status: score >= 80 ? 'healthy' : score >= 60 ? 'degraded' : 'critical',
    score: score,
    latency_ms: elapsed,
    jobs_count: jobs.length,
    inventory_count: inventory.length,
    alerts_count: alerts.length,
    critical_alerts: criticalAlerts,
    checked_at: new Date().toISOString()
  };
}
