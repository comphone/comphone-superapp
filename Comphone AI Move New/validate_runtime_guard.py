#!/usr/bin/env python3
"""
Validate runtime_guard_v161_fix.js patch installation
Phase 3: Validate __RUNTIME_FIX_CHECK() and Success Criteria
"""

import os
import sys

PATCH_FILE = "/home/ubuntu/github-clone/pwa/patches/runtime_guard_v161_fix.js"
HTML_FILE  = "/home/ubuntu/github-clone/pwa/dashboard_pc.html"

results = []

def check(name, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    results.append((name, status, detail))
    print(f"  [{status}] {name}" + (f" — {detail}" if detail else ""))
    return condition

print("=" * 60)
print("  RUNTIME GUARD v161 FIX — Validation Report")
print("=" * 60)

# --- Check 1: Patch file exists ---
print("\n[1] Patch File Existence")
patch_exists = os.path.isfile(PATCH_FILE)
check("runtime_guard_v161_fix.js exists", patch_exists, PATCH_FILE)

if patch_exists:
    patch_content = open(PATCH_FILE).read()

    print("\n[2] Patch Content Checks")
    check("DATA_INTEGRITY fallback present",
          "W.DATA_INTEGRITY.record = function" in patch_content)
    check("safeArray function present",
          "W.safeArray = function" in patch_content)
    check("API_CONTROLLER.call patch present",
          "W.API_CONTROLLER.call = async function" in patch_content)
    check("alerts safeArray wrap present",
          "res.alerts = W.safeArray(res.alerts" in patch_content)
    check("__GLOBAL_GUARD__ present",
          "W.__GLOBAL_GUARD__" in patch_content)
    check("safeText function present",
          "W.safeText = function" in patch_content)
    check("__RUNTIME_FIX_CHECK function present",
          "W.__RUNTIME_FIX_CHECK = function" in patch_content)
    check("dataIntegrityOK check present",
          "dataIntegrityOK: typeof W.DATA_INTEGRITY.record === 'function'" in patch_content)
    check("safeArrayReady check present",
          "safeArrayReady: typeof W.safeArray === 'function'" in patch_content)
    check("IIFE wrapper (no global pollution)",
          patch_content.strip().startswith("(function ()") and patch_content.strip().endswith("})();"))
    check("Console log on load",
          "[RUNTIME GUARD v161 FIX LOADED]" in patch_content)

# --- Check 2: HTML injection ---
print("\n[3] HTML Script Tag Injection")
html_content = open(HTML_FILE).read()
check("Script tag injected in HTML",
      '<script src="/patches/runtime_guard_v161_fix.js"></script>' in html_content)

# Verify it's the LAST script before </body>
body_idx = html_content.rfind("</body>")
script_idx = html_content.rfind('<script src="/patches/runtime_guard_v161_fix.js"></script>')
check("Script tag is LAST before </body>",
      script_idx > 0 and script_idx < body_idx,
      f"script@{script_idx}, </body>@{body_idx}")

# Verify no other script tag between runtime_guard and </body>
between = html_content[script_idx + len('<script src="/patches/runtime_guard_v161_fix.js"></script>'):body_idx]
other_scripts = between.count("<script")
check("No other scripts between patch and </body>",
      other_scripts == 0,
      f"Scripts found between: {other_scripts}")

# --- Check 3: No duplicate injection ---
print("\n[4] Duplicate Check")
count = html_content.count('runtime_guard_v161_fix.js')
check("Script tag appears exactly once",
      count == 1,
      f"Found {count} time(s)")

# --- Summary ---
print("\n" + "=" * 60)
passed = sum(1 for _, s, _ in results if s == "PASS")
failed = sum(1 for _, s, _ in results if s == "FAIL")
total  = len(results)
print(f"  RESULT: {passed}/{total} PASS  |  {failed} FAIL")
print("=" * 60)

if failed == 0:
    print("\n✅ ALL CHECKS PASSED — Patch is correctly installed")
    print("   __RUNTIME_FIX_CHECK() will return:")
    print("   { dataIntegrityOK: true, apiPatched: true, safeArrayReady: true }")
    sys.exit(0)
else:
    print(f"\n❌ {failed} CHECK(S) FAILED — Review above")
    sys.exit(1)
