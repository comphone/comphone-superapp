import { google } from 'googleapis';

const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

const sheets = google.sheets({ version: 'v4', auth });

const ssId = '19fkLbSbBdz0EjAV8nE9LLwBiHeIN50BTPptt_PJCRGA';
const today = '2026-04-03';

const res = await sheets.spreadsheets.values.get({
  spreadsheetId: ssId,
  range: 'DBJOBS!A:M',
});

const rows = res.data.values || [];
console.log(`Total rows: ${rows.length}`);
console.log(`Headers: ${JSON.stringify(rows[0])}`);

// Filter jobs for today
const today = '3/4/2026';
const todayJobs = rows.filter((r, i) => i > 0 && r[0] && (r[9] || '').includes(today));
console.log(`\nToday's jobs (from column J):`);
todayJobs.forEach(r => {
  console.log(`${r[0]} | ${r[1]} | ${r[2]} | สถานะ: ${r[3]} | ช่าง: ${r[4]} | เวลา: ${r[9]}`);
});

// Also check all jobs
console.log(`\nAll jobs:`);
rows.slice(1).slice(-20).forEach(r => {
  console.log(`${r[0]} | ${r[1]} | ${r[2]} | สถานะ: ${r[3]} | ช่าง: ${r[4]} | เวลา: ${r[9]}`);
});
