// ===========================================================
// COMPHONE SUPER APP v5.10.0-phase32
// PredictiveAnalytics.gs — Phase 33: Anomaly Detection & Predictive Analytics
// ===========================================================

/**
 * Get Sales Forecast (Linear Regression / Moving Average)
 * Phase 33.2 Predictive Analytics Module
 * 
 * @param {Object} data - { days_history: 90, days_forecast: 30, method: 'linear'|'moving_avg' }
 * @returns {Object} { success, forecast: [{ date, predicted_sales, lower_bound, upper_bound }], history, metadata }
 */
function getSalesForecast(data) {
  try {
    data = data || {};
    var daysHistory = parseInt(data.days_history) || 90;
    var daysForecast = parseInt(data.days_forecast) || 30;
    var method = data.method || 'linear'; // 'linear' or 'moving_avg'
    
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    
    var sh = ss.getSheetByName('DB_BILLING');
    if (!sh) return { success: false, error: 'DB_BILLING sheet not found' };
    
    var lastRow = sh.getLastRow();
    if (lastRow < 2) return { success: true, forecast: [], history: [], message: 'No billing data yet' };
    
    // Read billing data
    var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    var invoiceDateIdx = headers.indexOf('Invoice_Date');
    var totalAmountIdx = headers.indexOf('Total_Amount');
    var createdAtIdx = headers.indexOf('Created_At');
    
    if (invoiceDateIdx < 0 || totalAmountIdx < 0) {
      return { success: false, error: 'Required columns not found (Invoice_Date, Total_Amount)' };
    }
    
    var rows = sh.getRange(2, 1, lastRow - 1, headers.length).getValues();
    
    // Filter data by date range (last N days)
    var cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysHistory);
    
    var dailySales = {}; // { 'YYYY-MM-DD': total_sales }
    
    rows.forEach(function(row) {
      var dateStr = null;
      if (invoiceDateIdx >= 0 && row[invoiceDateIdx]) {
        var d = new Date(row[invoiceDateIdx]);
        if (!isNaN(d.getTime()) && d >= cutoffDate) {
          dateStr = formatDate_(d);
          var amount = parseFloat(row[totalAmountIdx]) || 0;
          dailySales[dateStr] = (dailySales[dateStr] || 0) + amount;
        }
      }
    });
    
    // Build history array (sorted by date)
    var history = Object.keys(dailySales).sort().map(function(date) {
      return { date: date, sales: dailySales[date] };
    });
    
    if (history.length < 7) {
      return { 
        success: true, 
        forecast: [], 
        history: history,
        message: 'Insufficient data for forecasting (need at least 7 days)' 
      };
    }
    
    // Generate forecast
    var forecast = [];
    var lastDate = new Date(history[history.length - 1].date);
    
    if (method === 'moving_avg') {
      // Simple Moving Average (7-day)
      var windowSize = 7;
      var recentSales = history.slice(-windowSize).map(function(h) { return h.sales; });
      var avgSales = recentSales.reduce(function(sum, val) { return sum + val; }, 0) / recentSales.length;
      
      for (var i = 1; i <= daysForecast; i++) {
        var forecastDate = new Date(lastDate);
        forecastDate.setDate(forecastDate.getDate() + i);
        forecast.push({
          date: formatDate_(forecastDate),
          predicted_sales: Math.round(avgSales * 100) / 100,
          lower_bound: Math.round(avgSales * 0.8 * 100) / 100,
          upper_bound: Math.round(avgSales * 1.2 * 100) / 100,
          method: 'moving_avg_7day'
        });
      }
    } else {
      // Linear Regression
      var x = [];
      var y = [];
      history.forEach(function(h, idx) {
        x.push(idx + 1);
        y.push(h.sales);
      });
      
      var regression = linearRegression_(x, y);
      
      for (var i = 1; i <= daysForecast; i++) {
        var xPred = history.length + i;
        var yPred = regression.slope * xPred + regression.intercept;
        yPred = Math.max(0, yPred); // Sales can't be negative
        
        forecast.push({
          date: formatDate_(new Date(lastDate.getTime() + i * 86400000)),
          predicted_sales: Math.round(yPred * 100) / 100,
          lower_bound: Math.round(yPred * 0.7 * 100) / 100,
          upper_bound: Math.round(yPred * 1.3 * 100) / 100,
          trend: regression.slope > 0 ? 'increasing' : (regression.slope < 0 ? 'decreasing' : 'stable'),
          method: 'linear_regression'
        });
      }
    }
    
    return {
      success: true,
      forecast: forecast,
      history: history,
      metadata: {
        days_history: daysHistory,
        days_forecast: daysForecast,
        method: method,
        data_points: history.length,
        avg_daily_sales: Math.round((history.reduce(function(sum, h) { return sum + h.sales; }, 0) / history.length) * 100) / 100,
        trend_slope: method === 'linear' ? regression.slope : null
      }
    };
    
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * Linear Regression Helper
 * @private
 */
function linearRegression_(x, y) {
  var n = x.length;
  var sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (var i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
    sumXY += x[i] * y[i];
    sumX2 += x[i] * x[i];
  }
  
  var slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  var intercept = (sumY - slope * sumX) / n;
  
  return { slope: slope, intercept: intercept };
}

/**
 * Format date to YYYY-MM-DD
 * @private
 */
function formatDate_(date) {
  var d = new Date(date);
  var year = d.getFullYear();
  var month = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

/**
 * Get Inventory Recommendations (based on historical velocity)
 * Phase 33.2 Predictive Analytics Module
 * 
 * @param {Object} data - { days_history: 90, top_n: 10 }
 * @returns {Object} { success, recommendations: [{ item_name, velocity, recommended_po, stock_status }] }
 */
function getInventoryRecommendation(data) {
  try {
    data = data || {};
    var daysHistory = parseInt(data.days_history) || 90;
    var topN = parseInt(data.top_n) || 10;
    
    var ss = getComphoneSheet();
    if (!ss) return { success: false, error: 'Spreadsheet not found' };
    
    // Read Inventory data
    var invSh = ss.getSheetByName('DB_INVENTORY');
    var jobsSh = ss.getSheetByName('DB_JOBS');
    
    if (!invSh || !jobsSh) {
      return { success: false, error: 'Required sheets not found' };
    }
    
    // TODO: Implement inventory velocity calculation
    // For now, return stub
    return {
      success: true,
      recommendations: [],
      message: 'Inventory recommendation engine - Phase 33 implementation pending',
      metadata: {
        days_history: daysHistory,
        top_n: topN
      }
    };
    
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * Predict Customer Demand
 * Phase 33.2 Predictive Analytics Module
 * 
 * @param {Object} data - { customer_id }
 * @returns {Object} { success, demand_forecast: [{ month, predicted_jobs, predicted_services }] }
 */
function predictCustomerDemand(data) {
  try {
    data = data || {};
    var customerId = data.customer_id || '';
    
    if (!customerId) {
      return { success: false, error: 'customer_id is required' };
    }
    
    // TODO: Implement customer demand prediction
    return {
      success: true,
      demand_forecast: [],
      message: 'Customer demand prediction - Phase 33 implementation pending'
    };
    
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * Anomaly Detection Baseline (Phase 33.1)
 * Returns current baseline statistics for anomaly detection
 * 
 * @param {Object} data - { metric: 'billing'|'jobs'|'inventory', days: 14 }
 * @returns {Object} { success, baseline: { mean, std_dev, thresholds } }
 */
function getAnomalyBaseline(data) {
  try {
    data = data || {};
    var metric = data.metric || 'billing';
    var days = parseInt(data.days) || 14;
    
    // TODO: Implement anomaly baseline calculation
    // This will be called after 14 days of Phase 2E telemetry
    return {
      success: true,
      baseline: null,
      message: 'Anomaly baseline - waiting for ' + (14 - days) + ' more days of telemetry data',
      telemetry_required: 14,
      telemetry_collected: days
    };
    
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
