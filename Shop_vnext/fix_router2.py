#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix Router.js - replace corrupted getDashboardSummary + openJob + updateJobById at end of file"""

path = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Router.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and remove the duplicate functions at the end of the file
# They start after the last "}" of cronMorningAlert
# Find the start of duplicate getDashboardData
start_marker = '\n\nfunction getDashboardData() {'
start_idx = content.rfind(start_marker)

if start_idx > -1:
    # Keep everything before the duplicate functions
    content = content[:start_idx]
    print('Removed duplicate functions at end of file')

# Now add the correct functions
correct_fns = '''

function getDashboardData() {
  var jobs = [], summary = {pending:0, inProgress:0, completed:0, totalJobs:0, lowStock:0, totalItems:0};
  try {
    var ss = getComphoneSheet();
    var jSh = findSheetByName(ss, 'DBJOBS');
    if (jSh) {
      var jd = jSh.getDataRange().getValues();
      var statusCol = -1;
      var headerRow = jd[0];
      for (var hi=0; hi<headerRow.length; hi++) {
        if (String(headerRow[hi]).indexOf('สถานะ') > -1) { statusCol = hi; break; }
      }
      if (statusCol < 0) statusCol = 3;
      for (var i=jd.length-1; i>=1 && i>=jd.length-100; i--) {
        var st = String(jd[i][statusCol]);
        if (st.indexOf('\u0e23\u0e2d') === 0) summary.pending++;
        else if (st === 'InProgress' || st.indexOf('\u0e01\u0e33\u0e25\u0e31') === 0) summary.inProgress++;
        else if (st === 'Completed') summary.completed++;
        var created = '-';
        try { if (jd[i][9]) created = Utilities.formatDate(new Date(jd[i][9]), 'Asia/Bangkok', 'dd/MM HH:mm'); } catch(e) {}
        jobs.push({
          id: String(jd[i][0]),
          customer: String(jd[i][1]||''),
          status: st,
          tech: String(jd[i][4]||'-'),
          created: created,
          folder: String(jd[i][12]||''),
          symptom: String(jd[i][2]||'')
        });
      }
    }
    var iSh = findSheetByName(ss, 'DB_INVENTORY');
    if (iSh) {
      var id2 = iSh.getDataRange().getValues();
      for (var k=1; k<id2.length; k++) {
        summary.totalItems++;
        if (id2[k][2] < 5) summary.lowStock++;
      }
    }
    summary.totalJobs = summary.pending + summary.inProgress + summary.completed;
    summary.date = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'dd/MM/yyyy HH:mm');
  } catch(e) { summary = {totalJobs:0,pending:0,inProgress:0,completed:0,totalItems:0,lowStock:0,date:'error'}; }
  return { success: true, jobs: jobs, inventory: [], summary: summary };
}

function openJob2(data) {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var num = sh.getLastRow();
    var id = 'J' + ('0000' + num).slice(-4);
    sh.appendRow([id, data.name||'', data.symptom||'', '\u0e23\u0e2d\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23',
      data.tech||'', data.gps||'', '', '', '', new Date(), '', '', '']);
    return { success: true, job_id: id, customer: data.name, status: '\u0e23\u0e2d\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23' };
  } catch(e) { return { error: e.toString() }; }
}

function updateJobById2(jobId, data) {
  try {
    var ss = getComphoneSheet();
    var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var all = sh.getDataRange().getValues();
    for (var i=1; i<all.length; i++) {
      if (String(all[i][0]) === String(jobId)) {
        if (data.name) all[i][1] = data.name;
        if (data.symptom) all[i][2] = data.symptom;
        if (data.status) all[i][3] = data.status;
        if (data.tech) all[i][4] = data.tech;
        if (data.gps) all[i][5] = data.gps;
        all[i][10] = new Date();
        sh.getDataRange().setValues(all);
        return { success: true };
      }
    }
    return { error: 'Not found '+jobId };
  } catch(e) { return { error: e.toString() }; }
}
'''

content += correct_fns

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed Router.js - {} bytes'.format(len(content)))
