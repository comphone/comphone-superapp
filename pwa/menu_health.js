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
          <button class="menu-health-run secondary" id="menu-health-export-btn" ${rows.length ? '' : 'disabled'}>
            <i class="bi bi-download"></i> Export
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
    const exportBtn = document.getElementById('menu-health-export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportMenuHealthReport);
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
    const label = row.skipped ? 'SKIP' : (row.ok ? 'OK' : (row.kind || 'FAIL').toUpperCase());
    return `
      <div class="menu-health-row ${cls}">
        <div>
          <strong>${row.action}</strong>
          <span>${row.skipped ? 'skipped' : row.elapsedMs + 'ms'}${row.required ? ' · required' : ''}${row.error ? ' · ' + row.error : ''}</span>
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
        if (item.smoke === false) {
          results.push({
            menu: menu.id,
            menuLabel: menu.label,
            action: item.action,
            required: !!item.required,
            ok: true,
            kind: 'skip',
            skipped: true,
            elapsedMs: 0,
            error: item.smokeReason || 'smoke disabled for this action'
          });
          continue;
        }
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

  function exportMenuHealthReport() {
    const payload = {
      generated_at: new Date().toISOString(),
      contract_version: global.COMPHONE_API_CONTRACT && global.COMPHONE_API_CONTRACT.version,
      user: global.APP && global.APP.user ? {
        username: global.APP.user.username || global.APP.user.name || '',
        role: global.APP.user.role || ''
      } : null,
      results: MENU_HEALTH.results
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'comphone-menu-health-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  global.MENU_HEALTH = MENU_HEALTH;
  global.renderMenuHealthPanel = renderMenuHealthPanel;
  global.runMenuHealth = runMenuHealth;
  global.exportMenuHealthReport = exportMenuHealthReport;
})(window);
