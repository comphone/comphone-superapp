// Final E2E Test with proper GAS redirect handling
const https = require('https');
const { URL } = require('url');

const GAS_SHORT_URL = 'https://script.google.com/macros/s/AKfycbzOci04s-AWrT-WE8v3UZ4MkQBwT3QD11pcf1LN_PGlsfJwUTcp-r8bBrIFkOy0A--Hyg/exec';

async function gasCall(action, params) {
  const body = JSON.stringify({ action, ...(params || {}) });
  const bodyBytes = Buffer.from(body, 'utf8');

  // Step 1: Get redirect URL from short URL
  const redirUrl = await getRedirectUrl();
  if (!redirUrl) return { success: false, error: 'Cannot get redirect URL' };

  // Step 2: POST to redirect URL
  return new Promise((resolve) => {
    const url = new URL(redirUrl);
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': bodyBytes.length
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ success: false, error: `Parse error: ${e.message}`, raw: data.substring(0, 200) }); }
      });
    });
    req.on('error', (e) => resolve({ success: false, error: e.message }));
    req.write(bodyBytes);
    req.end();
  });
}

// Cache redirect URL (valid for ~6-24 hours)
let cachedRedirectUrl = null;

async function getRedirectUrl() {
  if (cachedRedirectUrl) return cachedRedirectUrl;

  return new Promise((resolve) => {
    https.get(GAS_SHORT_URL, (res) => {
      if (res.statusCode === 302 && res.headers.location) {
        cachedRedirectUrl = res.headers.location;
        resolve(cachedRedirectUrl);
      } else if (res.statusCode === 200) {
        // Already got a 200 (maybe cached) - but GAS should redirect
        // Follow manual redirect from 302
        resolve(GAS_SHORT_URL); // fallback
      } else {
        // Need to follow redirect manually
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (data.includes('HREF="https://')) {
            const match = data.match(/HREF="(https:\/\/[^"]+)"/);
            if (match) {
              cachedRedirectUrl = match[1].replace(/&amp;/g, '&');
              resolve(cachedRedirectUrl);
            }
          }
          resolve(null);
        });
      }
    }).on('error', () => resolve(null));
  });
}

async function runTests() {
  console.log('=== Comphone Super App E2E Test (Final) ===\n');
  let passed = 0, failed = 0;

  // 1: Open Job
  process.stdout.write('1) Open Job: ');
  const r1 = await gasCall('openjob', { name: 'TEST_E2E_FINAL', phone: '0990000001', symptom: 'Final E2E' });
  if (r1?.success && r1.data?.success) {
    const jid = r1.data.job_id;
    console.log(`PASS - ${jid}`); passed++;

    // 2: Check
    process.stdout.write('2) Check: ');
    const r2 = await gasCall('checkjobs', { search: jid });
    if (r2?.success && r2.data?.jobs?.length > 0) {
      console.log(`PASS - ${r2.data.jobs[0].status}`); passed++;
    } else { console.log(`FAIL - ${r2?.error || 'not found'}`); failed++; }

    // 3: Summary
    process.stdout.write('3) Summary: ');
    const r3 = await gasCall('summary', {});
    if (r3?.success && r3.data?.total !== undefined) {
      console.log(`PASS - Total: ${r3.data.total}, Pending: ${r3.data.pending}`); passed++;
    } else { console.log(`FAIL - ${r3?.error}`); failed++; }

    // 4: Update Status
    process.stdout.write('4) Update Status: ');
    const r4 = await gasCall('updatestatus', { job_id: jid, status: 'InProgress', technician: 'Tester', note: 'E2E' });
    if (r4?.success) {
      console.log(`PASS - ${r4.data.status} by ${r4.data.technician}`); passed++;
    } else { console.log(`FAIL - ${r4?.error}`); failed++; }

    // 5: Close
    process.stdout.write('5) Close Job: ');
    const r5 = await gasCall('closejob', { job_id: jid, parts: 'CCTV_HD:1', labor_cost: 500 });
    if (r5?.success) {
      console.log(`PASS - ${r5.data.message}`); passed++;
    } else { console.log(`FAIL - ${r5?.error}`); failed++; }

    // 6: Verify Completed
    process.stdout.write('6) Verify: ');
    const r6 = await gasCall('checkjobs', { search: jid });
    if (r6?.data?.jobs?.[0]?.status === 'Completed') {
      console.log('PASS - Completed'); passed++;
    } else { console.log(`FAIL - ${r6?.data?.jobs?.[0]?.status}`); failed++; }

  } else {
    console.log(`FAIL - ${r1?.error || 'unknown'}`);
    failed += 5;
  }

  // 7: Check Stock
  process.stdout.write('7) Check Stock: ');
  const r7 = await gasCall('checkstock', {});
  if (r7?.success && r7.data?.total_items !== undefined) {
    console.log(`PASS - ${r7.data.total_items} items`); passed++;
  } else { console.log(`FAIL - ${r7?.error}`); failed++; }

  const total = passed + failed;
  console.log(`\n=== Result: ${passed}/${total} passed ===`);
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED! System is production ready!');
  } else {
    console.log(`⚠️ ${failed} test(s) failed`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
