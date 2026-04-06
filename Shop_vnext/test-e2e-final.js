// E2E Test - Final version with ASCII action names
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzOci04s-AWrT-WE8v3UZ4MkQBwT3QD11pcf1LN_PGlsfJwUTcp-r8bBrIFkOy0A--Hyg/exec';

async function gasCall(action, params) {
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...(params || {}) }),
      redirect: 'follow'
    });
    return await res.json();
  } catch (e) { return { success: false, error: e.message }; }
}

async function runTests() {
  console.log('=== Comphone Super App E2E Test ===\n');
  let passed = 0, failed = 0;

  // 1: Open
  process.stdout.write('1) Open: ');
  const r1 = await gasCall('openjob', { name: 'TEST_E2E', phone: '0999999999', symptom: 'E2E' });
  if (r1?.success && r1.data?.success) {
    const jid = r1.data.job_id;
    console.log(`PASS - ${jid}`); passed++;

    // 2: Check
    process.stdout.write('2) Check: ');
    const r2 = await gasCall('checkjobs', { search: jid });
    if (r2?.success && r2.data?.jobs?.length > 0) { console.log(`PASS - ${r2.data.jobs[0].status}`); passed++; }
    else { console.log('FAIL'); failed++; }

    // 3: Summary
    process.stdout.write('3) Summary: ');
    const r3 = await gasCall('summary', {});
    if (r3?.success && r3.data?.total !== undefined) { console.log(`PASS - Total: ${r3.data.total}`); passed++; }
    else { console.log('FAIL'); failed++; }

    // 4: Update
    process.stdout.write('4) Update: ');
    const r4 = await gasCall('updatestatus', { job_id: jid, status: 'InProgress', technician: 'tester', note: 'test' });
    if (r4?.success) { console.log(`PASS - ${r4.data.status}`); passed++; }
    else { console.log(`FAIL - ${r4?.error}`); failed++; }

    // 5: Close
    process.stdout.write('5) Close: ');
    const r5 = await gasCall('closejob', { job_id: jid, parts: 'CCTV_HD:1', labor_cost: 500 });
    if (r5?.success) { console.log('PASS'); passed++; }
    else { console.log(`FAIL - ${r5?.error}`); failed++; }

    // 6: Verify
    process.stdout.write('6) Verify: ');
    const r6 = await gasCall('checkjobs', { search: jid });
    if (r6?.data?.jobs?.[0]?.status === 'Completed') { console.log('PASS - Completed'); passed++; }
    else { console.log(`FAIL - ${r6?.data?.jobs?.[0]?.status}`); failed++; }
  } else {
    console.log(`FAIL - ${r1?.error}`); failed += 5;
  }

  // 7: Stock
  process.stdout.write('7) Stock: ');
  const r7 = await gasCall('checkstock', {});
  if (r7?.success && r7.data?.total_items !== undefined) { console.log(`PASS - ${r7.data.total_items} items`); passed++; }
  else { console.log(`FAIL - ${r7?.error}`); failed++; }

  const total = passed + failed;
  console.log(`\n=== Result: ${passed}/${total} passed ===`);
  if (failed === 0) console.log('ALL TESTS PASSED!');
  else console.log('Some tests failed');
  
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
