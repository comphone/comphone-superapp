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
    if (!invSh) return { success: false, error: 'DB_INVENTORY sheet not found' };
    
    var invLastRow = invSh.getLastRow();
    if (invLastRow < 2) {
      return { success: true, recommendations: [], message: 'No inventory data' };
    }
    
    var invHeaders = invSh.getRange(1, 1, 1, invSh.getLastColumn()).getValues()[0];
    var itemCodeIdx = invHeaders.indexOf('Item_Code');
    var itemNameIdx = invHeaders.indexOf('Item_Name');
    var qtyIdx = invHeaders.indexOf('Qty');
    var minQtyIdx = invHeaders.indexOf('Min_Qty');
    var costIdx = invHeaders.indexOf('Cost_Price');
    var categoryIdx = invHeaders.indexOf('Category');
    
    if (itemCodeIdx < 0 || qtyIdx < 0) {
      return { success: false, error: 'Required columns not found (Item_Code, Qty)' };
    }
    
    var invRows = invSh.getRange(2, 1, invLastRow - 1, invHeaders.length).getValues();
    
    // Read Job history for velocity calculation
    var jobsSh = ss.getSheetByName('DB_JOBS');
    var velocityMap = {}; // { item_code: { total_used, days_active, velocity } }
    
    if (jobsSh) {
      var jobLastRow = jobsSh.getLastRow();
      if (jobLastRow >= 2) {
        var jobHeaders = jobsSh.getRange(1, 1, 1, jobsSh.getLastColumn()).getValues()[0];
        var jobDescIdx = jobHeaders.indexOf('Description') >= 0 ? jobHeaders.indexOf('Description') : jobHeaders.indexOf('Note');
        var jobDateIdx = jobHeaders.indexOf('Created_At') >= 0 ? jobHeaders.indexOf('Created_At') : jobHeaders.indexOf('Opened_At');
        var jobStatusIdx = jobHeaders.indexOf('Status_Label');
        
        if (jobDescIdx >= 0 && jobDateIdx >= 0) {
          var cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - daysHistory);
          
          var jobRows = jobsSh.getRange(2, 1, jobLastRow - 1, jobHeaders.length).getValues();
          var now = new Date();
          
          jobRows.forEach(function(row) {
            var jobDate = new Date(row[jobDateIdx]);
            if (isNaN(jobDate.getTime()) || jobDate < cutoffDate) return;
            
            var desc = String(row[jobDescIdx] || '');
            // Look for inventory items mentioned in job description
            // Format: "Used: [item_code] x[qty]" or similar
            var regex = /(\w+)\s*x\s*(\d+)/gi;
            var match;
            while ((match = regex.exec(desc)) !== null) {
              var code = match[1];
              var qty = parseInt(match[2]) || 0;
              if (!velocityMap[code]) {
                velocityMap[code] = { total_used: 0, days_active: 0, last_date: null };
              }
              velocityMap[code].total_used += qty;
              velocityMap[code].days_active++;
              if (!velocityMap[code].last_date || jobDate > velocityMap[code].last_date) {
                velocityMap[code].last_date = jobDate;
              }
            }
          });
        }
      }
    }
    
    // Build recommendations
    var recommendations = [];
    
    invRows.forEach(function(row) {
      var code = String(row[itemCodeIdx] || '').trim();
      var name = String(row[itemNameIdx] || code).trim();
      var qty = parseFloat(row[qtyIdx]) || 0;
      var minQty = parseFloat(row[minQtyIdx]) || 5;
      var cost = parseFloat(row[costIdx]) || 0;
      var category = categoryIdx >= 0 ? String(row[categoryIdx] || '').trim() : '';
      
      // Calculate velocity
      var vel = velocityMap[code];
      var dailyVelocity = 0;
      var velocityConfidence = 'LOW';
      
      if (vel && vel.days_active > 0) {
        dailyVelocity = vel.total_used / daysHistory; // Average per day over history period
        velocityConfidence = vel.days_active >= 14 ? 'HIGH' : (vel.days_active >= 7 ? 'MEDIUM' : 'LOW');
      }
      
      // Calculate recommended PO
      var leadTimeDays = 7; // Assume 7 days lead time
      var safetyStock = minQty * 0.5;
      var reorderPoint = minQty + (dailyVelocity * leadTimeDays) + safetyStock;
      
      var recommendedPO = 0;
      var stockStatus = 'ADEQUATE';
      
      if (qty <= 0) {
        stockStatus = 'OUT_OF_STOCK';
        recommendedPO = reorderPoint * 2; // Emergency order
      } else if (qty < minQty) {
        stockStatus = 'REORDER';
        recommendedPO = reorderPoint - qty + (dailyVelocity * leadTimeDays);
      } else if (qty < reorderPoint) {
        stockStatus = 'LOW';
        recommendedPO = reorderPoint - qty;
      } else if (qty > reorderPoint * 3) {
        stockStatus = 'OVERSTOCK';
        recommendedPO = 0; // No need to order
      }
      
      if (recommendedPO > 0) {
        recommendedPO = Math.ceil(recommendedPO / 10) * 10; // Round up to nearest 10
      }
      
      recommendations.push({
        item_code: code,
        item_name: name,
        category: category,
        current_qty: qty,
        min_qty: minQty,
        reorder_point: Math.round(reorderPoint * 100) / 100,
        daily_velocity: Math.round(dailyVelocity * 100) / 100,
        velocity_confidence: velocityConfidence,
        stock_status: stockStatus,
        recommended_po: Math.max(0, Math.round(recommendedPO)),
        estimated_cost: Math.round(recommendedPO * cost * 100) / 100,
        lead_time_days: leadTimeDays
      });
    });
    
    // Sort by urgency (OUT_OF_STOCK first, then REORDER, etc.)
    var statusOrder = { 'OUT_OF_STOCK': 0, 'REORDER': 1, 'LOW': 2, 'ADEQUATE': 3, 'OVERSTOCK': 4 };
    recommendations.sort(function(a, b) {
      return (statusOrder[a.stock_status] || 5) - (statusOrder[b.stock_status] || 5);
    });
    
    // Return top N
    recommendations = recommendations.slice(0, topN);
    
    return {
      success: true,
      recommendations: recommendations,
      metadata: {
        days_history: daysHistory,
        top_n: topN,
        total_items: invRows.length,
        items_recommending_po: recommendations.filter(function(r) { return r.recommended_po > 0 }).length,
        total_estimated_cost: recommendations.reduce(function(sum, r) { return sum + r.estimated_cost; }, 0)
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
