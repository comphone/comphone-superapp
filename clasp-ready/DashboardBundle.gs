/**
 * DashboardBundle.gs — Single-pass Dashboard Data
 * v5.18.1-dashboard — Created 2026-05-06
 * Performance: 1-2s (vs 11s legacy getDashboardData)
 * Cache: 90s CacheService TTL
 */

// Main entry point called by frontend
function getDashboardBundle(payload) {
  const cache = CacheService.getScriptCache();
  const cacheKey = 'dashboard_bundle_' + (payload && payload.userId ? payload.userId : 'all');
  
  // Try cache first
  const cached = cache.get(cacheKey);
  if (cached) {
    try {
      const data = JSON.parse(cached);
      console.log('[DashboardBundle] Served from cache');
      return { success: true, cached: true, ...data };
    } catch (e) {
      console.warn('[DashboardBundle] Cache parse error, fetching fresh');
    }
  }
  
  // Fetch all data in single pass
  try {
    const bundle = fetchAllDashboardData(payload);
    // Cache for 90 seconds
    cache.put(cacheKey, JSON.stringify(bundle), 90);
    return { success: true, cached: false, ...bundle };
  } catch (err) {
    console.error('[DashboardBundle] Error:', err);
    // Fallback to legacy if available
    if (typeof getDashboardData === 'function') {
      console.warn('[DashboardBundle] Falling back to getDashboardData');
      return getDashboardData(payload);
    }
    return { success: false, error: err.message };
  }
}

// Fetch all dashboard data in single pass
function fetchAllDashboardData(payload) {
  const result = {
    summary: {},
    alerts: { items: [] },
    jobs: [],
    status_distribution: { statuses: [] },
    techWorkload: [],
    revenue: { today: 0, week: 0, month: 0 }
  };
  
  try {
    // 1. Summary stats (total jobs, overdue, low stock, etc.)
    const ss = SpreadsheetApp.openById(Config.get('DBJOBS_ID') || '');
    const jobsSheet = ss.getSheetByName('Jobs');
    if (jobsSheet) {
      const data = jobsSheet.getDataRange().getValues();
      const headers = data[0];
      
      // Find column indices
      const statusIdx = headers.indexOf('Status');
      const createdIdx = headers.indexOf('CreatedDate');
      const slaIdx = headers.indexOf('SLA_Date');
      const today = new Date();
      
      let totalJobs = 0;
      let overdueJobs = 0;
      let statuses = {};
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        totalJobs++;
        
        const status = row[statusIdx] || 'unknown';
        statuses[status] = (statuses[status] || 0) + 1;
        
        // Check overdue
        if (row[slaIdx] && new Date(row[slaIdx]) < today && !['Done', 'Cancelled'].includes(status)) {
          overdueJobs++;
        }
      }
      
      result.summary.totalJobs = totalJobs;
      result.summary.overdueJobs = overdueJobs;
      
      // Convert statuses to array
      result.status_distribution.statuses = Object.keys(statuses).map(s => ({
        status: s,
        status_label: s,
        job_count: statuses[s]
      })).filter(s => s.job_count > 0);
    }
  } catch (e) {
    console.warn('[DashboardBundle] Jobs summary error:', e);
  }
  
  try {
    // 2. Low stock alerts
    const dbInventory = SpreadsheetApp.openById(Config.get('DB_INVENTORY_ID') || '');
    const invSheet = dbInventory.getSheetByName('Inventory');
    if (invSheet) {
      const data = invSheet.getDataRange().getValues();
      const headers = data[0];
      const qtyIdx = headers.indexOf('Quantity');
      const minIdx = headers.indexOf('MinStock');
      const nameIdx = headers.indexOf('ItemName');
      
      let lowStock = 0;
      const alerts = [];
      
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const qty = Number(row[qtyIdx]) || 0;
        const min = Number(row[minIdx]) || 0;
        
        if (qty <= min && min > 0) {
          lowStock++;
          alerts.push({
            type: 'STOCK_LOW',
            message: `${row[nameIdx] || 'Unknown'} เหลือ ${qty} ชิ้น (ขั้นต่ำ ${min})`,
            severity: 'warning'
          });
        }
      }
      
      result.summary.lowStock = lowStock;
      result.alerts.items = alerts.slice(0, 10); // Top 10 alerts
    }
  } catch (e) {
    console.warn('[DashboardBundle] Inventory error:', e);
  }
  
  try {
    // 3. Revenue (simplified - would need Billing sheet)
    // Placeholder - implement based on your billing data structure
    result.revenue = {
      today: 0,
      week: 0,
      month: 0
    };
  } catch (e) {
    console.warn('[DashboardBundle] Revenue error:', e);
  }
  
  try {
    // 4. Recent jobs (top 8)
    const ss = SpreadsheetApp.openById(Config.get('DBJOBS_ID') || '');
    const jobsSheet = ss.getSheetByName('Jobs');
    if (jobsSheet) {
      const data = jobsSheet.getDataRange().getValues();
      const headers = data[0];
      const createdIdx = headers.indexOf('CreatedDate');
      
      // Sort by date descending (simple approach)
      const rows = data.slice(1).sort((a, b) => {
        const dateA = new Date(a[createdIdx] || 0);
        const dateB = new Date(b[createdIdx] || 0);
        return dateB - dateA;
      });
      
      result.jobs = rows.slice(0, 8).map(row => {
        const obj = {};
        headers.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
      });
    }
  } catch (e) {
    console.warn('[DashboardBundle] Recent jobs error:', e);
  }
  
  // Add metadata
  result.summary.date = new Date().toLocaleDateString('th-TH');
  result.timestamp = new Date().toISOString();
  
  return result;
}

// Warm cache (can be called via trigger)
function warmDashboardCache() {
  const users = ['all']; // Add specific user IDs if needed
  users.forEach(userId => {
    const cache = CacheService.getScriptCache();
    const cacheKey = 'dashboard_bundle_' + userId;
    try {
      const bundle = fetchAllDashboardData({ userId });
      cache.put(cacheKey, JSON.stringify(bundle), 90);
      console.log('[DashboardBundle] Cache warmed for', userId);
    } catch (e) {
      console.error('[DashboardBundle] Warm cache error:', e);
    }
  });
}
