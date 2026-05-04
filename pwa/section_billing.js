/**
 * section_billing.js — COMPHONE SUPER APP v5.14.5-phase37
 * Billing Section (ใบเสร็จ/วางบิล)
 * Status: Prototype (coming soon → active development)
 */

function renderBillingSection(data) {
  console.log('[Billing] Rendering billing section...', data);
  const bills = (data && data.billing && data.billing.items) || [
    { id: 'B001', customer: 'สมชาย ใจดี', amount: 1500, status: 'paid', date: '2026-05-01' },
    { id: 'B002', customer: 'วิชัย สบาย', amount: 3200, status: 'pending', date: '2026-05-03' },
    { id: 'B003', customer: 'ศิริพร แสงแสง', amount: 890, status: 'paid', date: '2026-05-04' },
  ];

  return `
    <div class="section-header">
      <h2><i class="bi bi-receipt"></i> ใบเสร็จ/วางบิล</h2>
      <button class="btn btn-sm btn-primary" onclick="alert('Add bill — coming soon')">
        <i class="bi bi-plus"></i> ออกใบเสร็จใหม่
      </button>
    </div>
    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>เลขที่</th>
            <th>ลูกค้า</th>
            <th>จำนวนเงิน</th>
            <th>สถานะ</th>
            <th>วันที่</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          ${bills.map(b => `
            <tr>
              <td>${b.id}</td>
              <td>${b.customer}</td>
              <td>฿${b.amount.toLocaleString()}</td>
              <td>
                <span class="badge ${b.status === 'paid' ? 'bg-success' : 'bg-warning'}">
                  ${b.status === 'paid' ? 'ชำระแล้ว' : 'ค้างชำระ'}
                </span>
              </td>
              <td>${b.date}</td>
              <td>
                <button class="btn btn-sm btn-outline-primary" onclick="alert('View bill ${b.id} — coming soon')">
                  <i class="bi bi-eye"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <p style="color:#9ca3af;margin-top:20px;text-align:center">
      ⏳ ระบบบัญชีเต็มรูปแบบกำลังพัฒนา...
    </p>
  `;
}

console.log('[Billing] section_billing.js loaded (v5.14.5-phase37)');
