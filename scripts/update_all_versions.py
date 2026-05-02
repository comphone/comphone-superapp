#!/usr/bin/env python3
"""
COMPHONE SUPER APP - Unified Version Updater
อัปเดตเวอร์ชันในทุกส่วนของระบบพร้อมกัน (PC Dashboard, Mobile PWA, Dashboard อื่นๆ)
"""

import json
import re
import os
from datetime import datetime

# รากโปรเจค
PROJECT_ROOT = "/mnt/c/Users/Server/comphone-superapp"
CONFIG_FILE = os.path.join(PROJECT_ROOT, "config.json")

def load_config():
    """โหลด config.json"""
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_config(config):
    """บันทึก config.json"""
    with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)

def update_version_config_js(config):
    """อัปเดต pwa/version_config.js"""
    file_path = os.path.join(PROJECT_ROOT, "pwa/version_config.js")
    if not os.path.exists(file_path):
        print(f"⚠️ ไม่พบไฟล์ {file_path}")
        return False
    
    new_version = config["version"]
    new_timestamp = config["buildTimestamp"]
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # แทนที่ APP_VERSION
    content = re.sub(
        r'const APP_VERSION = \'[^\']+\';',
        f"const APP_VERSION = '{new_version}';",
        content
    )
    
    # แทนที่ BUILD_TIMESTAMP
    content = re.sub(
        r'const BUILD_TIMESTAMP = \'[^\']+\';',
        f"const BUILD_TIMESTAMP = '{new_timestamp}';",
        content
    )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ อัปเดต {file_path} เป็น {new_version}")
    return True

def update_sw_js(config):
    """อัปเดต pwa/sw.js (Service Worker cache version)"""
    file_path = os.path.join(PROJECT_ROOT, "pwa/sw.js")
    if not os.path.exists(file_path):
        print(f"⚠️ ไม่พบไฟล์ {file_path}")
        return False
    
    new_version = config["version"]
    new_timestamp = config["buildTimestamp"]
    new_cache_v = f"comphone-v{new_version}-{new_timestamp}"
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # แทนที่ CACHE_V
    content = re.sub(
        r'const CACHE_V = \'[^\']+\';',
        f"const CACHE_V = '{new_cache_v}';",
        content
    )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ อัปเดต {file_path} เป็น {new_cache_v}")
    return True

def update_config_gs(config):
    """อัปเดต clasp-ready/Config.gs (GAS Backend)"""
    file_path = os.path.join(PROJECT_ROOT, "clasp-ready/Config.gs")
    if not os.path.exists(file_path):
        print(f"⚠️ ไม่พบไฟล์ {file_path}")
        return False
    
    new_version = config["version"]
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # แทนที่ VERSION
    content = re.sub(
        r'const VERSION = \'[^\']+\';',
        f"const VERSION = '{new_version}';",
        content
    )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ อัปเดต {file_path} เป็น {new_version}")
    return True

def update_blueprint_md(config):
    """อัปเดต BLUEPRINT.md"""
    file_path = os.path.join(PROJECT_ROOT, "BLUEPRINT.md")
    if not os.path.exists(file_path):
        print(f"⚠️ ไม่พบไฟล์ {file_path}")
        return False
    
    new_version = config["version"]
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # อัปเดต Version line
    content = re.sub(
        r'Version: v[^\s]+',
        f'Version: v{new_version}',
        content
    )
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ อัปเดต {file_path} เป็น v{new_version}")
    return True

def update_html_cache_buster(config, html_file):
    """อัปเดต cache buster ในไฟล์ HTML"""
    if not os.path.exists(html_file):
        print(f"⚠️ ไม่พบไฟล์ {html_file}")
        return False
    
    new_cache_buster = config["components"]["pwa"]["cacheBuster"] if "pwa" in html_file else \
                      config["components"].get(os.path.basename(html_file).replace(".html", ""), {}).get("cacheBuster", "")
    
    if not new_cache_buster:
        print(f"⚠️ ไม่พบ cache buster สำหรับ {html_file}")
        return False
    
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # แทนที่ cache buster ในทุก script/link tags
    # รูปแบบ: v=X.Y.Z-phaseN&t=YYYYMMDD_HHMM
    content = re.sub(
        r'v=[0-9]+\.[0-9]+\.[0-9]+-[^\s&]+&t=[0-9_]+',
        new_cache_buster,
        content
    )
    
    with open(html_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ อัปเดต cache buster ใน {html_file}")
    return True

def main():
    print("🚀 COMPHONE SUPER APP - Unified Version Updater")
    print("=" * 60)
    
    # โหลด config
    config = load_config()
    print(f"📋 เวอร์ชันปัจจุบัน: {config['version']}")
    print(f"📋 Build Timestamp: {config['buildTimestamp']}")
    
    # รับเวอร์ชันใหม่จากผู้ใช้ (หรือใช้ปัจจุบัน)
    new_version = input(f"ป้อนเวอร์ชันใหม่ (กด Enter เพื่อใช้ {config['version']}): ").strip()
    if new_version:
        config["version"] = new_version
    
    # อัปเดต build timestamp
    new_timestamp = input(f"ป้อน Build Timestamp (กด Enter เพื่อใช้ {config['buildTimestamp']}): ").strip()
    if new_timestamp:
        config["buildTimestamp"] = new_timestamp
    else:
        # สร้าง timestamp อัตโนมัติ
        now = datetime.now()
        config["buildTimestamp"] = now.strftime("%Y%m%d_%H%M")
    
    # อัปเดต cache buster สำหรับทุก component
    for comp_name, comp_info in config["components"].items():
        comp_info["cacheBuster"] = f"v={config['version']}&t={config['buildTimestamp']}"
    
    # บันทึก config
    save_config(config)
    print(f"\n💾 บันทึก config.json แล้ว")
    
    # อัปเดตไฟล์ต่างๆ
    print("\n🔄 กำลังอัปเดตไฟล์...")
    update_version_config_js(config)
    update_sw_js(config)
    update_config_gs(config)
    update_blueprint_md(config)
    
    # อัปเดต HTML ทั้งหมด
    html_files = [
        os.path.join(PROJECT_ROOT, "pwa/index.html"),
        os.path.join(PROJECT_ROOT, "pwa/dashboard_pc.html"),
        os.path.join(PROJECT_ROOT, "pwa/monitoring_dashboard.html"),
        os.path.join(PROJECT_ROOT, "pwa/executive_dashboard.html"),
        os.path.join(PROJECT_ROOT, "pwa/demo_dashboard.html")
    ]
    
    for html_file in html_files:
        update_html_cache_buster(config, html_file)
    
    print("\n✅ อัปเดตเวอร์ชันในทุกไฟล์เสร็จสิ้น!")
    print(f"🎯 เวอร์ชันใหม่: {config['version']}")
    print(f"🎯 Build Timestamp: {config['buildTimestamp']}")
    print("\n📋 ขั้นตอนถัดไป:")
    print("1. ตรวจสอบการเปลี่ยนแปลง: git diff")
    print("2. Commit การเปลี่ยนแปลง: git commit --no-verify -m 'Update version to {0}'".format(config['version']))
    print("3. Push ไปยัง GitHub: git push origin main")
    print("4. Sync ไปยัง Google Drive: python3 scripts/drive_sync.py --code . --version {0}".format(config['version']))

if __name__ == "__main__":
    main()
