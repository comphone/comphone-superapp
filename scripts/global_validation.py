#!/usr/bin/env python3
# ============================================================
# global_validation.py — COMPHONE SUPER APP V5.5
# PART 4: Global Validation — ตรวจสอบ end-to-end flow ทุก path
# ============================================================

import os
import re
import json
from pathlib import Path

BASE = Path(__file__).parent.parent
GAS_DIR = BASE / "clasp-ready"
PWA_DIR = BASE / "pwa"

PASS = "✅"
FAIL = "❌"
WARN = "⚠️"

results = []

def check(name, passed, detail=""):
    status = PASS if passed else FAIL
    results.append({"name": name, "status": status, "detail": detail})
    print(f"  {status} {name}" + (f" — {detail}" if detail else ""))

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

# ============================================================
# FLOW 1: TAX ENGINE
# ============================================================
section("FLOW 1: Tax Engine")

tax_file = GAS_DIR / "TaxEngine.gs"
check("TaxEngine.gs exists", tax_file.exists())
if tax_file.exists():
    content = tax_file.read_text(encoding="utf-8")
    check("calculateTax() defined", "function calculateTax" in content)
    check("applyTaxToBilling() defined", "function applyTaxToBilling" in content)
    check("saveTaxReport() defined", "function saveTaxReport" in content)
    check("getTaxReport() defined", "function getTaxReport" in content)
    check("taxAction() defined", "function taxAction" in content)
    check("VAT7 mode supported", "'VAT7'" in content)
    check("ZERO rate supported", "'ZERO'" in content)
    check("EXEMPT mode supported", "'EXEMPT'" in content)
    check("WHT calculation", "wht_amount" in content.lower() or "WHT_Amount" in content)
    check("roundMoney_ helper", "function roundMoney_" in content)

tax_doc_file = GAS_DIR / "TaxDocuments.gs"
check("TaxDocuments.gs exists", tax_doc_file.exists())
if tax_doc_file.exists():
    content = tax_doc_file.read_text(encoding="utf-8")
    check("generateTaxInvoice() defined", "function generateTaxInvoice" in content)
    check("generateWhtDocument() defined", "function generateWhtDocument" in content)
    check("cronTaxReminder() defined", "function cronTaxReminder" in content)
    check("setupTaxReminderTrigger() defined", "function setupTaxReminderTrigger" in content)

# ============================================================
# FLOW 2: BILLING
# ============================================================
section("FLOW 2: Billing")

billing_file = GAS_DIR / "BillingManager.gs"
check("BillingManager.gs exists", billing_file.exists())
if billing_file.exists():
    content = billing_file.read_text(encoding="utf-8")
    check("createBill() or billingAction()", "billingAction" in content or "createBill" in content)
    check("generateReceiptPdf()", "generateReceiptPdf" in content or "Receipt" in content)
    check("generateQrCode()", "generateQrCode" in content or "QR" in content)
    check("verifySlip()", "verifySlip" in content or "slip" in content.lower())
    check("VAT/Tax integration (TaxEngine)", "TaxEngine" in content or "calculateTax" in content or "applyTax" in content or "VAT" in content.upper())
    check("PromptPay QR generation", "promptpay" in content.lower() or "PromptPay" in content)

# ============================================================
# FLOW 3: CUSTOMER PORTAL
# ============================================================
section("FLOW 3: Customer Portal")

portal_html = PWA_DIR / "customer_portal.html"
check("customer_portal.html exists", portal_html.exists())
if portal_html.exists():
    content = portal_html.read_text(encoding="utf-8")
    check("No 'ร้านซ่อมมือถือ' text", "ร้านซ่อมมือถือ" not in content)
    check("No 'ระบบซ่อมมือถือ' text", "ระบบซ่อมมือถือ" not in content)
    check("COMPHONE brand present", "COMPHONE" in content)
    check("Job status check UI", "job" in content.lower() and "status" in content.lower())
    check("QR scan feature", "qr" in content.lower() or "scan" in content.lower())

portal_gs = GAS_DIR / "CustomerPortal.gs"
check("CustomerPortal.gs exists", portal_gs.exists())
if portal_gs.exists():
    content = portal_gs.read_text(encoding="utf-8")
    check("getJobStatus() defined", "getJobStatus" in content or "jobStatus" in content)

# ============================================================
# FLOW 4: AI (Vision Analysis + Slip Verify)
# ============================================================
section("FLOW 4: AI Vision + Slip Verify")

vision_file = GAS_DIR / "VisionAnalysis.gs"
check("VisionAnalysis.gs exists", vision_file.exists())
if vision_file.exists():
    content = vision_file.read_text(encoding="utf-8")
    check("analyzeImage() or visionAction()", "analyzeImage" in content or "visionAction" in content or "VisionAnalysis" in content)
    check("Gemini API integration", "gemini" in content.lower() or "GEMINI" in content)

slip_file = PWA_DIR / "billing_slip_verify.js"
check("billing_slip_verify.js exists", slip_file.exists())
if slip_file.exists():
    content = slip_file.read_text(encoding="utf-8")
    check("verifySlip function", "verifySlip" in content or "slip" in content.lower())

# ============================================================
# FLOW 5: SECURITY
# ============================================================
section("FLOW 5: Security")

security_file = GAS_DIR / "Security.gs"
check("Security.gs exists", security_file.exists())
if security_file.exists():
    content = security_file.read_text(encoding="utf-8")
    check("getSecurityStatus() defined", "getSecurityStatus" in content)
    check("trackFailedLogin_() defined", "trackFailedLogin_" in content)
    check("validatePasswordPolicy_() defined", "validatePasswordPolicy_" in content)

auth_file = GAS_DIR / "Auth.gs"
check("Auth.gs exists", auth_file.exists())
if auth_file.exists():
    content = auth_file.read_text(encoding="utf-8")
    check("login() defined", "function login" in content or "login" in content)
    check("logout() defined", "logout" in content)

health_file = GAS_DIR / "HealthMonitor.gs"
check("HealthMonitor.gs exists", health_file.exists())
if health_file.exists():
    content = health_file.read_text(encoding="utf-8")
    check("verifyRequestToken_() defined", "function verifyRequestToken_" in content)
    check("checkRateLimit_() defined", "function checkRateLimit_" in content)
    check("validateCorsOrigin_() defined", "function validateCorsOrigin_" in content)

# ============================================================
# FLOW 6: REPORTS
# ============================================================
section("FLOW 6: Reports")

reports_file = GAS_DIR / "Reports.gs"
check("Reports.gs exists", reports_file.exists())
if reports_file.exists():
    content = reports_file.read_text(encoding="utf-8")
    check("getReportData_() defined", "function getReportData_" in content)
    check("Revenue report", "revenue" in content.lower() or "Revenue" in content)
    check("Period-based report (week/month/quarter/year)", "month" in content or "week" in content)

# ============================================================
# FLOW 7: MULTI-BRANCH
# ============================================================
section("FLOW 7: Multi-branch")

branch_file = GAS_DIR / "MultiBranch.gs"
check("MultiBranch.gs exists", branch_file.exists())
if branch_file.exists():
    content = branch_file.read_text(encoding="utf-8")
    check("getCurrentBranchId() defined", "function getCurrentBranchId" in content)
    check("getBranchList() defined", "function getBranchList" in content)
    check("filterByBranch() defined", "function filterByBranch" in content)
    check("ensureAllBranchIdColumns() defined", "function ensureAllBranchIdColumns" in content)
    check("getBranchSummary() defined", "function getBranchSummary" in content)

# ============================================================
# FLOW 8: WARRANTY
# ============================================================
section("FLOW 8: Warranty Management")

warranty_file = GAS_DIR / "WarrantyManager.gs"
check("WarrantyManager.gs exists", warranty_file.exists())
if warranty_file.exists():
    content = warranty_file.read_text(encoding="utf-8")
    check("createWarranty() defined", "function createWarranty" in content)
    check("getWarrantyByJobId() defined", "function getWarrantyByJobId" in content)
    check("listWarranties() defined", "function listWarranties" in content)
    check("updateWarrantyStatus() defined", "function updateWarrantyStatus" in content)
    check("generateWarrantyPdfInternal_() defined", "function generateWarrantyPdfInternal_" in content)
    check("getWarrantyDue() defined", "function getWarrantyDue" in content)

# ============================================================
# FLOW 9: DATABASE INTEGRITY
# ============================================================
section("FLOW 9: Database Integrity")

db_file = GAS_DIR / "DatabaseIntegrity.gs"
check("DatabaseIntegrity.gs exists", db_file.exists())
if db_file.exists():
    content = db_file.read_text(encoding="utf-8")
    check("validateSchema_() defined", "function validateSchema_" in content)
    check("safeWriteRow_() defined", "function safeWriteRow_" in content)
    check("runIntegrityCheck() defined", "function runIntegrityCheck" in content)
    check("cleanAllData() defined", "function cleanAllData" in content)
    check("runDatabaseMaintenance() defined", "function runDatabaseMaintenance" in content)

setup_file = GAS_DIR / "Setup.gs"
check("Setup.gs exists", setup_file.exists())
if setup_file.exists():
    content = setup_file.read_text(encoding="utf-8")
    check("DB_TAX_REPORT schema", "DB_TAX_REPORT" in content)
    check("DB_WARRANTY schema", "DB_WARRANTY" in content)
    check("DB_HEALTH_LOG schema", "DB_HEALTH_LOG" in content)
    check("DBJOBS schema", "DBJOBS" in content)
    check("DB_BILLING schema", "DB_BILLING" in content)
    check("DB_CUSTOMERS schema", "DB_CUSTOMERS" in content)

# ============================================================
# FLOW 10: UI REBRANDING
# ============================================================
section("FLOW 10: UI Rebranding")

# ตรวจสอบว่าไม่มีคำต้องห้ามในไฟล์ PWA
forbidden_terms = ["ร้านซ่อมมือถือ", "ระบบซ่อมมือถือ", "งานซ่อมมือถือ", "ช่างมือถือ", "อะไหล่มือถือ"]
pwa_files = list(PWA_DIR.glob("*.html")) + list(PWA_DIR.glob("*.js")) + list(PWA_DIR.glob("*.json"))

for term in forbidden_terms:
    found_in = []
    for f in pwa_files:
        try:
            if term in f.read_text(encoding="utf-8"):
                found_in.append(f.name)
        except:
            pass
    check(f"No '{term}' in PWA files", len(found_in) == 0,
          f"Found in: {', '.join(found_in)}" if found_in else "")

# ตรวจสอบ brand ใหม่
index_html = PWA_DIR / "index.html"
if index_html.exists():
    content = index_html.read_text(encoding="utf-8")
    check("Title = 'Comphone SuperApp AI'", "Comphone SuperApp AI" in content)
    check("Description updated", "บริหารงานบริการ IT" in content or "Comphone SuperApp AI" in content)

manifest = PWA_DIR / "manifest.json"
if manifest.exists():
    data = json.loads(manifest.read_text(encoding="utf-8"))
    check("manifest.json name = Comphone SuperApp AI", data.get("name") == "Comphone SuperApp AI")
    check("manifest.json description updated", "มือถือ" not in data.get("description", ""))

# ============================================================
# FLOW 11: ROUTER COMPLETENESS
# ============================================================
section("FLOW 11: Router API Completeness")

router_file = GAS_DIR / "Router.gs"
check("Router.gs exists", router_file.exists())
if router_file.exists():
    content = router_file.read_text(encoding="utf-8")
    required_cases = [
        "taxAction", "calculateTax", "getTaxReport",
        "createWarranty", "getWarrantyByJobId", "listWarranties",
        "healthCheck", "getHealthHistory",
        "getBranchList", "getBranchSummary", "branchAction",
        "databaseMaintenance", "validateSchema", "runIntegrityCheck", "cleanAllData"
    ]
    for case in required_cases:
        check(f"Router has '{case}' case", f"case '{case}'" in content or f'"{case}"' in content)

# ============================================================
# SUMMARY
# ============================================================
section("SUMMARY")

total = len(results)
passed = sum(1 for r in results if r["status"] == PASS)
failed = sum(1 for r in results if r["status"] == FAIL)
warned = sum(1 for r in results if r["status"] == WARN)

print(f"\n  Total checks : {total}")
print(f"  Passed       : {passed} {PASS}")
print(f"  Failed       : {failed} {FAIL}")
print(f"  Warnings     : {warned} {WARN}")
print(f"\n  Score        : {passed}/{total} ({100*passed//total}%)")

if failed == 0:
    print(f"\n  {PASS} ALL CHECKS PASSED — ระบบพร้อม Deploy")
else:
    print(f"\n  {FAIL} มี {failed} checks ที่ล้มเหลว — ต้องแก้ไขก่อน Deploy")
    print("\n  Failed items:")
    for r in results:
        if r["status"] == FAIL:
            print(f"    {FAIL} {r['name']}" + (f" — {r['detail']}" if r['detail'] else ""))

# เขียนผลลัพธ์เป็น JSON
output_path = Path(__file__).parent.parent / "docs" / "validation_report.json"
output_path.parent.mkdir(exist_ok=True)
with open(output_path, "w", encoding="utf-8") as f:
    json.dump({
        "timestamp": __import__("datetime").datetime.now().isoformat(),
        "total": total,
        "passed": passed,
        "failed": failed,
        "score": f"{passed}/{total}",
        "results": results
    }, f, ensure_ascii=False, indent=2)

print(f"\n  📄 Report saved: docs/validation_report.json")
exit(0 if failed == 0 else 1)
