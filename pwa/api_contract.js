(function(global) {
  'use strict';

  const API_CONTRACT = {
    version: '2026-04-28.phase30',
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
        ],
      },
      {
        id: 'inventory',
        label: 'Inventory',
        icon: 'bi-box-seam-fill',
        actions: [
          { action: 'inventoryOverview', required: true, read: true },
          { action: 'barcodeLookup', payload: { barcode: '__SMOKE_EMPTY__' }, read: true, optional: true },
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
        id: 'admin',
        label: 'Admin',
        icon: 'bi-shield-fill-check',
        roles: ['admin', 'owner'],
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
