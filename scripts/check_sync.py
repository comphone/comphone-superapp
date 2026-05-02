#!/usr/bin/env python3
"""
COMPHONE SUPER APP - Sync Checker
ตรวจสอบความสอดคล้องของเวอร์ชันระหว่างทุกส่วนของระบบ
"""

import os
import json
import re
from datetime import datetime

PROJECT_ROOT = "/mnt/c/Users/Server/comphone-superapp"
CONFIG_FILE = os.path.join(PROJECT_ROOT, "config.json")

def load_config():
    """โหลด config.json"""
    try:
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"❌ ไม่สามารถโหลด config.json ได้: {e}")
        return None

def get_version_from_file(file_path, pattern):
    """อ่านเวอร์ชันจากไฟล์ด้วย regex pattern"""
    if not os.path.exists(file_path):
        return None
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        match = re.search(pattern, content)
        if match:
            return match.group(1)
        return None
    except Exception as e:
        print(f"⚠️ ผิดพลาดในการอ่าน {file_path}: {e}")
        return None

def check_all_versions(config):
    """ตรวจสอบเวอร์ชันในทุกไฟล์ที่เกี่ยวข้อง"""
    if not config:
        return False
    
    expected_version = config["version"]
    print(f"📋 เวอร์ชันที่คาดหวัง: {expected_version}")
    print("=" * 80)
    
    all_ok = True
    results = []
    
    # 1. ตรวจสอบ config.json
    results.append(("config.json", expected_version, expected_version, True))
    
    # 2. ตรวจสอบ pwa/version_config.js
    file_path = os.path.join(PROJECT_ROOT, "pwa/version_config.js")
    pattern = r"const APP_VERSION = '([^']+)';"
    found_version = get_version_from_file(file_path, pattern)
    ok = found_version == expected_version
    results.append(("pwa/version_config.js", expected_version, found_version or "ไม่พบ", ok))
    if not ok: all_ok = False
    
    # 3. ตรวจสอบ clasp-ready/Config.gs
    file_path = os.path.join(PROJECT_ROOT, "clasp-ready/Config.gs")
    pattern = r"const VERSION = '([^']+)';"
    found_version = get_version_from_file(file_path, pattern)
    ok = found_version == expected_version
    results.append(("clasp-ready/Config.gs", expected_version, found_version or "ไม่พบ", ok))
    if not ok: all_ok = False
    
    # 4. ตรวจสอบ pwa/sw.js
    file_path = os.path.join(PROJECT_ROOT, "pwa/sw.js")
    pattern = r"const CACHE_V = '([^']+)';"
    found_version = get_version_from_file(file_path, pattern)
    # CACHE_V มีรูปแบบ: comphone-v5.13.0-phase35-20260501_1930
    if found_version:
        # ตัดส่วนแรกออกเพื่อเปรียบเทียบเวอร์ชัน
        cache_version = found_version.replace("comphone-v", "").split("-")[0] if "comphone-v" in found_version else found_version
        ok = cache_version == expected_version
    else:
        cache_version = "ไม่พบ"
        ok = False
    results.append(("pwa/sw.js (CACHE_V)", expected_version, cache_version, ok))
    if not ok: all_ok = False
    
    # 5. ตรวจสอบ BLUEPRINT.md
    file_path = os.path.join(PROJECT_ROOT, "BLUEPRINT.md")
    pattern = r"Version: v([^\s]+)"
    found_version = get_version_from_file(file_path, pattern)
    ok = found_version == expected_version
    results.append(("BLUEPRINT.md", expected_version, found_version or "ไม่พบ", ok))
    if not ok: all_ok = False
    
    # 6. ตรวจสอบ cache buster ใน HTML ทุกไฟล์
    html_files = [
        os.path.join(PROJECT_ROOT, "pwa/index.html"),
        os.path.join(PROJECT_ROOT, "pwa/dashboard_pc.html"),
        os.path.join(PROJECT_ROOT, "pwa/monitoring_dashboard.html"),
        os.path.join(PROJECT_ROOT, "pwa/executive_dashboard.html"),
        os.path.join(PROJECT_ROOT, "pwa/demo_dashboard.html")
    ]
    
    for html_file in html_files:
        if not os.path.exists(html_file):
            results.append((os.path.basename(html_file), expected_version, "ไม่พบไฟล์", False))
            all_ok = False
            continue
        
        # ตรวจหา cache buster ในไฟล์ HTML
        try:
            with open(html_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # หา cache buster ทั้งหมดในไฟล์
            pattern = r"v=([0-9]+\.[0-9]+\.[0-9]+-[^&\s]+)&t=([0-9_]+)"
            matches = re.findall(pattern, content)
            
            if not matches:
                results.append((os.path.basename(html_file), expected_version, "ไม่พบ cache buster", False))
                all_ok = False
                continue
            
            # ตรวจสอบว่าเวอร์ชันใน cache buster ตรงกับ expected_version หรือไม่
            file_ok = True
            for match in matches:
                file_version = match[0]
                if file_version != expected_version:
                    file_ok = False
                    break
            
            status = "✅ ตรงกัน" if file_ok else "⚠️ ไม่ตรงกัน"
            results.append((os.path.basename(html_file), expected_version, f"cache buster: {matches[0][0] if matches else 'N/A'}", file_ok))
            if not file_ok: all_ok = False
        except Exception as e:
            results.append((os.path.basename(html_file), expected_version, f"ผิดพลาด: {e}", False))
            all_ok = False
    
    # แสดงผลลัพธ์
    print("\n📊 ผลการตรวจสอบเวอร์ชัน:")
    print("-" * 80)
    print(f"{'ไฟล์'.ljust(35)} | {'คาดหวัง'.ljust(15)} | {'พบ'.ljust(20)} | {'สถานะ'}")
    print("-" * 80)
    
    for item in results:
        file_name, expected, found, ok = item
        status = "✅ ผ่าน" if ok else "❌ ไม่ผ่าน"
        print(f"{file_name.ljust(35)} | {expected.ljust(15)} | {str(found).ljust(20)} | {status}")
    
    print("-" * 80)
    
    # สรุปผล
    if all_ok:
        print("\n🎉 ผลสรุป: ทุกส่วนตรงกับเวอร์ชันที่คาดหวัง!")
    else:
        print("\n⚠️ ผลสรุป: พบความไม่สอดคล้องกันในบางส่วน โปรดแก้ไขตามคำแนะนำด้านบน")
    
    return all_ok

def check_git_status():
    """ตรวจสอบสถานะ Git"""
    print("\n🔍 ตรวจสอบสถานะ Git...")
    print("-" * 80)
    
    try:
        import subprocess
        # ตรวจสอบ branch ปัจจุบัน
        result = subprocess.run("git branch --show-current", shell=True, capture_output=True, text=True, cwd=PROJECT_ROOT)
        current_branch = result.stdout.strip()
        print(f"📋 Branch ปัจจุบัน: {current_branch}")
        
        # ตรวจสอบสถานะไฟล์ที่เปลี่ยนแปลง
        result = subprocess.run("git status --porcelain", shell=True, capture_output=True, text=True, cwd=PROJECT_ROOT)
        status_output = result.stdout.strip()
        
        if status_output:
            print("⚠️ มีไฟล์ที่เปลี่ยนแปลงยังไม่ได้ commit:")
            print(status_output)
        else:
            print("✅ ไม่มีไฟล์ที่เปลี่ยนแปลงค้างอยู่")
        
        # ตรวจสอบว่าตรงกับ origin/main หรือไม่
        result = subprocess.run("git fetch origin", shell=True, capture_output=True, text=True, cwd=PROJECT_ROOT)
        result = subprocess.run("git log HEAD..origin/main --oneline", shell=True, capture_output=True, text=True, cwd=PROJECT_ROOT)
        if result.stdout.strip():
            print("⚠️ มี commit ใหม่ใน origin/main ที่ยังไม่ได้ pull:")
            print(result.stdout.strip())
        else:
            print("✅ ตรงกับ origin/main แล้ว")
            
    except Exception as e:
        print(f"⚠️ ไม่สามารถตรวจสอบสถานะ Git ได้: {e}")

def main():
    print("🚀 COMPHONE SUPER APP - Sync Checker")
    print("=" * 80)
    print("ตรวจสอบความสอดคล้องของเวอร์ชันระหว่างทุกส่วนของระบบ")
    print()
    
    # โหลด config
    config = load_config()
    if not config:
        return
    
    # ตรวจสอบเวอร์ชันทั้งหมด
    versions_ok = check_all_versions(config)
    
    # ตรวจสอบสถานะ Git
    check_git_status()
    
    # ข้อแนะนำ
    print("\n📋 ข้อแนะนำ:")
    if not versions_ok:
        print("1. รันสคริปต์อัปเดตเวอร์ชัน: python3 scripts/update_all_versions.py")
        print("2. ตรวจสอบว่าแก้ไขถูกต้องแล้วรันอีกครั้ง: python3 scripts/check_sync.py")
    else:
        print("1. เวอร์ชันทุกส่วนตรงกันแล้ว พร้อมสำหรับการ deploy")
        print("2. รันสคริปต์ deploy: python3 scripts/unified_deploy.py")
    
    print("3. ก่อนพัฒนาฟีเจอร์ใหม่: ตรวจสอบ sync ก่อนเสมอ")

if __name__ == "__main__":
    main()
