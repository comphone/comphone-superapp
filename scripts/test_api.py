#!/usr/bin/env python3
"""
COMPHONE SUPER APP V5.5 — API Endpoint Test Suite
ทดสอบ API endpoints หลักทั้งหมดของ GAS Web App @441
"""
import urllib.request
import json
import sys

WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzE5tyKNA-W6gDQEixw9VTDznTNn5FuToVeVuO_OQL75fDSrpW8U9BT3bhVn4kjKc37/exec'

def call_api(action, payload=None, token=None):
    """เรียก API endpoint"""
    data = {'action': action}
    if token:
        data['token'] = token
    if payload:
        data.update(payload)
    
    req_data = json.dumps(data).encode()
    req = urllib.request.Request(WEB_APP_URL, data=req_data, headers={'Content-Type': 'text/plain'})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = resp.read().decode()
            return json.loads(result)
    except Exception as e:
        return {'success': False, 'error': str(e)}

def call_get(action):
    """เรียก GET endpoint"""
    url = f"{WEB_APP_URL}?action={action}"
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            result = resp.read().decode()
            return json.loads(result)
    except Exception as e:
        return {'success': False, 'error': str(e)}

def print_result(name, result, check_key=None):
    """แสดงผลการทดสอบ"""
    if check_key:
        ok = result.get(check_key) is not None or result.get('success') == True
    else:
        ok = result.get('success') == True or 'status' in result
    
    status = '✅' if ok else '❌'
    print(f"  {status} {name}")
    if not ok:
        print(f"     Error: {result.get('error', result.get('message', 'Unknown'))[:100]}")
    return ok

# ─── Main Test Suite ───────────────────────────────────────────────────────────
print("=" * 60)
print("  COMPHONE SUPER APP V5.5 — API Test Suite")
print("=" * 60)

results = []

# 1. Health Check (GET)
print("\n[1] Health Check")
r = call_get('health')
results.append(print_result('GET ?action=health', r, 'status'))

# 2. Login
print("\n[2] Authentication")
r = call_api('loginUser', {'username': 'admin', 'password': 'admin1234'})
results.append(print_result('loginUser (admin)', r))
TOKEN = r.get('token', '')
if TOKEN:
    print(f"     Token: {TOKEN[:16]}...")

# 3. Dashboard
print("\n[3] Dashboard")
r = call_api('getDashboardData', token=TOKEN)
results.append(print_result('getDashboardData', r))
if r.get('success'):
    jobs = r.get('jobs', [])
    print(f"     Jobs: {len(jobs)} รายการ")

# 4. Jobs
print("\n[4] Jobs")
r = call_api('openJob', {
    'customer_name': 'ทดสอบ API',
    'device': 'Notebook Test',
    'issue': 'ทดสอบระบบ',
    'priority': 'ปกติ'
}, token=TOKEN)
results.append(print_result('openJob (createJob)', r))
test_job_id = ''
if r.get('success'):
    test_job_id = r.get('job_id', r.get('data', {}).get('job_id', ''))
    print(f"     Job ID: {test_job_id}")

# 5. Inventory
print("\n[5] Inventory")
r = call_api('inventoryOverview', token=TOKEN)
results.append(print_result('inventoryOverview', r))

r = call_api('addInventoryItem', {
    'item_code': 'TEST001',
    'item_name': 'สินค้าทดสอบ',
    'category': 'อะไหล่',
    'unit': 'ชิ้น',
    'qty': 10,
    'cost': 100,
    'price': 150,
    'location': 'SHOP'
}, token=TOKEN)
results.append(print_result('addInventoryItem', r))

# 6. Customer
print("\n[6] Customer / CRM")
r = call_api('createCustomer', {
    'name': 'ลูกค้าทดสอบ API',
    'phone': '0812345678',
    'email': 'test@example.com'
}, token=TOKEN)
results.append(print_result('createCustomer', r))

r = call_api('listCustomers', token=TOKEN)
results.append(print_result('listCustomers', r))

# 7. System Status
print("\n[7] System")
r = call_api('systemStatus', token=TOKEN)
results.append(print_result('systemStatus', r))

r = call_api('getComphoneConfig', token=TOKEN)
results.append(print_result('getComphoneConfig', r))

# 8. Session Verify
print("\n[8] Session")
r = call_api('verifySession', {'token': TOKEN})
results.append(print_result('verifySession', r))

r = call_api('listUsers', token=TOKEN)
results.append(print_result('listUsers', r))

# ─── Summary ──────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
passed = sum(1 for r in results if r)
total = len(results)
print(f"  ผลการทดสอบ: {passed}/{total} ผ่าน")
if passed == total:
    print("  ✅ ทุก endpoint ทำงานปกติ")
else:
    print(f"  ⚠️  {total - passed} endpoint มีปัญหา")
print("=" * 60)

sys.exit(0 if passed == total else 1)
