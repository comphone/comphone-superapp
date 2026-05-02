     1|/* ============================================
     2|   API AUTOMATED TESTING FRAMEWORK
     3|   COMPHONE SUPER APP Phase 32
     4|   ============================================ */
     5|
     6|const TEST_FRAMEWORK = {
     7|  version: '1.0.0',
     8|  results: [],
     9|  passed: 0,
    10|  failed: 0,
    11|  startTime: null,
    12|
    13|  // Initialize test run
    14|  init() {
    15|    this.results = [];
    16|    this.passed = 0;
    17|    this.failed = 0;
    18|    this.startTime = Date.now();
    19|    console.log('%c[TEST FRAMEWORK] Starting API Tests...', 'color:#3b82f6;font-weight:bold');
    20|  },
    21|
    22|  // Record test result
    23|  record(testName, passed, message, data) {
    24|    const result = {
    25|      name: testName,
    26|      passed: passed,
    27|      message: message,
    28|      data: data,
    29|      timestamp: new Date().toISOString()
    30|    };
    31|    this.results.push(result);
    32|    if (passed) {
    33|      this.passed++;
    34|      console.log(`%c✓ PASS: ${testName}`, 'color:#059669;font-weight:500', message);
    35|    } else {
    36|      this.failed++;
    37|      console.log(`%c✗ FAIL: ${testName}`, 'color:#ef4444;font-weight:500', message);
    38|    }
    39|  },
    40|
    41|  // Assert helpers
    42|  assertSuccess(res, testName) {
    43|    if (res && res.success === true) {
    44|      this.record(testName, true, 'API returned success:true', res);
    45|      return true;
    46|    } else {
    47|      this.record(testName, false, `Expected success:true, got: ${JSON.stringify(res)}`, res);
    48|      return false;
    49|    }
    50|  },
    51|
    52|  assertHasFields(obj, fields, testName) {
    53|    for (const field of fields) {
    54|      if (obj[field] === undefined) {
    55|        this.record(testName, false, `Missing field: ${field}`, obj);
    56|        return false;
    57|      }
    58|    }
    59|    this.record(testName, true, `All required fields present: ${fields.join(', ')}`, obj);
    60|    return true;
    61|  },
    62|
    63|  assertArray(res, testName, minLength = 0) {
    64|    if (res && Array.isArray(res) && res.length >= minLength) {
    65|      this.record(testName, true, `Array with ${res.length} items`, res);
    66|      return true;
    67|    } else {
    68|      this.record(testName, false, `Expected array with >=${minLength} items`, res);
    69|      return false;
    70|    }
    71|  },
    72|
    73|  // Generate report
    74|  generateReport() {
    75|    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);
    76|    const total = this.passed + this.failed;
    77|    const passRate = total > 0 ? ((this.passed / total) * 100).toFixed(1) : 0;
    78|
    79|    const report = {
    80|      framework: 'COMPHONE API Test Framework v' + this.version,
    81|      timestamp: new Date().toISOString(),
    82|      duration: duration + 's',
    83|      total: total,
    84|      passed: this.passed,
    85|      failed: this.failed,
    86|      pass_rate: passRate + '%',
    87|      results: this.results
    88|    };
    89|
    90|    console.log('%c[TEST REPORT] ' + JSON.stringify(report, null, 2), 'color:#8b5cf6;font-weight:bold');
    91|    return report;
    92|  }
    93|};
    94|
    95|// ============================================================
    96|// TEST SUITES
    97|// ============================================================
    98|
    99|// --- Health Check Tests ---
   100|async function testHealthCheck() {
   101|  TEST_FRAMEWORK.init();
   102|
   103|  // Test 1: getVersion
   104|  try {
   105|    const res = await callGas('getVersion', {});
   106|    TEST_FRAMEWORK.assertSuccess(res, 'getVersion_success');
   107|    if (res && res.version) {
   108|      TEST_FRAMEWORK.assertHasFields(res, ['version'], 'getVersion_hasVersion');
   109|    }
   110|  } catch(e) {
   111|    TEST_FRAMEWORK.record('getVersion_success', false, e.message);
   112|  }
   113|
   114|  // Test 2: getSystemHealth
   115|  try {
   116|    const res = await callGas('getSystemHealth', {});
   117|    TEST_FRAMEWORK.assertSuccess(res, 'getSystemHealth_success');
   118|    if (res && res.health) {
   119|      TEST_FRAMEWORK.assertHasFields(res, ['health', 'timestamp'], 'getSystemHealth_hasFields');
   120|    }
   121|  } catch(e) {
   122|    TEST_FRAMEWORK.record('getSystemHealth_success', false, e.message);
   123|  }
   124|
   125|  return TEST_FRAMEWORK.generateReport();
   126|}
   127|
   128|// --- Attendance API Tests (Phase 32) ---
   129|async function testAttendanceAPI() {
   130|  TEST_FRAMEWORK.init();
   131|
   132|  // Test 1: getAttendanceMonthlySummary - monthly
   133|  try {
   134|    const res = await callGas('getAttendanceMonthlySummary', { group_by: 'month' });
   135|    TEST_FRAMEWORK.assertSuccess(res, 'getAttendanceMonthlySummary_month_success');
   136|    if (res && res.summary) {
   137|      TEST_FRAMEWORK.assertArray(res.summary, 'getAttendanceMonthlySummary_month_hasData');
   138|    }
   139|  } catch(e) {
   140|    TEST_FRAMEWORK.record('getAttendanceMonthlySummary_month_success', false, e.message);
   141|  }
   142|
   143|  // Test 2: getAttendanceMonthlySummary - yearly
   144|  try {
   145|    const res = await callGas('getAttendanceMonthlySummary', { group_by: 'year' });
   146|    TEST_FRAMEWORK.assertSuccess(res, 'getAttendanceMonthlySummary_year_success');
   147|  } catch(e) {
   148|    TEST_FRAMEWORK.record('getAttendanceMonthlySummary_year_success', false, e.message);
   149|  }
   150|
   151|  // Test 3: getAttendanceReport
   152|  try {
   153|    const today = new Date().toISOString().split('T')[0];
   154|    const res = await callGas('getAttendanceReport', { date_from: today, date_to: today });
   155|    TEST_FRAMEWORK.assertSuccess(res, 'getAttendanceReport_success');
   156|  } catch(e) {
   157|    TEST_FRAMEWORK.record('getAttendanceReport_success', false, e.message);
   158|  }
   159|
   160|  // Test 4: getAllTechsSummary
   161|  try {
   162|    const res = await callGas('getAllTechsSummary', {});
   163|    TEST_FRAMEWORK.assertSuccess(res, 'getAllTechsSummary_success');
   164|    if (res && res.techs) {
   165|      TEST_FRAMEWORK.assertArray(res.techs, 'getAllTechsSummary_hasTechs');
   166|    }
   167|  } catch(e) {
   168|    TEST_FRAMEWORK.record('getAllTechsSummary_success', false, e.message);
   169|  }
   170|
   171|  return TEST_FRAMEWORK.generateReport();
   172|}
   173|
   174|// --- Dashboard API Tests ---
   175|async function testDashboardAPI() {
   176|  TEST_FRAMEWORK.init();
   177|
   178|  // Test 1: getDashboardBundle
   179|  try {
   180|    const res = await callGas('getDashboardBundle', {});
   181|    TEST_FRAMEWORK.assertSuccess(res, 'getDashboardBundle_success');
   182|    if (res && res.stats) {
   183|      TEST_FRAMEWORK.assertHasFields(res, ['stats'], 'getDashboardBundle_hasStats');
   184|    }
   185|  } catch(e) {
   186|    TEST_FRAMEWORK.record('getDashboardBundle_success', false, e.message);
   187|  }
   188|
   189|  // Test 2: getDashboardBundle
   190|  try {
   191|    const res = await callGas('getDashboardBundle', {});
   192|    TEST_FRAMEWORK.assertSuccess(res, 'getDashboardBundle_success');
   193|  } catch(e) {
   194|    TEST_FRAMEWORK.record('getDashboardBundle_success', false, e.message);
   195|  }
   196|
   197|  return TEST_FRAMEWORK.generateReport();
   198|}
   199|
   200|// --- Inventory API Tests ---
   201|async function testInventoryAPI() {
   202|  TEST_FRAMEWORK.init();
   203|
   204|  // Test 1: inventoryOverview
   205|  try {
   206|    const res = await callGas('inventoryOverview', {});
   207|    TEST_FRAMEWORK.assertSuccess(res, 'inventoryOverview_success');
   208|    if (res && res.stock) {
   209|      TEST_FRAMEWORK.assertArray(res.stock, 'inventoryOverview_hasData');
   210|    }
   211|  } catch(e) {
   212|    TEST_FRAMEWORK.record('inventoryOverview_success', false, e.message);
   213|  }
   214|
   215|  // Test 2: checkStock
   216|  try {
   217|    const res = await callGas('checkStock', {});
   218|    TEST_FRAMEWORK.assertSuccess(res, 'checkStock_success');
   219|  } catch(e) {
   220|    TEST_FRAMEWORK.record('checkStock_success', false, e.message);
   221|  }
   222|
   223|  return TEST_FRAMEWORK.generateReport();
   224|}
   225|
   226|// --- Billing API Tests ---
   227|async function testBillingAPI() {
   228|  TEST_FRAMEWORK.init();
   229|
   230|  // Test 1: getReportData
   231|  try {
   232|    const today = new Date().toISOString().split('T')[0];
   233|    const res = await callGas('getReportData', { date_from: today, date_to: today });
   234|    if (res && (res.success === true || res.summary)) {
   235|      TEST_FRAMEWORK.record('getReportData_success', true, 'API responded', res);
   236|    } else {
   237|      TEST_FRAMEWORK.record('getReportData_success', false, 'API did not return expected data', res);
   238|    }
   239|  } catch(e) {
   240|    TEST_FRAMEWORK.record('getReportData_success', false, e.message);
   241|  }
   242|
   243|  return TEST_FRAMEWORK.generateReport();
   244|}
   245|
   246|// ============================================================
   247|// MASTER TEST RUNNER
   248|// ============================================================
   249|async function runAllTests() {
   250|  console.log('%c[TEST FRAMEWORK] Running ALL Test Suites...', 'color:#3b82f6;font-size:16px;font-weight:bold');
   251|
   252|  const allResults = {
   253|    health: await testHealthCheck(),
   254|    attendance: await testAttendanceAPI(),
   255|    dashboard: await testDashboardAPI(),
   256|    inventory: await testInventoryAPI(),
   257|    billing: await testBillingAPI()
   258|  };
   259|
   260|  // Summary
   261|  let totalPassed = 0;
   262|  let totalFailed = 0;
   263|  Object.keys(allResults).forEach(suite => {
   264|    totalPassed += allResults[suite].passed;
   265|    totalFailed += allResults[suite].failed;
   266|  });
   267|
   268|  const summary = {
   269|    timestamp: new Date().toISOString(),
   270|    suites: Object.keys(allResults).length,
   271|    total_passed: totalPassed,
   272|    total_failed: totalFailed,
   273|    total_tests: totalPassed + totalFailed,
   274|    overall_pass_rate: ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1) + '%'
   275|  };
   276|
   277|  console.log('%c[OVERALL SUMMARY] ' + JSON.stringify(summary, null, 2), 'color:#059669;font-size:14px;font-weight:bold');
   278|
   279|  // Save to window for inspection
   280|  window._lastTestResults = allResults;
   281|  window._testSummary = summary;
   282|
   283|  return { summary, details: allResults };
   284|}
   285|
   286|// Quick test (for manual trigger)
   287|async function quickTest() {
   288|  TEST_FRAMEWORK.init();
   289|  try {
   290|    const res = await callGas('getVersion', {});
   291|    TEST_FRAMEWORK.assertSuccess(res, 'quickTest_getVersion');
   292|  } catch(e) {
   293|    TEST_FRAMEWORK.record('quickTest_getVersion', false, e.message);
   294|  }
   295|  return TEST_FRAMEWORK.generateReport();
   296|}
   297|
   298|console.log('%c[TEST FRAMEWORK] Loaded. Use runAllTests() to start.', 'color:#059669;font-weight:bold');
   299|