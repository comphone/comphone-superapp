(function(global) {
  'use strict';

  const API_CONTRACT = {
    version: '2026-04-29.phase30-api-stability',
    responseShape: {
      success: '{ success: true, data?, meta? }',
      failure: '{ success: false, error, code, kind?, action?, request_id? }',
    },
    publicActions: [
      { action: 'health', menu: 'System', description: 'GAS health check', noAuth: true },
      { action: 'getVersion', menu: 'System', description: 'Backend version', noAuth: true },
    ],
    menus: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'bi-speedometer2',
        actions: [
          { action: 'getDashboardBundle', read: true, optional: true },
          { action: 'getDashboardData', required: true, read: true },
          { action: 'getTechPerformance', payload: { days: 7 }, read: true },
          { action: 'getRetailSales', payload: { days: 7 }, read: true },
          { action: 'getAllTechsSummary', read: true },
        ],
      },
      {
        id: 'crm',
        label: 'CRM',
        icon: 'bi-people-fill',
        actions: [
          { action: 'listCustomers', required: true, read: true },
          { action: 'getAfterSalesDue', read: true },
          { action: 'getAttendanceReport', payload: { days: 7 }, read: true },
          { action: 'getCustomerListWithStats', read: true },
          { action: 'getCRMMetrics', read: true },
        ],
      },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: 'bi-box-seam-fill',
        actions: [
          { action: 'inventoryOverview', required: true, read: true },
          { action: 'barcodeLookup', payload: { barcode: '__SMOKE_EMPTY__' }, read: true, optional: true },
          { action: 'checkStock', read: true },
        ],
      },
      {
        id: 'po',
        label: 'Purchase Orders',
        icon: 'bi-cart-check-fill',
        actions: [
          { action: 'listPurchaseOrders', payload: { limit: 10 }, required: true, read: true },
        ],
      },
      {
        id: 'reports',
        label: 'Reports',
        icon: 'bi-graph-up-arrow',
        actions: [
          { action: 'getReportData', payload: { period: 'month' }, required: true, read: true },
        ],
      },
      {
        id: 'billing',
        label: 'Billing',
        icon: 'bi-receipt-cutoff',
        actions: [
          { action: 'getBilling', payload: { job_id: '__SMOKE_EMPTY__' }, read: true, optional: true, smoke: false, smokeReason: 'requires a real job_id with an existing billing record' },
          { action: 'generatePromptPayQR', payload: { amount: 1, ref: 'SMOKE' }, read: true, optional: true },
        ],
      },
      {
        id: 'admin',
        label: 'Admin',
        icon: 'bi-shield-fill-check',
        roles: ['admin', 'owner', 'ADMIN', 'OWNER'],
        actions: [
          { action: 'getSecurityStatus', required: true, read: true },
          { action: 'getAuditLog', payload: { limit: 5 }, read: true },
          { action: 'listUsers', read: true },
        ],
      },
    ],
  };

  API_CONTRACT.protectedActions = API_CONTRACT.menus
    .flatMap(menu => menu.actions.map(item => Object.assign({ menu: menu.id }, item)));

  global.COMPHONE_API_CONTRACT = API_CONTRACT;
  if (typeof module !== 'undefined' && module.exports) module.exports = API_CONTRACT;
})(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : globalThis));
