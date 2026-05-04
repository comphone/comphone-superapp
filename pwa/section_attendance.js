/**
 * section_attendance.js — COMPHONE SUPER APP v5.13.8
 * Attendance Section (ลงเวลาทำงาน)
 * Status: Prototype (coming soon → active development)
 */

function renderAttendanceSection(data) {
  console.log('[Attendance] Rendering attendance section...', data);
  const records = (data && data.attendance && data.attendance.records) || [
    { id: 'A001', employee: 'สมชาย ใจดี', date: '2026-05-04', timeIn: '08:58', timeOut: '17:05', status: 'on-time' },
    { id: 'A002', employee: 'วิชัย สบาย', date: '2026-05-04', timeIn: '09:15', timeOut: '17:30', status: 'late' },
    { id: 'A003', employee: 'ศิริพร แสงแสง', date: '2026-05-04', timeIn: '08:45', timeOut: '18:00', status: 'on-time' },
  ];

  return `
    <div class="section-header">
      <h2><i class="bi bi-clock-history"></i> ลงเวลาทำงาน</h2>
      <button class="btn btn-sm btn-primary" onclick="alert('Add attendance record — coming soon')">
        <i class="bi bi-plus"></i> บันทึกเวลาเข้า-ออก
      </button>
    </div>
    <div class="table-responsive">
      <table class="table table-hover">
        <thead>
          <tr>
            <th>เลขที่</th>
            <th>พนักงาน</th>
            <th>วันที่</th>
            <th>เวลาเข้า</th>
            <th>เวลาออก</th>
            <th>สถานะ</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(a => `
            <tr>
              <td>${a.id}</td>
              <td>${a.employee}</td>
              <td>${a.date}</td>
              <td>${a.timeIn}</td>
              <td>${a.timeOut}</td>
              <td>
                <span class="badge ${a.status === 'on-time' ? 'bg-success' : a.status === 'late' ? 'bg-warning' : 'bg-danger'}">
                  ${a.status === 'on-time' ? 'มาตรงเวลา' : a.status === 'late' ? 'มาสาย' : 'ขาดงาน'}
                </span>
              </td>
              <td>
                <button class="btn btn-sm btn-outline-primary" onclick="alert('View attendance ${a.id} — coming soon')">
                  <i class="bi bi-eye"></i>
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <p style="color:#9ca3af;margin-top:20px;text-align:center">
      ⏳ ระบบลงเวลาทำงานเต็มรูปแบบกำลังพัฒนา...
    </p>
  `;
}

console.log('[Attendance] section_attendance.js loaded (v5.13.8)');
