#!/usr/bin/env python3
"""
clasp_push.py -- COMPHONE SUPER APP V5.5
Push ไฟล์ GAS ทั้งหมดขึ้น Google Apps Script อัตโนมัติ
รันได้บนทุก OS: Windows, Mac, Linux

วิธีใช้ (รันจาก root ของโปรเจกต์):
  python3 scripts/clasp_push.py              # push อย่างเดียว
  python3 scripts/clasp_push.py --deploy     # push + สร้าง deployment ใหม่
  python3 scripts/clasp_push.py --triggers   # push + ตั้ง triggers อัตโนมัติ
  python3 scripts/clasp_push.py --full       # push + deploy + triggers (ครบ)

บน Windows ใช้:
  python scripts/clasp_push.py --full
"""

import os
import sys
import subprocess
import shutil
import time
import argparse
from pathlib import Path
from datetime import datetime

# ── Config ───────────────────────────────────────────────────
SCRIPT_ID = "1-aoCd5gXoo1dX4FjW62l8JknR3ZPiaf1W7YEmEdtq8gnRzSp4Hwj6043"
REPO_ROOT = Path(__file__).resolve().parent.parent
CLASP_DIR = REPO_ROOT / "clasp-ready"

# ── Helpers ──────────────────────────────────────────────────
def run(cmd, cwd=None, capture=False):
    """รันคำสั่ง shell และคืนค่า (returncode, output)"""
    result = subprocess.run(
        cmd,
        cwd=cwd or CLASP_DIR,
        shell=True,
        capture_output=capture,
        text=True
    )
    return result.returncode, result.stdout + result.stderr if capture else ""

def ok(msg):  print(f"  [OK] {msg}")
def err(msg): print(f"  [ERROR] {msg}")
def warn(msg): print(f"  [WARN] {msg}")
def step(n, total, msg): print(f"\n[{n}/{total}] {msg}...")

def find_clasprc():
    """หาไฟล์ .clasprc.json บนทุก OS"""
    candidates = [
        Path.home() / ".clasprc.json",
    ]
    # Windows paths
    if os.name == "nt":
        userprofile = os.environ.get("USERPROFILE", "")
        if userprofile:
            candidates.append(Path(userprofile) / ".clasprc.json")
    for p in candidates:
        if p.exists():
            return p
    return None

# ── Main ─────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="COMPHONE clasp push automation")
    parser.add_argument("--deploy",   action="store_true", help="สร้าง Web App Deployment ใหม่")
    parser.add_argument("--triggers", action="store_true", help="รัน setupAllTriggers() อัตโนมัติ")
    parser.add_argument("--full",     action="store_true", help="push + deploy + triggers")
    args = parser.parse_args()

    do_deploy   = args.deploy or args.full
    do_triggers = args.triggers or args.full

    print("=" * 60)
    print(" COMPHONE SUPER APP V5.5 -- clasp push (Python)")
    print("=" * 60)
    print(f" Script ID : {SCRIPT_ID}")
    print(f" Source    : {CLASP_DIR}")
    print(f" Deploy    : {do_deploy}")
    print(f" Triggers  : {do_triggers}")
    print("=" * 60)

    total_steps = 4 + (1 if do_deploy else 0) + (1 if do_triggers else 0)

    # ── Step 1: ตรวจสอบ clasp ───────────────────────────────
    step(1, total_steps, "ตรวจสอบ clasp")
    clasp_path = shutil.which("clasp")
    if not clasp_path:
        err("ไม่พบคำสั่ง 'clasp'")
        print("       กรุณาติดตั้งด้วยคำสั่ง: npm install -g @google/clasp")
        sys.exit(1)
    rc, ver = run("clasp --version", capture=True)
    ok(f"clasp พร้อมใช้งาน ({ver.strip()})")

    # ── Step 2: ตรวจสอบ login ───────────────────────────────
    step(2, total_steps, "ตรวจสอบ clasp login")
    clasprc = find_clasprc()
    if not clasprc:
        err("ยังไม่ได้ Login clasp")
        print("       กรุณารันคำสั่ง: clasp login")
        sys.exit(1)
    ok(f"Login แล้ว (พบ {clasprc})")

    # ── Step 3: ตรวจสอบ .clasp.json ─────────────────────────
    step(3, total_steps, "ตรวจสอบ .clasp.json")
    clasp_json = CLASP_DIR / ".clasp.json"
    if not clasp_json.exists():
        err(f"ไม่พบ .clasp.json ใน {CLASP_DIR}")
        sys.exit(1)
    gs_files = list(CLASP_DIR.glob("*.gs"))
    ok(f".clasp.json พบแล้ว")
    ok(f"ไฟล์ .gs จริง: {len(gs_files)} ไฟล์")

    # ── Step 4: clasp push ───────────────────────────────────
    step(4, total_steps, "กำลัง push ไฟล์ขึ้น Google Apps Script")
    push_success = False
    for attempt in range(1, 4):
        print(f"  ครั้งที่ {attempt}/3...")
        rc, _ = run("clasp push --force")
        if rc == 0:
            push_success = True
            ok(f"Push สำเร็จ! ({len(gs_files)} ไฟล์)")
            break
        if attempt < 3:
            print("  Push ล้มเหลว รอ 5 วินาที...")
            time.sleep(5)

    if not push_success:
        print()
        err("clasp push ล้มเหลวทั้ง 3 ครั้ง")
        print()
        print("  วิธีแก้ไข:")
        print("  1. เปิดใช้งาน Apps Script API:")
        print("     https://script.google.com/home/usersettings")
        print("  2. ตรวจสอบ Script ID ใน .clasp.json")
        print("  3. ลอง login ใหม่: clasp login")
        sys.exit(1)

    # ── Step 5a (optional): Deploy ───────────────────────────
    step_num = 5
    if do_deploy:
        step(step_num, total_steps, "สร้าง Web App Deployment ใหม่")
        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        rc, out = run(f'clasp deploy --description "COMPHONE v5.5 -- {now}"', capture=True)
        print(out)
        if rc == 0:
            ok("Deploy สำเร็จ")
        else:
            warn("Deploy อาจมีปัญหา ตรวจสอบใน GAS Editor")
        step_num += 1

    # ── Step 5b (optional): Setup Triggers ───────────────────
    if do_triggers:
        step(step_num, total_steps, "ตั้งค่า Triggers อัตโนมัติ")
        rc, out = run("clasp run setupAllTriggers", capture=True)
        print(out)
        if rc == 0:
            ok("Triggers ตั้งค่าสำเร็จ")
        else:
            warn("ไม่สามารถรัน setupAllTriggers() อัตโนมัติได้")
            print("       กรุณารันด้วยตนเองใน GAS Editor:")
            print("       AutoBackup.gs -> setupAllTriggers -> Run")

    # ── Summary ──────────────────────────────────────────────
    print()
    print("=" * 60)
    print(" SUMMARY")
    print("=" * 60)
    print(f"  GAS Push      SUCCESS ({len(gs_files)} files)")
    if do_deploy:   print("  Web App Deploy DONE")
    if do_triggers: print("  Triggers Setup DONE")
    print()
    print(f"  GAS Editor : https://script.google.com/d/{SCRIPT_ID}/edit")
    print(f"  Triggers   : https://script.google.com/home/triggers")
    print("=" * 60)


if __name__ == "__main__":
    main()
