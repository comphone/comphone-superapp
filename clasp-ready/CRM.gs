/**
 * CRM.gs — Customer Relationship Management Backend
 * COMPHONE SUPER APP V5.5 | Sprint 3
 *
 * Functions:
 *   getCustomerHistoryFull(params)  — ดึงประวัติลูกค้าครบ (jobs + audit + followup)
 *   getCustomerListWithStats(params) — ดึงรายชื่อลูกค้าพร้อม stats
 *   scheduleFollowUp_(params)       — บันทึกนัด follow-up ลง DB_FOLLOWUP
 *   logFollowUpResult_(params)      — บันทึกผลการติดต่อ
 *   getCRMFollowUpSchedule_(params) — ดึงตาราง follow-up 7 วันข้างหน้า
 *   getCRMMetrics_()                — Metric cards สำหรับ After-Sales Dashboard
 *   nudgeSalesTeam_()               — ส่ง LINE ไปยัง SALES group
 */

'use strict';

/* ─── Sheet helpers ─────────────────────────────────────────── */

/**
 * ดึงหรือสร้าง DB_FOLLOWUP sheet
 * @return {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getFollowUpSheet_() {
  const ss = getComphoneSheet();
  let sh = findSheetByName(ss, 'DB_FOLLOWUP');
  if (!sh) {
    sh = ss.insertSheet('DB_FOLLOWUP');
    sh.getRange(1, 1, 1, 9).setValues([[
      'followup_id', 'customer_id', 'customer_name', 'scheduled_date',
      'result', 'note', 'next_date', 'created_by', 'created_at'
    ]]);
    sh.setFrozenRows(1);
    SpreadsheetApp.flush();
  }
  return sh;
}

/* ─── Public API functions (called via Router.gs) ─────────── */

/**
 * ดึงประวัติลูกค้าครบ: jobs + audit events + followup records
 * @param {Object} params - { customer_id, customer_name, phone }
 * @return {Object} { success, customer, events[] }
 */
function getCustomerHistoryFull(params) {
  try {
    params = params || {};
    const ss = getComphoneSheet();

    /* 1. หาข้อมูลลูกค้า */
    const custSheet = findSheetByName(ss, 'CUSTOMERS');
    let customer = null;
    if (custSheet && custSheet.getLastRow() > 1) {
      const rows = custSheet.getDataRange().getValues();
      const hdr  = rows[0];
      const iId   = hdr.indexOf('customer_id');
      const iName = hdr.findIndex(h => /ชื่อ|name/i.test(h));
      const iPhone = hdr.findIndex(h => /เบอร์|phone/i.test(h));
      for (let r = 1; r < rows.length; r++) {
        const id    = String(rows[r][iId]   || '');
        const name  = String(rows[r][iName] || '');
        const phone = String(rows[r][iPhone]|| '');
        if (
          (params.customer_id   && id    === String(params.customer_id)) ||
          (params.customer_name && name  === params.customer_name) ||
          (params.phone         && phone === params.phone)
        ) {
          customer = { id, name, phone };
          break;
        }
      }
    }
    if (!customer) {
      customer = {
        id:    params.customer_id   || '',
        name:  params.customer_name || '',
        phone: params.phone         || ''
      };
    }

    const events = [];

    /* 2. Jobs จาก DBJOBS */
    const jobSheet = findSheetByName(ss, 'DBJOBS');
    if (jobSheet && jobSheet.getLastRow() > 1) {
      const rows = jobSheet.getDataRange().getValues();
      const hdr  = rows[0];
      const iJob    = hdr.findIndex(h => /JobID|job_id/i.test(h));
      const iCust   = hdr.findIndex(h => /ชื่อลูกค้า|Customer/i.test(h));
      const iSymp   = hdr.findIndex(h => /อาการ|Symptom|Issue/i.test(h));
      const iStat   = hdr.findIndex(h => /สถานะ|Status/i.test(h));
      const iTech   = hdr.findIndex(h => /ช่าง|Technician|tech/i.test(h));
      const iAmt    = hdr.findIndex(h => /ราคา|Amount|Price|total/i.test(h));
      const iMethod = hdr.findIndex(h => /วิธีชำระ|Payment|method/i.test(h));
      const iDate   = hdr.findIndex(h => /เวลาสร้าง|Created/i.test(h));
      for (let r = 1; r < rows.length; r++) {
        const custName = String(rows[r][iCust] || '');
        if (!customer.name || custName !== customer.name) continue;
        const dateVal = rows[r][iDate];
        events.push({
          type:       'job',
          icon:       'bi-wrench-adjustable-circle-fill',
          color:      '#3b82f6',
          date:       dateVal instanceof Date ? dateVal.toISOString() : String(dateVal || ''),
          job_id:     String(rows[r][iJob]    || ''),
          detail:     String(rows[r][iSymp]   || ''),
          status:     String(rows[r][iStat]   || ''),
          technician: String(rows[r][iTech]   || ''),
          amount:     rows[r][iAmt]  ? Number(rows[r][iAmt])  : 0,
          method:     String(rows[r][iMethod] || '')
        });
      }
    }

    /* 3. Follow-up records จาก DB_FOLLOWUP */
    const fuSheet = getFollowUpSheet_();
    if (fuSheet.getLastRow() > 1) {
      const rows = fuSheet.getDataRange().getValues();
      const hdr  = rows[0];
      const iCId   = hdr.indexOf('customer_id');
      const iCName = hdr.indexOf('customer_name');
      const iDate  = hdr.indexOf('scheduled_date');
      const iRes   = hdr.indexOf('result');
      const iNote  = hdr.indexOf('note');
      const iBy    = hdr.indexOf('created_by');
      for (let r = 1; r < rows.length; r++) {
        const cid   = String(rows[r][iCId]   || '');
        const cname = String(rows[r][iCName] || '');
        if (cid !== customer.id && cname !== customer.name) continue;
        const dateVal = rows[r][iDate];
        events.push({
          type:   'followup',
          icon:   'bi-telephone-fill',
          color:  '#10b981',
          date:   dateVal instanceof Date ? dateVal.toISOString() : String(dateVal || ''),
          result: String(rows[r][iRes]  || ''),
          note:   String(rows[r][iNote] || ''),
          by:     String(rows[r][iBy]   || '')
        });
      }
    }

    /* 4. เรียงใหม่ → เก่า */
    events.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

    try { writeAuditLog('CRM_HISTORY_VIEW', params.requested_by || 'SYSTEM', customer.id); } catch (e) {}

    return { success: true, customer, events };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * ดึงรายชื่อลูกค้าพร้อม stats (last_contact, total_jobs, overdue flag)
 * @param {Object} params - { filter: 'all'|'overdue'|'vip' }
 * @return {Object} { success, customers[] }
 */
function getCustomerListWithStats(params) {
  try {
    params = params || {};
    const ss = getComphoneSheet();
    const custSheet = findSheetByName(ss, 'CUSTOMERS');
    if (!custSheet || custSheet.getLastRow() < 2) {
      return { success: true, customers: [] };
    }

    const rows = custSheet.getDataRange().getValues();
    const hdr  = rows[0];
    const iId    = hdr.indexOf('customer_id');
    const iName  = hdr.findIndex(h => /ชื่อ|name/i.test(h));
    const iPhone = hdr.findIndex(h => /เบอร์|phone/i.test(h));
    const iType  = hdr.findIndex(h => /type|ประเภท/i.test(h));

    /* นับ jobs ต่อลูกค้า */
    const jobSheet = findSheetByName(ss, 'DBJOBS');
    const jobMap   = {};
    if (jobSheet && jobSheet.getLastRow() > 1) {
      const jrows = jobSheet.getDataRange().getValues();
      const jhdr  = jrows[0];
      const jCust = jhdr.findIndex(h => /ชื่อลูกค้า|Customer/i.test(h));
      const jDate = jhdr.findIndex(h => /เวลาสร้าง|Created/i.test(h));
      for (let r = 1; r < jrows.length; r++) {
        const name = String(jrows[r][jCust] || '');
        if (!name) continue;
        if (!jobMap[name]) jobMap[name] = { count: 0, last: null };
        jobMap[name].count++;
        const d = jrows[r][jDate];
        if (d instanceof Date && (!jobMap[name].last || d > jobMap[name].last)) {
          jobMap[name].last = d;
        }
      }
    }

    /* last follow-up date */
    const fuSheet = getFollowUpSheet_();
    const fuMap   = {};
    if (fuSheet.getLastRow() > 1) {
      const frows = fuSheet.getDataRange().getValues();
      const fhdr  = frows[0];
      const fCId  = fhdr.indexOf('customer_id');
      const fDate = fhdr.indexOf('scheduled_date');
      for (let r = 1; r < frows.length; r++) {
        const cid = String(frows[r][fCId] || '');
        const d   = frows[r][fDate];
        if (!cid) continue;
        if (!fuMap[cid] || (d instanceof Date && d > fuMap[cid])) {
          fuMap[cid] = d instanceof Date ? d : null;
        }
      }
    }

    const now      = new Date();
    const sevenAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const customers = [];

    for (let r = 1; r < rows.length; r++) {
      const id    = String(rows[r][iId]   || '');
      const name  = String(rows[r][iName] || '');
      const phone = String(rows[r][iPhone]|| '');
      const type  = String(rows[r][iType] || 'regular');
      const jinfo = jobMap[name] || { count: 0, last: null };
      const lastContact = fuMap[id] || jinfo.last;
      const overdue = lastContact ? lastContact < sevenAgo : jinfo.count > 0;

      if (params.filter === 'overdue' && !overdue) continue;
      if (params.filter === 'vip'     && type !== 'vip') continue;

      customers.push({
        id, name, phone, type,
        total_jobs:   jinfo.count,
        last_job:     jinfo.last ? Utilities.formatDate(jinfo.last, 'Asia/Bangkok', 'yyyy-MM-dd') : '',
        last_contact: lastContact ? Utilities.formatDate(lastContact, 'Asia/Bangkok', 'yyyy-MM-dd') : '',
        overdue
      });
    }

    return { success: true, customers };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * บันทึกนัด follow-up ใหม่
 * @param {Object} params - { customer_id, customer_name, scheduled_date, note, created_by }
 * @return {Object} { success, followup_id }
 */
function scheduleFollowUp_(params) {
  try {
    params = params || {};
    const sh  = getFollowUpSheet_();
    const fid = 'FU-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMddHHmmss');
    sh.appendRow([
      fid,
      params.customer_id   || '',
      params.customer_name || '',
      params.scheduled_date || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd'),
      '',
      params.note || '',
      '',
      params.created_by || 'SYSTEM',
      new Date()
    ]);
    SpreadsheetApp.flush();
    try { writeAuditLog('CRM_FOLLOWUP_SCHEDULED', params.created_by || 'SYSTEM', fid); } catch (e) {}
    return { success: true, followup_id: fid };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * บันทึกผลการติดต่อ follow-up
 * @param {Object} params - { customer_id, result, note, next_date, created_by }
 * @return {Object} { success }
 */
function logFollowUpResult_(params) {
  try {
    params = params || {};
    const sh   = getFollowUpSheet_();
    const hdr  = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const iCId = hdr.indexOf('customer_id');
    const iRes = hdr.indexOf('result');
    const iNote= hdr.indexOf('note');
    const iNext= hdr.indexOf('next_date');
    const rows = sh.getDataRange().getValues();

    /* อัปเดต row ล่าสุดของลูกค้า */
    let updated = false;
    for (let r = rows.length - 1; r >= 1; r--) {
      if (String(rows[r][iCId] || '') === String(params.customer_id || '')) {
        sh.getRange(r + 1, iRes  + 1).setValue(params.result    || '');
        sh.getRange(r + 1, iNote + 1).setValue(params.note      || '');
        sh.getRange(r + 1, iNext + 1).setValue(params.next_date || '');
        updated = true;
        break;
      }
    }

    /* ถ้าไม่มี row เดิม → สร้างใหม่ */
    if (!updated) {
      sh.appendRow([
        'FU-' + Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMddHHmmss'),
        params.customer_id   || '',
        params.customer_name || '',
        Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd'),
        params.result   || '',
        params.note     || '',
        params.next_date|| '',
        params.created_by || 'SYSTEM',
        new Date()
      ]);
    }

    SpreadsheetApp.flush();
    try { writeAuditLog('CRM_FOLLOWUP_LOGGED', params.created_by || 'SYSTEM', params.customer_id || ''); } catch (e) {}
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * ดึงตาราง follow-up 7 วันข้างหน้า
 * @param {Object} params - { from_date, to_date }
 * @return {Object} { success, schedule: { [date]: items[] } }
 */
function getCRMFollowUpSchedule_(params) {
  try {
    params = params || {};
    const sh = getFollowUpSheet_();
    if (sh.getLastRow() < 2) return { success: true, schedule: {} };

    const now  = new Date();
    const from = params.from_date ? new Date(params.from_date) : now;
    const to   = params.to_date   ? new Date(params.to_date)   : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const rows = sh.getDataRange().getValues();
    const hdr  = rows[0];
    const iCId  = hdr.indexOf('customer_id');
    const iCNm  = hdr.indexOf('customer_name');
    const iDate = hdr.indexOf('scheduled_date');
    const iRes  = hdr.indexOf('result');
    const iNote = hdr.indexOf('note');
    const iNext = hdr.indexOf('next_date');

    const schedule = {};
    for (let r = 1; r < rows.length; r++) {
      const dateVal = rows[r][iDate];
      const d = dateVal instanceof Date ? dateVal : new Date(String(dateVal || ''));
      if (isNaN(d.getTime())) continue;
      if (d < from || d > to) continue;
      const key = Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd');
      if (!schedule[key]) schedule[key] = [];
      schedule[key].push({
        customer_id:   String(rows[r][iCId]  || ''),
        customer_name: String(rows[r][iCNm]  || ''),
        result:        String(rows[r][iRes]  || ''),
        note:          String(rows[r][iNote] || ''),
        next_date:     String(rows[r][iNext] || ''),
        row_index:     r + 1
      });
    }

    return { success: true, schedule };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Metric cards สำหรับ After-Sales Dashboard
 * @return {Object} { success, today, overdue_yesterday, done_this_week, overdue_7days[] }
 */
function getCRMMetrics_() {
  try {
    const sh = getFollowUpSheet_();
    const now = new Date();
    const todayStr = Utilities.formatDate(now, 'Asia/Bangkok', 'yyyy-MM-dd');
    const yesterdayStr = Utilities.formatDate(new Date(now.getTime() - 86400000), 'Asia/Bangkok', 'yyyy-MM-dd');
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekStart = new Date(now.getTime() - now.getDay() * 86400000);

    let today = 0, overdueYesterday = 0, doneThisWeek = 0;
    const overdue7days = [];

    if (sh.getLastRow() > 1) {
      const rows = sh.getDataRange().getValues();
      const hdr  = rows[0];
      const iCNm = hdr.indexOf('customer_name');
      const iDate= hdr.indexOf('scheduled_date');
      const iRes = hdr.indexOf('result');
      for (let r = 1; r < rows.length; r++) {
        const dateVal = rows[r][iDate];
        const d = dateVal instanceof Date ? dateVal : new Date(String(dateVal || ''));
        if (isNaN(d.getTime())) continue;
        const dStr = Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd');
        const result = String(rows[r][iRes] || '');
        if (dStr === todayStr) today++;
        if (dStr === yesterdayStr && !result) overdueYesterday++;
        if (d >= weekStart && result) doneThisWeek++;
        if (d < weekAgo && !result) {
          overdue7days.push({ customer_name: String(rows[r][iCNm] || ''), scheduled_date: dStr });
        }
      }
    }

    return { success: true, today, overdue_yesterday: overdueYesterday, done_this_week: doneThisWeek, overdue_7days: overdue7days };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * ส่ง LINE ไปยัง SALES group พร้อมรายชื่อลูกค้าค้าง
 * @param {Object} params - { requested_by }
 * @return {Object} { success }
 */
function nudgeSalesTeam_(params) {
  try {
    params = params || {};
    const metrics = getCRMMetrics_();
    if (!metrics.success) return metrics;

    const list = metrics.overdue_7days.slice(0, 10);
    if (!list.length) return { success: true, message: 'ไม่มีลูกค้าค้าง' };

    const lines = list.map((c, i) => `${i + 1}. ${c.customer_name} (ค้างตั้งแต่ ${c.scheduled_date})`).join('\n');
    const msg   = `🔔 แจ้งเตือนทีมขาย\nลูกค้าที่ยังไม่ได้ติดต่อเกิน 7 วัน (${list.length} ราย)\n\n${lines}`;

    const salesGroup = getConfig('LINE_GROUP_SALES', '');
    if (salesGroup) {
      sendLinePush(salesGroup, [{ type: 'text', text: msg }]);
    }
    try { writeAuditLog('CRM_NUDGE_SALES', params.requested_by || 'SYSTEM', `${list.length} overdue`); } catch (e) {}
    return { success: true, sent: list.length };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
