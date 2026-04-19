// ============================================================
// COMPHONE SUPER APP V5.5
// attendance_ui.js — Attendance UI + GPS + Monthly Report + Overtime
// Version: 5.6.0
// ============================================================
// ฟีเจอร์:
//   5a. loadAttendancePage()   — โหลดหน้า Attendance
//   5b. clockIn()              — ลงเวลาเข้างาน + GPS
//   5c. clockOut()             — ลงเวลาออกงาน + GPS
//   5d. renderMonthlyReport()  — รายงานประจำเดือน
//   5e. renderOvertimeSection()— คำนวณ OT
//   5f. renderTodayStatus()    — สถานะวันนี้
// ============================================================

'use strict';

// ============================================================
// STATE
// ============================================================
const ATT = {
  todayRecord:   null,   // record วันนี้
  monthlyData:   [],     // ข้อมูลรายเดือน
  isClockedIn:   false,  // กำลัง clock-in อยู่หรือไม่
  clockInTime:   null,   // เวลา clock-in
  currentMonth:  null,   // เดือนที่กำลังดูอยู่ (YYYY-MM)
  gpsEnabled:    false,  // GPS ใช้งานได้หรือไม่
  lastGPS:       null,   // { lat, lng, accuracy }
};

// OT threshold (ชั่วโมงทำงานปกติ)
const NORMAL_HOURS_PER_DAY = 8;
const OT_RATE_MULTIPLIER   = 1.5; // OT = 1.5x

// ============================================================
// 5a. LOAD ATTENDANCE PAGE
// ============================================================
/**
 * โหลดหน้า Attendance
 */
async function loadAttendancePage() {
  const container = document.getElementById('attendance-content');
  if (!container) return;

  container.innerHTML = _buildAttendanceSkeleton_();

  try {
    // ดึงข้อมูลวันนี้
    const techName = (APP && APP.user && APP.user.name) || '';
    if (!techName) {
      container.innerHTML = _buildAttendanceError_('กรุณา Login ก่อนใช้งาน');
      return;
    }

    // ดึงรายงานเดือนปัจจุบัน
    const now   = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    ATT.currentMonth = month;

    const [reportResult] = await Promise.all([
      callApi('getAttendanceReport', { tech: techName, month }),
    ]);

    // วิเคราะห์สถานะวันนี้
    const today = now.toISOString().slice(0, 10);
    ATT.monthlyData = reportResult?.records || [];
    ATT.todayRecord = ATT.monthlyData.find(r => r.date === today) || null;
    ATT.isClockedIn = !!(ATT.todayRecord && ATT.todayRecord.clock_in && !ATT.todayRecord.clock_out);
    ATT.clockInTime = ATT.isClockedIn ? new Date(ATT.todayRecord.clock_in) : null;

    // Render
    container.innerHTML = _buildAttendanceHTML_();
    renderTodayStatus();
    renderMonthlyReport(ATT.monthlyData);
    renderOvertimeSection(ATT.monthlyData);
    _startClockTimer_();

  } catch (err) {
    container.innerHTML = _buildAttendanceError_(err.message);
    console.error('[Attendance] loadAttendancePage error:', err);
  }
}

// ============================================================
// 5b. CLOCK IN
// ============================================================
/**
 * ลงเวลาเข้างาน
 */
async function clockIn() {
  if (ATT.isClockedIn) {
    showToast('คุณลงเวลาเข้างานแล้ววันนี้');
    return;
  }

  const btn = document.getElementById('att-clockin-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'กำลังลงเวลา...'; }

  try {
    // ดึง GPS ก่อน (ถ้าได้)
    let gpsNote = '';
    try {
      const pos = await _getGPS_();
      ATT.lastGPS = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
      ATT.gpsEnabled = true;
      gpsNote = `GPS: ${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)} (±${Math.round(pos.coords.accuracy)}m)`;
    } catch (_) {
      gpsNote = 'GPS: ไม่ได้รับอนุญาต';
    }

    const techName = (APP && APP.user && APP.user.name) || '';
    const result = await callApi('clockIn', {
      tech:      techName,
      tech_name: techName,
      note:      gpsNote,
      gps:       ATT.lastGPS,
    });

    if (!result || !result.success) {
      throw new Error(result?.error || 'ลงเวลาเข้างานไม่สำเร็จ');
    }

    ATT.isClockedIn = true;
    ATT.clockInTime = new Date();
    ATT.todayRecord = { clock_in: result.clock_in, date: result.date };

    showToast(`✅ ลงเวลาเข้างาน ${result.clock_in} สำเร็จ`);
    renderTodayStatus();
    _startClockTimer_();

  } catch (err) {
    showToast(`❌ ${err.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🟢 เข้างาน'; }
  }
}

// ============================================================
// 5c. CLOCK OUT
// ============================================================
/**
 * ลงเวลาออกงาน
 */
async function clockOut() {
  if (!ATT.isClockedIn) {
    showToast('คุณยังไม่ได้ลงเวลาเข้างานวันนี้');
    return;
  }

  const btn = document.getElementById('att-clockout-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'กำลังลงเวลา...'; }

  try {
    // ดึง GPS
    let gpsNote = '';
    try {
      const pos = await _getGPS_();
      ATT.lastGPS = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
      gpsNote = `GPS: ${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)} (±${Math.round(pos.coords.accuracy)}m)`;
    } catch (_) {
      gpsNote = 'GPS: ไม่ได้รับอนุญาต';
    }

    const techName = (APP && APP.user && APP.user.name) || '';
    const result = await callApi('clockOut', {
      tech:      techName,
      tech_name: techName,
      note:      gpsNote,
      gps:       ATT.lastGPS,
    });

    if (!result || !result.success) {
      throw new Error(result?.error || 'ลงเวลาออกงานไม่สำเร็จ');
    }

    ATT.isClockedIn = false;
    ATT.clockInTime = null;
    if (ATT.todayRecord) {
      ATT.todayRecord.clock_out   = result.clock_out;
      ATT.todayRecord.hours_worked = result.hours_worked;
    }

    const ot = Math.max(0, (result.hours_worked || 0) - NORMAL_HOURS_PER_DAY);
    let msg = `✅ ลงเวลาออกงาน ${result.clock_out} | ทำงาน ${result.hours_worked} ชม.`;
    if (ot > 0) msg += ` | OT ${ot.toFixed(2)} ชม.`;

    showToast(msg);
    renderTodayStatus();
    _stopClockTimer_();

    // Reload monthly data
    await loadAttendancePage();

  } catch (err) {
    showToast(`❌ ${err.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🔴 ออกงาน'; }
  }
}

// ============================================================
// 5d. MONTHLY REPORT
// ============================================================
/**
 * Render Monthly Report Table
 * @param {Array} records
 */
function renderMonthlyReport(records) {
  const container = document.getElementById('att-monthly-table');
  if (!container) return;

  if (!records || records.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#9ca3af;padding:20px;font-size:13px">ไม่มีข้อมูลเดือนนี้</div>';
    return;
  }

  // สรุปรายเดือน
  let totalDays  = 0;
  let totalHours = 0;
  let totalOT    = 0;

  const rows = records.map(r => {
    const hours = parseFloat(r.hours_worked || 0);
    const ot    = Math.max(0, hours - NORMAL_HOURS_PER_DAY);
    totalDays++;
    totalHours += hours;
    totalOT    += ot;

    const statusColor = r.status === 'PRESENT' ? '#22c55e' : r.status === 'LATE' ? '#f59e0b' : '#ef4444';
    return `
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:8px 10px;font-size:12px;color:#374151">${r.date || '-'}</td>
        <td style="padding:8px 6px;font-size:12px;text-align:center">${r.clock_in || '-'}</td>
        <td style="padding:8px 6px;font-size:12px;text-align:center">${r.clock_out || '-'}</td>
        <td style="padding:8px 6px;font-size:12px;text-align:center;font-weight:600">${hours.toFixed(1)}</td>
        <td style="padding:8px 6px;font-size:12px;text-align:center;color:${ot > 0 ? '#f59e0b' : '#9ca3af'};font-weight:${ot > 0 ? '700' : '400'}">${ot > 0 ? ot.toFixed(1) : '-'}</td>
        <td style="padding:8px 10px;font-size:11px">
          <span style="background:${statusColor}22;color:${statusColor};padding:2px 8px;border-radius:10px;font-weight:600">${r.status || '-'}</span>
        </td>
      </tr>`;
  }).join('');

  container.innerHTML = `
    <!-- Summary row -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
      <div style="background:#eff6ff;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:20px;font-weight:800;color:#1d4ed8">${totalDays}</div>
        <div style="font-size:11px;color:#6b7280">วันทำงาน</div>
      </div>
      <div style="background:#f0fdf4;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:20px;font-weight:800;color:#166534">${totalHours.toFixed(1)}</div>
        <div style="font-size:11px;color:#6b7280">ชั่วโมงรวม</div>
      </div>
      <div style="background:#fffbeb;border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:20px;font-weight:800;color:#92400e">${totalOT.toFixed(1)}</div>
        <div style="font-size:11px;color:#6b7280">OT รวม (ชม.)</div>
      </div>
    </div>
    <!-- Table -->
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr style="background:#f9fafb">
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;font-size:11px">วันที่</th>
            <th style="padding:8px 6px;text-align:center;color:#6b7280;font-weight:600;font-size:11px">เข้า</th>
            <th style="padding:8px 6px;text-align:center;color:#6b7280;font-weight:600;font-size:11px">ออก</th>
            <th style="padding:8px 6px;text-align:center;color:#6b7280;font-weight:600;font-size:11px">ชม.</th>
            <th style="padding:8px 6px;text-align:center;color:#6b7280;font-weight:600;font-size:11px">OT</th>
            <th style="padding:8px 10px;text-align:left;color:#6b7280;font-weight:600;font-size:11px">สถานะ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

// ============================================================
// 5e. OVERTIME SECTION
// ============================================================
/**
 * Render Overtime Summary Section
 * @param {Array} records
 */
function renderOvertimeSection(records) {
  const container = document.getElementById('att-overtime-section');
  if (!container) return;

  const salary = _getUserSalary_();
  const dailyRate = salary / 26; // 26 วันทำงาน/เดือน
  const hourlyRate = dailyRate / NORMAL_HOURS_PER_DAY;
  const otRate = hourlyRate * OT_RATE_MULTIPLIER;

  let totalOT = 0;
  (records || []).forEach(r => {
    const hours = parseFloat(r.hours_worked || 0);
    totalOT += Math.max(0, hours - NORMAL_HOURS_PER_DAY);
  });

  const otPay = totalOT * otRate;

  container.innerHTML = `
    <div style="background:#fffbeb;border:1px solid #fde047;border-radius:10px;padding:14px">
      <div style="font-size:13px;font-weight:700;color:#92400e;margin-bottom:10px">
        <i class="bi bi-clock-history" style="margin-right:6px"></i>สรุปการทำงานล่วงเวลา (OT)
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
        <div>
          <div style="color:#6b7280">ชั่วโมง OT รวม</div>
          <div style="font-weight:800;font-size:18px;color:#92400e">${totalOT.toFixed(2)} ชม.</div>
        </div>
        <div>
          <div style="color:#6b7280">ค่า OT โดยประมาณ</div>
          <div style="font-weight:800;font-size:18px;color:#22c55e">
            ${salary > 0 ? `฿${_fmt_(otPay)}` : 'ไม่ระบุเงินเดือน'}
          </div>
        </div>
        <div>
          <div style="color:#6b7280">อัตรา OT/ชม.</div>
          <div style="font-weight:600;color:#374151">${salary > 0 ? `฿${_fmt_(otRate)}` : '-'}</div>
        </div>
        <div>
          <div style="color:#6b7280">ปกติ/วัน</div>
          <div style="font-weight:600;color:#374151">${NORMAL_HOURS_PER_DAY} ชม.</div>
        </div>
      </div>
      ${salary === 0 ? `<div style="font-size:11px;color:#9ca3af;margin-top:8px">* ตั้งค่าเงินเดือนในโปรไฟล์เพื่อคำนวณค่า OT</div>` : ''}
    </div>`;
}

// ============================================================
// 5f. TODAY STATUS
// ============================================================
/**
 * Render Today Status Card
 */
function renderTodayStatus() {
  const container = document.getElementById('att-today-status');
  if (!container) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  let elapsed = '';
  if (ATT.isClockedIn && ATT.clockInTime) {
    const ms = now - ATT.clockInTime;
    const h  = Math.floor(ms / 3600000);
    const m  = Math.floor((ms % 3600000) / 60000);
    elapsed  = `${h} ชม. ${m} นาที`;
  }

  const clockInStr  = ATT.todayRecord?.clock_in  || '-';
  const clockOutStr = ATT.todayRecord?.clock_out  || '-';
  const hoursStr    = ATT.todayRecord?.hours_worked ? `${parseFloat(ATT.todayRecord.hours_worked).toFixed(2)} ชม.` : '-';

  container.innerHTML = `
    <!-- Clock display -->
    <div style="text-align:center;padding:16px 0 8px">
      <div id="att-live-clock" style="font-size:36px;font-weight:800;color:#111827;font-variant-numeric:tabular-nums;letter-spacing:2px">${timeStr}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px">${now.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
    </div>

    <!-- Status badge -->
    <div style="text-align:center;margin-bottom:16px">
      <span style="background:${ATT.isClockedIn ? '#d1fae5' : '#f3f4f6'};color:${ATT.isClockedIn ? '#065f46' : '#6b7280'};
        padding:6px 16px;border-radius:20px;font-size:13px;font-weight:700">
        ${ATT.isClockedIn ? `🟢 กำลังทำงาน — ${elapsed}` : (ATT.todayRecord?.clock_out ? '✅ ออกงานแล้ว' : '⚫ ยังไม่เข้างาน')}
      </span>
    </div>

    <!-- Time info -->
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px;text-align:center">
      <div style="background:#f9fafb;border-radius:8px;padding:10px">
        <div style="font-size:11px;color:#9ca3af;font-weight:600">เข้างาน</div>
        <div style="font-size:16px;font-weight:700;color:#111827;margin-top:2px">${clockInStr}</div>
      </div>
      <div style="background:#f9fafb;border-radius:8px;padding:10px">
        <div style="font-size:11px;color:#9ca3af;font-weight:600">ออกงาน</div>
        <div style="font-size:16px;font-weight:700;color:#111827;margin-top:2px">${clockOutStr}</div>
      </div>
      <div style="background:#f9fafb;border-radius:8px;padding:10px">
        <div style="font-size:11px;color:#9ca3af;font-weight:600">ชั่วโมง</div>
        <div style="font-size:16px;font-weight:700;color:#111827;margin-top:2px">${hoursStr}</div>
      </div>
    </div>

    <!-- Action buttons -->
    <div style="display:flex;gap:10px">
      <button id="att-clockin-btn" onclick="clockIn()"
        style="flex:1;padding:14px;background:${ATT.isClockedIn ? '#e5e7eb' : '#22c55e'};color:${ATT.isClockedIn ? '#9ca3af' : '#fff'};
          border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:${ATT.isClockedIn ? 'not-allowed' : 'pointer'}"
        ${ATT.isClockedIn ? 'disabled' : ''}>
        🟢 เข้างาน
      </button>
      <button id="att-clockout-btn" onclick="clockOut()"
        style="flex:1;padding:14px;background:${!ATT.isClockedIn ? '#e5e7eb' : '#ef4444'};color:${!ATT.isClockedIn ? '#9ca3af' : '#fff'};
          border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:${!ATT.isClockedIn ? 'not-allowed' : 'pointer'}"
        ${!ATT.isClockedIn ? 'disabled' : ''}>
        🔴 ออกงาน
      </button>
    </div>

    <!-- GPS status -->
    <div style="text-align:center;margin-top:8px;font-size:11px;color:#9ca3af">
      ${ATT.lastGPS ? `📍 GPS: ${ATT.lastGPS.lat.toFixed(4)}, ${ATT.lastGPS.lng.toFixed(4)} (±${Math.round(ATT.lastGPS.accuracy)}m)` : '📍 GPS: ยังไม่ได้รับตำแหน่ง'}
    </div>`;
}

// ============================================================
// HTML BUILDERS
// ============================================================
function _buildAttendanceHTML_() {
  const techName = (APP && APP.user && APP.user.name) || '';
  const month    = ATT.currentMonth || '';

  return `
    <!-- Header -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px 8px">
      <div>
        <div style="font-size:16px;font-weight:700;color:#111827">เวลาทำงาน</div>
        <div style="font-size:12px;color:#6b7280">${techName} · ${month}</div>
      </div>
      <button onclick="loadAttendancePage()"
        style="padding:7px 10px;background:#f3f4f6;border:none;border-radius:8px;cursor:pointer;font-size:16px" title="รีเฟรช">
        <i class="bi bi-arrow-clockwise"></i>
      </button>
    </div>

    <!-- Today Status -->
    <div style="padding:0 12px 12px">
      <div style="background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <div id="att-today-status"></div>
      </div>
    </div>

    <!-- Monthly Report -->
    <div style="padding:0 12px 12px">
      <div style="background:#fff;border-radius:12px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="font-size:13px;font-weight:700;color:#374151">
            <i class="bi bi-calendar3" style="color:#3b82f6;margin-right:6px"></i>รายงานประจำเดือน
          </div>
          <button onclick="exportAttendanceCSV()"
            style="padding:5px 10px;background:#f3f4f6;border:none;border-radius:6px;font-size:11px;cursor:pointer;color:#374151">
            📥 Export CSV
          </button>
        </div>
        <div id="att-monthly-table"></div>
      </div>
    </div>

    <!-- Overtime Section -->
    <div style="padding:0 12px 20px">
      <div id="att-overtime-section"></div>
    </div>`;
}

function _buildAttendanceSkeleton_() {
  return `
    <style>@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }</style>
    <div style="padding:12px">
      <div style="height:200px;background:#f3f4f6;border-radius:12px;margin-bottom:12px;animation:pulse 1.5s infinite"></div>
      <div style="height:300px;background:#f3f4f6;border-radius:12px;animation:pulse 1.5s infinite"></div>
    </div>`;
}

function _buildAttendanceError_(msg) {
  return `
    <div style="text-align:center;padding:40px 20px">
      <div style="font-size:40px;margin-bottom:12px">⏰</div>
      <div style="font-weight:600;color:#374151;margin-bottom:6px">โหลดข้อมูลไม่สำเร็จ</div>
      <div style="font-size:12px;color:#9ca3af;margin-bottom:16px">${msg}</div>
      <button onclick="loadAttendancePage()"
        style="padding:10px 20px;background:#3b82f6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">
        ลองใหม่
      </button>
    </div>`;
}

// ============================================================
// LIVE CLOCK TIMER
// ============================================================
let _clockTimerId = null;

function _startClockTimer_() {
  _stopClockTimer_();
  _clockTimerId = setInterval(() => {
    const el = document.getElementById('att-live-clock');
    if (el) {
      el.textContent = new Date().toLocaleTimeString('th-TH', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
    }
    // อัปเดต elapsed time
    if (ATT.isClockedIn && ATT.clockInTime) {
      const statusEl = document.querySelector('#att-today-status .att-elapsed');
      if (statusEl) {
        const ms = Date.now() - ATT.clockInTime;
        const h  = Math.floor(ms / 3600000);
        const m  = Math.floor((ms % 3600000) / 60000);
        statusEl.textContent = `${h} ชม. ${m} นาที`;
      }
    }
  }, 1000);
}

function _stopClockTimer_() {
  if (_clockTimerId) {
    clearInterval(_clockTimerId);
    _clockTimerId = null;
  }
}

// ============================================================
// GPS HELPER
// ============================================================
/**
 * ดึง GPS position
 * @return {Promise<GeolocationPosition>}
 */
function _getGPS_() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GPS ไม่รองรับในเบราว์เซอร์นี้'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 60000,
    });
  });
}

// ============================================================
// EXPORT CSV
// ============================================================
/**
 * Export Attendance เป็น CSV
 */
function exportAttendanceCSV() {
  const records = ATT.monthlyData;
  if (!records || records.length === 0) {
    showToast('ไม่มีข้อมูลที่จะ export');
    return;
  }

  const techName = (APP && APP.user && APP.user.name) || 'UNKNOWN';
  const rows = [['วันที่', 'ชื่อช่าง', 'เข้างาน', 'ออกงาน', 'ชั่วโมง', 'OT (ชม.)', 'สถานะ']];

  records.forEach(r => {
    const hours = parseFloat(r.hours_worked || 0);
    const ot    = Math.max(0, hours - NORMAL_HOURS_PER_DAY);
    rows.push([
      r.date || '',
      techName,
      r.clock_in  || '',
      r.clock_out || '',
      hours.toFixed(2),
      ot.toFixed(2),
      r.status || '',
    ]);
  });

  const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `Attendance_${techName}_${ATT.currentMonth}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ Export CSV สำเร็จ');
}

// ============================================================
// HELPERS
// ============================================================
function _getUserSalary_() {
  try {
    return parseFloat(localStorage.getItem('cpa_salary') || '0') || 0;
  } catch (_) { return 0; }
}

function _fmt_(num) {
  return Number(num || 0).toLocaleString('th-TH', { maximumFractionDigits: 2 });
}

// ============================================================
// EXPOSE GLOBALS
// ============================================================
window.loadAttendancePage    = loadAttendancePage;
window.clockIn               = clockIn;
window.clockOut              = clockOut;
window.renderMonthlyReport   = renderMonthlyReport;
window.renderOvertimeSection = renderOvertimeSection;
window.renderTodayStatus     = renderTodayStatus;
window.exportAttendanceCSV   = exportAttendanceCSV;
