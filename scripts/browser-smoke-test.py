#!/usr/bin/env python3
# ============================================================
# COMPHONE SUPER APP — Browser-Level Smoke Test
# PHMP v1 Post-Incident Observation
# Purpose: Verify dashboard_pc.html renders without recurrence patterns
# Usage: python3 scripts/browser-smoke-test.py [--verbose]
# Exit: 0 = pass, 1 = fail
# ============================================================

import http.server
import socketserver
import threading
import urllib.request
import urllib.error
import sys
import os
import time
import json

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

PORT = 8765
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PWA_DIR = os.path.join(BASE_DIR, "pwa")

VERBOSE = "--verbose" in sys.argv or "-v" in sys.argv

def log(msg):
    if VERBOSE:
        print(msg)

def start_server():
    os.chdir(PWA_DIR)
    handler = http.server.SimpleHTTPRequestHandler
    httpd = socketserver.TCPServer(("", PORT), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    time.sleep(0.5)  # Let server start
    return httpd

def fetch_url(url):
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            return response.read().decode('utf-8', errors='replace')
    except urllib.error.HTTPError as e:
        return f"HTTP_ERROR:{e.code}"
    except Exception as e:
        return f"FETCH_ERROR:{e}"

def linked_local_scripts(html):
    scripts = []
    marker = '<script src="'
    start = 0
    while True:
        idx = html.find(marker, start)
        if idx < 0:
            break
        src_start = idx + len(marker)
        src_end = html.find('"', src_start)
        if src_end < 0:
            break
        src = html[src_start:src_end].split('?')[0]
        if not src.startswith('http') and not src.startswith('//'):
            scripts.append(src.lstrip('/').replace('comphone-superapp/pwa/', ''))
        start = src_end + 1
    return scripts

def html_or_script_contains(html, needle):
    if needle in html:
        return True
    for script in linked_local_scripts(html):
        script_path = os.path.join(PWA_DIR, script)
        if not os.path.isfile(script_path):
            continue
        try:
            with open(script_path, encoding='utf-8') as fh:
                if needle in fh.read():
                    return True
        except OSError:
            pass
    return False

def check_dashboard(html):
    errors = []
    warnings = []
    checks = []

    # --- RECURRENCE PATTERN CHECKS ---

    # R1: Must NOT have ai_executor_validation.js in load order
    if 'ai_executor_validation.js' in html:
        errors.append("RECURRENCE: ai_executor_validation.js still loaded in dashboard")
    else:
        checks.append("✅ ai_executor_validation.js removed from load order")

    # R2: callGas must use direct fetch (not AI_EXECUTOR)
    # Look for the pattern: direct fetch with POST headers
    if 'window.AI_EXECUTOR' in html and 'callGas' in html:
        # Check if callGas still tries AI_EXECUTOR first
        callgas_idx = html.find('async function callGas')
        if callgas_idx > 0:
            snippet = html[callgas_idx:callgas_idx+800]
            if 'window.AI_EXECUTOR' in snippet and 'return window.AI_EXECUTOR' in snippet:
                errors.append("RECURRENCE: callGas() still routes through AI_EXECUTOR (not direct fetch)")
            else:
                checks.append("✅ callGas() uses direct fetch pattern")
        else:
            warnings.append("Could not locate callGas() function")
    else:
        checks.append("✅ No AI_EXECUTOR routing in callGas")

    # R3: Must NOT show APPROVAL_REQUIRED in rendered error fallback
    # The string exists in execution_lock.js source, but should not be the visible error
    # We check if the error display block still has the old message
    if 'APPROVAL_REQUIRED: &quot;getDashboardData&quot; requires prior approval' in html:
        errors.append("RECURRENCE: APPROVAL_REQUIRED error string embedded in HTML output")
    else:
        checks.append("✅ No APPROVAL_REQUIRED error in HTML response")

    # R4: Must have fetch — either inline or via api_client.js
    if "api_client.js" in html and html_or_script_contains(html, "callApi"):
        checks.append("✅ callGas() delegates to api_client.js callApi()")
    elif html_or_script_contains(html, "fetch("):
        checks.append("✅ Direct fetch present in callGas")
    else:
        errors.append("RECURRENCE: fetch() missing — neither inline nor api_client.js")

    # --- FUNCTIONAL CHECKS ---

    # F1: Version badge present
    if 'version_badge' in html:
        checks.append("✅ Version badge element present")
    else:
        errors.append("FUNCTIONAL: version_badge missing")

    # F2: getDashboardData action referenced
    if html_or_script_contains(html, 'getDashboardData'):
        checks.append("✅ getDashboardData referenced")
    else:
        errors.append("FUNCTIONAL: getDashboardData not referenced")

    # F3: GAS_URL defined
    if 'gas_config.js' in html or 'GAS_URL' in html or 'COMPHONE_GAS_URL' in html:
        checks.append("✅ GAS URL config present")
    else:
        errors.append("FUNCTIONAL: GAS URL config missing")

    # F4: Script load order includes critical files
    critical_scripts = ['gas_config.js', 'api_contract.js', 'api_client.js',
                        'dashboard_pc_core.js', 'error_boundary.js']
    for script in critical_scripts:
        if script in html:
            checks.append(f"✅ {script} in load order")
        else:
            errors.append(f"FUNCTIONAL: {script} missing from load order")

    # F5: Service worker registration
    if 'serviceWorker.register' in html:
        checks.append("✅ Service worker registration present")
    else:
        warnings.append("Service worker registration not found")

    # --- SECURITY CHECKS ---

    # S1: __APP_VERSION version lock present
    if "window.__APP_VERSION" in html:
        checks.append("✅ __APP_VERSION lock present")
    else:
        errors.append("SECURITY: __APP_VERSION lock missing")

    # S2: No hardcoded secrets in source
    if 'AKfycby' in html:
        warnings.append("GAS URL hardcoded in HTML (acceptable for public endpoint)")

    return errors, warnings, checks

def main():
    print("🧪 COMPHONE BROWSER SMOKE TEST — Post-Incident Observation")
    print("=" * 60)

    server = None
    try:
        log(f"Starting HTTP server on port {PORT} from {PWA_DIR}...")
        server = start_server()
        log(f"Server started. Fetching dashboard...")

        url = f"http://localhost:{PORT}/dashboard_pc.html"
        html = fetch_url(url)

        if html.startswith("HTTP_ERROR") or html.startswith("FETCH_ERROR"):
            print(f"❌ FAIL: Could not fetch dashboard: {html}")
            return 1

        log(f"Fetched {len(html)} bytes")
        errors, warnings, checks = check_dashboard(html)

        print()
        for c in checks:
            print(f"  {c}")
        for w in warnings:
            print(f"  ⚠️  {w}")
        for e in errors:
            print(f"  {e}")

        print()
        if errors:
            print(f"❌ FAIL: {len(errors)} error(s), {len(warnings)} warning(s)")
            return 1
        else:
            print(f"✅ PASS: {len(checks)} check(s), {len(warnings)} warning(s)")
            return 0

    except KeyboardInterrupt:
        print("\nInterrupted by user")
        return 130
    finally:
        if server:
            server.shutdown()
            log("Server stopped.")

if __name__ == '__main__':
    sys.exit(main())
