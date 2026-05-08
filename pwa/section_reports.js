/**
 * section_reports.js - COMPHONE SUPER APP
 * Compatibility bridge for the PC dashboard reports menu.
 *
 * The full reports experience lives in reports.js. This bridge exists because
 * the PC shell historically called renderReportsSection(); it must never render
 * an empty placeholder surface.
 */

function renderReportsFallback() {
  return `
    <div class="section-header">
      <h2><i class="bi bi-file-earmark-text"></i> ศูนย์รายงาน</h2>
      <button class="btn btn-sm btn-primary" onclick="if (typeof loadSection === 'function') loadSection('reports')">
        <i class="bi bi-arrow-clockwise"></i> โหลดใหม่
      </button>
    </div>
    <div class="card-box">
      <h3>กำลังเตรียมโมดูลรายงาน</h3>
      <p style="color:#6b7280;margin-bottom:12px">
        ระบบกำลังโหลดโมดูลรายงานหลัก หากหน้านี้ค้างให้กดโหลดใหม่หรือล้างแคช PWA หนึ่งครั้ง
      </p>
      <div class="d-flex flex-wrap gap-2">
        <button class="btn btn-outline-primary btn-sm" onclick="if (typeof loadSection === 'function') loadSection('reports')">
          <i class="bi bi-arrow-repeat"></i> โหลดรายงานอีกครั้ง
        </button>
        <button class="btn btn-outline-secondary btn-sm" onclick="location.reload()">
          <i class="bi bi-bootstrap-reboot"></i> รีเฟรชระบบ
        </button>
      </div>
    </div>
  `;
}

function renderReportsSection(data) {
  console.log('[Reports] Delegating PC reports menu to reports.js', data);
  if (typeof window !== 'undefined' && typeof window.renderReportModule === 'function') {
    window.renderReportModule(data || {});
    return `
      <div class="card-box">
        <h3>กำลังเปิดศูนย์รายงาน...</h3>
        <p style="color:#6b7280;margin:0">ระบบกำลังเชื่อมต่อโมดูลรายงานหลัก</p>
      </div>
    `;
  }
  return renderReportsFallback();
}

if (typeof window !== 'undefined') {
  window.renderReportsSection = renderReportsSection;
}

console.log('[Reports] section_reports.js compatibility bridge loaded');
