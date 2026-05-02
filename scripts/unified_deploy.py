#!/usr/bin/env python3
"""
COMPHONE SUPER APP - Unified Deploy Script
อัปเดตเวอร์ชัน → Commit → Push → Drive Sync → Verify ทุกส่วนพร้อมกัน
"""

import os
import sys
import subprocess
import json
from datetime import datetime

PROJECT_ROOT = "/mnt/c/Users/Server/comphone-superapp"
CONFIG_FILE = os.path.join(PROJECT_ROOT, "config.json")
GAS_SCRIPT_URL = "[REDACTED]"  # แทนที่ credentials ตามข้อตกลง

def run_command(cmd, cwd=None, timeout=300):
    """รันคำสั่ง shell และคืนค่าผลลัพธ์"""
    print(f"🔧 รันคำสั่ง: {cmd}")
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            cwd=cwd or PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        if result.returncode != 0:
            print(f"⚠️ คำสั่งล้มเหลว: {result.stderr}")
            return False, result.stderr
        return True, result.stdout
    except subprocess.TimeoutExpired:
        print(f"⚠️ คำสั่งหมดเวลา ({timeout} วินาที)")
        return False, "Timeout"
    except Exception as e:
        print(f"⚠️ ข้อผิดพลาด: {e}")
        return False, str(e)

def load_config():
    """โหลด config.json"""
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def update_version_in_all_files(version, timestamp):
    """อัปเดตเวอร์ชันในทุกไฟล์ที่เกี่ยวข้อง (เรียกสคริปต์ update_all_versions.py)"""
    print("\n📝 อัปเดตเวอร์ชันในทุกไฟล์...")
    cmd = f"python3 {os.path.join(PROJECT_ROOT, 'scripts/update_all_versions.py')}"
    # ส่งเวอร์ชันและ timestamp ผ่าน stdin (หากสคริปต์รองรับ)
    # หรือแก้ไขสคริปต์ให้รับ arguments
    return run_command(cmd)

def git_commit_and_push(version):
    """Commit และ Push การเปลี่ยนแปลงทั้งหมดไปยัง GitHub"""
    print("\n📦 Commit และ Push ไปยัง GitHub...")
    
    # 1. Add ทุกไฟล์ที่เปลี่ยนแปลง
    success, output = run_command("git add -A")
    if not success:
        return False
    
    # 2. Commit (ใช้ --no-verify ตามข้อตกลง)
    commit_msg = f"Phase Update: Version {version} - Unified Deploy"
    success, output = run_command(f'git commit --no-verify -m "{commit_msg}"')
    if not success:
        print("⚠️ อาจไม่มีการเปลี่ยนแปลงใหม่ หรือมีข้อผิดพลาดในการ commit")
        # ไม่ return False เพื่อให้ทำขั้นตอนถัดไปต่อได้
    
    # 3. Push ไปยัง origin/main
    success, output = run_command("git push origin main")
    if not success:
        return False
    
    print("✅ Commit และ Push เสร็จสิ้น!")
    return True

def drive_sync(version):
    """Sync ไฟล์ขึ้น Google Drive ด้วยสคริปต์ drive_sync.py"""
    print("\n☁️ Sync ไฟล์ขึ้น Google Drive...")
    
    # ใช้ timeout ที่นานขึ้น (600 วินาที) เพื่อให้ sync เสร็จสมบูรณ์
    script_path = os.path.join(PROJECT_ROOT, "scripts/drive_sync.py")
    cmd = f"python3 {script_path} --code . --version {version}"
    
    success, output = run_command(cmd, timeout=600)
    if not success:
        print("⚠️ Drive Sync ล้มเหลวหรือหมดเวลา")
        return False
    
    print("✅ Drive Sync เสร็จสิ้น!")
    return True

def verify_deployment(version):
    """ตรวจสอบว่าเวอร์ชันอัปเดตในทุกส่วนแล้ว"""
    print("\n🔍 ตรวจสอบการ Deploy...")
    
    config = load_config()
    
    # ตรวจสอบไฟล์หลัก
    checks = [
        (os.path.join(PROJECT_ROOT, "pwa/version_config.js"), version),
        (os.path.join(PROJECT_ROOT, "clasp-ready/Config.gs"), version),
        (os.path.join(PROJECT_ROOT, "BLUEPRINT.md"), version),
        (os.path.join(PROJECT_ROOT, "pwa/sw.js"), version)
    ]
    
    all_ok = True
    for file_path, expected_version in checks:
        if not os.path.exists(file_path):
            print(f"⚠️ ไม่พบไฟล์ {file_path}")
            all_ok = False
            continue
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if expected_version in content:
            print(f"✅ {os.path.basename(file_path)} ตรงกับเวอร์ชัน {expected_version}")
        else:
            print(f"⚠️ {os.path.basename(file_path)} ไม่ตรงกับเวอร์ชัน {expected_version}")
            all_ok = False
    
    # ตรวจสอบ GAS Live API (ถ้าต้องการ)
    print(f"\n🌐 ตรวจสอบ GAS Live API: {GAS_SCRIPT_URL}")
    print("   (แนะนำให้ใช้ browser_navigate หรือ curl เพื่อตรวจสอบ VERSION API)")
    
    return all_ok

def main():
    print("🚀 COMPHONE SUPER APP - Unified Deploy Script")
    print("=" * 80)
    print("ปฏิบัติตาม GOLDEN RULE: อัปเดต BLUEPRINT.md → Git Commit+Push → Drive Sync → Verify")
    print()
    
    # 1. โหลด config ปัจจุบัน
    try:
        config = load_config()
        current_version = config["version"]
        print(f"📋 เวอร์ชันปัจจุบัน: {current_version}")
    except Exception as e:
        print(f"⚠️ ไม่สามารถโหลด config.json ได้: {e}")
        return
    
    # 2. รับเวอร์ชันใหม่จากผู้ใช้
    new_version = input(f"ป้อนเวอร์ชันใหม่ (กด Enter เพื่อใช้ {current_version}): ").strip()
    if not new_version:
        new_version = current_version
    
    # 3. อัปเดต timestamp
    now = datetime.now()
    new_timestamp = now.strftime("%Y%m%d_%H%M")
    print(f"📋 Build Timestamp ใหม่: {new_timestamp}")
    
    # 4. อัปเดต config.json
    config["version"] = new_version
    config["buildTimestamp"] = new_timestamp
    for comp_name in config["components"]:
        config["components"][comp_name]["cacheBuster"] = f"v={new_version}&t={new_timestamp}"
    
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    print(f"✅ อัปเดต config.json เป็นเวอร์ชัน {new_version}")
    
    # 5. อัปเดตไฟล์ทั้งหมด (เรียกสคริปต์ update_all_versions.py)
    print("\n" + "=" * 80)
    print("ขั้นตอนที่ 1: อัปเดตไฟล์ทั้งหมด")
    success, _ = update_version_in_all_files(new_version, new_timestamp)
    
    # 6. Git Commit และ Push
    print("\n" + "=" * 80)
    print("ขั้นตอนที่ 2: Git Commit และ Push")
    git_success = git_commit_and_push(new_version)
    
    # 7. Drive Sync
    print("\n" + "=" * 80)
    print("ขั้นตอนที่ 3: Drive Sync")
    drive_success = drive_sync(new_version)
    
    # 8. Verify Deployment
    print("\n" + "=" * 80)
    print("ขั้นตอนที่ 4: Verify Deployment")
    verify_success = verify_deployment(new_version)
    
    # สรุปผล
    print("\n" + "=" * 80)
    print("📊 สรุปผลการ Deploy:")
    print(f"   อัปเดตไฟล์: {'✅ สำเร็จ' if success else '⚠️ มีปัญหา'}")
    print(f"   Git Commit/Push: {'✅ สำเร็จ' if git_success else '⚠️ มีปัญหา'}")
    print(f"   Drive Sync: {'✅ สำเร็จ' if drive_success else '⚠️ มีปัญหา'}")
    print(f"   Verify: {'✅ สำเร็จ' if verify_success else '⚠️ มีปัญหา'}")
    
    if all([success, git_success, drive_success, verify_success]):
        print("\n🎉 Deploy สำเร็จสมบูรณ์! ทุกส่วนอัปเดตเป็นเวอร์ชันล่าสุด")
    else:
        print("\n⚠️ Deploy บางส่วนล้มเหลว โปรดตรวจสอบข้อผิดพลาดข้างต้น")
    
    # แนะนำขั้นตอนถัดไป
    print("\n📋 ขั้นตอนถัดไป:")
    print("1. ทดสอบ PC Dashboard: https://comphone.github.io/comphone-superapp/pwa/dashboard_pc.html")
    print("2. ทดสอบ Mobile PWA: https://comphone.github.io/comphone-superapp/pwa/")
    print("3. ทดสอบ Dashboard อื่นๆ: monitoring_dashboard.html, executive_dashboard.html, demo_dashboard.html")
    print("4. Deploy GAS (หากต้องการ): cd ~/.clasp && clasp push && clasp deploy")

if __name__ == "__main__":
    main()
