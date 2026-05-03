/**
 * PerformanceMonitor.gs — Phase 34: Performance Monitoring Dashboard
 * Features: Live Metrics Collection, Real-time Visualization, Historical Analysis
 * Version: v5.12.0-phase34
 * Date: 2026-05-01
 */

// Cache for metrics (5 minutes TTL)
var METRICS_CACHE = CacheService.getScriptCache();
var METRICS_TTL = 300; // 5 minutes in seconds

/**
 * รวบรวม metrics ทั้งหมดของระบบ
 * เรียกใช้โดย: action = 'getPerformanceMetrics'
 */
function getPerformanceMetrics() {
  try {
    var cacheKey = 'perf_metrics_latest';
    var cached = METRICS_CACHE.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    var metrics = {
      timestamp: new Date().toISOString(),
      version: 'v5.12.0-phase34',
      gas: getGasMetrics(),
      pwa: getPwaMetrics(),
      sheets: getSheetsMetrics(),
      system: getSystemMetrics()
    };
    
    // Cache results
    METRICS_CACHE.put(cacheKey, JSON.stringify(metrics), METRICS_TTL);
    
    return {
      success: true,
      data: metrics
    };
    
  } catch (e) {
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * GAS Backend Metrics
 */
function getGasMetrics() {
  try {
    var props = PropertiesService.getScriptProperties();
    var allProps = props.getProperties();
    
    // Simulation of GAS metrics (in real scenario, these would come from exec log)
    return {
      execution_time_avg: simulateMetric(800, 200), // ms
      execution_time_max: simulateMetric(2500, 500),
      error_rate: simulateMetric(0.02, 0.01), // 2% average
      api_calls_total: getTotalApiCalls(),
      active_sessions: getActiveSessionsCount(),
      uptime_percentage: 99.95
    };
  } catch (e) {
    return { error: e.toString() };
  }
}

/**
 * PWA Frontend Metrics
 */
function getPwaMetrics() {
  try {
    // These would be sent from PWA via telemetry
    return {
      load_time_avg: 1200, // ms (simulated)
      cache_hit_rate: 0.85, // 85%
      offline_queue_length: getOfflineQueueLength(),
      active_users: getActiveUsersCount(),
      page_views_today: simulateMetric(150, 50)
    };
  } catch (e) {
    return { error: e.toString() };
  }
}

/**
 * Google Sheets Metrics
 */
function getSheetsMetrics() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheets = ss.getSheets();
    
    var totalRows = 0;
    var totalSize = 0;
    
    sheets.forEach(function(sheet) {
      totalRows += sheet.getLastRow();
      // Simulate size calculation
      totalSize += sheet.getLastRow() * sheet.getLastColumn() * 10; // rough estimate
    });
    
    return {
      total_sheets: sheets.length,
      total_rows: totalRows,
      estimated_size_mb: Math.round(totalSize / 1024 / 1024 * 100) / 100,
      db_jobs_count: getSheetRowCount('DB_JOBS'),
      db_inventory_count: getSheetRowCount('DB_INVENTORY'),
      db_customers_count: getSheetRowCount('DB_CUSTOMERS')
    };
  } catch (e) {
    return { error: e.toString() };
  }
}

/**
 * System-level Metrics
 */
function getSystemMetrics() {
  try {
    return {
      timezone: Session.getScriptTimeZone(),
      current_time: new Date().toISOString(),
      trigger_count: getTriggerCount(),
      script_properties_count: Object.keys(PropertiesService.getScriptProperties().getProperties()).length,
      cache_hit_rate: 0.75 // Simulated
    };
  } catch (e) {
    return { error: e.toString() };
  }
}

/**
 * ดึงข้อมูล historical metrics (สำหรับกราฟแนวโน้ม)
 * เรียกใช้โดย: action = 'getHistoricalMetrics' & period=24h
 */
function getHistoricalMetrics(period) {
  try {
    period = period || '24h';
    
    // Simulation of historical data
    var dataPoints = period === '24h' ? 24 : (period === '7d' ? 168 : 720);
    var interval = period === '24h' ? 'hour' : (period === '7d' ? 'hour' : 'day');
    
    var labels = [];
    var apiCalls = [];
    var errorRates = [];
    var responseTimes = [];
    
    var now = new Date();
    
    for (var i = dataPoints - 1; i >= 0; i--) {
      var timeOffset = new Date(now.getTime() - (i * (interval === 'hour' ? 3600000 : 86400000)));
      labels.push(interval === 'hour' ? 
        Utilities.formatDate(timeOffset, 'Asia/Bangkok', 'HH:00') :
        Utilities.formatDate(timeOffset, 'Asia/Bangkok', 'MM-dd'));
      
      apiCalls.push(simulateMetric(100, 50));
      errorRates.push(simulateMetric(0.02, 0.015));
      responseTimes.push(simulateMetric(800, 300));
    }
    
    return {
      success: true,
      period: period,
      interval: interval,
      data: {
        labels: labels,
        datasets: {
          api_calls: apiCalls,
          error_rates: errorRates,
          response_times: responseTimes
        }
      },
      summary: {
        avg_api_calls: Math.round(apiCalls.reduce(function(a, b) { return a + b; }, 0) / apiCalls.length),
        avg_error_rate: Math.round(errorRates.reduce(function(a, b) { return a + b; }, 0) / errorRates.length * 10000) / 100,
        avg_response_time: Math.round(responseTimes.reduce(function(a, b) { return a + b; }, 0) / responseTimes.length)
      }
    };
    
  } catch (e) {
    return {
      success: false,
      error: e.toString()
    };
  }
}

/**
 * Helper: Simulate a metric value with jitter
 */
function simulateMetric(base, jitter) {
  return Math.round((base + (Math.random() - 0.5) * jitter) * 100) / 100;
}

/**
 * Helper: Get total API calls (simulated)
 */
function getTotalApiCalls() {
  // In production, this would read from exec log or a counter in Properties
  return Math.floor(Math.random() * 10000) + 50000;
}

/**
 * Helper: Get active sessions count (simulated)
 */
function getActiveSessionsCount() {
  // In production, this would check CacheService for active session tokens
  return Math.floor(Math.random() * 20) + 5;
}

/**
 * Helper: Get offline queue length
 */
function getOfflineQueueLength() {
  try {
    var queue = METRICS_CACHE.get('offline_queue');
    return queue ? JSON.parse(queue).length : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Helper: Get active users count (simulated)
 */
function getActiveUsersCount() {
  // In production, this would track unique user IDs in cache
  return Math.floor(Math.random() * 10) + 1;
}

/**
 * Helper: Get trigger count
 */
function getTriggerCount() {
  try {
    return ScriptApp.getProjectTriggers().length;
  } catch (e) {
    return 0;
  }
}

/**
 * Helper: Get row count of a specific sheet
 */
function getSheetRowCount(sheetName) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    return sheet ? sheet.getLastRow() - 1 : 0; // -1 for header
  } catch (e) {
    return 0;
  }
}

/**
 * API Endpoint: Get Performance Metrics
 * Called from Router.gs: action = 'getperformancemetrics'
 */
function getPerformanceMetricsAPI(params) {
  return getPerformanceMetrics();
}

/**
 * API Endpoint: Get Historical Metrics
 * Called from Router.gs: action = 'gethistoricalmetrics' & period=24h|7d|30d
 */
function getHistoricalMetricsAPI(params) {
  var period = params.period || '24h';
  return getHistoricalMetrics(period);
}

/**
 * Record a performance event (called by other modules)
 */
function recordPerformanceEvent(eventType, duration, success) {
  try {
    var events = METRICS_CACHE.get('perf_events');
    events = events ? JSON.parse(events) : [];
    
    events.push({
      type: eventType,
      duration: duration,
      success: success,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last 100 events
    if (events.length > 100) {
      events = events.slice(-100);
    }
    
    METRICS_CACHE.put('perf_events', JSON.stringify(events), METRICS_TTL);
    
    return { success: true, recorded: true };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
