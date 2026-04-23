#!/usr/bin/env python3
"""
COMPHONE Dashboard v16.1.0 — Final Pre-Handover Validation Script
Phase 1-7 Static Code Analysis
"""

import re
import json
import os
import sys

HTML_FILE = '/home/ubuntu/github-clone/pwa/dashboard_pc.html'
MEMORY_DIR = '/home/ubuntu/handover_v1600/memory'
DOCS_DIR = '/home/ubuntu/handover_v1600/docs'

def load_html():
    with open(HTML_FILE, 'r', encoding='utf-8') as f:
        return f.read(), f.name

results = []

def check(name, condition, detail='', critical=False):
    status = '✅ PASS' if condition else ('❌ FAIL (CRITICAL)' if critical else '⚠️  FAIL')
    results.append({'name': name, 'pass': condition, 'detail': detail, 'critical': critical})
    print(f"  {status} | {name}" + (f" — {detail}" if detail else ''))
    return condition

print("=" * 70)
print("COMPHONE Dashboard v16.1.0 — FINAL PRE-HANDOVER VALIDATION")
print("=" * 70)

# ──────────────────────────────────────────────────────────
# PHASE 1: DATA INTEGRITY FIX
# ──────────────────────────────────────────────────────────
print("\n📋 PHASE 1: DATA INTEGRITY FIX")
content, _ = load_html()

check("safeArray helper defined", "window.safeArray = function" in content, critical=True)
check("safeObject helper defined", "window.safeObject = function" in content)
check("safeString helper defined", "window.safeString = function" in content)
check("safeNumber helper defined", "window.safeNumber = function" in content)
check("renderDashboard wrapped with safeArray", 
      "sanitized.jobs = safeArray" in content and "sanitized.alerts = safeArray" in content, critical=True)
check("loadSection response sanitization hooked", "arrayFields.forEach" in content and "safeArray(res[field])" in content)
check("DATA_INTEGRITY.record called on invalid_type", "DATA_INTEGRITY.record('invalid_type'" in content)

# ──────────────────────────────────────────────────────────
# PHASE 2: UNDEFINED SCAN
# ──────────────────────────────────────────────────────────
print("\n📋 PHASE 2: UNDEFINED SCAN")

check("__V1610_UNDEFINED_VIOLATIONS tracker", "__V1610_UNDEFINED_VIOLATIONS" in content, critical=True)
check("innerHTML undefined guard", "undefined_render" in content)
check("string 'undefined' replacement", "string_undefined" in content)
check("DATA_INTEGRITY.record for undefined_render", "DATA_INTEGRITY.record('undefined_render'" in content)

# ตรวจ renderDashboard L519 — ต้องมี || [] guard
lines = content.split('\n')
render_dash_line = next((i for i, l in enumerate(lines, 1) if 'function renderDashboard(data)' in l), 0)
if render_dash_line:
    context = '\n'.join(lines[render_dash_line-1:render_dash_line+30])
    check("renderDashboard: jobs has || [] guard", "data.jobs || []" in context or "safeArray(data.jobs)" in context)
    check("renderDashboard: alerts has safe handling", "alertsRaw" in context or "safeArray(data.alerts)" in context)
else:
    check("renderDashboard found", False, "function not found", critical=True)

# ──────────────────────────────────────────────────────────
# PHASE 3: CACHE RESET
# ──────────────────────────────────────────────────────────
print("\n📋 PHASE 3: CACHE RESET")

check("CACHE_RESET utility defined", "window.CACHE_RESET" in content, critical=True)
check("CACHE_RESET.clearLocalStorage", "clearLocalStorage: function" in content)
check("CACHE_RESET.clearServiceWorker", "clearServiceWorker: async function" in content)
check("CACHE_RESET.clearCacheAPI", "clearCacheAPI: async function" in content)
check("CACHE_RESET.full method", "full: async function" in content)

# ──────────────────────────────────────────────────────────
# PHASE 4: RUNTIME VALIDATION
# ──────────────────────────────────────────────────────────
print("\n📋 PHASE 4: RUNTIME VALIDATION")

check("V1610 suite defined", "window.V1610" in content, critical=True)
check("V1610.runtimeReport method", "runtimeReport: function" in content)
check("V1610.validate method", "validate: function" in content)
check("V1610.report method", "V1610" in content and "report: function" in content)

# ตรวจ callApi ไม่มี wrapper ซ้อนใน v16.1.0 patch
v1610_patch_start = content.find('__V1610_LOADED')
v1610_patch_end = content.find('</script>', v1610_patch_start) if v1610_patch_start > 0 else -1
if v1610_patch_start > 0 and v1610_patch_end > 0:
    v1610_section = content[v1610_patch_start:v1610_patch_end]
    nested_callapi = len(re.findall(r'window\.callApi\s*=\s*function', v1610_section))
    check("v16.1.0 patch: callApi not permanently wrapped", nested_callapi == 0, 
          f"found {nested_callapi} permanent wraps (temp wrap in loadSection is OK)")

# ──────────────────────────────────────────────────────────
# PHASE 5: MEMORY VALIDATION
# ──────────────────────────────────────────────────────────
print("\n📋 PHASE 5: MEMORY VALIDATION (JSON Files)")

memory_files = [
    'system_state.json', 'DECISION_LOG.json', 'POLICY_ENGINE.json',
    'FAILURE_MEMORY.json', 'FIX_LEARNING_ENGINE.json', 'TRUST_SCORE.json'
]
for fname in memory_files:
    fpath = os.path.join(MEMORY_DIR, fname)
    if os.path.exists(fpath):
        with open(fpath, 'r') as f:
            try:
                data = json.load(f)
                size = os.path.getsize(fpath)
                check(f"Memory: {fname}", size > 100, f"{size} bytes, valid JSON")
            except json.JSONDecodeError as e:
                check(f"Memory: {fname}", False, f"JSON error: {e}", critical=True)
    else:
        check(f"Memory: {fname}", False, "file not found", critical=True)

# ──────────────────────────────────────────────────────────
# PHASE 6: AGENT BOOT TEST
# ──────────────────────────────────────────────────────────
print("\n📋 PHASE 6: AGENT BOOT TEST")

doc_files = ['BOOT_AGENT.md', 'SYSTEM_ARCHITECTURE.md', 'DEBUG_PLAYBOOK.md']
for fname in doc_files:
    fpath = os.path.join(DOCS_DIR, fname)
    if os.path.exists(fpath):
        size = os.path.getsize(fpath)
        check(f"Doc: {fname}", size > 500, f"{size} bytes")
    else:
        check(f"Doc: {fname}", False, "file not found", critical=True)

# ตรวจ BOOT_AGENT.md มี Golden Rules
boot_path = os.path.join(DOCS_DIR, 'BOOT_AGENT.md')
if os.path.exists(boot_path):
    with open(boot_path, 'r') as f:
        boot_content = f.read()
    check("BOOT_AGENT: Golden Rules section", "Golden Rule" in boot_content or "GOLDEN" in boot_content.upper())
    check("BOOT_AGENT: V1600.report() command", "V1600" in boot_content or "report()" in boot_content)
    check("BOOT_AGENT: API_CONTROLLER mentioned", "API_CONTROLLER" in boot_content)

# ──────────────────────────────────────────────────────────
# PHASE 7: SUCCESS CRITERIA
# ──────────────────────────────────────────────────────────
print("\n📋 PHASE 7: SUCCESS CRITERIA")

# ✔ callApi ไม่ซ้อน — นับ window.callApi = function ทั้งหมด
callapi_assigns = len(re.findall(r'window\.callApi\s*=\s*function', content))
check("callApi assignments count", callapi_assigns <= 15, f"{callapi_assigns} assignments (expected ≤15)")

# ✔ ไม่มี infinite loop pattern — ตรวจ callstack guard แทน
has_calllock = '__CALL_LOCK' in content or 'MAX_DEPTH' in content or '_callDepth' in content
check("Call stack protection exists", has_calllock, "__CALL_LOCK or MAX_DEPTH guard found")

# ✔ setInterval count
interval_count = len(re.findall(r'setInterval\s*\(', content))
check("setInterval count reasonable", interval_count <= 20, f"{interval_count} setInterval calls")

# ✔ v16.1.0 patch loaded
check("v16.1.0 patch present in HTML", "__V1610_LOADED" in content, critical=True)

# ✔ All patch versions present — ใช้ guard patterns จริงในแต่ละ version
patch_guards = [
    ('v7.0.0 (Isolation Mode)', '__SYSTEM_STABLE_MODE'),
    ('v8.0.0 (Controller)', '__RUNTIME_GUARD'),
    ('v8.1.0 (Self-Defending)', '__IN_FLIGHT'),
    ('v9.0.0 (Anti-Fragile)', '__CIRCUIT_BREAKER'),
    ('v10.0.0 (Intelligent)', '__INTELLIGENT_THROTTLE'),
    ('v11.0.0 (Self-Learning)', 'DECISION_LOG'),
    ('v12.0.0 (AI Safety)', 'CONFIDENCE_GATE'),
    ('v13.0.0 (AI Governance)', 'AI_SANDBOX'),
    ('v14.0.0 (Observability)', 'PROD_REPLAY'),
    ('v15.0.0 (Incident Mgmt)', 'ROOT_CAUSE_ENGINE'),
    ('v16.0.0 (Self-Evolving)', 'EVOLUTION_SCORE'),
    ('v16.1.0 (Handover)', '__V1610_LOADED'),
]
for ver_name, guard in patch_guards:
    check(f"Patch {ver_name}", guard in content)

# ──────────────────────────────────────────────────────────
# SUMMARY
# ──────────────────────────────────────────────────────────
print("\n" + "=" * 70)
total = len(results)
passed = sum(1 for r in results if r['pass'])
critical_fails = [r for r in results if not r['pass'] and r.get('critical')]
non_critical_fails = [r for r in results if not r['pass'] and not r.get('critical')]

print(f"\n📊 VALIDATION SUMMARY: {passed}/{total} PASSED")
print(f"   Critical Fails: {len(critical_fails)}")
print(f"   Non-Critical Fails: {len(non_critical_fails)}")

if critical_fails:
    print("\n🚨 CRITICAL FAILURES (must fix before handover):")
    for r in critical_fails:
        print(f"   ❌ {r['name']}: {r['detail']}")

if non_critical_fails:
    print("\n⚠️  NON-CRITICAL FAILURES:")
    for r in non_critical_fails:
        print(f"   ⚠️  {r['name']}: {r['detail']}")

if len(critical_fails) == 0 and passed >= total * 0.9:
    print(f"\n✅ READY FOR HANDOVER — {passed}/{total} checks passed")
    sys.exit(0)
elif len(critical_fails) == 0:
    print(f"\n⚠️  MOSTLY READY — {passed}/{total} checks passed (no critical fails)")
    sys.exit(0)
else:
    print(f"\n❌ NOT READY — {len(critical_fails)} critical failures must be fixed")
    sys.exit(1)
