(function(global) {
  'use strict';

  const MENU_HEALTH = {
    results: [],
    running: false,
    lastRun: null,
  };

  function canViewMenuHealth() {
    const role = global.APP && global.APP.user && global.APP.user.role;
    return role === 'admin' || role === 'owner';
  }

  function renderMenuHealthPanel(container) {
    if (!container) return;
    if (!canViewMenuHealth()) {
      container.innerHTML = apiErrorState('PERMISSION_DENIED');
      return;
    }

    const rows = MENU_HEALTH.results;
    container.innerHTML = `
      <div class="menu-health-panel">
        <div class="menu-health-head">
          <div>
            <div class="menu-health-title"><i class="bi bi-activity"></i> Menu Health</div>
            <div class="menu-health-sub">ตรวจ action สำคัญของแต่ละเมนูผ่าน API contract กลาง</div>
          </div>
          <button class="menu-health-run" id="menu-health-run-btn">
            <i class="bi bi-play-fill"></i> Run
          </button>
        </div>
        <div class="menu-health-meta">
          ${MENU_HEALTH.lastRun ? `Last run: ${new Date(MENU_HEALTH.lastRun).toLocaleString('th-TH')}` : 'ยังไม่ได้ตรวจ'}
        </div>
        <div id="menu-health-results">
          ${rows.length ? renderMenuHealthRows(rows) : renderMenuHealthEmpty()}
        </div>
      </div>`;

    const btn = document.getElementById('menu-health-run-btn');
    if (btn) btn.addEventListener('click', () => runMenuHealth(container));
  }

  function renderMenuHealthEmpty() {
    return `
      <div class="menu-health-empty">
        <i class="bi bi-radar"></i>
        <strong>พร้อมตรวจระบบ</strong>
        <span>กด Run เพื่อเช็ก Dashboard, CRM, Inventory, PO, Reports และ Admin</span>
      </div>`;
  }

  function renderMenuHealthRows(rows) {
    const grouped = rows.reduce((acc, row) => {
      (acc[row.menuLabel] = acc[row.menuLabel] || []).push(row);
      return acc;
    }, {});
    return Object.keys(grouped).map(menu => `
      <div class="menu-health-group">
        <div class="menu-health-group-title">${menu}</div>
        ${grouped[menu].map(renderMenuHealthRow).join('')}
      </div>
    `).join('');
  }

  function renderMenuHealthRow(row) {
    const cls = row.ok ? 'ok' : row.kind || 'backend';
    const label = row.ok ? 'OK' : (row.kind || 'FAIL').toUpperCase();
    return `
      <div class="menu-health-row ${cls}">
        <div>
          <strong>${row.action}</strong>
          <span>${row.elapsedMs}ms${row.required ? ' · required' : ''}</span>
        </div>
        <div class="menu-health-status">${label}</div>
      </div>`;
  }

  async function runMenuHealth(container) {
    if (MENU_HEALTH.running) return;
    MENU_HEALTH.running = true;
    MENU_HEALTH.results = [];
    container.innerHTML = `
      <div class="menu-health-panel">
        <div class="menu-health-empty">
          <div class="spinner" style="margin:0 auto 12px;width:34px;height:34px"></div>
          <strong>กำลังตรวจ Menu Health...</strong>
          <span>กำลังยิง API action สำคัญของแต่ละเมนู</span>
        </div>
      </div>`;

    const contract = global.COMPHONE_API_CONTRACT;
    const menus = contract && contract.menus ? contract.menus : [];
    const results = [];

    for (const menu of menus) {
      if (menu.roles && !menu.roles.includes(global.APP && global.APP.user && global.APP.user.role)) continue;
      for (const item of menu.actions) {
        const started = Date.now();
        const payload = Object.assign({}, item.payload || {});
        Object.keys(payload).forEach(key => {
          if (payload[key] === '__SMOKE_EMPTY__') payload[key] = '';
        });
        try {
          const res = await global.callApi(item.action, payload);
          const elapsedMs = Date.now() - started;
          const ok = !!res && res.success !== false;
          const error = res && (res.error || res.message || res.status);
          const kind = ok ? 'ok' : (global.classifyApiError ? global.classifyApiError(error).kind : 'backend');
          results.push({ menu: menu.id, menuLabel: menu.label, action: item.action, required: !!item.required, ok, kind, elapsedMs, error });
        } catch (err) {
          const elapsedMs = Date.now() - started;
          const kind = global.classifyApiError ? global.classifyApiError(err.message).kind : 'backend';
          results.push({ menu: menu.id, menuLabel: menu.label, action: item.action, required: !!item.required, ok: false, kind, elapsedMs, error: err.message });
        }
      }
    }

    MENU_HEALTH.results = results;
    MENU_HEALTH.lastRun = Date.now();
    MENU_HEALTH.running = false;
    renderMenuHealthPanel(container);
  }

  global.MENU_HEALTH = MENU_HEALTH;
  global.renderMenuHealthPanel = renderMenuHealthPanel;
  global.runMenuHealth = runMenuHealth;
})(window);
