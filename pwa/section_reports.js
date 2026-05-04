/**
 * section_reports.js — COMPHONE SUPER APP v5.13.6
 * Reports Section (รายงาน)
 * Status: Prototype (coming soon → active development)
 */

function renderReportsSection(data) {
  console.log('[Reports] Rendering reports section...', data);
  const reports = (data && data.reports && data.reports.items) || [
    { id: 'R001', name: 'รายงานรายวัน', type: 'daily', lastRun: '2026-05-04', status: 'ready' },
    { id: 'R002', name: 'รายงานรายเดือน', type: 'monthly', lastRun: '2026-05-01', status: 'ready' },
    { id: 'R003', name: 'รายงานภาษี', type: 'tax', lastRun: '2026-04-30', status: 'ready' },
  ];

  return `
    <div class="section-header">
      <h2><i class="bi bi-file-earmark-text"></i> รายงาน</h2>
      <button class="btn btn-sm btn-primary" onclick="alert('Generate report — coming soon')">
        <i class="bi bi-plus"></i> สร้างรายงานใหม่
      </button>
    </div>
    <div class="row">
      ${reports.map(r => `
        <div class="col-md-4 mb-3">
          <div class="card-box">
            <h4>${r.name}</h4>
            <p style="color:#9ca3af;font-size:0.9em">ประเภท: ${r.type} | ล่าสุด: ${r.lastRun}</p>
            <button class="btn btn-sm btn-outline-primary" onclick="alert('View report ${r.id} — coming soon')">
              <i class="bi bi-eye"></i> ดูรายงาน
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick="alert('Download report ${r.id} — coming soon')">
              <i class="bi bi-download"></i> ดาวน์โหลด
            </button>
          </div>
        </div>
      `).join('')}
    </div>
    <p style="color:#9ca3af;margin-top:20px;text-align:center">
      ⏳ ระบบรายงานเต็มรูปแบบกำลังพัฒนา...
    </p>
  `;
}

console.log('[Reports] section_reports.js loaded (v5.13.6)');
