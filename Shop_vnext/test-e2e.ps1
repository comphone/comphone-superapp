Write-Host "=== Comphone Super App E2E Test ==="
$pass = 0; $fail = 0

$URL = "https://script.google.com/macros/s/AKfycbzSw46G549H6y-4JckzqrRUeWo1ls2wQBtDqiHlUtXTd2t8a20lT0CvIccb_EcnLWeTOA/exec"

# Helper function
function GasCall {
  param([hashtable]$body)
  $json = $body | ConvertTo-Json -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  try {
    $r = Invoke-WebRequest -Uri $URL -Method POST -ContentType "application/json" -Body $bytes -MaximumRedirection 10
    return $r.Content | ConvertFrom-Json
  } catch {
    return @{ success = $false; error = $_.Exception.Message }
  }
}

# Test 1: Open Job
Write-Host "`n1. Open New Job... " -NoNewline
$r1 = GasCall @{
  action = "เปิดงาน"
  name = "TEST_E2E"
  phone = "0999999999"
  symptom = "E2E test"
}

if ($r1.success -and $r1.data.success) {
  $jid = $r1.data.job_id
  Write-Host "OK $jid - $($r1.data.customer), Status: $($r1.data.status)" -ForegroundColor Green
  $pass++

  # Test 2: Check Job
  Write-Host "2. Check Job... " -NoNewline
  $r2 = GasCall @{ action = "เช็คงาน"; search = $jid }
  if ($r2.success -and $r2.data.jobs.Count -gt 0) {
    Write-Host "OK - Found $($r2.data.count) job(s), First: $($r2.data.jobs[0].job_id)" -ForegroundColor Green
    $pass++
  } else { Write-Host "FAIL" -ForegroundColor Red; $fail++ }

  # Test 3: Summary
  Write-Host "3. Summary... " -NoNewline
  $r3 = GasCall @{ action = "สรุปงาน" }
  if ($r3.success -and $r3.data.total -gt 0) {
    Write-Host "OK - Total: $($r3.data.total), Pending: $($r3.data.pending)" -ForegroundColor Green
    $pass++
  } else { Write-Host "FAIL" -ForegroundColor Red; $fail++ }

  # Test 4: Update Status
  Write-Host "4. Update Status to InProgress... " -NoNewline
  $r4 = GasCall @{
    action = "อัพเดทสถานะ"
    job_id = $jid
    status = "InProgress"
    technician = "Tester"
    note = "E2E test update"
  }
  if ($r4.success) {
    Write-Host "OK - Status: $($r4.data.status)" -ForegroundColor Green
    $pass++
  } else { Write-Host "FAIL - $($r4.error)" -ForegroundColor Red; $fail++ }

  # Test 5: Close Job (with stock cut + billing)
  Write-Host "5. Close Job (cut stock + create bill)... " -NoNewline
  $r5 = GasCall @{
    action = "ปิดงาน"
    job_id = $jid
    parts = "CCTV_HD:1"
    labor_cost = 500
  }
  if ($r5.success) {
    Write-Host "OK - $($r5.data.message)" -ForegroundColor Green
    $pass++
  } else { Write-Host "FAIL - $($r5.error)" -ForegroundColor Red; $fail++ }

  # Test 6: Verify Status = Completed
  Write-Host "6. Verify Status = Completed... " -NoNewline
  $r6 = GasCall @{ action = "เช็คงาน"; search = $jid }
  if ($r6.success -and $r6.data.jobs[0].status -eq "Completed") {
    Write-Host "OK - Job is Completed, Status: $($r6.data.jobs[0].status)" -ForegroundColor Green
    $pass++
  } else { Write-Host "FAIL - Status is: $($r6.data.jobs[0].status)" -ForegroundColor Red; $fail++ }
} else {
  Write-Host "FAIL - $($r1.error)" -ForegroundColor Red
  $fail = 6
}

# Test 7: Check Stock
Write-Host "7. Check Stock... " -NoNewline
$r7 = GasCall @{ action = "เช็คสต๊อก"; search = "" }
if ($r7.success) {
  Write-Host "OK - $($r7.data.total_items) items" -ForegroundColor Green
  $pass++
} else { Write-Host "FAIL" -ForegroundColor Red; $fail++ }

# Summary
$score = $pass + $fail
$color = if ($fail -eq 0) { "Green" } else { "Red" }
Write-Host "`n=== E2E Test Result: $pass/$score passed ===" -ForegroundColor $color

# Clean up test data
if ($pass -gt 0) {
  Write-Host "`nE2E test jobs remain in DB for analysis"
}

exit $(if ($fail -eq 0) { 0 } else { 1 })
