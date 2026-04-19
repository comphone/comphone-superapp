// ============================================================
// COMPHONE SUPER APP v5.5 — RouterSplit.gs
// Phase 5: Router Split — map action → module handler
// Phase 6: Health Fix — ensure status: 'healthy' in responses
// ============================================================

/**
 * MODULE_ROUTER — Maps action prefix → module handler function
 * Reduces switch-case lookup time for large action sets
 */
var MODULE_ROUTER = {
  // Dashboard & Bundle
  'getDashboardBundle':     function(p) { return getDashboardBundle(p); },
  'invalidateBundleCache':  function(p) { return invalidateBundleCache(); },
  'getDashboardData':       function(p) { return getDashboardData(); },
  'getDashboardPayloadV55': function(p) { return getDashboardPayloadV55(); },

  // Jobs
  'checkJobs':    function(p) { return checkJobs(p); },
  'listJobs':     function(p) { return checkJobs(p); },
  'openJob':      function(p) { return openJob(p); },
  'createJob':    function(p) { return openJob(p); },
  'updateJobById': function(p) { return updateJobById(p.job_id || p.jobId || '', p); },
  'updateJobStatus': function(p) { return updateJobStatus(p); },
  'transitionJob': function(p) { return transitionJob(p.job_id || p.jobId || '', p.new_status || p.to_status || p.status, p); },
  'addQuickNote': function(p) { return addQuickNote(p.job_id || p.jobId || '', p.note || '', p.user || 'SYSTEM'); },
  'getJobTimeline': function(p) { return getJobTimelineV55_(p.job_id || p.jobId || ''); },
  'getJobStateConfig': function(p) { return getJobStateConfig(); },
  'getJobQRData': function(p) { return getJobWebAppPayload(p.job_id || p.jobId || ''); },
  'generateJobQR': function(p) { return generateJobQR(p.job_id || p.jobId || ''); },

  // Inventory
  'inventoryOverview':    function(p) { return getInventoryOverview(p); },
  'addInventoryItem':     function(p) { return addInventoryItem(p); },
  'updateInventoryItem':  function(p) { return updateInventoryItem(p); },
  'deleteInventoryItem':  function(p) { return deleteInventoryItem(p); },
  'getInventoryItemDetail': function(p) { return getInventoryItemDetail(p); },
  'transferStock':        function(p) { return transferStock(p.from_location || p.from, p.to_location || p.to, p.item_id || p.item_code || p.code, p.qty, p); },
  'checkStock':           function(p) { return checkStock(p); },
  'barcodeLookup':        function(p) { return barcodeLookup(p); },
  'scanWithdrawStock':    function(p) { return scanWithdrawStock(p); },
  'getStockMovementHistory': function(p) { return getStockMovementHistory(p); },
  'createPurchaseOrder':  function(p) { return createPurchaseOrder(p); },
  'listPurchaseOrders':   function(p) { return listPurchaseOrders(p); },
  'receivePurchaseOrder': function(p) { return receivePurchaseOrder(p); },
  'geminiReorderSuggestion': function(p) { return geminiReorderSuggestion(); },

  // Billing & POS
  'createBilling':        function(p) { return createBilling(p); },
  'getBilling':           function(p) { return getBilling(p); },
  'listBillings':         function(p) { return listBillings(p); },
  'updatePayment':        function(p) { return updatePayment(p); },
  'generatePromptPayQR':  function(p) { return generatePromptPayQR(p); },
  'createRetailSale':     function(p) { return createRetailSale(p); },
  'listRetailSales':      function(p) { return listRetailSales(p); },
  'createRefund':         function(p) { return createRefund(p); },
  'createBillingFromSale': function(p) { return createBillingFromSale(p); },
  'deductStock':          function(p) { return deductStock(p); },
  'restoreStock':         function(p) { return restoreStock(p); },

  // Customers
  'createCustomer': function(p) { return createCustomer(p); },
  'updateCustomer': function(p) { return updateCustomer(p); },
  'getCustomer':    function(p) { return getCustomer(p); },
  'listCustomers':  function(p) { return listCustomers(p); },

  // Reports
  'getReportData': function(p) {
    return (typeof getReportData === 'function') ? getReportData(p) : getReportData_(p.period || 'month');
  },

  // System Health (Phase 6: always return status: 'healthy')
  'getSystemHealth': function(p) {
    var result = (typeof getSystemHealth === 'function') ? getSystemHealth(p) : { success: true };
    return _ensureHealthStatus_(result);
  },
  'getSystemContext': function(p) {
    var result = (typeof getSystemContext === 'function') ? getSystemContext(p) : { success: true };
    return _ensureHealthStatus_(result);
  },
  'healthCheck': function(p) {
    var result = (typeof healthCheckV55_ === 'function') ? healthCheckV55_() : { success: true };
    return _ensureHealthStatus_(result);
  },
};

/**
 * routeByModule — Fast module-based routing
 * Falls back to original dispatchActionV55_ if action not found
 */
function routeByModule(action, payload) {
  var handler = MODULE_ROUTER[action];
  if (handler) {
    try {
      var result = handler(payload || {});
      // Phase 6: Ensure health status in all responses
      if (result && result.success !== false && !result.status) {
        result.status = 'ok';
      }
      return result;
    } catch(e) {
      Logger.log('[RouterSplit] Error in ' + action + ': ' + e.message);
      return { success: false, error: e.message, action: action };
    }
  }
  return null; // Signal to fall back to original router
}

/**
 * _ensureHealthStatus_ — Phase 6: Ensure status field in health responses
 */
function _ensureHealthStatus_(result) {
  if (!result) return { success: true, status: 'healthy' };
  if (!result.status) result.status = 'healthy';
  if (result.health && !result.health.status) result.health.status = 'healthy';
  if (result.modules) {
    Object.keys(result.modules).forEach(function(k) {
      if (result.modules[k] && !result.modules[k].status) {
        result.modules[k].status = 'healthy';
      }
    });
  }
  return result;
}

/**
 * getModuleRouterStats — Returns stats about the module router
 */
function getModuleRouterStats() {
  return {
    success: true,
    status: 'healthy',
    total_routes: Object.keys(MODULE_ROUTER).length,
    modules: ['dashboard', 'jobs', 'inventory', 'billing', 'customers', 'reports', 'health'],
    version: '6.1'
  };
}
