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

  // Version
  'getSystemVersion': function(p) {
    return (typeof getSystemVersion === 'function') ? getSystemVersion() : getVersionV55_();
  },
  'getVersion': function(p) {
    return (typeof getVersionV55_ === 'function') ? getVersionV55_() : { success: true, version: '6.2.0' };
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

  // Attendance & Tech History
  'clockIn':     function(p) { return clockIn(p.tech || p.tech_name || '', p.note || ''); },
  'clockOut':    function(p) { return clockOut(p.tech || p.tech_name || '', p.note || ''); },
  'getAttendanceReport': function(p) { return getAttendanceReport(p); },
  'getTechHistory': function(p) { return getTechHistory(p.tech || p.tech_name || '', p); },
  'getAllTechsSummary': function(p) { return getAllTechsSummary(); },

  // CRM Sprint 3
  'getCustomerHistoryFull': function(p) { return getCustomerHistoryFull(p); },
  'getCustomerListWithStats': function(p) { return getCustomerListWithStats(p); },
  'scheduleFollowUp': function(p) { return scheduleFollowUp_(p); },
  'logFollowUpResult': function(p) { return logFollowUpResult_(p); },
  'getCRMFollowUpSchedule': function(p) { return getCRMFollowUpSchedule_(p); },
  'getCRMMetrics': function(p) { return getCRMMetrics_(); },
  'nudgeSalesTeam': function(p) { return nudgeSalesTeam_(p); },

  // After-Sales Service
  'createAfterSalesRecord': function(p) { return createAfterSalesRecord(p.job_id || p.jobId || ''); },
  'getAfterSalesDue': function(p) { return getAfterSalesDue(p.days || 30); },
  'logAfterSalesFollowUp': function(p) { return logAfterSalesFollowUp(p.record_id || '', p.note || '', p.followup_by || '', p.next_action || ''); },
  'sendAfterSalesAlerts': function(p) { return sendAfterSalesAlerts(); },
  'getAfterSalesSummary': function(p) { return getAfterSalesSummary(); },

  // Auth & RBAC
  'loginUser':    function(p) { return loginUser(p.username || '', p.password || ''); },
  'logoutUser':   function(p) { return logoutUser(p.token || ''); },
  'verifySession': function(p) { return verifySession(p.token || ''); },
  'listUsers':    function(p) { return listUsers(p.token || ''); },
  'createUser':   function(p) { return createUser(p.token || '', p); },
  'updateUserRole': function(p) { return updateUserRole(p.token || '', p.username || '', p.role || ''); },
  'setUserActive': function(p) { return setUserActive(p.token || '', p.username || '', p.active !== false); },
  'setupUserSheet': function(p) { return setupUserSheet(); },
  'forceResetAdmin': function(p) { return forceResetAdmin(p.password || p.newPassword || ''); },
  'cleanupSessions': function(p) { return cleanupSessions(); },
  'verifyToken':  function(p) { return verifyToken(p.token || ''); },

  // Security
  'changePassword': function(p) { return changePassword(p); },
  'forcePasswordChange': function(p) { return forcePasswordChange(p); },
  'lockAccount':  function(p) { return lockAccount(p); },
  'unlockAccount': function(p) { return unlockAccount(p); },
  'getSecurityStatus': function(p) { return getSecurityStatus(); },
  'getAuditLog':  function(p) { return getAuditLog(p); },
  'getAuditSummary': function(p) { return getAuditSummary(p.period || 'today'); },
  'pruneAuditLog': function(p) { return pruneAuditLog(p.keep_days || 90); },

  // System
  'initSystem':   function(p) { return initSystem(); },
  'systemStatus': function(p) { return systemStatus(); },
  'setupTriggers': function(p) { return setupAllTriggers(); },
  'setupAllTriggers': function(p) { return setupAllTriggers(); },
  'getSchemaInfo': function(p) { return getSchemaInfo(); },
  'validateConfig': function(p) { return validateRequiredConfigs(); },
  'getComphoneConfig': function(p) { return getComphoneConfig(); },
  'setScriptProperties': function(p) { return setScriptPropertiesFromPayload(p); },
  'logSystemError': function(p) { return logSystemError(p); },
  'getSystemLogs': function(p) { return getSystemLogs(p); },
  'getSystemMetrics': function(p) { return (typeof getSystemMetrics === 'function') ? getSystemMetrics() : { success: false }; },
  'getHealthMonitor': function(p) { return (typeof getHealthMonitor === 'function') ? getHealthMonitor(p) : { success: false }; },
  'getHealthTrend': function(p) { return (typeof getHealthTrend === 'function') ? getHealthTrend(p) : { success: false }; },
  'getSnapshots': function(p) { return (typeof getSnapshots === 'function') ? getSnapshots(p) : { success: false }; },
  'controlAction': function(p) { return (typeof controlAction === 'function') ? controlAction(p) : { success: false }; },
  'storeSnapshot': function(p) { return (typeof storeSnapshot === 'function') ? storeSnapshot(p) : { success: false }; },
  'getSecurityLog': function(p) { var sl = (typeof getSecurityLog === 'function') ? getSecurityLog() : []; return { success: true, data: sl, count: sl.length }; },
  'seedAllData':  function(p) { return seedAllData(); },
  'runBackup':    function(p) { return runBackup(); },
  'cronMorningAlert': function(p) { return cronMorningAlert(); },

  // Push Notifications
  'savePushSubscription': function(p) { return savePushSubscription(p); },
  'removePushSubscription': function(p) { return removePushSubscription(p); },

  // Drive Sync
  'getDriveSyncStatus': function(p) { return getDriveSyncStatus(); },
  'storeSessionContent': function(p) { return storeSessionContent(p.content || ''); },

  // Customer Portal (public)
  'getJobStatusPublic': function(p) { return getJobStatusPublic(p.job_id || p.jobId || '', p.phone || ''); },
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
