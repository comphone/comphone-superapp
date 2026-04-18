#!/usr/bin/env python3
"""
sync_all.py — COMPHONE SUPER APP V5.5
=========================================================
🔄 Triple Sync: GitHub + Google Drive + Local Backup
   ทำงานในคำสั่งเดียว ครอบคลุมทุก storage

ใช้งาน:
  python3 sync_all.py                    # sync ทั้งหมด
  python3 sync_all.py --session-only     # sync session.md เท่านั้น
  python3 sync_all.py --code-only        # sync โค้ดเท่านั้น
  python3 sync_all.py --dry-run          # ทดสอบ
  python3 sync_all.py --watch            # เปิด file watcher
"""

import os
import sys
import json
import time
import shutil
import hashlib
import argparse
import subprocess
from pathlib import Path
from datetime import datetime

# ─── Color output ───────────────────────────────────────────
class C:
    RESET  = '\033[0m'
    GREEN  = '\033[92m'
    YELLOW = '\033[93m'
    RED    = '\033[91m'
    BLUE   = '\033[94m'
    CYAN   = '\033[96m'
    BOLD   = '\033[1m'

def log(msg, color=C.RESET, prefix='INFO'):
    ts = datetime.now().strftime('%H:%M:%S')
    print(f"{C.BLUE}[{ts}]{C.RESET} {color}[{prefix}]{C.RESET} {msg}", flush=True)

def log_ok(msg):   log(msg, C.GREEN,  'OK')
def log_warn(msg): log(msg, C.YELLOW, 'WARN')
def log_err(msg):  log(msg, C.RED,    'ERROR')
def log_step(msg): log(msg, C.CYAN,   'STEP')

# ─── Config ────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
REPO_ROOT  = SCRIPT_DIR.parent
LOCAL_BACKUP_DIR = Path.home() / 'session_backups'
MAX_LOCAL_BACKUPS = 30

# ─── 1. Local Backup ────────────────────────────────────────

def backup_local(session_file, dry_run=False):
    """Backup session.md ไปยัง local directory"""
    log_step("Local backup...")
    session_path = Path(session_file)

    if not session_path.exists():
        log_warn(f"ไม่พบ session file: {session_file}")
        return {'success': False, 'error': 'File not found'}

    LOCAL_BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = LOCAL_BACKUP_DIR / f'session_{timestamp}.md'
    latest_path = LOCAL_BACKUP_DIR / 'session_latest.md'

    if dry_run:
        log(f"[DRY-RUN] Copy → {backup_path}", C.YELLOW)
        return {'success': True, 'dry_run': True}

    shutil.copy2(session_path, backup_path)
    shutil.copy2(session_path, latest_path)

    # ลบไฟล์เก่า
    backups = sorted(LOCAL_BACKUP_DIR.glob('session_2*.md'))
    deleted = 0
    while len(backups) > MAX_LOCAL_BACKUPS:
        backups[0].unlink()
        backups.pop(0)
        deleted += 1

    log_ok(f"Local: {backup_path.name} (deleted {deleted} old)")
    return {'success': True, 'path': str(backup_path), 'deleted': deleted}

# ─── 2. GitHub Push ─────────────────────────────────────────

def push_github(repo_path, commit_msg=None, dry_run=False):
    """git add + commit + push"""
    log_step("GitHub push...")

    def run_git(args):
        cmd = ['git'] + args
        if dry_run and args[0] not in ['status', 'diff', 'rev-parse']:
            log(f"[DRY-RUN] git {' '.join(args)}", C.YELLOW)
            return True, ''
        try:
            r = subprocess.run(cmd, cwd=repo_path, capture_output=True, text=True, timeout=60)
            return r.returncode == 0, r.stdout + r.stderr
        except Exception as e:
            return False, str(e)

    # ตรวจสอบว่ามีการเปลี่ยนแปลง
    ok, out = run_git(['status', '--porcelain'])
    if not out.strip():
        log("ℹ️ GitHub: ไม่มีการเปลี่ยนแปลง", C.YELLOW)
        return {'success': True, 'skipped': True}

    # นับไฟล์ที่เปลี่ยน
    changed_count = len([l for l in out.strip().splitlines() if l.strip()])

    # สร้าง commit message
    if not commit_msg:
        ts = datetime.now().strftime('%Y-%m-%d %H:%M')
        commit_msg = f"🔄 Auto-sync {changed_count} files [{ts}]"

    # git add -A
    ok, out = run_git(['add', '-A'])
    if not ok:
        log_err(f"git add failed: {out[:100]}")
        return {'success': False, 'error': out}

    # git commit
    ok, out = run_git(['commit', '-m', commit_msg])
    if not ok:
        if 'nothing to commit' in out:
            return {'success': True, 'skipped': True}
        log_err(f"git commit failed: {out[:100]}")
        return {'success': False, 'error': out}

    # git push (retry 3 ครั้ง)
    for attempt in range(1, 4):
        ok, out = run_git(['push', 'origin', 'main'])
        if ok:
            log_ok(f"GitHub: pushed {changed_count} files → origin/main")
            return {'success': True, 'files': changed_count, 'message': commit_msg}
        log_warn(f"Push attempt {attempt}/3 failed")
        if attempt < 3:
            time.sleep(5)

    log_err("GitHub push failed after 3 attempts")
    return {'success': False, 'error': 'Push failed after 3 retries'}

# ─── 3. Google Drive Sync ────────────────────────────────────

def sync_drive(session_file=None, code_path=None, dry_run=False):
    """Sync ขึ้น Google Drive ผ่าน drive_sync.py"""
    log_step("Google Drive sync...")

    drive_script = SCRIPT_DIR / 'drive_sync.py'
    if not drive_script.exists():
        log_warn("ไม่พบ drive_sync.py — ข้าม Drive sync")
        return {'success': False, 'error': 'drive_sync.py not found'}

    # ตรวจสอบว่า Google API พร้อมหรือไม่
    try:
        import google.auth
    except ImportError:
        log_warn("ไม่พบ google-auth package — ข้าม Drive sync")
        log_warn("รัน: pip3 install google-auth google-api-python-client")
        return {'success': False, 'error': 'google-auth not installed'}

    # ตรวจสอบ credentials
    config_file = Path.home() / '.comphone' / 'drive_config.json'
    if not config_file.exists():
        log_warn("ยังไม่ได้ตั้งค่า Google Drive")
        log_warn("รัน: python3 scripts/drive_sync.py --setup")
        return {'success': False, 'error': 'Not configured', 'setup_required': True}

    try:
        with open(config_file) as f:
            config = json.load(f)
        auth_method = config.get('auth_method', 'oauth2')

        if auth_method == 'service_account':
            sa_file = config.get('service_account_file', '')
            if not sa_file or not Path(sa_file).exists():
                log_warn(f"ไม่พบ service account file: {sa_file}")
                return {'success': False, 'error': 'Service account file not found'}
        else:
            token_file = Path(config.get('token_file', str(Path.home() / '.comphone' / 'token.json')))
            if not token_file.exists():
                log_warn("ยังไม่ได้ login OAuth2")
                log_warn("รัน: python3 scripts/drive_sync.py --setup-oauth")
                return {'success': False, 'error': 'OAuth2 not authenticated', 'setup_required': True}
    except Exception as e:
        log_warn(f"Config error: {e}")
        return {'success': False, 'error': str(e)}

    # รัน drive_sync.py
    cmd = [sys.executable, str(drive_script)]
    if session_file:
        cmd += ['--session', str(session_file)]
    if code_path:
        cmd += ['--code', str(code_path)]
    if not session_file and not code_path:
        cmd += ['--all', '--repo', str(REPO_ROOT)]
    if dry_run:
        cmd += ['--dry-run']

    try:
        result = subprocess.run(cmd, capture_output=False, timeout=300)
        if result.returncode == 0:
            log_ok("Google Drive: sync สำเร็จ")
            return {'success': True}
        else:
            log_err("Google Drive: sync ล้มเหลว")
            return {'success': False, 'error': f'Exit code {result.returncode}'}
    except subprocess.TimeoutExpired:
        log_err("Google Drive: timeout (>5 นาที)")
        return {'success': False, 'error': 'Timeout'}
    except Exception as e:
        log_err(f"Google Drive: {e}")
        return {'success': False, 'error': str(e)}

# ─── Main Sync ───────────────────────────────────────────────

def run_sync(args):
    """รัน Triple Sync"""
    print(f"\n{C.BOLD}{'='*60}")
    print(f" 🔄 COMPHONE Triple Sync — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*60}{C.RESET}")

    session_file = str(REPO_ROOT / 'memory' / 'session.md')
    if not Path(session_file).exists():
        session_file = '/memory/session.md'

    results = {}

    # 1. Local Backup
    if not args.skip_local:
        results['local'] = backup_local(session_file, args.dry_run)

    # 2. GitHub Push
    if not args.skip_github:
        results['github'] = push_github(str(REPO_ROOT), args.message, args.dry_run)

    # 3. Google Drive
    if not args.skip_drive:
        if args.session_only:
            results['drive'] = sync_drive(session_file=session_file, dry_run=args.dry_run)
        elif args.code_only:
            results['drive'] = sync_drive(code_path=str(REPO_ROOT), dry_run=args.dry_run)
        else:
            results['drive'] = sync_drive(dry_run=args.dry_run)

    # Summary
    print(f"\n{C.BOLD}{'='*60}")
    print(f" 📊 SYNC SUMMARY")
    print(f"{'='*60}{C.RESET}")

    all_success = True
    for key, result in results.items():
        if result.get('skipped'):
            status = f"{C.YELLOW}⏭️  SKIPPED{C.RESET}"
        elif result.get('success'):
            status = f"{C.GREEN}✅ SUCCESS{C.RESET}"
        else:
            status = f"{C.RED}❌ FAILED{C.RESET}"
            if not result.get('setup_required'):
                all_success = False

        extra = ''
        if result.get('setup_required'):
            extra = f" {C.YELLOW}(ต้องตั้งค่าก่อน){C.RESET}"

        print(f"  {key.upper():<10} {status}{extra}")

    print(f"{C.BOLD}{'='*60}{C.RESET}\n")

    if not all_success:
        sys.exit(1)

# ─── File Watcher Mode ───────────────────────────────────────

def run_watch(args):
    """รัน File Watcher + sync อัตโนมัติ"""
    log_step("Starting File Watcher + Auto-Sync...")
    log(f"Repo: {REPO_ROOT}", C.CYAN)
    log(f"Debounce: {args.debounce}s", C.CYAN)
    log("กด Ctrl+C เพื่อหยุด", C.YELLOW)

    # ใช้ auto_push.py สำหรับ watch + GitHub
    auto_push = SCRIPT_DIR / 'auto_push.py'
    if auto_push.exists():
        cmd = [sys.executable, str(auto_push),
               '--repo', str(REPO_ROOT),
               '--debounce', str(args.debounce),
               '--branch', 'main']
        if args.dry_run:
            cmd.append('--dry-run')

        # รัน auto_push ใน background
        import threading
        def run_auto_push():
            subprocess.run(cmd)
        t = threading.Thread(target=run_auto_push, daemon=True)
        t.start()

    # Drive sync loop
    last_drive_sync = 0
    DRIVE_SYNC_INTERVAL = 3600  # sync Drive ทุก 1 ชั่วโมง

    try:
        while True:
            time.sleep(60)
            now = time.time()
            if now - last_drive_sync >= DRIVE_SYNC_INTERVAL:
                log_step("Scheduled Drive sync...")
                sync_drive(session_file='/memory/session.md', dry_run=args.dry_run)
                last_drive_sync = now
    except KeyboardInterrupt:
        log("Watcher stopped", C.YELLOW)

# ─── Main ────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='COMPHONE Triple Sync — GitHub + Google Drive + Local',
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument('--session-only', action='store_true', help='Sync session.md เท่านั้น')
    parser.add_argument('--code-only',    action='store_true', help='Sync โค้ดเท่านั้น')
    parser.add_argument('--watch',        action='store_true', help='เปิด File Watcher')
    parser.add_argument('--dry-run',      action='store_true', help='ทดสอบโดยไม่ sync จริง')
    parser.add_argument('--message', '-m', default=None, help='Commit message สำหรับ GitHub')
    parser.add_argument('--debounce',     type=int, default=15, help='Debounce วินาที (watch mode)')
    parser.add_argument('--skip-local',   action='store_true', help='ข้าม Local backup')
    parser.add_argument('--skip-github',  action='store_true', help='ข้าม GitHub push')
    parser.add_argument('--skip-drive',   action='store_true', help='ข้าม Drive sync')

    args = parser.parse_args()

    if args.watch:
        run_watch(args)
    else:
        run_sync(args)

if __name__ == '__main__':
    main()
