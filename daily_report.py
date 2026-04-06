# -*- coding: utf-8 -*-
"""
Comphone Daily Report — ดึงข้อมูลจาก Google Sheets ผ่าน GAS API
Usage: python daily_report.py
Output: สร้างไฟล์ daily_report_YYYYMMDD.txt
"""

import urllib.request
import urllib.error
import json
from datetime import datetime
import os

GAS_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbyvO-2dBR8RQH1EmuAXKFILPwsFxhm6Xsr0B61OaBDF8HIQpVlDnoSu93039NgfxQ_n4A/exec"
REPORT_DIR = os.path.dirname(os.path.abspath(__file__))

def call_gas(action, data):
    """Call GAS API ผ่าน POST request"""
    try:
        payload = json.dumps({"action": action, **data}).encode('utf-8')
        req = urllib.request.Request(
            GAS_WEBHOOK_URL,
            data=payload,
            headers={'Content-Type': 'text/plain;charset=utf-8'},
            method='POST'
        )
        # GAS จะ redirect — ต้อง follow
        import http.cookiejar
        cj = http.cookiejar.CookieJar()
        opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(cj),
            urllib.request.HTTPRedirectHandler()
        )
        response = opener.open(req, timeout=30)
        return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return {"success": False, "error": f"HTTP {e.code}: {e.reason}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def generate_daily_report():
    """สร้างรายงานรายวัน"""
    print("📊 กำลังดึงรายงานจาก Comphone Super App...")
    
    # เรียก GAS API
    result = call_gas("dailyReport", {})
    
    if not result.get("success"):
        return f"❌ ไม่สามารถดึงข้อมูลได้: {result.get('error', 'Unknown')}"
    
    r = result.get("data", {})
    if "error" in r:
        return f"❌ Error จาก Server: {r['error']}"
    
    # Format Report
    lines = []
    lines.append("=" * 50)
    lines.append("📊 COMPHONE DAILY REPORT")
    lines.append(f"📅 วันที่: {r.get('dateTH', '-')}")
    lines.append("=" * 50)
    lines.append("")
    
    # Summary
    lines.append("📋 สรุปงาน")
    lines.append(f"  งานทั้งหมด: {r.get('totalJobs', 0)} งาน")
    lines.append(f"  ⏳ รอดำเนินการ: {r.get('pending', 0)} งาน")
    lines.append(f"  🔄 กำลังทำ: {r.get('inProgress', 0)} งาน")
    lines.append(f"  ✅ เสร็จแล้ว: {r.get('completed', 0)} งาน")
    lines.append(f"  ❌ ยกเลิก: {r.get('canceled', 0)} งาน")
    lines.append("")
    
    # Revenue
    if 'totalRevenue' in r:
        lines.append("💰 สรุปการเงิน")
        lines.append(f"  รายได้รวม: {r.get('totalRevenue', 0):,.0f} บาท")
        lines.append(f"  🔧 ค่าแรง: {r.get('totalLaborCost', 0):,.0f} บาท")
        lines.append(f"  📦 อะไหล่: {r.get('totalPartsCost', 0):,.0f} บาท")
        lines.append("")
    
    # Completed jobs
    comp = r.get('jobsCompleted', [])
    if comp:
        lines.append(f"✅ งานที่เสร็จแล้ว ({len(comp)} งาน)")
        for j in comp:
            lines.append(f"  {j['id']} | {j['customer']} | {j['tech']}")
        lines.append("")
    
    # In progress
    prog = r.get('jobsInProgress', [])
    if prog:
        lines.append(f"🔄 งานที่กำลังทำ ({len(prog)} งาน)")
        for j in prog:
            lines.append(f"  {j['id']} | {j['customer']} | {j['tech']}")
        lines.append("")
    
    # Pending
    pend = r.get('jobsPending', [])
    if pend:
        lines.append(f"⏳ งานที่รอดำเนินการ ({len(pend)} งาน)")
        for j in pend:
            lines.append(f"  {j['id']} | {j['customer']}")
        lines.append("")
    
    lines.append("=" * 50)
    report = "\n".join(lines)
    
    # Save to file
    today = datetime.now().strftime("%Y%m%d")
    filepath = os.path.join(REPORT_DIR, f"daily_report_{today}.txt")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(report)
    print(f"\n💾 บันทึกรายงาน: {filepath}")
    return report

if __name__ == "__main__":
    generate_daily_report()
