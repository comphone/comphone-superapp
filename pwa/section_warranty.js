/**
 * section_warranty.js — COMPHONE SUPER APP v5.13.5
 * Warranty Section (รับประกัน)
 * Status: Prototype (coming soon → active development)
 */

function renderWarrantySection(data) {
  console.log('[Warranty] Rendering warranty section...', data);
  const warranties = (data && data.warranty && data.warranty.items) || [
    { id: 'W001', customer: 'สมชาย ใจดี', device: 'iPhone 14 Pro', expire: '2026-12-31', status: 'active' },
    { id: 'W002', customer: 'วิชัย สบาย', device: 'Samsung Galaxy S23', expire: '2026-08-15', status: 'active' },
    { id: 'W003', customer: 'ศิริพร แสงแสง', device: 'iPad Air', expire: '2026-05-10', status: 'expiring' },
  ];

  return `
    <div class="section-header">
      <h2><i class="bi bi-shield-check"></i> รับประกัน</h2>
      <button class="btn btn-sm btn-primary" onclick="alert('Add warranty — coming soon')">
        <i class="bi bi-plus"></i> เพิ่มข้อมูลรับประกัน
      </button>
    </div>
    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>เลขที่</th>
            <th>ลูกค้า</th>
            <th>อุปกรณ์</th>
            <th>วันหมดประกัน</th>
            <th>สถานะ</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          ${warranties.map(w => `
            <tr>
              <td>${w.id}</td>
              <td>${w.customer}</td>
              <td>${w.device}</td>
              <td>${w.expire}</td>
              <td>
                <span class="badge ${w.status === 'active' ? 'bg-success' : w.status === 'expiring' ? 'bg-warning' : 'bg-danger'}">
                  ${w.status === 'active' ? 'ใช้งานอยู่' : w.status === 'expiring' ? 'ใกล้หมด' : 'หมดอายุ'}
                </span>
              </td>
              <td>
                <button class="btn btn-sm btn-outline-primary" onclick="alert('View warranty ${w.id} — coming soon')">
                  <i class="bi bi-eye"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <p style="color:#9ca3af;margin-top:20px;text-align:center">
      ⏳ ระบบจัดการรับประกันเต็มรูปแบบกำลังพัฒนา...
    </p>
  `;
}

console.log('[Warranty] section_warranty.js loaded (v5.13.5)');
