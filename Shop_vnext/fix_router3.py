#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fix Router.js - remove corrupted duplicates, add correct functions"""
import re

path = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Router.js'

# Read as latin-1 (never fails) then encode back
with open(path, 'r', encoding='latin-1', errors='replace') as f:
    content = f.read()

# Find duplicate functions near end
# Keep only the last getDashboardData block
dup_start = content.rfind('\nfunction getDashboardData() {')
if dup_start > -1:
    # Find the start of this function's block (skip the router's getDashboardData call in switch)
    # We want the last occurrence which is the standalone function
    prev_occurrence = content.rfind('\nfunction getDashboardData() {', 0, dup_start)
    if prev_occurrence > -1:
        # Check if the next occurrence is within the function or separate
        # The second one should be right after cronMorningAlert ends
        content = content[:dup_start]
        print('Found duplicate at index {}'.format(dup_start))
    else:
        print('Only one occurrence found')

# Add correct functions
correct = '''
function getDashboardData() {
  var jobs = [], summary = {pending:0, inProgress:0, completed:0, totalJobs:0, lowStock:0, totalItems:0};
  try {
    var ss = getComphoneSheet();
    var jSh = findSheetByName(ss, 'DBJOBS');
    if (jSh) {
      var jd = jSh.getDataRange().getValues();
      var statusCol = 3;
      for (var hi=0; hi<jd[0].length; hi++) {
        if (String(jd[0][hi]).indexOf('สถานะ') > -1) { statusCol = hi; break; }
      }
      for (var i=jd.length-1; i>=1 && i>=jd.length-100; i--) {
        var st = String(jd[i][statusCol]);
        if (st.indexOf('\u0e23\u0e2d') === 0) summary.pending++;
        else if (st === 'InProgress' || st.indexOf('\u0e01\u0e33\u0e25\u0e31') === 0) summary.inProgress++;
        else if (st === 'Completed') summary.completed++;
        var created = '-';
        try { if (jd[i][9]) created = Utilities.formatDate(new Date(jd[i][9]), 'Asia/Bangkok', 'dd/MM HH:mm'); } catch(e) {}
        jobs.push({id:String(jd[i][0]),customer:String(jd[i][1]||''),status:st,
          tech:String(jd[i][4]||'-'),created:created,folder:String(jd[i][12]||''),symptom:String(jd[i][2]||'')});
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
    var ss = getComphoneSheet(); var sh = findSheetByName(ss, 'DBJOBS');
    if (!sh) return { error: 'DBJOBS not found' };
    var num = sh.getLastRow(); var id = 'J' + ('0000' + num).slice(-4);
    sh.appendRow([id, data.name||'', data.symptom||'', '\u0e23\u0e2d\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23',
      data.tech||'', data.gps||'', '', '', '', new Date(), '', '', '']);
    return { success: true, job_id: id, customer: data.name, status: '\u0e23\u0e2d\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e01\u0e32\u0e23' };
  } catch(e) { return { error: e.toString() }; }
}

function updateJobById2(jobId, data) {
  try {
    var ss = getComphoneSheet(); var sh = findSheetByName(ss, 'DBJOBS');
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

content += correct

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed: {} bytes (UTF-8)'.format(len(content)))
