#!/usr/bin/env python3
"""
COMPHONE SUPER APP v5.9.0-phase2d — API Endpoint Test Suite
ทดสอบ API endpoints หลักทั้งหมดของ GAS Web App @497
"""

import urllib.request
import json
import sys

WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwzJgj8ZMWqLYAsg9DklnrJIM2F-O0yH3gHhBjdn6WQDJ3uuLPI87pxAQAvXLdzDx__7A/exec'

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
    url = WEB_APP_URL + '?action=' + action
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            result = resp.read().decode()
            return json.loads(result)
    except Exception as e:
        return {'success': False, 'error': str(e)}

def test_health():
    print("Testing: healthcheck (GET)")
    result = call_get('healthcheck')
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result.get('status') == 'healthy'

def test_version():
    print("\nTesting: getVersion (GET)")
    result = call_get('getVersion')
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return result.get('success', False)

def test_dashboard():
    print("\nTesting: getDashboardData (GET)")
    result = call_get('getDashboardData')
    if result.get('success'):
        print("✅ Dashboard data received")
        return True
    else:
        print("❌ Failed:", result.get('error'))
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("COMPHONE SUPER APP v5.9.0-phase2d — API Test Suite")
    print("=" * 60)
    
    results = []
    results.append(('Health Check', test_health()))
    results.append(('Get Version', test_version()))
    results.append(('Dashboard Data', test_dashboard()))
    
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    for name, passed in results:
        status = '✅ PASS' if passed else '❌ FAIL'
        print(f"{name}: {status}")
    
    all_passed = all(passed for _, passed in results)
    print(f"\nOverall: {'✅ ALL TESTS PASSED' if all_passed else '❌ SOME TESTS FAILED'}")
    sys.exit(0 if all_passed else 1)
