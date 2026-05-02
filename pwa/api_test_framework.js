/* ============================================
API AUTOMATED TESTING FRAMEWORK
COMPHONE SUPER APP Phase 32
============================================ */
const TEST_FRAMEWORK = {
version: '1.0.0',
results: [],
passed: 0,
failed: 0,
startTime: null,
// Initialize test run
init() {
this.results = [];
this.passed = 0;
this.failed = 0;
this.startTime = Date.now();
console.log('%c[TEST FRAMEWORK] Starting API Tests...', 'color:#3b82f6;font-weight:bold');
},
// Record test result
record(testName, passed, message, data) {
const result = {
name: testName,
passed: passed,
message: message,
data: data,
timestamp: new Date().toISOString()
};
this.results.push(result);
if (passed) {
this.passed++;
console.log(`%c✓ PASS: ${testName}`, 'color:#059669;font-weight:500', message);
} else {
this.failed++;
console.log(`%c✗ FAIL: ${testName}`, 'color:#ef4444;font-weight:500', message);
}
},
// Assert helpers
assertSuccess(res, testName) {
if (res && res.success === true) {
this.record(testName, true, 'API returned success:true', res);
return true;
} else {
this.record(testName, false, `Expected success:true, got: ${JSON.stringify(res)}`, res);
return false;
}
},
assertHasFields(obj, fields, testName) {
for (const field of fields) {
if (obj[field] === undefined) {
this.record(testName, false, `Missing field: ${field}`, obj);
return false;
}
}
this.record(testName, true, `All required fields present: ${fields.join(', ')}`, obj);
return true;
},
assertArray(res, testName, minLength = 0) {
if (res && Array.isArray(res) && res.length >= minLength) {
this.record(testName, true, `Array with ${res.length} items`, res);
return true;
} else {
this.record(testName, false, `Expected array with >=${minLength} items`, res);
return false;
}
},
// Generate report
generateReport() {
const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
const total = this.passed + this.failed;
const passRate = total > 0 ? ((this.passed / total) * 100).toFixed(1) : 0;
const report = {
framework: 'COMPHONE API Test Framework v' + this.version,
timestamp: new Date().toISOString(),
duration: duration + 's',
total: total,
passed: this.passed,
failed: this.failed,
pass_rate: passRate + '%',
results: this.results
};
console.log('%c[TEST REPORT] ' + JSON.stringify(report, null, 2), 'color:#8b5cf6;font-weight:bold');
return report;
}
};
// ============================================================
// TEST SUITES
// ============================================================
// --- Health Check Tests ---
async function testHealthCheck() {
TEST_FRAMEWORK.init();
// Test 1: getVersion
try {
const res = await callGas('getVersion', {});
TEST_FRAMEWORK.assertSuccess(res, 'getVersion_success');
if (res && res.version) {
TEST_FRAMEWORK.assertHasFields(res, ['version'], 'getVersion_hasVersion');
}
} catch(e) {
TEST_FRAMEWORK.record('getVersion_success', false, e.message);
}
// Test 2: getSystemHealth
try {
const res = await callGas('getSystemHealth', {});
TEST_FRAMEWORK.assertSuccess(res, 'getSystemHealth_success');
if (res && res.health) {
TEST_FRAMEWORK.assertHasFields(res, ['health', 'timestamp'], 'getSystemHealth_hasFields');
}
} catch(e) {
TEST_FRAMEWORK.record('getSystemHealth_success', false, e.message);
}
return TEST_FRAMEWORK.generateReport();
}
// --- Attendance API Tests (Phase 32) ---
async function testAttendanceAPI() {
TEST_FRAMEWORK.init();
// Test 1: getAttendanceMonthlySummary - monthly
try {
const res = await callGas('getAttendanceMonthlySummary', { group_by: 'month' });
TEST_FRAMEWORK.assertSuccess(res, 'getAttendanceMonthlySummary_month_success');
if (res && res.summary) {
TEST_FRAMEWORK.assertArray(res.summary, 'getAttendanceMonthlySummary_month_hasData');
}
} catch(e) {
TEST_FRAMEWORK.record('getAttendanceMonthlySummary_month_success', false, e.message);
}
// Test 2: getAttendanceMonthlySummary - yearly
try {
const res = await callGas('getAttendanceMonthlySummary', { group_by: 'year' });
TEST_FRAMEWORK.assertSuccess(res, 'getAttendanceMonthlySummary_year_success');
} catch(e) {
TEST_FRAMEWORK.record('getAttendanceMonthlySummary_year_success', false, e.message);
}
// Test 3: getAttendanceReport
try {
const today = new Date().toISOString().split('T')[0];
const res = await callGas('getAttendanceReport', { date_from: today, date_to: today });
TEST_FRAMEWORK.assertSuccess(res, 'getAttendanceReport_success');
} catch(e) {
TEST_FRAMEWORK.record('getAttendanceReport_success', false, e.message);
}
// Test 4: getAllTechsSummary
try {
const res = await callGas('getAllTechsSummary', {});
TEST_FRAMEWORK.assertSuccess(res, 'getAllTechsSummary_success');
if (res && res.techs) {
TEST_FRAMEWORK.assertArray(res.techs, 'getAllTechsSummary_hasTechs');
}
} catch(e) {
TEST_FRAMEWORK.record('getAllTechsSummary_success', false, e.message);
}
return TEST_FRAMEWORK.generateReport();
}
// --- Dashboard API Tests ---
async function testDashboardAPI() {
TEST_FRAMEWORK.init();
// Test 1: getDashboardBundle
try {
const res = await callGas('getDashboardBundle', {});
TEST_FRAMEWORK.assertSuccess(res, 'getDashboardBundle_success');
if (res && res.stats) {
TEST_FRAMEWORK.assertHasFields(res, ['stats'], 'getDashboardBundle_hasStats');
}
} catch(e) {
TEST_FRAMEWORK.record('getDashboardBundle_success', false, e.message);
}
// Test 2: getDashboardBundle
try {
const res = await callGas('getDashboardBundle', {});
TEST_FRAMEWORK.assertSuccess(res, 'getDashboardBundle_success');
} catch(e) {
TEST_FRAMEWORK.record('getDashboardBundle_success', false, e.message);
}
return TEST_FRAMEWORK.generateReport();
}
// --- Inventory API Tests ---
async function testInventoryAPI() {
TEST_FRAMEWORK.init();
// Test 1: inventoryOverview
try {
const res = await callGas('inventoryOverview', {});
TEST_FRAMEWORK.assertSuccess(res, 'inventoryOverview_success');
if (res && res.stock) {
TEST_FRAMEWORK.assertArray(res.stock, 'inventoryOverview_hasData');
}
} catch(e) {
TEST_FRAMEWORK.record('inventoryOverview_success', false, e.message);
}
// Test 2: checkStock
try {
const res = await callGas('checkStock', {});
TEST_FRAMEWORK.assertSuccess(res, 'checkStock_success');
} catch(e) {
TEST_FRAMEWORK.record('checkStock_success', false, e.message);
}
return TEST_FRAMEWORK.generateReport();
}
// --- Billing API Tests ---
async function testBillingAPI() {
TEST_FRAMEWORK.init();
// Test 1: getReportData
try {
const today = new Date().toISOString().split('T')[0];
const res = await callGas('getReportData', { date_from: today, date_to: today });
if (res && (res.success === true || res.summary)) {
TEST_FRAMEWORK.record('getReportData_success', true, 'API responded', res);
} else {
TEST_FRAMEWORK.record('getReportData_success', false, 'API did not return expected data', res);
}
} catch(e) {
TEST_FRAMEWORK.record('getReportData_success', false, e.message);
}
return TEST_FRAMEWORK.generateReport();
}
// ============================================================
// MASTER TEST RUNNER
// ============================================================
async function runAllTests() {
console.log('%c[TEST FRAMEWORK] Running ALL Test Suites...', 'color:#3b82f6;font-size:16px;font-weight:bold');
const allResults = {
health: await testHealthCheck(),
attendance: await testAttendanceAPI(),
dashboard: await testDashboardAPI(),
inventory: await testInventoryAPI(),
billing: await testBillingAPI()
};
// Summary
let totalPassed = 0;
let totalFailed = 0;
Object.keys(allResults).forEach(suite => {
totalPassed += allResults[suite].passed;
totalFailed += allResults[suite].failed;
});
const summary = {
timestamp: new Date().toISOString(),
suites: Object.keys(allResults).length,
total_passed: totalPassed,
total_failed: totalFailed,
total_tests: totalPassed + totalFailed,
overall_pass_rate: ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1) + '%'
};
console.log('%c[OVERALL SUMMARY] ' + JSON.stringify(summary, null, 2), 'color:#059669;font-size:14px;font-weight:bold');
// Save to window for inspection
window._lastTestResults = allResults;
window._testSummary = summary;
return { summary, details: allResults };
}
// Quick test (for manual trigger)
async function quickTest() {
TEST_FRAMEWORK.init();
try {
const res = await callGas('getVersion', {});
TEST_FRAMEWORK.assertSuccess(res, 'quickTest_getVersion');
} catch(e) {
TEST_FRAMEWORK.record('quickTest_getVersion', false, e.message);
}
return TEST_FRAMEWORK.generateReport();
}
console.log('%c[TEST FRAMEWORK] Loaded. Use runAllTests() to start.', 'color:#059669;font-weight:bold');
