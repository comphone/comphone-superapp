// ============================================================
// COMPHONE SUPER APP v5.9.0-phase31a
// AnalyticsIndex.gs — Data Indexing Layer for Performance
// Phase 31: Reduce full-sheet scans for Dashboard/Analytics queries
// Target: response time <2 seconds for frequent queries
// ============================================================

var ANALYTICS_INDEX_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

// ─── INDEX BUILDERS ────────────────────────────────────────

/**
 * getJobsIndex — Build in-memory index of all jobs keyed by status + tech + date
 * Dramatically reduces scan time for Dashboard, Analytics, and filter queries
 */
function getJobsIndex(forceRefresh) {
  var cacheKey = 'ANALYTICS_JOBS_INDEX';
  var cached = _idxGetCached_(cacheKey);
  if (cached && !forceRefresh) return cached;

  try {
    var ss = getComphoneSheet();
    var jobSheet = findSheetByName(ss, 'DBJOBS');
    if (!jobSheet) return { success: false, error: 'DBJOBS not found' };

    var all = jobSheet.getDataRange().getValues();
    if (all.length < 2) return { success: true, total: 0, index: {} };

    var headers = all[0];
    var idx = _idxMapHeaders_(headers);

    var index = {
      byStatus: {},
      byTech: {},
      byDate: {},
      byCustomer: {},
      techList: [],
      statusList: [],
      totalJobs: 0,
      totalRevenue: 0,
      activeJobs: 0,
      completedToday: 0,
      builtAt: new Date().toISOString()
    };

    var today = new Date();
    var todayKey = Utilities.formatDate(today, 'Asia/Bangkok', 'yyyy-MM-dd');

    for (var i = 1; i < all.length; i++) {
      var row = all[i];
      var jobId = safeCellValue_(row, idx.jobId);
      if (!jobId) continue;

      var status = safeCellValue_(row, idx.status) || 'unknown';
      var tech = safeCellValue_(row, idx.tech) || 'UNASSIGNED';
      var customer = safeCellValue_(row, idx.customer) || '';
      var created = parseFlexibleDate_(safeCellRaw_(row, idx.created));
      var dateKey = created ? Utilities.formatDate(created, 'Asia/Bangkok', 'yyyy-MM-dd') : 'unknown';
      var revenue = normalizeNumber_(safeCellRaw_(row, idx.revenue), 0);

      // By Status
      if (!index.byStatus[status]) index.byStatus[status] = [];
      index.byStatus[status].push({ jobId: jobId, tech: tech, customer: customer, date: dateKey, revenue: revenue });

      // By Tech
      if (!index.byTech[tech]) index.byTech[tech] = [];
      index.byTech[tech].push({ jobId: jobId, status: status, customer: customer, date: dateKey, revenue: revenue });

      // By Date
      if (!index.byDate[dateKey]) index.byDate[dateKey] = [];
      index.byDate[dateKey].push({ jobId: jobId, status: status, tech: tech, customer: customer, revenue: revenue });

      // By Customer
      if (customer) {
        var custKey = customer.toLowerCase();
        if (!index.byCustomer[custKey]) index.byCustomer[custKey] = [];
        index.byCustomer[custKey].push({ jobId: jobId, status: status, tech: tech, date: dateKey, revenue: revenue });
      }

      index.totalJobs++;
      index.totalRevenue += revenue;

      if (status !== '\u0e1b\u0e34\u0e14\u0e07\u0e32\u0e19' && status !== '\u0e40\u0e01\u0e47\u0e1a\u0e40\u0e07\u0e34\u0e19\u0e41\u0e25\u0e49\u0e27') {
        index.activeJobs++;
      }

      if (dateKey === todayKey && (status === '\u0e1b\u0e34\u0e14\u0e07\u0e32\u0e19' || status === '\u0e40\u0e01\u0e47\u0e1a\u0e40\u0e07\u0e34\u0e19\u0e41\u0e25\u0e49\u0e27')) {
        index.completedToday++;
      }
    }

    // Tech list sorted alphabetically
    var techKeys = Object.keys(index.byTech);
    techKeys.sort();
    index.techList = techKeys;

    // Status list with counts
    var statusKeys = Object.keys(index.byStatus);
    index.statusList = statusKeys.map(function(s) {
      return { status: s, count: index.byStatus[s].length };
    });

    _idxSetCached_(cacheKey, index);
    return { success: true, total: index.totalJobs, index: index };

  } catch (e) {
    try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'getJobsIndex', e); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

/**
 * getInventoryIndex — Fast inventory lookup index
 */
function getInventoryIndex(forceRefresh) {
  var cacheKey = 'ANALYTICS_INVENTORY_INDEX';
  var cached = _idxGetCached_(cacheKey);
  if (cached && !forceRefresh) return cached;

  try {
    var ss = getComphoneSheet();
    var invSheet = findSheetByName(ss, 'DB_INVENTORY');
    if (!invSheet) return { success: false, error: 'DB_INVENTORY not found' };

    var all = invSheet.getDataRange().getValues();
    if (all.length < 2) return { success: true, total: 0, index: { byCode: {}, byLocation: {}, lowStock: [] } };

    var hdrs = all[0];
    var idx = {
      code: findHeaderIndex_(hdrs, ['Item_Code', 'item_code', 'Code', 'code']),
      name: findHeaderIndex_(hdrs, ['Item_Name', 'item_name', 'Name', 'name']),
      qty: findHeaderIndex_(hdrs, ['Qty', 'qty', 'Quantity']),
      cost: findHeaderIndex_(hdrs, ['Cost', 'cost', 'Cost_Price', 'costprice']),
      price: findHeaderIndex_(hdrs, ['Price', 'price', 'Sell_Price', 'sellprice']),
      locType: findHeaderIndex_(hdrs, ['Location_Type', 'location_type']),
      locCode: findHeaderIndex_(hdrs, ['Location_Code', 'location_code'])
    };

    var index = {
      byCode: {},
      byLocation: { MAIN: [], VAN: [], SITE: [] },
      lowStock: [],
      totalItems: 0,
      totalValue: 0,
      builtAt: new Date().toISOString()
    };

    for (var i = 1; i < all.length; i++) {
      var row = all[i];
      var code = safeCellValue_(row, idx.code);
      if (!code) continue;

      var qty = normalizeNumber_(safeCellRaw_(row, idx.qty), 0);
      var cost = normalizeNumber_(safeCellRaw_(row, idx.cost), 0);
      var price = normalizeNumber_(safeCellRaw_(row, idx.price), 0);
      var locType = safeString_(safeCellRaw_(row, idx.locType)).toUpperCase() || 'MAIN';

      var entry = {
        code: code,
        name: safeCellValue_(row, idx.name),
        qty: qty,
        cost: cost,
        price: price,
        location: locType,
        value: qty * cost
      };

      if (index.byCode[code]) {
        index.byCode[code].qty += qty;
        index.byCode[code].value += entry.value;
      } else {
        index.byCode[code] = entry;
      }

      if (index.byLocation[locType]) {
        index.byLocation[locType].push(entry);
      } else {
        index.byLocation[locType] = [entry];
      }

      if (qty < INVENTORY_ALERT_THRESHOLD) {
        index.lowStock.push(entry);
      }

      index.totalItems += qty;
      index.totalValue += entry.value;
    }

    _idxSetCached_(cacheKey, index);
    return { success: true, total: index.totalItems, index: index };

  } catch (e) {
    try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'getInventoryIndex', e); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

/**
 * getCustomerIndex — Quick customer lookup
 */
function getCustomerIndex(forceRefresh) {
  var cacheKey = 'ANALYTICS_CUSTOMER_INDEX';
  var cached = _idxGetCached_(cacheKey);
  if (cached && !forceRefresh) return cached;

  try {
    var ss = getComphoneSheet();
    var custSheet = findSheetByName(ss, 'DB_CUSTOMERS');
    if (!custSheet) return { success: false, error: 'DB_CUSTOMERS not found' };

    var all = custSheet.getDataRange().getValues();
    if (all.length < 2) return { success: true, total: 0, index: { byName: {}, byPhone: {} } };

    var hdrs = all[0];
    var idx = {
      name: findHeaderIndex_(hdrs, ['Customer_Name', 'customer_name', 'Name', 'name', '\u0e0a\u0e37\u0e48\u0e2d']),
      phone: findHeaderIndex_(hdrs, ['Phone', 'phone', '\u0e40\u0e1a\u0e2d\u0e23\u0e4c']),
      address: findHeaderIndex_(hdrs, ['Address', 'address', '\u0e17\u0e35\u0e48\u0e2d\u0e22\u0e39\u0e48'])
    };

    var index = {
      byName: {},
      byPhone: {},
      totalCustomers: 0,
      builtAt: new Date().toISOString()
    };

    for (var i = 1; i < all.length; i++) {
      var row = all[i];
      var name = safeCellValue_(row, idx.name);
      var phone = safeCellValue_(row, idx.phone);
      if (!name && !phone) continue;

      var entry = {
        name: name,
        phone: phone,
        address: safeCellValue_(row, idx.address)
      };

      if (name) index.byName[name.toLowerCase()] = entry;
      if (phone) index.byPhone[normalizeDigits_(phone)] = entry;
      index.totalCustomers++;
    }

    _idxSetCached_(cacheKey, index);
    return { success: true, total: index.totalCustomers, index: index };

  } catch (e) {
    try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'getCustomerIndex', e); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

/**
 * getDashboardAnalytics — Fast Analytics computed from indexes
 * Returns KPI-ready data without scanning full sheets
 */
function getDashboardAnalytics(params) {
  try {
    params = params || {};
    var startMs = Date.now();

    var jobsIdxResult = getJobsIndex();
    if (!jobsIdxResult.success) return jobsIdxResult;
    var jIdx = jobsIdxResult.index;

    var invIdxResult = getInventoryIndex();
    var invIdx = invIdxResult.success ? invIdxResult.index : null;

    var result = {
      success: true,
      totalJobs: jIdx.totalJobs,
      activeJobs: jIdx.activeJobs,
      completedToday: jIdx.completedToday,
      totalRevenue: jIdx.totalRevenue,
      totalTechs: jIdx.techList.length,
      statusBreakdown: jIdx.statusList,
      techList: jIdx.techList,
      lowStockCount: invIdx ? invIdx.lowStock.length : 0,
      totalInventoryValue: invIdx ? invIdx.totalValue : 0,
      generatedAt: new Date().toISOString(),
      latencyMs: Date.now() - startMs
    };

    return result;

  } catch (e) {
    try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'getDashboardAnalytics', e); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

/**
 * searchWithIndex — Fast cross-index search combining job/customer/inventory
 */
function searchWithIndex(query) {
  try {
    if (!query) return { success: false, error: 'query is required' };
    var q = query.toLowerCase();
    var startMs = Date.now();

    var jobsIdx = getJobsIndex();
    var custIdx = getCustomerIndex();
    var results = {
      jobs: [],
      customers: [],
      inventory: [],
      totalHits: 0,
      latencyMs: 0
    };

    // Search customers by name/phone
    if (custIdx.success && custIdx.index) {
      var cIdx = custIdx.index;
      for (var cName in cIdx.byName) {
        if (cIdx.byName.hasOwnProperty(cName) && cName.indexOf(q) >= 0) {
          results.customers.push(cIdx.byName[cName]);
        }
      }
      for (var cPhone in cIdx.byPhone) {
        if (cIdx.byPhone.hasOwnProperty(cPhone) && cPhone.indexOf(normalizeDigits_(query)) >= 0) {
          var entry = cIdx.byPhone[cPhone];
          if (results.customers.indexOf(entry) < 0) results.customers.push(entry);
        }
      }
    }

    // Search jobs by customer name
    if (jobsIdx.success && jobsIdx.index) {
      var jIdx = jobsIdx.index;
      for (var custKey in jIdx.byCustomer) {
        if (jIdx.byCustomer.hasOwnProperty(custKey) && custKey.indexOf(q) >= 0) {
          var jobs = jIdx.byCustomer[custKey];
          for (var j = 0; j < jobs.length && results.jobs.length < 50; j++) {
            results.jobs.push(jobs[j]);
          }
        }
      }
      // Also search by tech name
      for (var t = 0; t < jIdx.techList.length; t++) {
        var tech = jIdx.techList[t];
        if (tech.toLowerCase().indexOf(q) >= 0) {
          var techJobs = jIdx.byTech[tech];
          for (var j2 = 0; j2 < techJobs.length && results.jobs.length < 50; j2++) {
            if (results.jobs.indexOf(techJobs[j2]) < 0) results.jobs.push(techJobs[j2]);
          }
        }
      }
      // Search by job ID
      for (var statusKey in jIdx.byStatus) {
        if (!jIdx.byStatus.hasOwnProperty(statusKey)) continue;
        var statusJobs = jIdx.byStatus[statusKey];
        for (var sj = 0; sj < statusJobs.length; sj++) {
          if (statusJobs[sj].jobId.toLowerCase().indexOf(q) >= 0) {
            if (results.jobs.indexOf(statusJobs[sj]) < 0) results.jobs.push(statusJobs[sj]);
          }
        }
      }
    }

    results.totalHits = results.jobs.length + results.customers.length + results.inventory.length;
    results.latencyMs = Date.now() - startMs;

    return results;

  } catch (e) {
    try { if (typeof _logError_ === 'function') _logError_('MEDIUM', 'searchWithIndex', e); } catch(_le) {}
    return { success: false, error: e.toString() };
  }
}

/**
 * invalidateAllIndexes — Force rebuild all caches
 */
function invalidateAllIndexes() {
  try {
    _idxClearCached_('ANALYTICS_JOBS_INDEX');
    _idxClearCached_('ANALYTICS_INVENTORY_INDEX');
    _idxClearCached_('ANALYTICS_CUSTOMER_INDEX');
    return { success: true, message: 'All indexes invalidated' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// ─── INTERNAL CACHE HELPERS ────────────────────────────────

function _idxGetCached_(key) {
  try {
    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty(key + '_DATA');
    var ts = props.getProperty(key + '_TS');
    if (!raw || !ts) return null;

    var age = Date.now() - parseInt(ts, 10);
    if (age > ANALYTICS_INDEX_TTL_MS) {
      _idxClearCached_(key);
      return null;
    }

    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function _idxSetCached_(key, data) {
  try {
    var props = PropertiesService.getScriptProperties();
    props.setProperty(key + '_DATA', JSON.stringify(data));
    props.setProperty(key + '_TS', String(Date.now()));
  } catch (e) {
    _idxClearCached_(key);
  }
}

function _idxClearCached_(key) {
  try {
    var props = PropertiesService.getScriptProperties();
    props.deleteProperty(key + '_DATA');
    props.deleteProperty(key + '_TS');
  } catch (e) {}
}

// ─── HEADER MAPPING HELPERS ────────────────────────────────

function _idxMapHeaders_(headers) {
  return {
    jobId: findHeaderIndex_(headers, ['JobID', 'Job_ID', 'job_id']),
    status: findHeaderIndex_(headers, ['\u0e2a\u0e16\u0e32\u0e19\u0e30', 'Status', 'status']),
    tech: findHeaderIndex_(headers, ['\u0e0a\u0e48\u0e32\u0e07\u0e17\u0e35\u0e48\u0e23\u0e31\u0e1a\u0e07\u0e32\u0e19', 'Technician', 'tech']),
    customer: findHeaderIndex_(headers, ['\u0e0a\u0e37\u0e48\u0e2d\u0e25\u0e39\u0e01\u0e04\u0e49\u0e32', 'Customer_Name', 'customer_name', 'Customer']),
    created: findHeaderIndex_(headers, ['\u0e40\u0e27\u0e25\u0e32\u0e2a\u0e23\u0e49\u0e32\u0e07', 'Created_At', 'CreatedAt']),
    revenue: findHeaderIndex_(headers, ['\u0e23\u0e32\u0e22\u0e44\u0e14\u0e49', 'Revenue', 'Total', 'total_amount'])
  };
}
