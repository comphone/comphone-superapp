#!/usr/bin/env node
// ============================================================
// COMPHONE SUPER APP — MOBILE SECTION RENDER SMOKE
// Loads every mobile PWA script in index.html order into one VM (like the
// browser), stubs the DOM + callApi with a representative dashboard payload,
// then invokes each menu loader goPage() dispatches and reports any that throw
// at render time. Catches runtime render crashes that static/contract guards
// cannot see (e.g. an unguarded APP.user.name on a null user).
// Exit: 0 = all sections render, 1 = a load or render error occurred.
// ============================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const PWA = path.join(ROOT, 'pwa');

const LOAD_ORDER = [
  'version_config.js','gas_config.js','pwa_asset_manifest.js','api_contract.js',
  'mobile_shared.js','api_client.js','auth_guard.js','app.js','offline_db.js',
  'app_home.js','app_jobs.js','app_actions.js','section_vision.js','section_line_center.js',
  'dashboard.js','dashboard_helpers.js','crm_attendance.js','purchase_order.js',
  'section_inventory.js','billing_section.js','reports.js','customer_portal.js',
  'analytics_section.js','admin_panel.js','menu_health.js','runtime_self_test.js',
  'notification_center.js','auth.js','error_boundary.js','pwa_install.js',
  'push_notifications.js','section_warranty.js','section_revenue.js','section_tax.js',
  'section_performance.js',
];

// Rich mock dashboard payload covering field names various renderers read.
const MOCK = {
  success: true,
  summary: {
    revenue: { today: 1500, week: 9000, month: 42000 },
    jobs: { total: 12, pending: 3, completed: 9 },
    customers: { total: 40 },
  },
  revenue_by_day: [{ date: '2026-06-01', amount: 1500 }, { date: '2026-06-02', amount: 2000 }],
  report: { jobs: [{ jobId: 'J0007', customer: 'ร้านโชคชัย', revenue: 5000, cost: 2000 }] },
  jobs: [{ jobId: 'J0007', job_id: 'J0007', customer: 'ร้านโชคชัย', status: 'pending', device: 'iPhone' }],
  customers: [{ id: 'C0001', name: 'ร้านโชคชัย', phone: '0812345678' }],
  billings: [{ id: 'B0001', jobId: 'J0007', amount: 5000, status: 'unpaid' }],
  inventory: [{ sku: 'S001', name: 'จอ LCD', qty: 5, price: 1200 }],
  purchaseOrders: [{ id: 'PO001', supplier: 'ABC', total: 8000, status: 'open' }],
  warranties: [{ job_id: 'J0007', customer: 'ร้านโชคชัย', expires: '2027-01-01' }],
  attendance: [{ tech: 'ช่างโต้', clockIn: '08:00' }],
  performance: { techs: [{ name: 'ช่างโต้', jobs: 9 }] },
};

function makeEl(id) {
  const el = {
    id, innerHTML: '', textContent: '', value: '', className: '',
    style: {}, dataset: {}, classList: { add(){}, remove(){}, contains(){return false;}, toggle(){} },
    children: [], attributes: {},
    setAttribute(k,v){ this.attributes[k]=v; }, getAttribute(k){ return this.attributes[k]||''; },
    removeAttribute(){}, appendChild(){}, prepend(){}, append(){}, remove(){},
    addEventListener(){}, removeEventListener(){}, querySelector(){ return makeEl('q'); },
    querySelectorAll(){ return []; }, focus(){}, click(){}, closest(){ return null; },
    insertAdjacentHTML(){}, scrollIntoView(){},
  };
  return el;
}

function createSandbox() {
  const els = new Map();
  const doc = {
    getElementById(id){ if(!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
    querySelector(){ return makeEl('q'); },
    querySelectorAll(){ return []; },
    createElement(){ return makeEl('created'); },
    createTextNode(){ return makeEl('text'); },
    body: makeEl('body'), head: makeEl('head'),
    addEventListener(){}, removeEventListener(){},
    documentElement: makeEl('html'),
  };
  const storage = { _d:{}, getItem(k){ return this._d[k]||null; }, setItem(k,v){ this._d[k]=String(v); }, removeItem(k){ delete this._d[k]; } };
  const sandbox = {
    console: { log(){}, warn(){}, error(){}, info(){}, debug(){} },
    setTimeout(fn){ if(typeof fn==='function'){ try{ fn(); }catch(e){} } return 0; },
    clearTimeout(){}, setInterval(){ return 0; }, clearInterval(){},
    requestAnimationFrame(fn){ if(typeof fn==='function') try{fn();}catch(e){} return 0; },
    alert(){}, confirm(){ return false; }, prompt(){ return null; },
    document: doc,
    localStorage: storage, sessionStorage: { getItem(){return null;}, setItem(){}, removeItem(){} },
    location: { href:'https://comphone.github.io/comphone-superapp/pwa/', search:'', hash:'', reload(){}, replace(){} },
    history: { pushState(){}, replaceState(){}, back(){} },
    navigator: { onLine:true, clipboard:{ writeText(){ return Promise.resolve(); } }, serviceWorker:{ register(){ return Promise.resolve({}); }, ready: Promise.resolve({}), addEventListener(){}, removeEventListener(){} }, geolocation:{ getCurrentPosition(){} } },
    innerWidth: 390, innerHeight: 800, devicePixelRatio: 2,
    addEventListener(){}, removeEventListener(){}, dispatchEvent(){},
    APP: { user: { username: 'smoke', name: 'Smoke User', role: 'owner', full_name: 'Smoke User' }, role: 'owner', currentPage: 'home' },
    fetch: async () => ({ ok:true, json: async()=>({success:true}), text: async()=>'' }),
    callApi: async () => ({ success:true, ...MOCK }),
    callAPI: async () => ({ success:true, ...MOCK }),
    callGas: async () => ({ success:true, ...MOCK }),
    cachedCallApi: async () => ({ success:true, ...MOCK }),
    Chart: function(){ return { destroy(){}, update(){} }; },
    AbortController: function(){ this.signal={}; this.abort=()=>{}; },
    CustomEvent: function(){}, Event: function(){},
    URL: { createObjectURL(){ return 'blob:x'; }, revokeObjectURL(){} },
    Blob: function(){}, FileReader: function(){},
    matchMedia: () => ({ matches:false, addEventListener(){}, addListener(){} }),
    btoa: s => Buffer.from(String(s)).toString('base64'),
    atob: s => Buffer.from(String(s),'base64').toString(),
    DASHBOARD_DATA: MOCK,
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  return { sandbox, els };
}

const { sandbox } = createSandbox();
vm.createContext(sandbox);

const loadErrors = [];
for (const f of LOAD_ORDER) {
  const p = path.join(PWA, f);
  if (!fs.existsSync(p)) { loadErrors.push(`${f}: file missing`); continue; }
  try {
    vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: f });
  } catch (e) {
    loadErrors.push(`${f}: LOAD ERROR ${e.message}`);
  }
}

// Menu loaders goPage dispatches (mobile), plus a few render fns.
const TARGETS = [
  'renderJobsPage','renderProfile','loadCRMPage','loadAttendancePage','loadPurchaseOrderPage',
  'loadDashboardPage','loadInventoryPage','loadReportsPage','openAnalyticsSection',
  'loadBillingPage','loadWarrantyPage','loadRevenuePage','loadTaxPage','loadPerformancePage',
  'renderMobileVisionPage','renderMobileLineCenterPage',
];

const runErrors = [];
let okCount = 0;
(async () => {
  for (const fn of TARGETS) {
    const f = sandbox[fn];
    if (typeof f !== 'function') { runErrors.push(`${fn}: NOT a function (undefined)`); continue; }
    try {
      const r = f(MOCK);
      if (r && typeof r.then === 'function') await r;
      okCount++;
    } catch (e) {
      runErrors.push(`${fn}: RENDER THREW ${e.message}`);
    }
  }

  console.log('=== LOAD ERRORS ===');
  console.log(loadErrors.length ? loadErrors.join('\n') : '  none');
  console.log('=== RENDER RESULTS ===');
  console.log(`  ok: ${okCount}/${TARGETS.length}`);
  console.log(runErrors.length ? runErrors.join('\n') : '  no render exceptions');
  process.exit(loadErrors.length || runErrors.length ? 1 : 0);
})();
