// ============================================================
// COMPHONE SUPER APP — Warranty Section UI
// File: pwa/warranty_section.js
// ============================================================

// ---- Global State ----
var _warrantyData = [];
var _warrantyDueData = [];
var _warrantyFilter = { status: 'ALL', search: '' };

// ============================================================
// 1. renderWarrantySection(data) — Main Section Renderer
// ============================================================
function renderWarrantySection(data) {
  setActiveNav('warranty');
  document.getElementById('topbar-title').innerHTML = '🛡️ ระบบประกัน (Warranty)';

  _warrantyFilter = { status: 'ALL', search: '' };

  document.getElementById('main-content').innerHTML =
    '<div id="warranty-kpi-row" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">' +
      '<div style="background:#f0f9ff;border-radius:12px;padding:16px;text-align:center">' +
        '<div style="font-size:24px;font-weight:700;color:#3b82f6" id="w-kpi-total">-</div>' +
        '<div style="font-size:13px;color:#6b7280;margin-top:4px">ประกันทั้งหมด</div>' +
      '</div>' +
      '<div style="background:#f0fdf4;border-radius:12px;padding:16px;text-align:center">' +
        '<div style="font-size:24px;font-weight:700;color:#059669" id="w-kpi-active">-</div>' +
        '<div style="font-size:13px;color:#6b7280;margin-top:4px">ยังมีผล</div>' +
      '</div>' +
      '<div style="background:#fffbeb;border-radius:12px;padding:16px;text-align:center">' +
        '<div style="font-size:24px;font-weight:700;color:#d97706" id="w-kpi-due">-</div>' +
        '<div style="font-size:13px;color:#6b7280;margin-top:4px">ใกล้หมดอายุ</div>' +
      '</div>' +
      '<div style="background:#fef2f2;border-radius:12px;padding:16px;text-align:center">' +
        '<div style="font-size:24px;font-weight:700;color:#ef4444" id="w-kpi-expired">-</div>' +
        '<div style="font-size:13px;color:#6b7280;margin-top:4px">หมดอายุแล้ว</div>' +
      '</div>' +
    '</div>' +

    '<div id="warranty-due-alert" style="display:none;margin-bottom:16px;"></div>' +

    '<div class="card-box" style="margin-bottom:16px;">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;">' +
        '<div class="card-title" style="margin:0;">📋 รายการประกัน</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button onclick="_showWarrantyDue()" style="background:#d97706;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">⚠️ ใกล้หมดอายุ</button>' +
          '<button onclick="_showCreateWarranty()" style="background:#3b82f6;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer">+ สร้างประกัน</button>' +
        '</div>' +
      '</div>' +

      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">' +
        '<input type="text" id="warranty-search" placeholder="ค้นหา Job ID / ชื่อลูกค้า / รุ่นอุปกรณ์..." ' +
          'style="flex:1;min-width:220px;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;" ' +
          'oninput="_warrantyFilter.search=this.value;_filterAndRenderWarranties()">' +
        '<select id="warranty-status-filter" ' +
          'style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;min-width:140px;" ' +
          'onchange="_warrantyFilter.status=this.value;_filterAndRenderWarranties()">' +
          '<option value="ALL">ทั้งหมด</option>' +
          '<option value="ACTIVE">ACTIVE</option>' +
          '<option value="EXPIRED">EXPIRED</option>' +
          '<option value="CLAIMED">CLAIMED</option>' +
          '<option value="VOIDED">VOIDED</option>' +
        '</select>' +
      '</div>' +

      '<div id="warranty-table-wrap"><div style="text-align:center;padding:24px;color:#6b7280;">กำลังโหลด...</div></div>' +
    '</div>';

  _listWarranties();
}

// ============================================================
// 2. _listWarranties() — Fetch and display all warranties
// ============================================================
function _listWarranties() {
  callGas('listWarranties', {}).then(function(res) {
    if (!res || !res.success) {
      document.getElementById('warranty-table-wrap').innerHTML =
        '<div style="text-align:center;padding:24px;color:#ef4444;">ไม่สามารถโหลดข้อมูลประกันได้</div>';
      return;
    }
    _warrantyData = res.warranties || [];
    _updateWarrantyKPIs();
    _checkWarrantyDueAlert();
    _filterAndRenderWarranties();
  }).catch(function(err) {
    document.getElementById('warranty-table-wrap').innerHTML =
      '<div style="text-align:center;padding:24px;color:#ef4444;">เกิดข้อผิดพลาด: ' + (err.message || err) + '</div>';
  });
}

// ---- Update KPI Cards ----
function _updateWarrantyKPIs() {
  var total = _warrantyData.length;
  var now = new Date();
  var in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  var active = 0, dueCount = 0, expired = 0;

  _warrantyData.forEach(function(w) {
    var status = (w.Status || '').toUpperCase();
    if (status === 'ACTIVE') {
      active++;
      var endDate = new Date(w.End_Date);
      if (endDate <= in30 && endDate >= now) {
        dueCount++;
      }
    }
    if (status === 'EXPIRED') expired++;
  });

  var el;
  el = document.getElementById('w-kpi-total');   if (el) el.textContent = total;
  el = document.getElementById('w-kpi-active');   if (el) el.textContent = active;
  el = document.getElementById('w-kpi-due');      if (el) el.textContent = dueCount;
  el = document.getElementById('w-kpi-expired');  if (el) el.textContent = expired;
}

// ---- Check & show due alert banner ----
function _checkWarrantyDueAlert() {
  var now = new Date();
  var in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  var dueList = _warrantyData.filter(function(w) {
    var status = (w.Status || '').toUpperCase();
    if (status !== 'ACTIVE') return false;
    var endDate = new Date(w.End_Date);
    return endDate <= in30 && endDate >= now;
  });

  var alertEl = document.getElementById('warranty-due-alert');
  if (!alertEl) return;

  if (dueList.length > 0) {
    alertEl.style.display = 'block';
    alertEl.innerHTML =
      '<div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:10px;cursor:pointer" ' +
        'onclick="_showWarrantyDue()">' +
        '<span style="font-size:20px;">⚠️</span>' +
        '<div>' +
          '<div style="font-weight:600;color:#92400e;font-size:14px;">ประกันใกล้หมดอายุ ' + dueList.length + ' รายการ</div>' +
          '<div style="font-size:12px;color:#a16207;">คลิกเพื่อดูรายละเอียด</div>' +
        '</div>' +
        '<span style="margin-left:auto;color:#d97706;font-weight:600;">▶</span>' +
      '</div>';
  } else {
    alertEl.style.display = 'none';
  }
}

// ---- Filter & Render Table ----
function _filterAndRenderWarranties() {
  var search = (_warrantyFilter.search || '').toLowerCase();
  var statusFilter = (_warrantyFilter.status || 'ALL').toUpperCase();

  var filtered = _warrantyData.filter(function(w) {
    var matchStatus = statusFilter === 'ALL' || (w.Status || '').toUpperCase() === statusFilter;
    if (!matchStatus) return false;
    if (!search) return true;
    var haystack = [
      w.Warranty_ID, w.Job_ID, w.Customer_Name, w.Phone, w.Device_Model,
      w.Service_Type, w.Parts_Used
    ].join(' ').toLowerCase();
    return haystack.indexOf(search) !== -1;
  });

  if (filtered.length === 0) {
    document.getElementById('warranty-table-wrap').innerHTML =
      '<div style="text-align:center;padding:24px;color:#6b7280;">ไม่พบรายการประกัน</div>';
    return;
  }

  var html =
    '<table class="job-table">' +
      '<thead>' +
        '<tr>' +
          '<th>Warranty ID</th>' +
          '<th>Job ID</th>' +
          '<th>ลูกค้า</th>' +
          '<th>เบอร์โทร</th>' +
          '<th>อุปกรณ์</th>' +
          '<th>ประเภทบริการ</th>' +
          '<th>วันประกัน</th>' +
          '<th>วันที่เริ่ม</th>' +
          '<th>วันหมดอายุ</th>' +
          '<th>สถานะ</th>' +
          '<th>เคลม</th>' +
          '<th>จัดการ</th>' +
        '</tr>' +
      '</thead>' +
      '<tbody>';

  filtered.forEach(function(w) {
    var statusBadge = _warrantyStatusBadge(w.Status);
    var claimInfo = (w.Claim_Count || 0) > 0
      ? '<span style="color:#d97706;font-weight:600;">' + w.Claim_Count + ' ครั้ง</span>'
      : '<span style="color:#6b7280;">0</span>';

    html +=
      '<tr style="cursor:pointer;" ondblclick="_showWarrantyDetail(\'' + (w.Warranty_ID || '') + '\')">' +
        '<td><strong>' + _escHtml(w.Warranty_ID || '-') + '</strong></td>' +
        '<td>' + _escHtml(w.Job_ID || '-') + '</td>' +
        '<td>' + _escHtml(w.Customer_Name || '-') + '</td>' +
        '<td>' + _escHtml(w.Phone || '-') + '</td>' +
        '<td>' + _escHtml(w.Device_Model || '-') + '</td>' +
        '<td>' + _escHtml(w.Service_Type || '-') + '</td>' +
        '<td>' + (w.Warranty_Days || '-') + '</td>' +
        '<td>' + _fmtDate(w.Start_Date) + '</td>' +
        '<td>' + _fmtDate(w.End_Date) + '</td>' +
        '<td>' + statusBadge + '</td>' +
        '<td>' + claimInfo + '</td>' +
        '<td>' +
          '<button onclick="event.stopPropagation();_showWarrantyDetail(\'' + (w.Warranty_ID || '') + '\')" ' +
            'style="background:#3b82f6;color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;">ดู</button>' +
        '</td>' +
      '</tr>';
  });

  html += '</tbody></table>';
  document.getElementById('warranty-table-wrap').innerHTML = html;
}

// ============================================================
// 3. _showWarrantyDetail(warrantyId) — Detail Modal
// ============================================================
function _showWarrantyDetail(warrantyId) {
  var w = _findWarrantyById(warrantyId);
  if (!w) {
    alert('ไม่พบข้อมูลประกัน');
    return;
  }

  var statusBadge = _warrantyStatusBadge(w.Status);
  var canUpdate = (w.Status || '').toUpperCase() === 'ACTIVE';

  var html =
    '<div id="warranty-detail-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;" ' +
      'onclick="if(event.target===this)this.remove()">' +
      '<div style="background:#fff;border-radius:16px;max-width:640px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;">' +

        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
          '<h3 style="margin:0;font-size:18px;">🛡️ รายละเอียดประกัน</h3>' +
          '<button onclick="document.getElementById(\'warranty-detail-modal\').remove()" ' +
            'style="background:#6b7280;color:#fff;border:none;padding:6px 14px;border-radius:8px;font-size:13px;cursor:pointer;">ปิด</button>' +
        '</div>' +

        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">' +
          _detailRow('Warranty ID', w.Warranty_ID) +
          _detailRow('Job ID', w.Job_ID) +
          _detailRow('Customer ID', w.Customer_ID) +
          _detailRow('ชื่อลูกค้า', w.Customer_Name) +
          _detailRow('เบอร์โทร', w.Phone) +
          _detailRow('อุปกรณ์', w.Device_Model) +
          _detailRow('ประเภทบริการ', w.Service_Type) +
          _detailRow('อะไหล่ที่ใช้', w.Parts_Used) +
          _detailRow('วันประกัน', w.Warranty_Days + ' วัน') +
          _detailRow('วันที่เริ่ม', _fmtDate(w.Start_Date)) +
          _detailRow('วันหมดอายุ', _fmtDate(w.End_Date)) +
          '<div>' +
            '<div style="color:#6b7280;font-size:12px;">สถานะ</div>' +
            '<div style="margin-top:2px;">' + statusBadge + '</div>' +
          '</div>' +
          _detailRow('จำนวนเคลม', w.Claim_Count || 0) +
          _detailRow('เคลมล่าสุด', _fmtDate(w.Last_Claim_Date)) +
          _detailRow('หมายเหตุเคลม', w.Last_Claim_Note) +
          _detailRow('สร้างโดย', w.Created_By) +
          _detailRow('วันที่สร้าง', _fmtDateTime(w.Created_At)) +
          _detailRow('อัปเดตล่าสุด', _fmtDateTime(w.Updated_At)) +
          _detailRow('หมายเหตุ', w.Notes) +
        '</div>' +

        (w.Warranty_PDF_URL
          ? '<div style="margin-top:14px;">' +
              '<a href="' + _escHtml(w.Warranty_PDF_URL) + '" target="_blank" ' +
                'style="color:#3b82f6;text-decoration:underline;font-size:13px;">📄 ดูเอกสาร PDF</a>' +
            '</div>'
          : '') +

        '<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">' +
          (canUpdate
            ? '<button onclick="_doUpdateWarrantyStatus(\'' + w.Warranty_ID + '\',\'CLAIMED\')" ' +
                'style="background:#d97706;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;">📝 เคลมประกัน</button>' +
              '<button onclick="_doUpdateWarrantyStatus(\'' + w.Warranty_ID + '\',\'VOIDED\')" ' +
                'style="background:#6b7280;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;">🚫 ยกเลิกประกัน</button>'
            : '') +
        '</div>' +

      '</div>' +
    '</div>';

  var existing = document.getElementById('warranty-detail-modal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

// ============================================================
// 4. _showCreateWarranty() — Create New Warranty Form Modal
// ============================================================
function _showCreateWarranty() {
  var html =
    '<div id="warranty-create-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px;" ' +
      'onclick="if(event.target===this)this.remove()">' +
      '<div style="background:#fff;border-radius:16px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;">' +

        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">' +
          '<h3 style="margin:0;font-size:18px;">🛡️ สร้างประกันใหม่</h3>' +
          '<button onclick="document.getElementById(\'warranty-create-modal\').remove()" ' +
            'style="background:#6b7280;color:#fff;border:none;padding:6px 14px;border-radius:8px;font-size:13px;cursor:pointer;">ปิด</button>' +
        '</div>' +

        '<div style="display:flex;flex-direction:column;gap:12px;">' +

          _formField('wc-job-id', 'Job ID *', 'text', 'เช่น JOB-20250101-001') +
          _formField('wc-customer', 'ชื่อลูกค้า *', 'text', 'ชื่อ-นามสกุล') +
          _formField('wc-phone', 'เบอร์โทร *', 'tel', '0xx-xxx-xxxx') +
          _formField('wc-device', 'รุ่นอุปกรณ์ *', 'text', 'เช่น iPhone 15 Pro') +
          _formField('wc-service', 'ประเภทบริการ', 'text', 'เช่น เปลี่ยนแบตเตอรี่') +
          _formField('wc-parts', 'อะไหล่ที่ใช้', 'text', 'เช่น Battery OEM') +
          _formField('wc-days', 'จำนวนวันประกัน *', 'number', '90') +

        '</div>' +

        '<div style="margin-top:18px;display:flex;gap:8px;justify-content:flex-end;">' +
          '<button onclick="document.getElementById(\'warranty-create-modal\').remove()" ' +
            'style="background:#6b7280;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;">ยกเลิก</button>' +
          '<button onclick="_doCreateWarranty()" ' +
            'style="background:#3b82f6;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;">✅ สร้างประกัน</button>' +
        '</div>' +

      '</div>' +
    '</div>';

  var existing = document.getElementById('warranty-create-modal');
  if (existing) existing.remove();
  document.body.insertAdjacentHTML('beforeend', html);
}

// ============================================================
// 5. _doCreateWarranty() — Execute Create via API
// ============================================================
function _doCreateWarranty() {
  var jobId       = _getVal('wc-job-id');
  var customer    = _getVal('wc-customer');
  var phone       = _getVal('wc-phone');
  var device      = _getVal('wc-device');
  var service     = _getVal('wc-service');
  var parts       = _getVal('wc-parts');
  var days        = _getVal('wc-days');

  if (!jobId || !customer || !phone || !device || !days) {
    alert('กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน');
    return;
  }

  var params = {
    job_id: jobId,
    customer_name: customer,
    phone: phone,
    device_model: device,
    service_type: service || '',
    parts_used: parts || '',
    warranty_days: parseInt(days, 10) || 90,
    user: window._currentUser || 'system'
  };

  var btn = document.querySelector('#warranty-create-modal button[onclick="_doCreateWarranty()"]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ กำลังสร้าง...';
  }

  callGas('createWarranty', params).then(function(res) {
    var modal = document.getElementById('warranty-create-modal');
    if (modal) modal.remove();

    if (res && res.success) {
      _showToast('สร้างประกันสำเร็จ ✅', 'success');
      _listWarranties();
    } else {
      alert('สร้างประกันไม่สำเร็จ: ' + (res && res.message ? res.message : 'Unknown error'));
    }
  }).catch(function(err) {
    alert('เกิดข้อผิดพลาด: ' + (err.message || err));
    if (btn) {
      btn.disabled = false;
      btn.textContent = '✅ สร้างประกัน';
    }
  });
}

// ============================================================
// 6. _doUpdateWarrantyStatus(warrantyId, newStatus)
// ============================================================
function _doUpdateWarrantyStatus(warrantyId, newStatus) {
  var label = newStatus === 'CLAIMED' ? 'เคลมประกัน' : 'ยกเลิกประกัน';
  var note = prompt('หมายเหตุ (' + label + '):', '');
  if (note === null) return;

  var params = {
    warranty_id: warrantyId,
    status: newStatus,
    note: note || ''
  };

  callGas('updateWarrantyStatus', params).then(function(res) {
    var modal = document.getElementById('warranty-detail-modal');
    if (modal) modal.remove();

    if (res && res.success) {
      _showToast(label + ' สำเร็จ ✅', 'success');
      _listWarranties();
    } else {
      alert(label + ' ไม่สำเร็จ: ' + (res && res.message ? res.message : 'Unknown error'));
    }
  }).catch(function(err) {
    alert('เกิดข้อผิดพลาด: ' + (err.message || err));
  });
}

// ============================================================
// 7. _showWarrantyDue() — Show warranties expiring soon
// ============================================================
function _showWarrantyDue() {
  document.getElementById('main-content').innerHTML =
    '<div style="margin-bottom:12px;">' +
      '<button onclick="renderWarrantySection()" ' +
        'style="background:#3b82f6;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;">← กลับรายการประกัน</button>' +
    '</div>' +
    '<div class="card-box">' +
      '<div class="card-title">⚠️ ประกันใกล้หมดอายุ (ภายใน 30 วัน)</div>' +
      '<div id="warranty-due-wrap"><div style="text-align:center;padding:24px;color:#6b7280;">กำลังโหลด...</div></div>' +
    '</div>';

  callGas('getWarrantyDue', {}).then(function(res) {
    if (!res || !res.success) {
      document.getElementById('warranty-due-wrap').innerHTML =
        '<div style="text-align:center;padding:24px;color:#ef4444;">ไม่สามารถโหลดข้อมูล</div>';
      return;
    }

    _warrantyDueData = res.due || [];

    if (_warrantyDueData.length === 0) {
      document.getElementById('warranty-due-wrap').innerHTML =
        '<div style="text-align:center;padding:24px;color:#059669;">✅ ไม่มีประกันใกล้หมดอายุ</div>';
      return;
    }

    var html =
      '<table class="job-table">' +
        '<thead>' +
          '<tr>' +
            '<th>Warranty ID</th>' +
            '<th>Job ID</th>' +
            '<th>ลูกค้า</th>' +
            '<th>อุปกรณ์</th>' +
            '<th>วันหมดอายุ</th>' +
            '<th>คงเหลือ (วัน)</th>' +
            '<th>จัดการ</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>';

    var now = new Date();
    _warrantyDueData.forEach(function(w) {
      var endDate = new Date(w.End_Date);
      var daysLeft = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
      var urgencyColor = daysLeft <= 7 ? '#ef4444' : daysLeft <= 14 ? '#d97706' : '#3b82f6';

      html +=
        '<tr>' +
          '<td><strong>' + _escHtml(w.Warranty_ID || '-') + '</strong></td>' +
          '<td>' + _escHtml(w.Job_ID || '-') + '</td>' +
          '<td>' + _escHtml(w.Customer_Name || '-') + '</td>' +
          '<td>' + _escHtml(w.Device_Model || '-') + '</td>' +
          '<td>' + _fmtDate(w.End_Date) + '</td>' +
          '<td style="text-align:center;">' +
            '<span style="background:' + urgencyColor + ';color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">' +
              daysLeft + ' วัน' +
            '</span>' +
          '</td>' +
          '<td>' +
            '<button onclick="_showWarrantyDetail(\'' + (w.Warranty_ID || '') + '\')" ' +
              'style="background:#3b82f6;color:#fff;border:none;padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer;">ดู</button>' +
          '</td>' +
        '</tr>';
    });

    html += '</tbody></table>';
    document.getElementById('warranty-due-wrap').innerHTML = html;

  }).catch(function(err) {
    document.getElementById('warranty-due-wrap').innerHTML =
      '<div style="text-align:center;padding:24px;color:#ef4444;">เกิดข้อผิดพลาด: ' + (err.message || err) + '</div>';
  });
}

// ============================================================
// Utility Functions
// ============================================================

function _findWarrantyById(id) {
  for (var i = 0; i < _warrantyData.length; i++) {
    if (_warrantyData[i].Warranty_ID === id) return _warrantyData[i];
  }
  return null;
}

function _warrantyStatusBadge(status) {
  var s = (status || '').toUpperCase();
  var colors = {
    'ACTIVE':  { bg: '#dcfce7', color: '#166534' },
    'EXPIRED': { bg: '#fee2e2', color: '#991b1b' },
    'CLAIMED': { bg: '#fef3c7', color: '#92400e' },
    'VOIDED':  { bg: '#f3f4f6', color: '#6b7280' }
  };
  var c = colors[s] || colors['VOIDED'];
  return '<span style="background:' + c.bg + ';color:' + c.color + ';padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">' +
    _escHtml(s || 'N/A') + '</span>';
}

function _detailRow(label, value) {
  return '<div>' +
    '<div style="color:#6b7280;font-size:12px;">' + _escHtml(label) + '</div>' +
    '<div style="font-weight:500;margin-top:2px;">' + _escHtml(value != null ? String(value) : '-') + '</div>' +
  '</div>';
}

function _formField(id, label, type, placeholder) {
  return '<div>' +
    '<label style="font-size:13px;font-weight:500;color:#374151;display:block;margin-bottom:3px;">' + _escHtml(label) + '</label>' +
    '<input type="' + type + '" id="' + id + '" placeholder="' + _escHtml(placeholder || '') + '" ' +
      'style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box;">' +
  '</div>';
}

function _getVal(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function _fmtDate(dateStr) {
  if (!dateStr) return '-';
  try {
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return _escHtml(dateStr);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch (e) {
    return _escHtml(dateStr);
  }
}

function _fmtDateTime(dateStr) {
  if (!dateStr) return '-';
  try {
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return _escHtml(dateStr);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return _escHtml(dateStr);
  }
}

function _escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function _showToast(message, type) {
  var bgColor = type === 'success' ? '#059669' : type === 'error' ? '#ef4444' : '#3b82f6';
  var toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;top:20px;right:20px;background:' + bgColor + ';color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:slideIn .3s ease;';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function() {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s';
    setTimeout(function() { toast.remove(); }, 300);
  }, 3000);
}
