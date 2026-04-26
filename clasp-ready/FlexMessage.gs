// COMPHONE SUPER APP v5.9.0-phase2d
// ============================================================
// FlexMessage.gs - LINE Flex Message Templates
// ============================================================
// รองรับ Flex Message 4 ประเภท:
//   1. createJobFlexMessage_()     - แจ้งงานใหม่ (กลุ่มช่าง)
//   2. createStatusFlexMessage_()  - อัปเดตสถานะงาน
//   3. createSummaryFlexMessage_() - สรุปประจำวัน (กลุ่มผู้บริหาร)
//   4. createLowStockFlexMessage_()- แจ้งเตือนสต็อกต่ำ (กลุ่มจัดซื้อ)
//   5. createBillingFlexMessage_() - แจ้งใบเสร็จ/ชำระเงิน
// ============================================================

// ============================================================
// B1: Deep Link Helper — ชี้ไป PWA GitHub Pages
// ============================================================
var PWA_BASE_URL_ = 'https://comphone.github.io/comphone-superapp/pwa/';

var WEB_APP_BASE_URL_ = (function() {
  try {
    return getConfig('WEB_APP_URL') || '';
  } catch(e) { return ''; }
})();

/**
 * buildPwaDeepLink_(page, params)
 * สร้าง URL ไปยัง PWA ตรงหน้าที่ต้องการ
 * @param {string} page - ชื่อหน้า เช่น 'jobs', 'po', 'dashboard'
 * @param {Object} params - query params เพิ่มเติม เช่น { id: 'JOB-001' }
 * @returns {string} URL
 */
function buildPwaDeepLink_(page, params) {
  var base = PWA_BASE_URL_;
  var query = '?page=' + encodeURIComponent(page || 'home');
  if (params) {
    Object.keys(params).forEach(function(k) {
      query += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(String(params[k] || ''));
    });
  }
  return base + query;
}

// ============================================================
// 1. Flex Message — งานใหม่
// ============================================================
function createJobFlexMessage_(job) {
  job = job || {};
  var jobId    = String(job.job_id || job.id || '-');
  var customer = String(job.customer_name || job.customer || 'ลูกค้า');
  var symptom  = String(job.symptom || job.description || '-');
  var priority = String(job.priority || 'ปกติ');
  var address  = String(job.address || job.location || '-');
  var techName = String(job.technician || job.tech_name || 'ยังไม่มอบหมาย');
  var dueDate  = String(job.due_date || job.scheduled_date || '-');
  var dashUrl  = buildPwaDeepLink_('jobs', { id: jobId });

  var priorityColor = priority === 'ด่วน' ? '#E53935' : priority === 'สูง' ? '#FB8C00' : '#43A047';

  return {
    type: 'flex',
    altText: '🔧 งานใหม่: ' + jobId + ' | ' + customer,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1565C0',
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '🔧 งานใหม่',
                color: '#FFFFFF',
                size: 'sm',
                flex: 1
              },
              {
                type: 'text',
                text: priority,
                color: priorityColor,
                size: 'sm',
                align: 'end',
                weight: 'bold',
                decoration: 'none',
                style: 'normal'
              }
            ]
          },
          {
            type: 'text',
            text: jobId,
            color: '#FFFFFF',
            size: 'xl',
            weight: 'bold',
            margin: 'sm'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '16px',
        contents: [
          createFlexRow_('👤 ลูกค้า', customer),
          createFlexRow_('🔍 อาการ', symptom),
          createFlexRow_('📍 สถานที่', address),
          createFlexRow_('👨‍🔧 ช่าง', techName),
          createFlexRow_('📅 กำหนด', dueDate)
        ]
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        paddingAll: '12px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: 'ดูงาน',
              uri: dashUrl
            },
            style: 'primary',
            color: '#1565C0',
            height: 'sm',
            flex: 1
          },
          {
            type: 'button',
            action: {
              type: 'message',
              label: 'รับงาน',
              text: jobId + ' รับงานแล้ว'
            },
            style: 'secondary',
            height: 'sm',
            flex: 1
          }
        ]
      }
    }
  };
}

// ============================================================
// 2. Flex Message — อัปเดตสถานะงาน
// ============================================================
function createStatusFlexMessage_(job, newStatus) {
  job = job || {};
  var jobId    = String(job.job_id || job.id || '-');
  var customer = String(job.customer_name || job.customer || 'ลูกค้า');
  var techName = String(job.technician || job.tech_name || job.changed_by || '-');
  var statusLabel = String(newStatus || job.status_label || job.status || '-');
  var note     = String(job.note || '');
  var dashUrl  = buildPwaDeepLink_('jobs', { id: jobId });

  var statusEmoji = getStatusEmoji_(statusLabel);
  var statusColor = getStatusColor_(statusLabel);

  return {
    type: 'flex',
    altText: statusEmoji + ' ' + jobId + ': ' + statusLabel,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: statusColor,
        paddingAll: '14px',
        contents: [
          {
            type: 'text',
            text: statusEmoji + ' ' + statusLabel,
            color: '#FFFFFF',
            size: 'md',
            weight: 'bold'
          },
          {
            type: 'text',
            text: jobId + ' | ' + customer,
            color: '#FFFFFFCC',
            size: 'sm',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '14px',
        contents: [
          createFlexRow_('👨‍🔧 ช่าง', techName),
          createFlexRow_('🕐 เวลา', Utilities.formatDate(new Date(), 'Asia/Bangkok', 'HH:mm น.')),
          note ? createFlexRow_('📝 หมายเหตุ', note) : null
        ].filter(Boolean)
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '10px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: 'ดูรายละเอียดงาน',
              uri: dashUrl
            },
            style: 'link',
            height: 'sm',
            color: statusColor
          }
        ]
      }
    }
  };
}

// ============================================================
// 3. Flex Message — สรุปประจำวัน
// ============================================================
function createSummaryFlexMessage_(summary) {
  summary = summary || {};
  var totalJobs   = Number(summary.totalJobs   || 0);
  var openJobs    = Number(summary.openJobs    || 0);
  var doneJobs    = Number(summary.doneJobs    || 0);
  var overdueJobs = Number(summary.overdueJobs || 0);
  var revenue     = summary.revenue || {};
  var todayRev    = Number(revenue.today || 0).toLocaleString('th-TH');
  var monthRev    = Number(revenue.month || 0).toLocaleString('th-TH');
  var lowStock    = Number(summary.lowStock || 0);
  var dateStr     = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy');
  var dashUrl     = buildPwaDeepLink_('dashboard');

  return {
    type: 'flex',
    altText: '📊 สรุปประจำวัน ' + dateStr,
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#37474F',
        paddingAll: '16px',
        contents: [
          {
            type: 'text',
            text: '📊 สรุปประจำวัน',
            color: '#FFFFFF',
            size: 'sm'
          },
          {
            type: 'text',
            text: dateStr,
            color: '#FFFFFF',
            size: 'xl',
            weight: 'bold',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '16px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              createStatBox_('งานทั้งหมด', String(totalJobs), '#1565C0'),
              createStatBox_('เปิดอยู่', String(openJobs), '#FB8C00'),
              createStatBox_('เสร็จแล้ว', String(doneJobs), '#43A047')
            ]
          },
          {
            type: 'separator',
            margin: 'md'
          },
          createFlexRow_('💰 รายได้วันนี้', todayRev + ' บาท'),
          createFlexRow_('📈 รายได้เดือนนี้', monthRev + ' บาท'),
          overdueJobs > 0 ? createFlexRow_('⚠️ งานเกินกำหนด', String(overdueJobs) + ' งาน') : null,
          lowStock > 0 ? createFlexRow_('📦 สต็อกต่ำ', String(lowStock) + ' รายการ') : null
        ].filter(Boolean)
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '10px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: 'เปิด Dashboard',
              uri: dashUrl
            },
            style: 'primary',
            color: '#1565C0',
            height: 'sm'
          },
          {
            type: 'button',
            action: {
              type: 'uri',
              label: 'สั่งซื้อ PO',
              uri: buildPwaDeepLink_('po')
            },
            style: 'secondary',
            height: 'sm'
          }
        ]
      }
    }
  };
}

// ============================================================
// 4. Flex Message — แจ้งเตือนสต็อกต่ำ
// ============================================================
function createLowStockFlexMessage_(items) {
  items = items || [];
  var dashUrl = buildPwaDeepLink_('po');

  var itemRows = [];
  for (var i = 0; i < Math.min(items.length, 6); i++) {
    var item = items[i] || {};
    itemRows.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'sm',
      contents: [
        {
          type: 'text',
          text: String(item.name || item.code || '-'),
          size: 'sm',
          flex: 3,
          wrap: true,
          color: '#333333'
        },
        {
          type: 'text',
          text: 'คงเหลือ: ' + Number(item.qty || 0),
          size: 'sm',
          flex: 2,
          align: 'end',
          color: Number(item.qty || 0) === 0 ? '#E53935' : '#FB8C00',
          weight: 'bold'
        }
      ]
    });
  }

  return {
    type: 'flex',
    altText: '📦 แจ้งเตือน: สต็อกต่ำ ' + items.length + ' รายการ',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#E65100',
        paddingAll: '14px',
        contents: [
          {
            type: 'text',
            text: '📦 แจ้งเตือนสต็อกต่ำ',
            color: '#FFFFFF',
            size: 'md',
            weight: 'bold'
          },
          {
            type: 'text',
            text: items.length + ' รายการต้องสั่งซื้อ',
            color: '#FFFFFFCC',
            size: 'sm',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '14px',
        contents: itemRows.length > 0 ? itemRows : [
          { type: 'text', text: 'ไม่มีรายการสต็อกต่ำ', color: '#888888', size: 'sm' }
        ]
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        paddingAll: '10px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: 'จัดการสต็อก',
              uri: dashUrl
            },
            style: 'primary',
            color: '#E65100',
            height: 'sm',
            flex: 1
          },
          {
            type: 'button',
            action: {
              type: 'message',
              label: 'สั่งซื้อทั้งหมด',
              text: '#สั่งซื้อสต็อกต่ำ'
            },
            style: 'secondary',
            height: 'sm',
            flex: 1
          }
        ]
      }
    }
  };
}

// ============================================================
// 5. Flex Message — แจ้งใบเสร็จ/ชำระเงิน
// ============================================================
function createBillingFlexMessage_(billing) {
  billing = billing || {};
  var jobId     = String(billing.job_id || billing.id || '-');
  var customer  = String(billing.customer_name || billing.customer || 'ลูกค้า');
  var amount    = Number(billing.total || billing.amount || 0).toLocaleString('th-TH');
  var status    = String(billing.payment_status || billing.status || 'รอชำระ');
  var method    = String(billing.payment_method || '-');
  var billDate  = String(billing.bill_date || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy'));
  var dashUrl   = buildPwaDeepLink_('jobs', { id: jobId, tab: 'billing' });

  var isPaid = status === 'ชำระแล้ว' || status === 'paid';
  var headerColor = isPaid ? '#2E7D32' : '#1565C0';
  var headerText  = isPaid ? '✅ ชำระเงินแล้ว' : '💳 ใบเสร็จรับเงิน';

  return {
    type: 'flex',
    altText: headerText + ': ' + jobId + ' | ' + amount + ' บาท',
    contents: {
      type: 'bubble',
      size: 'kilo',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: headerColor,
        paddingAll: '14px',
        contents: [
          {
            type: 'text',
            text: headerText,
            color: '#FFFFFF',
            size: 'md',
            weight: 'bold'
          },
          {
            type: 'text',
            text: jobId + ' | ' + billDate,
            color: '#FFFFFFCC',
            size: 'sm',
            margin: 'xs'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '14px',
        contents: [
          createFlexRow_('👤 ลูกค้า', customer),
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            contents: [
              { type: 'text', text: '💰 ยอดรวม', size: 'sm', color: '#888888', flex: 2 },
              { type: 'text', text: amount + ' บาท', size: 'lg', color: headerColor, weight: 'bold', flex: 3, align: 'end' }
            ]
          },
          method !== '-' ? createFlexRow_('💳 วิธีชำระ', method) : null,
          {
            type: 'separator',
            margin: 'md'
          },
          {
            type: 'text',
            text: isPaid ? '✅ ชำระเงินเรียบร้อยแล้ว' : '⏳ รอการชำระเงิน',
            size: 'sm',
            color: isPaid ? '#2E7D32' : '#FB8C00',
            weight: 'bold',
            align: 'center',
            margin: 'md'
          }
        ].filter(Boolean)
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        paddingAll: '10px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: 'ดูใบเสร็จ',
              uri: dashUrl
            },
            style: 'primary',
            color: headerColor,
            height: 'sm',
            flex: 1
          },
          !isPaid ? {
            type: 'button',
            action: {
              type: 'message',
              label: 'ยืนยันชำระ',
              text: jobId + ' ชำระแล้ว'
            },
            style: 'secondary',
            height: 'sm',
            flex: 1
          } : null
        ].filter(Boolean)
      }
    }
  };
}

// ============================================================
// Helper Functions
// ============================================================
function createFlexRow_(label, value) {
  return {
    type: 'box',
    layout: 'horizontal',
    margin: 'sm',
    contents: [
      {
        type: 'text',
        text: String(label || ''),
        size: 'sm',
        color: '#888888',
        flex: 2,
        wrap: false
      },
      {
        type: 'text',
        text: String(value || '-'),
        size: 'sm',
        color: '#333333',
        flex: 3,
        wrap: true,
        align: 'end'
      }
    ]
  };
}

function createStatBox_(label, value, color) {
  return {
    type: 'box',
    layout: 'vertical',
    flex: 1,
    backgroundColor: color + '15',
    cornerRadius: '8px',
    paddingAll: '10px',
    contents: [
      {
        type: 'text',
        text: String(value || '0'),
        size: 'xl',
        weight: 'bold',
        color: color,
        align: 'center'
      },
      {
        type: 'text',
        text: String(label || ''),
        size: 'xs',
        color: '#888888',
        align: 'center',
        margin: 'xs'
      }
    ]
  };
}

function getStatusEmoji_(status) {
  var map = {
    'เดินทาง': '🚗', 'ถึงหน้างาน': '📍', 'เริ่มงาน': '🔧',
    'รอชิ้นส่วน': '⏳', 'งานเสร็จ': '✅', 'ลูกค้าตรวจรับ': '👍',
    'รอเก็บเงิน': '💰', 'เก็บเงินแล้ว': '💚', 'ปิดงานสมบูรณ์': '🎉',
    'เปิดงาน': '📋', 'มอบหมายงาน': '👨‍🔧'
  };
  for (var key in map) {
    if (status.indexOf(key) > -1) return map[key];
  }
  return '📌';
}

function getStatusColor_(status) {
  if (status.indexOf('เสร็จ') > -1 || status.indexOf('ปิด') > -1 || status.indexOf('ชำระ') > -1) return '#2E7D32';
  if (status.indexOf('รอ') > -1 || status.indexOf('เดินทาง') > -1) return '#FB8C00';
  if (status.indexOf('เปิด') > -1 || status.indexOf('มอบ') > -1) return '#1565C0';
  return '#37474F';
}

// ============================================================
// Push Flex Messages to LINE Groups
// ============================================================

/**
 * ส่ง Flex Message แจ้งงานใหม่ไปยังกลุ่มช่าง
 */
function notifyNewJobToTechnicians(job) {
  var groupId = getConfig('LINE_GROUP_TECHNICIAN') || '';
  if (!groupId) return { success: false, error: 'LINE_GROUP_TECHNICIAN not configured' };
  var flexMsg = createJobFlexMessage_(job);
  return pushLineMessage(groupId, [flexMsg]);
}

/**
 * ส่ง Flex Message อัปเดตสถานะไปยังกลุ่มที่เกี่ยวข้อง
 */
function notifyStatusUpdate(job, newStatus, targetGroups) {
  targetGroups = targetGroups || ['LINE_GROUP_TECHNICIAN'];
  var flexMsg = createStatusFlexMessage_(job, newStatus);
  var results = [];
  for (var i = 0; i < targetGroups.length; i++) {
    var groupId = getConfig(targetGroups[i]) || '';
    if (groupId) {
      results.push(pushLineMessage(groupId, [flexMsg]));
    }
  }
  return { success: true, sent: results.length };
}

/**
 * ส่งสรุปประจำวันไปยังกลุ่มผู้บริหาร
 */
function notifyDailySummaryToExecutive() {
  var groupId = getConfig('LINE_GROUP_EXECUTIVE') || '';
  if (!groupId) return { success: false, error: 'LINE_GROUP_EXECUTIVE not configured' };

  var dashboard = (typeof routeActionV55 === 'function') ? routeActionV55('getDashboardData', {}) : {};
  var summary = (dashboard && dashboard.summary) ? dashboard.summary : {};
  var flexMsg = createSummaryFlexMessage_(summary);
  return pushLineMessage(groupId, [flexMsg]);
}

/**
 * ส่งแจ้งเตือนสต็อกต่ำไปยังกลุ่มจัดซื้อ
 */
function notifyLowStockToProcurement(items) {
  var groupId = getConfig('LINE_GROUP_PROCUREMENT') || '';
  if (!groupId) return { success: false, error: 'LINE_GROUP_PROCUREMENT not configured' };
  if (!items || items.length === 0) return { success: false, error: 'No low stock items' };
  var flexMsg = createLowStockFlexMessage_(items);
  return pushLineMessage(groupId, [flexMsg]);
}

/**
 * ส่งแจ้งใบเสร็จไปยังกลุ่มบัญชี
 */
function notifyBillingToAccounting(billing) {
  var groupId = getConfig('LINE_GROUP_ACCOUNTING') || '';
  if (!groupId) return { success: false, error: 'LINE_GROUP_ACCOUNTING not configured' };
  var flexMsg = createBillingFlexMessage_(billing);
  return pushLineMessage(groupId, [flexMsg]);
}

/**
 * ส่งแจ้งใบเสร็จไปยังกลุ่มเซลส์
 */
function notifyBillingToSales(billing) {
  var groupId = getConfig('LINE_GROUP_SALES') || '';
  if (!groupId) return { success: false, error: 'LINE_GROUP_SALES not configured' };
  var flexMsg = createBillingFlexMessage_(billing);
  return pushLineMessage(groupId, [flexMsg]);
}
