#!/usr/bin/env bash
# ============================================================
# COMPHONE SUPER APP — REGRESSION GUARD PACK
# Purpose: Pre-deploy regression checks (smoke + security + version)
# Usage: ./scripts/regression-guard.sh
# Exit: 0 = all pass, 1 = regression detected
# ============================================================

set -euo pipefail

# grep -P aborts under non-UTF-8 multibyte locales (Windows Git Bash callers),
# so pin a UTF-8 locale before any pattern checks run.
export LC_ALL=C.UTF-8

ERRORS=()
WARNINGS=()

function fail() {
  ERRORS+=("❌ $1")
}

function warn() {
  WARNINGS+=("⚠️  $1")
}

echo "🧪 COMPHONE REGRESSION GUARD — Pre-Deploy Check Pack"
echo "============================================================"

# ============================================================
# TEST SUITE A: SMOKE TESTS (File Existence)
# ============================================================
echo ""
echo "💨 [SUITE A] Smoke Tests..."

SMOKE_FILES=(
  "clasp-ready/Router.gs"
  "clasp-ready/Config.gs"
  "clasp-ready/Utils.gs"
  "pwa/sw.js"
  "pwa/index.html"
  "pwa/dashboard_pc.html"
  "pwa/policy_engine.js"
  "pwa/approval_guard.js"
  "pwa/execution_lock.js"
  "pwa/error_boundary.js"
  "pwa/app.js"
  "pwa/auth.js"
  ".github/workflows/deploy-gas.yml"
  ".github/workflows/drive-sync.yml"
)

for f in "${SMOKE_FILES[@]}"; do
  if [ ! -f "$f" ]; then
    fail "Missing critical file: $f"
  fi
done

# Check for empty files
for f in "${SMOKE_FILES[@]}"; do
  if [ -f "$f" ] && [ ! -s "$f" ]; then
    fail "Empty critical file: $f"
  fi
done

# ============================================================
# TEST SUITE B: SECURITY INVARIANT TESTS
# ============================================================
echo ""
echo "🔒 [SUITE B] Security Invariant Tests..."

# B1: Auth gate exists and has protected actions
if ! grep -q '_checkAuthGateV55_' clasp-ready/Router.gs; then
  fail "Auth gate _checkAuthGateV55_ missing from Router.gs"
fi
if ! grep -q 'ADMIN_ACTIONS' clasp-ready/Router.gs; then
  fail "Admin action list missing from auth gate"
fi
if ! grep -q "'createUser'" clasp-ready/Router.gs; then
  fail "Admin auth gate action list missing 'createUser'"
fi
if grep -A25 'var PUBLIC_ACTIONS' clasp-ready/Router.gs | grep -q "'listCustomers'"; then
  fail "Public whitelist exposes listCustomers"
fi
if grep -A25 'var PUBLIC_ACTIONS' clasp-ready/Router.gs | grep -q "'getSecurityStatus'"; then
  fail "Public whitelist exposes getSecurityStatus"
fi

# B2: Private function guard exists
if ! grep -q "functionName.charAt(0) === '_'" clasp-ready/Router.gs; then
  fail "Underscore prefix guard missing from invokeFunctionByNameV55_"
fi

# B3: Rate limiter uses CacheService (not IP-based)
if ! grep -q 'CacheService.getScriptCache()' clasp-ready/Router.gs; then
  fail "Rate limiter CacheService integration missing"
fi
if grep -q 'e.parameter.*ip' clasp-ready/Router.gs; then
  warn "Possible IP-based rate limiting detected (should be token-based)"
fi

# B4: LINE signature hard-fail
if ! grep -q "verifyLineSignature_" clasp-ready/Router.gs; then
  fail "LINE signature hard-fail check missing"
fi

# B5: Approval guard has server timeout
if ! grep -q 'serverTimeoutMs' pwa/approval_guard.js; then
  fail "Approval guard server timeout missing"
fi

# B6: Policy engine has denyAutoFix
if ! grep -q 'denyAutoFix' pwa/policy_engine.js; then
  fail "Policy engine denyAutoFix list missing"
fi

# B7: Execution lock exists
if ! grep -q 'execution_lock\|LOCK_VERSION' pwa/execution_lock.js; then
  warn "Execution lock file may be missing expected content"
fi

# ============================================================
# TEST SUITE C: CACHE / VERSION CHECKS
# ============================================================
echo ""
echo "🔄 [SUITE C] Cache / Version Checks..."

# C1: Version consistency
CONFIG_V=$(grep -oP "VERSION:\s*.\K[0-9.]+" clasp-ready/Config.gs | head -1 || echo "X")
SW_V=$(grep -oP "comphone-v\K[0-9.]+" pwa/sw.js | head -1 || echo "X")
PC_V=$(grep -oP "[?&]v=\K[0-9.]+" pwa/dashboard_pc.html | head -1 || echo "X")
MOBILE_V=$(grep -oP "[?&]v=\K[0-9.]+" pwa/index.html | head -1 || echo "X")

# Frontend versions must match each other
if [ "$SW_V" != "$PC_V" ]; then
  fail "Frontend version mismatch: sw.js=$SW_V vs dashboard=$PC_V"
fi
if [ "$SW_V" != "$MOBILE_V" ]; then
  fail "Frontend version mismatch: sw.js=$SW_V vs mobile=$MOBILE_V"
fi
# Backend version documented separately (may differ from frontend)
echo "   Backend=$CONFIG_V | Frontend=$SW_V"

# C2: Service worker cache-bust logic
if ! grep -q 'caches.keys().then(keys' pwa/sw.js || ! grep -q 'keys.forEach' pwa/sw.js || ! grep -q 'caches.delete' pwa/sw.js; then
  warn "SW may be missing cache cleanup logic"
fi

# C3: Dashboard has version badge
if ! grep -q 'version_badge' pwa/dashboard_pc.html; then
  fail "Version badge missing from dashboard_pc.html"
fi

# C4: Dashboard cache-bust params on policy scripts
if ! grep -q 'api_client.js?v=' pwa/dashboard_pc.html; then
  fail "dashboard_pc.html missing cache-busted api_client.js"
fi
if ! grep -q 'dashboard_pc_core.js?v=' pwa/dashboard_pc.html; then
  fail "dashboard_pc.html missing cache-busted dashboard_pc_core.js"
fi

# ============================================================
# TEST SUITE D: LINE IMAGE FLOW TESTS
# ============================================================
echo ""
echo "📱 [SUITE D] LINE Image Flow Tests..."

# D1: Router handles LINE webhook
if ! grep -q 'line/webhook\|LINE_CHANNEL' clasp-ready/Router.gs; then
  fail "LINE webhook handler missing from Router.gs"
fi

# D2: Photo queue sheet exists in Config
if ! grep -q 'PHOTO_QUEUE' clasp-ready/Config.gs; then
  warn "PHOTO_QUEUE sheet not defined in Config.gs"
fi

# D3: Router has image/photo handling logic
if ! grep -q 'photo\|image\|blob\|base64' clasp-ready/Router.gs; then
  warn "Router.gs may be missing image handling logic"
fi

# ============================================================
# TEST SUITE E: BROWSER-LEVEL SMOKE TESTS (Post-Incident Upgrade)
# ============================================================
echo ""
echo "💻 [SUITE E] Browser-Level Smoke Tests..."

# Windows ships a python3 alias stub that exists but cannot run scripts,
# so candidates must prove they can execute before being selected.
PYTHON_BIN=""
for PY_CANDIDATE in python3 python py; do
  if command -v "$PY_CANDIDATE" &>/dev/null && "$PY_CANDIDATE" -c "import sys" &>/dev/null; then
    PYTHON_BIN="$PY_CANDIDATE"
    break
  fi
done

if [ -n "$PYTHON_BIN" ] && [ -f "scripts/browser-smoke-test.py" ]; then
  if "$PYTHON_BIN" scripts/browser-smoke-test.py; then
    echo "   ✅ Browser-level smoke test passed"
  else
    fail "Browser-level smoke test FAILED — recurrence patterns detected"
  fi
else
  warn "Python or browser-smoke-test.py unavailable — skipping browser tests"
fi

if command -v node &>/dev/null && [ -f "scripts/build_code_index.js" ]; then
  if node scripts/build_code_index.js; then
    echo "   โ… Code intelligence index passed"
  else
    fail "Code intelligence index FAILED"
  fi
else
  warn "Node or build_code_index.js unavailable — skipping code index"
fi

if command -v node &>/dev/null && [ -f "scripts/system_integrity_audit.js" ]; then
  if node scripts/system_integrity_audit.js; then
    echo "   ✅ System integrity audit passed"
  else
    fail "System integrity audit FAILED"
  fi
else
  warn "Node or system_integrity_audit.js unavailable - skipping system integrity audit"
fi

if command -v node &>/dev/null && [ -f "scripts/thai_encoding_guard.js" ]; then
  if node scripts/thai_encoding_guard.js; then
    echo "   ✅ Thai encoding guard passed"
  else
    fail "Thai encoding guard FAILED — corrupted Thai in loaded PWA files"
  fi
else
  warn "Node or thai_encoding_guard.js unavailable - skipping Thai encoding guard"
fi

if command -v node &>/dev/null && [ -f "scripts/section_render_smoke.js" ]; then
  if node scripts/section_render_smoke.js; then
    echo "   ✅ Mobile section render smoke passed"
  else
    fail "Mobile section render smoke FAILED — a menu loader threw at render time"
  fi
else
  warn "Node or section_render_smoke.js unavailable - skipping section render smoke"
fi

if command -v node &>/dev/null && [ -f "scripts/pwa_functional_menu_audit.js" ]; then
  if node scripts/pwa_functional_menu_audit.js; then
    echo "   ✅ Functional menu audit passed"
  else
    fail "Functional menu audit FAILED"
  fi
else
  warn "Node or pwa_functional_menu_audit.js unavailable - skipping functional menu audit"
fi

if command -v node &>/dev/null && [ -f "scripts/vision_capability_audit.js" ]; then
  if node scripts/vision_capability_audit.js; then
    echo "   AI Vision capability audit passed"
  else
    fail "AI Vision capability audit FAILED"
  fi
else
  warn "Node or vision_capability_audit.js unavailable - skipping AI Vision capability audit"
fi

if command -v node &>/dev/null && [ -f "scripts/vision_runtime_smoke.js" ]; then
  if node scripts/vision_runtime_smoke.js; then
    echo "   AI Vision runtime smoke passed"
  else
    fail "AI Vision runtime smoke FAILED"
  fi
else
  warn "Node or vision_runtime_smoke.js unavailable - skipping AI Vision runtime smoke"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint99_live_readiness_audit.js" ]; then
  if node scripts/sprint99_live_readiness_audit.js; then
    echo "   Sprint 99 live readiness audit passed"
  else
    fail "Sprint 99 live readiness audit FAILED"
  fi
else
  warn "Node or sprint99_live_readiness_audit.js unavailable - skipping Sprint 99 live readiness audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint100_operator_menu_audit.js" ]; then
  if node scripts/sprint100_operator_menu_audit.js; then
    echo "   Sprint 100 operator menu audit passed"
  else
    fail "Sprint 100 operator menu audit FAILED"
  fi
else
  warn "Node or sprint100_operator_menu_audit.js unavailable - skipping Sprint 100 operator menu audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint101_write_lifecycle_audit.js" ]; then
  if node scripts/sprint101_write_lifecycle_audit.js; then
    echo "   Sprint 101 write lifecycle audit passed"
  else
    fail "Sprint 101 write lifecycle audit FAILED"
  fi
else
  warn "Node or sprint101_write_lifecycle_audit.js unavailable - skipping Sprint 101 write lifecycle audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint102_live_ux_menu_audit.js" ]; then
  if node scripts/sprint102_live_ux_menu_audit.js; then
    echo "   Sprint 102 live UX menu audit passed"
  else
    fail "Sprint 102 live UX menu audit FAILED"
  fi
else
  warn "Node or sprint102_live_ux_menu_audit.js unavailable - skipping Sprint 102 live UX menu audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint103_visual_runtime_walkthrough.js" ]; then
  if node scripts/sprint103_visual_runtime_walkthrough.js; then
    echo "   Sprint 103 visual runtime walkthrough passed"
  else
    fail "Sprint 103 visual runtime walkthrough FAILED"
  fi
else
  warn "Node or sprint103_visual_runtime_walkthrough.js unavailable - skipping Sprint 103 visual runtime walkthrough"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint104_protected_browser_journey.js" ]; then
  if node scripts/sprint104_protected_browser_journey.js; then
    echo "   Sprint 104 protected browser journey passed or skipped safely"
  else
    fail "Sprint 104 protected browser journey FAILED"
  fi
else
  warn "Node or sprint104_protected_browser_journey.js unavailable - skipping Sprint 104 protected browser journey"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint105_record_detail_completeness.js" ]; then
  if node scripts/sprint105_record_detail_completeness.js; then
    echo "   Sprint 105 record detail completeness passed or skipped safely"
  else
    fail "Sprint 105 record detail completeness FAILED"
  fi
else
  warn "Node or sprint105_record_detail_completeness.js unavailable - skipping Sprint 105 record detail completeness"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint106_production_data_quality_guard.js" ]; then
  if node scripts/sprint106_production_data_quality_guard.js; then
    echo "   Sprint 106 production data quality guard passed or reported warnings safely"
  else
    fail "Sprint 106 production data quality guard FAILED"
  fi
else
  warn "Node or sprint106_production_data_quality_guard.js unavailable - skipping Sprint 106 production data quality guard"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint107_controlled_data_cleanup_plan.js" ]; then
  if node scripts/sprint107_controlled_data_cleanup_plan.js; then
    echo "   Sprint 107 controlled data cleanup plan passed"
  else
    fail "Sprint 107 controlled data cleanup plan FAILED"
  fi
else
  warn "Node or sprint107_controlled_data_cleanup_plan.js unavailable - skipping Sprint 107 controlled data cleanup plan"
fi

if command -v node &>/dev/null && [ -f "scripts/vision_e2e_smoke.js" ]; then
  if node scripts/vision_e2e_smoke.js; then
    echo "   AI Vision E2E safety gate passed"
  else
    fail "AI Vision E2E safety gate FAILED"
  fi
else
  warn "Node or vision_e2e_smoke.js unavailable - skipping AI Vision E2E safety gate"
fi

if command -v node &>/dev/null && [ -f "scripts/pwa_line_room_smoke.js" ]; then
  if node scripts/pwa_line_room_smoke.js; then
    echo "   LINE room smoke safety gate passed"
  else
    fail "LINE room smoke safety gate FAILED"
  fi
else
  warn "Node or pwa_line_room_smoke.js unavailable - skipping LINE room smoke safety gate"
fi

if command -v node &>/dev/null && [ -f "scripts/pwa_write_smoke.js" ]; then
  if node scripts/pwa_write_smoke.js; then
    echo "   Write smoke safety gate passed"
  else
    fail "Write smoke safety gate FAILED"
  fi
else
  warn "Node or pwa_write_smoke.js unavailable - skipping write smoke safety gate"
fi

if command -v node &>/dev/null && [ -f "scripts/pwa_smoke_cleanup_plan.js" ]; then
  if node scripts/pwa_smoke_cleanup_plan.js; then
    echo "   Smoke cleanup planner passed"
  else
    fail "Smoke cleanup planner FAILED"
  fi
else
  warn "Node or pwa_smoke_cleanup_plan.js unavailable - skipping smoke cleanup planner"
fi

if command -v node &>/dev/null && [ -f "scripts/pwa_ui_write_contract.js" ]; then
  if node scripts/pwa_ui_write_contract.js; then
    echo "   PWA UI write contract passed"
  else
    fail "PWA UI write contract FAILED"
  fi
else
  warn "Node or pwa_ui_write_contract.js unavailable - skipping PWA UI write contract"
fi

if command -v node &>/dev/null && [ -f "scripts/pwa_ui_surface_audit.js" ]; then
  if node scripts/pwa_ui_surface_audit.js; then
    echo "   PWA UI surface audit passed"
  else
    fail "PWA UI surface audit FAILED"
  fi
else
  warn "Node or pwa_ui_surface_audit.js unavailable - skipping PWA UI surface audit"
fi

if command -v node &>/dev/null && [ -f "scripts/pwa_menu_journey_audit.js" ]; then
  if node scripts/pwa_menu_journey_audit.js; then
    echo "   PWA menu journey audit passed"
  else
    fail "PWA menu journey audit FAILED"
  fi
else
  warn "Node or pwa_menu_journey_audit.js unavailable - skipping PWA menu journey audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint74_core_audit.js" ]; then
  if node scripts/sprint74_core_audit.js; then
    echo "   Sprint 74 core system audit passed"
  else
    fail "Sprint 74 core system audit FAILED"
  fi
else
  warn "Node or sprint74_core_audit.js unavailable - skipping Sprint 74 core system audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint75_jobs_billing_reports_audit.js" ]; then
  if node scripts/sprint75_jobs_billing_reports_audit.js; then
    echo "   Sprint 75 Jobs/Billing/Reports audit passed"
  else
    fail "Sprint 75 Jobs/Billing/Reports audit FAILED"
  fi
else
  warn "Node or sprint75_jobs_billing_reports_audit.js unavailable - skipping Sprint 75 focused audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint76_jobs_e2e_audit.js" ]; then
  if node scripts/sprint76_jobs_e2e_audit.js; then
    echo "   Sprint 76 Jobs E2E audit passed"
  else
    fail "Sprint 76 Jobs E2E audit FAILED"
  fi
else
  warn "Node or sprint76_jobs_e2e_audit.js unavailable - skipping Sprint 76 Jobs E2E audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint77_billing_e2e_audit.js" ]; then
  if node scripts/sprint77_billing_e2e_audit.js; then
    echo "   Sprint 77 Billing E2E audit passed"
  else
    fail "Sprint 77 Billing E2E audit FAILED"
  fi
else
  warn "Node or sprint77_billing_e2e_audit.js unavailable - skipping Sprint 77 Billing E2E audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint78_reports_e2e_audit.js" ]; then
  if node scripts/sprint78_reports_e2e_audit.js; then
    echo "   Sprint 78 Reports E2E audit passed"
  else
    fail "Sprint 78 Reports E2E audit FAILED"
  fi
else
  warn "Node or sprint78_reports_e2e_audit.js unavailable - skipping Sprint 78 Reports E2E audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint79_vision_line_flow_audit.js" ]; then
  if node scripts/sprint79_vision_line_flow_audit.js; then
    echo "   Sprint 79 Vision+LINE flow audit passed"
  else
    fail "Sprint 79 Vision+LINE flow audit FAILED"
  fi
else
  warn "Node or sprint79_vision_line_flow_audit.js unavailable - skipping Sprint 79 Vision+LINE flow audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint80_production_journey_audit.js" ]; then
  if node scripts/sprint80_production_journey_audit.js; then
    echo "   Sprint 80 production journey audit passed"
  else
    fail "Sprint 80 production journey audit FAILED"
  fi
else
  warn "Node or sprint80_production_journey_audit.js unavailable - skipping Sprint 80 production journey audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint82_mobile_quick_actions_audit.js" ]; then
  if node scripts/sprint82_mobile_quick_actions_audit.js; then
    echo "   Sprint 82 mobile quick actions audit passed"
  else
    fail "Sprint 82 mobile quick actions audit FAILED"
  fi
else
  warn "Node or sprint82_mobile_quick_actions_audit.js unavailable - skipping Sprint 82 mobile quick actions audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint83_mobile_core_workflows_audit.js" ]; then
  if node scripts/sprint83_mobile_core_workflows_audit.js; then
    echo "   Sprint 83 mobile core workflows audit passed"
  else
    fail "Sprint 83 mobile core workflows audit FAILED"
  fi
else
  warn "Node or sprint83_mobile_core_workflows_audit.js unavailable - skipping Sprint 83 mobile core workflows audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint84_mobile_secondary_workflows_audit.js" ]; then
  if node scripts/sprint84_mobile_secondary_workflows_audit.js; then
    echo "   Sprint 84 mobile secondary workflows audit passed"
  else
    fail "Sprint 84 mobile secondary workflows audit FAILED"
  fi
else
  warn "Node or sprint84_mobile_secondary_workflows_audit.js unavailable - skipping Sprint 84 mobile secondary workflows audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint85_live_mobile_menu_smoke.js" ]; then
  if node scripts/sprint85_live_mobile_menu_smoke.js; then
    echo "   Sprint 85 live mobile menu smoke passed"
  else
    fail "Sprint 85 live mobile menu smoke FAILED"
  fi
else
  warn "Node or sprint85_live_mobile_menu_smoke.js unavailable - skipping Sprint 85 live mobile menu smoke"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint86_operator_ux_qa_checklist.js" ]; then
  if node scripts/sprint86_operator_ux_qa_checklist.js; then
    echo "   Sprint 86 operator UX QA checklist passed"
  else
    fail "Sprint 86 operator UX QA checklist FAILED"
  fi
else
  warn "Node or sprint86_operator_ux_qa_checklist.js unavailable - skipping Sprint 86 operator UX QA checklist"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint87_protected_live_qa_runbook.js" ]; then
  if node scripts/sprint87_protected_live_qa_runbook.js; then
    echo "   Sprint 87 protected live QA runbook passed or skipped safely"
  else
    fail "Sprint 87 protected live QA runbook FAILED"
  fi
else
  warn "Node or sprint87_protected_live_qa_runbook.js unavailable - skipping Sprint 87 protected live QA runbook"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint98_operator_workflow_audit.js" ]; then
  if node scripts/sprint98_operator_workflow_audit.js; then
    echo "   Sprint 98 operator workflow audit passed"
  else
    fail "Sprint 98 operator workflow audit FAILED"
  fi
else
  warn "Node or sprint98_operator_workflow_audit.js unavailable - skipping Sprint 98 operator workflow audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint108_database_schema_registry_guard.js" ]; then
  if node scripts/sprint108_database_schema_registry_guard.js; then
    echo "   Sprint 108 database schema registry guard passed"
  else
    fail "Sprint 108 database schema registry guard FAILED"
  fi
else
  warn "Node or sprint108_database_schema_registry_guard.js unavailable - skipping Sprint 108 database schema registry guard"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint109_data_repair_console_plan.js" ]; then
  if node scripts/sprint109_data_repair_console_plan.js; then
    echo "   Sprint 109 data repair console plan passed"
  else
    fail "Sprint 109 data repair console plan FAILED"
  fi
else
  warn "Node or sprint109_data_repair_console_plan.js unavailable - skipping Sprint 109 data repair console plan"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint111_controlled_data_repair_execution.js" ]; then
  if node scripts/sprint111_controlled_data_repair_execution.js; then
    echo "   Sprint 111 controlled data repair execution guard passed"
  else
    fail "Sprint 111 controlled data repair execution guard FAILED"
  fi
else
  warn "Node or sprint111_controlled_data_repair_execution.js unavailable - skipping Sprint 111 controlled data repair execution guard"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint112_admin_repair_console_audit.js" ]; then
  if node scripts/sprint112_admin_repair_console_audit.js; then
    echo "   Sprint 112 admin repair console audit passed"
  else
    fail "Sprint 112 admin repair console audit FAILED"
  fi
else
  warn "Node or sprint112_admin_repair_console_audit.js unavailable - skipping Sprint 112 admin repair console audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint113_repair_console_live_qa.js" ]; then
  if node scripts/sprint113_repair_console_live_qa.js; then
    echo "   Sprint 113 repair console live QA passed"
  else
    fail "Sprint 113 repair console live QA FAILED"
  fi
else
  warn "Node or sprint113_repair_console_live_qa.js unavailable - skipping Sprint 113 repair console live QA"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint114_jobs_workflow_polish_audit.js" ]; then
  if node scripts/sprint114_jobs_workflow_polish_audit.js; then
    echo "   Sprint 114 Jobs workflow polish audit passed"
  else
    fail "Sprint 114 Jobs workflow polish audit FAILED"
  fi
else
  warn "Node or sprint114_jobs_workflow_polish_audit.js unavailable - skipping Sprint 114 Jobs workflow polish audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint115_billing_resilience_audit.js" ]; then
  if node scripts/sprint115_billing_resilience_audit.js; then
    echo "   Sprint 115 Billing resilience audit passed"
  else
    fail "Sprint 115 Billing resilience audit FAILED"
  fi
else
  warn "Node or sprint115_billing_resilience_audit.js unavailable - skipping Sprint 115 Billing resilience audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint116_reports_drilldown_audit.js" ]; then
  if node scripts/sprint116_reports_drilldown_audit.js; then
    echo "   Sprint 116 Reports drilldown audit passed"
  else
    fail "Sprint 116 Reports drilldown audit FAILED"
  fi
else
  warn "Node or sprint116_reports_drilldown_audit.js unavailable - skipping Sprint 116 Reports drilldown audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint117_vision_line_operational_loop_audit.js" ]; then
  if node scripts/sprint117_vision_line_operational_loop_audit.js; then
    echo "   Sprint 117 Vision + LINE operational loop audit passed"
  else
    fail "Sprint 117 Vision + LINE operational loop audit FAILED"
  fi
else
  warn "Node or sprint117_vision_line_operational_loop_audit.js unavailable - skipping Sprint 117 Vision + LINE operational loop audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint119_inventory_po_warranty_audit.js" ]; then
  if node scripts/sprint119_inventory_po_warranty_audit.js; then
    echo "   Sprint 119 Inventory/PO/Warranty workflow audit passed"
  else
    fail "Sprint 119 Inventory/PO/Warranty workflow audit FAILED"
  fi
else
  warn "Node or sprint119_inventory_po_warranty_audit.js unavailable - skipping Sprint 119 Inventory/PO/Warranty workflow audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint120_settings_admin_runtime_audit.js" ]; then
  if node scripts/sprint120_settings_admin_runtime_audit.js; then
    echo "   Sprint 120 Settings/Admin runtime audit passed"
  else
    fail "Sprint 120 Settings/Admin runtime audit FAILED"
  fi
else
  warn "Node or sprint120_settings_admin_runtime_audit.js unavailable - skipping Sprint 120 Settings/Admin runtime audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint121_performance_accessibility_audit.js" ]; then
  if node scripts/sprint121_performance_accessibility_audit.js; then
    echo "   Sprint 121 Performance/Accessibility audit passed"
  else
    fail "Sprint 121 Performance/Accessibility audit FAILED"
  fi
else
  warn "Node or sprint121_performance_accessibility_audit.js unavailable - skipping Sprint 121 Performance/Accessibility audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint122_dashboard_operator_analytics_audit.js" ]; then
  if node scripts/sprint122_dashboard_operator_analytics_audit.js; then
    echo "   Sprint 122 Dashboard Operator Analytics audit passed"
  else
    fail "Sprint 122 Dashboard Operator Analytics audit FAILED"
  fi
else
  warn "Node or sprint122_dashboard_operator_analytics_audit.js unavailable - skipping Sprint 122 Dashboard Operator Analytics audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint123_live_visual_qa_guard.js" ]; then
  if node scripts/sprint123_live_visual_qa_guard.js; then
    echo "   Sprint 123 Live Visual QA guard passed"
  else
    fail "Sprint 123 Live Visual QA guard FAILED"
  fi
else
  warn "Node or sprint123_live_visual_qa_guard.js unavailable - skipping Sprint 123 Live Visual QA guard"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint124_protected_visual_menu_qa.js" ]; then
  if node scripts/sprint124_protected_visual_menu_qa.js; then
    echo "   Sprint 124 Protected Visual/Menu QA passed"
  else
    fail "Sprint 124 Protected Visual/Menu QA FAILED"
  fi
else
  warn "Node or sprint124_protected_visual_menu_qa.js unavailable - skipping Sprint 124 Protected Visual/Menu QA"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint125_role_based_dashboard_widgets_audit.js" ]; then
  if node scripts/sprint125_role_based_dashboard_widgets_audit.js; then
    echo "   Sprint 125 Role-Based Dashboard Widgets audit passed"
  else
    fail "Sprint 125 Role-Based Dashboard Widgets audit FAILED"
  fi
else
  warn "Node or sprint125_role_based_dashboard_widgets_audit.js unavailable - skipping Sprint 125 Role-Based Dashboard Widgets audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint126_ai_vision_role_readiness_audit.js" ]; then
  if node scripts/sprint126_ai_vision_role_readiness_audit.js; then
    echo "   Sprint 126 AI Vision + Role Readiness audit passed"
  else
    fail "Sprint 126 AI Vision + Role Readiness audit FAILED"
  fi
else
  warn "Node or sprint126_ai_vision_role_readiness_audit.js unavailable - skipping Sprint 126 AI Vision + Role Readiness audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint127_vision_line_notification_controls_audit.js" ]; then
  if node scripts/sprint127_vision_line_notification_controls_audit.js; then
    echo "   Sprint 127 Vision + LINE Notification Controls audit passed"
  else
    fail "Sprint 127 Vision + LINE Notification Controls audit FAILED"
  fi
else
  warn "Node or sprint127_vision_line_notification_controls_audit.js unavailable - skipping Sprint 127 Vision + LINE Notification Controls audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint128_line_notification_toggle_live_qa.js" ]; then
  if node scripts/sprint128_line_notification_toggle_live_qa.js; then
    echo "   Sprint 128 LINE Notification Toggle Live QA passed or skipped safely"
  else
    fail "Sprint 128 LINE Notification Toggle Live QA FAILED"
  fi
else
  warn "Node or sprint128_line_notification_toggle_live_qa.js unavailable - skipping Sprint 128 LINE Notification Toggle Live QA"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint129_vision_line_suppression_live_qa.js" ]; then
  if node scripts/sprint129_vision_line_suppression_live_qa.js; then
    echo "   Sprint 129 AI Vision LINE Suppression Live QA passed or skipped safely"
  else
    fail "Sprint 129 AI Vision LINE Suppression Live QA FAILED"
  fi
else
  warn "Node or sprint129_vision_line_suppression_live_qa.js unavailable - skipping Sprint 129 AI Vision LINE Suppression Live QA"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint131_line_real_send_readiness.js" ]; then
  if node scripts/sprint131_line_real_send_readiness.js; then
    echo "   Sprint 131 LINE Real-Send Readiness passed or skipped safely"
  else
    fail "Sprint 131 LINE Real-Send Readiness FAILED"
  fi
else
  warn "Node or sprint131_line_real_send_readiness.js unavailable - skipping Sprint 131 LINE Real-Send Readiness"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint132_core_workflow_live_qa.js" ]; then
  if node scripts/sprint132_core_workflow_live_qa.js; then
    echo "   Sprint 132 Core Workflow Live QA passed or skipped safely"
  else
    fail "Sprint 132 Core Workflow Live QA FAILED"
  fi
else
  warn "Node or sprint132_core_workflow_live_qa.js unavailable - skipping Sprint 132 Core Workflow Live QA"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint133_support_admin_live_qa.js" ]; then
  if node scripts/sprint133_support_admin_live_qa.js; then
    echo "   Sprint 133 Support/Admin Live QA passed or skipped safely"
  else
    fail "Sprint 133 Support/Admin Live QA FAILED"
  fi
else
  warn "Node or sprint133_support_admin_live_qa.js unavailable - skipping Sprint 133 Support/Admin Live QA"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint134_data_completeness_review.js" ]; then
  if node scripts/sprint134_data_completeness_review.js; then
    echo "   Sprint 134 Data Completeness Review passed or reported safe warnings"
  else
    fail "Sprint 134 Data Completeness Review FAILED"
  fi
else
  warn "Node or sprint134_data_completeness_review.js unavailable - skipping Sprint 134 Data Completeness Review"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint135_data_completeness_panel_audit.js" ]; then
  if node scripts/sprint135_data_completeness_panel_audit.js; then
    echo "   Sprint 135 Data Completeness Panel audit passed"
  else
    fail "Sprint 135 Data Completeness Panel audit FAILED"
  fi
else
  warn "Node or sprint135_data_completeness_panel_audit.js unavailable - skipping Sprint 135 Data Completeness Panel audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint136_data_review_workflow_audit.js" ]; then
  if node scripts/sprint136_data_review_workflow_audit.js; then
    echo "   Sprint 136 Data Review Workflow audit passed"
  else
    fail "Sprint 136 Data Review Workflow audit FAILED"
  fi
else
  warn "Node or sprint136_data_review_workflow_audit.js unavailable - skipping Sprint 136 Data Review Workflow audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint137_backend_review_log_audit.js" ]; then
  if node scripts/sprint137_backend_review_log_audit.js; then
    echo "   Sprint 137 Backend Review Log audit passed"
  else
    fail "Sprint 137 Backend Review Log audit FAILED"
  fi
else
  warn "Node or sprint137_backend_review_log_audit.js unavailable - skipping Sprint 137 Backend Review Log audit"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint138_backend_review_log_live_qa.js" ]; then
  if node scripts/sprint138_backend_review_log_live_qa.js; then
    echo "   Sprint 138 Backend Review Log Live QA passed or skipped safely"
  else
    fail "Sprint 138 Backend Review Log Live QA FAILED"
  fi
else
  warn "Node or sprint138_backend_review_log_live_qa.js unavailable - skipping Sprint 138 Backend Review Log Live QA"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint139_data_cleanup_triage.js" ]; then
  if node scripts/sprint139_data_cleanup_triage.js; then
    echo "   Sprint 139 Data Cleanup Triage passed or skipped safely"
  else
    fail "Sprint 139 Data Cleanup Triage FAILED"
  fi
else
  warn "Node or sprint139_data_cleanup_triage.js unavailable - skipping Sprint 139 Data Cleanup Triage"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint140_jobs_billing_reports_live_polish.js" ]; then
  if node scripts/sprint140_jobs_billing_reports_live_polish.js; then
    echo "   Sprint 140 Jobs/Billing/Reports Live Polish passed or skipped safely"
  else
    fail "Sprint 140 Jobs/Billing/Reports Live Polish FAILED"
  fi
else
  warn "Node or sprint140_jobs_billing_reports_live_polish.js unavailable - skipping Sprint 140 Jobs/Billing/Reports Live Polish"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint141_mobile_menu_deep_qa.js" ]; then
  if node scripts/sprint141_mobile_menu_deep_qa.js; then
    echo "   Sprint 141 Mobile Menu Deep QA passed or skipped safely"
  else
    fail "Sprint 141 Mobile Menu Deep QA FAILED"
  fi
else
  warn "Node or sprint141_mobile_menu_deep_qa.js unavailable - skipping Sprint 141 Mobile Menu Deep QA"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint142_ai_vision_real_use_readiness.js" ]; then
  if node scripts/sprint142_ai_vision_real_use_readiness.js; then
    echo "   Sprint 142 AI Vision Real-Use Readiness passed or skipped safely"
  else
    fail "Sprint 142 AI Vision Real-Use Readiness FAILED"
  fi
else
  warn "Node or sprint142_ai_vision_real_use_readiness.js unavailable - skipping Sprint 142 AI Vision Real-Use Readiness"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint143_permission_ops_hardening.js" ]; then
  if node scripts/sprint143_permission_ops_hardening.js; then
    echo "   Sprint 143 Permission/Ops Hardening passed or skipped safely"
  else
    fail "Sprint 143 Permission/Ops Hardening FAILED"
  fi
else
  warn "Node or sprint143_permission_ops_hardening.js unavailable - skipping Sprint 143 Permission/Ops Hardening"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint144_owner_data_resolution.js" ]; then
  if node scripts/sprint144_owner_data_resolution.js; then
    echo "   Sprint 144 Owner Data Resolution passed or skipped safely"
  else
    fail "Sprint 144 Owner Data Resolution FAILED"
  fi
else
  warn "Node or sprint144_owner_data_resolution.js unavailable - skipping Sprint 144 Owner Data Resolution"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint145_mobile_ux_walkthrough.js" ]; then
  if node scripts/sprint145_mobile_ux_walkthrough.js; then
    echo "   Sprint 145 Mobile UX Walkthrough passed or skipped safely"
  else
    fail "Sprint 145 Mobile UX Walkthrough FAILED"
  fi
else
  warn "Node or sprint145_mobile_ux_walkthrough.js unavailable - skipping Sprint 145 Mobile UX Walkthrough"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint146_ai_vision_pilot_workflow.js" ]; then
  if node scripts/sprint146_ai_vision_pilot_workflow.js; then
    echo "   Sprint 146 AI Vision Pilot Workflow passed or skipped safely"
  else
    fail "Sprint 146 AI Vision Pilot Workflow FAILED"
  fi
else
  warn "Node or sprint146_ai_vision_pilot_workflow.js unavailable - skipping Sprint 146 AI Vision Pilot Workflow"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint147_dashboard_decision_layer_audit.js" ]; then
  if node scripts/sprint147_dashboard_decision_layer_audit.js; then
    echo "   Sprint 147 Dashboard Decision Layer passed"
  else
    fail "Sprint 147 Dashboard Decision Layer FAILED"
  fi
else
  warn "Node or sprint147_dashboard_decision_layer_audit.js unavailable - skipping Sprint 147 Dashboard Decision Layer"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint148_ops_permission_cleanup.js" ]; then
  if node scripts/sprint148_ops_permission_cleanup.js; then
    echo "   Sprint 148 Ops Permission Cleanup passed or skipped safely"
  else
    fail "Sprint 148 Ops Permission Cleanup FAILED"
  fi
else
  warn "Node or sprint148_ops_permission_cleanup.js unavailable - skipping Sprint 148 Ops Permission Cleanup"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint149_live_browser_visual_qa.js" ]; then
  if node scripts/sprint149_live_browser_visual_qa.js; then
    echo "   Sprint 149 Live Browser Visual QA passed or skipped safely"
  else
    fail "Sprint 149 Live Browser Visual QA FAILED"
  fi
else
  warn "Node or sprint149_live_browser_visual_qa.js unavailable - skipping Sprint 149 Live Browser Visual QA"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint150_data_cleanup_owner_workflow.js" ]; then
  if node scripts/sprint150_data_cleanup_owner_workflow.js; then
    echo "   Sprint 150 Data Cleanup Owner Workflow passed or skipped safely"
  else
    fail "Sprint 150 Data Cleanup Owner Workflow FAILED"
  fi
else
  warn "Node or sprint150_data_cleanup_owner_workflow.js unavailable - skipping Sprint 150 Data Cleanup Owner Workflow"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint151_dashboard_ux_polish_audit.js" ]; then
  if node scripts/sprint151_dashboard_ux_polish_audit.js; then
    echo "   Sprint 151 Dashboard UX Polish passed"
  else
    fail "Sprint 151 Dashboard UX Polish FAILED"
  fi
else
  warn "Node or sprint151_dashboard_ux_polish_audit.js unavailable - skipping Sprint 151 Dashboard UX Polish"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint152_ai_vision_real_pilot_guard.js" ]; then
  if node scripts/sprint152_ai_vision_real_pilot_guard.js; then
    echo "   Sprint 152 AI Vision Real Pilot passed or skipped safely"
  else
    fail "Sprint 152 AI Vision Real Pilot FAILED"
  fi
else
  warn "Node or sprint152_ai_vision_real_pilot_guard.js unavailable - skipping Sprint 152 AI Vision Real Pilot"
fi

if command -v node &>/dev/null && [ -f "scripts/sprint153_permission_fallback_closure.js" ]; then
  if node scripts/sprint153_permission_fallback_closure.js; then
    echo "   Sprint 153 Permission Fallback Closure passed or skipped safely"
  else
    fail "Sprint 153 Permission Fallback Closure FAILED"
  fi
else
  warn "Node or sprint153_permission_fallback_closure.js unavailable - skipping Sprint 153 Permission Fallback Closure"
fi

for sprint_script in \
  sprint154_post_deploy_pages_confirmation \
  sprint155_owner_data_backfill_readiness \
  sprint156_mobile_menu_e2e_guard \
  sprint157_pc_dashboard_workflow_guard \
  sprint158_ai_vision_line_room_control_guard \
  sprint159_post_deploy_publish_confirmation \
  sprint160_real_browser_clickthrough_contract \
  sprint161_protected_live_token_sweep \
  sprint162_owner_data_cleanup_decision \
  sprint163_ai_vision_real_sample_pilot \
  sprint164_pages_publish_lock \
  sprint165_browser_profile_clickthrough_pack \
  sprint166_protected_token_full_sweep_pack \
  sprint167_owner_cleanup_execution_readiness \
  sprint168_ai_vision_real_sample_runbook \
  sprint169_pages_fresh_release_gate \
  sprint170_protected_browser_acceptance_gate \
  sprint171_ai_vision_sample_evidence_contract \
  sprint172_line_room_notification_matrix_gate \
  sprint173_release_readiness_master_gate \
  sprint174_strict_protected_browser_runbook \
  sprint175_ai_vision_sample_pilot_gate \
  sprint176_published_protected_acceptance \
  sprint177_ai_vision_real_sample_evidence \
  sprint178_strict_live_acceptance_gate \
  sprint179_ai_vision_real_sample_execution \
  sprint180_strict_protected_live_proof \
  sprint181_ai_vision_owner_sample_run \
  sprint182_smoke_cleanup_execution \
  sprint183_line_ai_vision_ingress_guard \
  sprint185_line_group_image_pilot \
  sprint188_line_bot_reply_toggle_guard \
  sprint189_line_reply_noise_guard \
  sprint190_ai_vision_review_inbox_guard \
  sprint191_ai_vision_inbox_render_smoke \
  sprint192_mobile_dashboard_simplification_guard \
  sprint193_delete_camera_dashboard_guard \
  sprint194_job_archive_restore_guard \
  sprint195_mobile_tap_guard \
  sprint197_sw_update_reliability_guard
do
  script_path="scripts/${sprint_script}.js"
  if command -v node &>/dev/null && [ -f "$script_path" ]; then
    if node "$script_path"; then
      echo "   ${sprint_script} passed or skipped safely"
    else
      fail "${sprint_script} FAILED"
    fi
  else
    warn "Node or ${script_path} unavailable - skipping ${sprint_script}"
  fi
done

# E2: Post-incident recurrence patterns (check ALL surfaces)
if grep -q '<script src="ai_executor_validation.js"' pwa/dashboard_pc.html; then
  fail "RECURRENCE: ai_executor_validation.js loaded in dashboard_pc.html"
fi
if grep -q '<script src="ai_executor_validation.js"' pwa/index.html; then
  fail "RECURRENCE: ai_executor_validation.js loaded in index.html"
fi
if [ -f pwa/ai_executor_validation.js ]; then
  fail "RECURRENCE: ai_executor_validation.js file still exists in pwa/"
fi

if grep -A5 'async function callGas' pwa/dashboard_pc.html | grep -q 'window.AI_EXECUTOR'; then
  fail "RECURRENCE: callGas() routes through AI_EXECUTOR instead of direct fetch"
fi

if ! grep -q 'Object.getOwnPropertyDescriptor(window, .__USER_ROLE.)' pwa/ai_executor_runtime.js; then
  fail "RECURRENCE: __USER_ROLE redefinition guard missing"
fi

# ============================================================
# REPORT
# ============================================================
echo ""
echo "============================================================"

if [ ${#WARNINGS[@]} -gt 0 ]; then
  echo "⚠️  WARNINGS (${#WARNINGS[@]}):"
  for w in "${WARNINGS[@]}"; do echo "   $w"; done
fi

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo "❌ FAILURES (${#ERRORS[@]}):"
  for e in "${ERRORS[@]}"; do echo "   $e"; done
  echo ""
  echo "❌ REGRESSION GUARD FAILED — Deploy blocked."
  exit 1
else
  echo "✅ ALL CHECKS PASSED — Safe to deploy."
  exit 0
fi
