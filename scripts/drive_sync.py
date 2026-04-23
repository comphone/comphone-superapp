#!/usr/bin/env python3
"""
drive_sync.py — COMPHONE SUPER APP V5.5
=========================================================
Sync โค้ดและ session.md ขึ้น Google Drive อัตโนมัติ

รองรับ 2 วิธี Authentication:
  1. Service Account (แนะนำสำหรับ CI/CD) — ไม่ต้อง login
  2. OAuth2 (สำหรับใช้งานส่วนตัว) — login ครั้งแรกครั้งเดียว

ใช้งาน:
  python3 drive_sync.py --session session.md              # sync session เท่านั้น
  python3 drive_sync.py --code ./pwa ./clasp-ready        # sync โค้ด
  python3 drive_sync.py --all                             # sync ทุกอย่าง
  python3 drive_sync.py --dry-run --all                   # ทดสอบ
  python3 drive_sync.py --setup                           # ตั้งค่าครั้งแรก
"""

import os
import sys
import json
import time
import hashlib
import argparse
import mimetypes
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
CONFIG_FILE = Path.home() / '.comphone' / 'drive_config.json'
CACHE_FILE  = Path.home() / '.comphone' / 'drive_cache.json'

DEFAULT_CONFIG = {
    'auth_method':        'oauth2',          # 'oauth2' หรือ 'service_account'
    'service_account_file': '',              # path ไปยัง service account JSON
    'credentials_file':   'credentials.json', # OAuth2 credentials
    'token_file':         str(Path.home() / '.comphone' / 'token.json'),
    'root_folder_name':   'COMPHONE_Backups',
    'code_folder_name':   'COMPHONE_Code',
    'session_folder_name': 'COMPHONE_Session',
    'max_versions':       10,                # เก็บ code versions สูงสุด
    'max_session_backups': 30,              # เก็บ session backups สูงสุด
    'watch_dirs':         ['pwa', 'clasp-ready', 'memory', 'scripts'],
    'watch_extensions':   ['.js', '.gs', '.html', '.css', '.json', '.md', '.yml'],
    'ignore_patterns':    ['.git', 'node_modules', '__pycache__', 'backups'],
    'version':            'v5.5.8',
}

# ─── Auth ───────────────────────────────────────────────────

def get_drive_service(config):
    """สร้าง Google Drive service object — OAuth2 from Environment Variables (ไม่ใช้ Service Account แล้ว)"""
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from googleapiclient.discovery import build
    except ImportError:
        log_err("ไม่พบ Google API packages")
        log_err("รัน: pip3 install google-auth google-api-python-client")
        sys.exit(1)

    SCOPES = ['https://www.googleapis.com/auth/drive']
    creds = None

    # ── METHOD 1: OAuth2 from Environment Variables (แนะนำ — ไม่ต้องมีไฟล์ local) ──
    env_client_id     = os.environ.get('GOOGLE_CLIENT_ID')
    env_client_secret = os.environ.get('GOOGLE_CLIENT_SECRET')
    env_refresh_token = os.environ.get('GOOGLE_REFRESH_TOKEN')

    if env_client_id and env_client_secret and env_refresh_token:
        log_ok("Auth: Using OAuth2 from Environment Variables")
        creds = Credentials(
            token=None,
            refresh_token=env_refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=env_client_id,
            client_secret=env_client_secret,
            scopes=SCOPES,
        )
        try:
            creds.refresh(Request())
            log_ok("Auth: OAuth2 token refreshed from env vars")
        except Exception as e:
            log_err(f"OAuth2 refresh failed: {e}")
            log_warn("ตรวจสอบ GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN")
            return None

    # ── METHOD 2: OAuth2 from local token file (fallback สำหรับ development) ──
    elif config.get('token_file') and Path(config.get('token_file', '')).exists():
        from google.oauth2.credentials import Credentials as _Creds
        token_file = Path(config['token_file'])
        log_ok(f"Auth: Using local token file ({token_file.name})")
        creds = _Creds.from_authorized_user_file(str(token_file), SCOPES)
        if not creds.valid and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
                log_ok("Auth: Local token refreshed")
            except Exception as e:
                log_warn(f"Local token refresh failed: {e}")
                creds = None

    # ── NO AUTH AVAILABLE ──
    if not creds:
        log_err("ไม่พบ credentials — ตั้งค่าอย่างน้อย 1 วิธี:")
        log_warn("  1) ตั้ง Environment Variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN")
        log_warn("  2) บันทึก token file ที่ ~/.comphone/token.json")
        return None

    return build('drive', 'v3', credentials=creds)

# ─── Drive Helpers ──────────────────────────────────────────

def get_or_create_folder(service, name, parent_id=None, dry_run=False):
    """หรือสร้าง folder ใน Drive"""
    if dry_run:
        log(f"[DRY-RUN] get_or_create_folder: {name}", C.YELLOW)
        return f"dry_run_folder_{name}"

    query = f"name='{name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    if parent_id:
        query += f" and '{parent_id}' in parents"

    results = service.files().list(q=query, fields='files(id,name)').execute()
    files = results.get('files', [])

    if files:
        return files[0]['id']

    # สร้าง folder ใหม่
    meta = {'name': name, 'mimeType': 'application/vnd.google-apps.folder'}
    if parent_id:
        meta['parents'] = [parent_id]

    folder = service.files().create(body=meta, fields='id').execute()
    return folder['id']

def upsert_file(service, folder_id, file_name, content, mime_type='text/plain', dry_run=False):
    """อัปโหลดหรืออัปเดตไฟล์ใน Drive"""
    if dry_run:
        log(f"[DRY-RUN] upsert_file: {file_name} → folder {folder_id[:8]}...", C.YELLOW)
        return {'id': 'dry_run_id', 'name': file_name}

    from googleapiclient.http import MediaInMemoryUpload

    query = f"name='{file_name}' and '{folder_id}' in parents and trashed=false"
    results = service.files().list(q=query, fields='files(id,name)').execute()
    existing = results.get('files', [])

    media = MediaInMemoryUpload(content.encode('utf-8'), mimetype=mime_type)

    if existing:
        file_id = existing[0]['id']
        file = service.files().update(fileId=file_id, media_body=media, fields='id,name,webViewLink').execute()
        return file
    else:
        meta = {'name': file_name, 'parents': [folder_id]}
        file = service.files().create(body=meta, media_body=media, fields='id,name,webViewLink').execute()
        return file

def clean_old_files(service, folder_id, prefix, max_count, dry_run=False):
    """ลบไฟล์เก่าเกิน max_count ใน folder"""
    query = f"name contains '{prefix}' and '{folder_id}' in parents and trashed=false"
    results = service.files().list(
        q=query, fields='files(id,name,createdTime)', orderBy='createdTime'
    ).execute()
    files = results.get('files', [])

    to_delete = len(files) - max_count
    deleted = 0
    for i in range(max(0, to_delete)):
        if dry_run:
            log(f"[DRY-RUN] delete: {files[i]['name']}", C.YELLOW)
        else:
            service.files().delete(fileId=files[i]['id']).execute()
        deleted += 1

    return deleted

def get_folder_structure(service, config, dry_run=False):
    """สร้าง/หา folder structure ทั้งหมด"""
    root_id    = get_or_create_folder(service, config['root_folder_name'], dry_run=dry_run)
    code_id    = get_or_create_folder(service, config['code_folder_name'], root_id, dry_run=dry_run)
    session_id = get_or_create_folder(service, config['session_folder_name'], root_id, dry_run=dry_run)
    backups_id = get_or_create_folder(service, 'Backups', root_id, dry_run=dry_run)

    return {
        'root':    root_id,
        'code':    code_id,
        'session': session_id,
        'backups': backups_id,
    }

# ─── Sync Functions ─────────────────────────────────────────

def sync_session(service, config, session_file, dry_run=False):
    """Sync session.md ขึ้น Google Drive"""
    log_step(f"Syncing session.md: {session_file}")

    if not Path(session_file).exists():
        log_err(f"ไม่พบไฟล์: {session_file}")
        return {'success': False, 'error': f'File not found: {session_file}'}

    content = Path(session_file).read_text(encoding='utf-8')
    folders = get_folder_structure(service, config, dry_run)

    timestamp = datetime.now().strftime('%Y%m%d_%H%M')

    # บันทึก session_latest.md
    latest = upsert_file(service, folders['session'], 'session_latest.md', content, dry_run=dry_run)
    log_ok(f"Updated: session_latest.md")

    # บันทึก session_TIMESTAMP.md
    ts_file = upsert_file(service, folders['backups'], f'session_{timestamp}.md', content, dry_run=dry_run)
    log_ok(f"Backup: session_{timestamp}.md")

    # ลบไฟล์เก่า
    deleted = clean_old_files(service, folders['backups'], 'session_', config['max_session_backups'], dry_run)
    if deleted > 0:
        log(f"Cleaned {deleted} old session backups", C.YELLOW)

    return {
        'success': True,
        'latest_id': latest.get('id'),
        'backup_id': ts_file.get('id'),
        'deleted': deleted,
    }

def sync_code(service, config, repo_path, version=None, dry_run=False):
    """Sync ไฟล์โค้ดทั้งหมดขึ้น Google Drive"""
    log_step(f"Syncing code from: {repo_path}")

    repo = Path(repo_path)
    folders = get_folder_structure(service, config, dry_run)
    version = version or config.get('version', 'v5.5.8')
    timestamp = datetime.now().strftime('%Y%m%d_%H%M')
    version_folder_name = f"{version}_{timestamp}"

    # สร้าง version folder
    version_folder_id = get_or_create_folder(service, version_folder_name, folders['code'], dry_run)
    log(f"Version folder: {version_folder_name}", C.CYAN)

    synced = []
    errors = []

    # สแกนไฟล์ใน watch_dirs
    for watch_dir in config['watch_dirs']:
        dir_path = repo / watch_dir
        if not dir_path.exists():
            continue

        # สร้าง sub-folder สำหรับแต่ละ directory
        sub_folder_id = get_or_create_folder(service, watch_dir, version_folder_id, dry_run)

        for filepath in sorted(dir_path.rglob('*')):
            if not filepath.is_file():
                continue
            if filepath.suffix not in config['watch_extensions']:
                continue

            # ตรวจสอบ ignore patterns
            skip = False
            for pattern in config['ignore_patterns']:
                if pattern in str(filepath):
                    skip = True
                    break
            if skip:
                continue

            try:
                content = filepath.read_text(encoding='utf-8', errors='replace')
                mime = mimetypes.guess_type(str(filepath))[0] or 'text/plain'
                file_result = upsert_file(service, sub_folder_id, filepath.name, content, mime, dry_run)
                synced.append(filepath.name)
                log_ok(f"  {watch_dir}/{filepath.name}")
            except Exception as e:
                errors.append({'file': str(filepath), 'error': str(e)})
                log_err(f"  {filepath.name}: {e}")

    # สร้าง _index.json
    index = {
        'version':   version,
        'timestamp': datetime.now().isoformat(),
        'files':     synced,
        'total':     len(synced),
        'errors':    len(errors),
    }
    upsert_file(service, version_folder_id, '_index.json', json.dumps(index, ensure_ascii=False, indent=2), dry_run=dry_run)

    # ลบ version เก่า (เก็บ max_versions)
    deleted = clean_old_files(service, folders['code'], 'v', config['max_versions'], dry_run)
    if deleted > 0:
        log(f"Cleaned {deleted} old code versions", C.YELLOW)

    log_ok(f"Code sync complete: {len(synced)} files, {len(errors)} errors")
    return {
        'success': len(errors) == 0,
        'synced':  len(synced),
        'errors':  errors,
        'version': version,
        'folder':  version_folder_name,
    }

# ─── Setup ──────────────────────────────────────────────────

def run_setup():
    """แสดงขั้นตอนการตั้งค่าครั้งแรก"""
    print(f"""
{C.BOLD}{'='*60}
 COMPHONE Drive Sync — Setup Guide
{'='*60}{C.RESET}

{C.CYAN}วิธีที่ 1: Service Account (แนะนำสำหรับ CI/CD){C.RESET}
─────────────────────────────────────────────────
1. ไปที่ https://console.cloud.google.com
2. สร้าง Project ใหม่หรือเลือก Project ที่มีอยู่
3. เปิดใช้งาน Google Drive API
   APIs & Services → Enable APIs → ค้นหา "Google Drive API"
4. สร้าง Service Account
   IAM & Admin → Service Accounts → Create Service Account
5. ดาวน์โหลด JSON key
   Service Account → Keys → Add Key → JSON
6. บันทึกไฟล์ JSON ไว้ที่ปลอดภัย เช่น ~/.comphone/service_account.json
7. แชร์ Google Drive folder ให้ Service Account email (Editor)

จากนั้นรัน:
  python3 drive_sync.py --config-sa ~/.comphone/service_account.json

{C.CYAN}วิธีที่ 2: OAuth2 (สำหรับใช้งานส่วนตัว){C.RESET}
─────────────────────────────────────────────────
1. ไปที่ https://console.cloud.google.com
2. เปิดใช้งาน Google Drive API
3. สร้าง OAuth2 Credentials
   APIs & Services → Credentials → Create Credentials → OAuth Client ID
   Application type: Desktop App
4. ดาวน์โหลด JSON → บันทึกเป็น credentials.json ใน repo root
5. รัน:
   python3 drive_sync.py --setup-oauth

{C.CYAN}สำหรับ GitHub Actions:{C.RESET}
─────────────────────────────────────────────────
1. สร้าง Service Account (วิธีที่ 1)
2. เข้ารหัส JSON ด้วย base64:
   base64 -i service_account.json | tr -d '\\n'
3. เพิ่มใน GitHub Secrets:
   GOOGLE_SERVICE_ACCOUNT_KEY = (base64 string)
4. GitHub Actions จะใช้ secret นี้อัตโนมัติ

{C.GREEN}ไฟล์ config จะถูกบันทึกที่: {CONFIG_FILE}{C.RESET}
""")

def setup_oauth(config):
    """รัน OAuth2 flow ครั้งแรก"""
    log_step("Starting OAuth2 setup...")
    service = get_drive_service(config)
    if service:
        log_ok("OAuth2 setup สำเร็จ! Token บันทึกแล้ว")
        log_ok(f"Token file: {config['token_file']}")
    else:
        log_err("OAuth2 setup ล้มเหลว")

# ─── Config Management ──────────────────────────────────────

def load_config():
    """โหลด config จากไฟล์"""
    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE) as f:
                saved = json.load(f)
            config = {**DEFAULT_CONFIG, **saved}
            return config
        except:
            pass
    return DEFAULT_CONFIG.copy()

def save_config(config):
    """บันทึก config ลงไฟล์"""
    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, ensure_ascii=False, indent=2)
    log_ok(f"Config saved: {CONFIG_FILE}")

# ─── Main ────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description='COMPHONE Drive Sync — sync โค้ดขึ้น Google Drive',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
ตัวอย่าง:
  python3 drive_sync.py --session memory/session.md
  python3 drive_sync.py --code .
  python3 drive_sync.py --all --dry-run
  python3 drive_sync.py --setup
  python3 drive_sync.py --config-sa ~/.comphone/sa.json --all
        """
    )

    # Actions
    parser.add_argument('--session', metavar='FILE', help='Sync session.md ขึ้น Drive')
    parser.add_argument('--code', metavar='REPO_PATH', help='Sync โค้ดทั้งหมดขึ้น Drive')
    parser.add_argument('--all', action='store_true', help='Sync ทั้ง session และ code')
    parser.add_argument('--status', action='store_true', help='แสดงสถานะ Drive Sync')
    parser.add_argument('--setup', action='store_true', help='แสดงขั้นตอนการตั้งค่า')
    parser.add_argument('--setup-oauth', action='store_true', help='รัน OAuth2 setup')

    # Config
    parser.add_argument('--config-sa', metavar='FILE', help='Path ไปยัง Service Account JSON')
    parser.add_argument('--version', default=None, help='Version string สำหรับ code folder')
    parser.add_argument('--dry-run', action='store_true', help='ทดสอบโดยไม่ sync จริง')
    parser.add_argument('--repo', default='.', help='Path ไปยัง repo (default: .)')

    args = parser.parse_args()

    # Setup mode
    if args.setup:
        run_setup()
        return

    config = load_config()

    # ตั้งค่า Service Account ถ้าระบุ
    if args.config_sa:
        if not Path(args.config_sa).exists():
            log_err(f"ไม่พบไฟล์: {args.config_sa}")
            sys.exit(1)
        config['auth_method'] = 'service_account'
        config['service_account_file'] = str(Path(args.config_sa).resolve())
        save_config(config)

    if args.setup_oauth:
        setup_oauth(config)
        return

    if not (args.session or args.code or args.all or args.status):
        parser.print_help()
        return

    # เชื่อมต่อ Drive
    log_step("Connecting to Google Drive...")
    service = get_drive_service(config)
    if not service:
        log_err("ไม่สามารถเชื่อมต่อ Google Drive ได้")
        log_warn("รัน: python3 drive_sync.py --setup เพื่อดูขั้นตอน")
        sys.exit(1)
    log_ok("Connected to Google Drive")

    repo_path = str(Path(args.repo).resolve())
    results = {}

    # Sync session
    if args.session or args.all:
        session_file = args.session or 'memory/session.md'
        if not Path(session_file).is_absolute():
            session_file = str(Path(repo_path) / session_file)
        results['session'] = sync_session(service, config, session_file, args.dry_run)

    # Sync code
    if args.code or args.all:
        code_path = args.code or repo_path
        results['code'] = sync_code(service, config, code_path, args.version, args.dry_run)

    # Status
    if args.status:
        folders = get_folder_structure(service, config)
        log_ok(f"Root folder ID: {folders['root']}")
        log_ok(f"Session folder ID: {folders['session']}")
        log_ok(f"Code folder ID: {folders['code']}")

    # Summary
    print(f"\n{C.BOLD}{'='*50}")
    print(f" DRIVE SYNC SUMMARY")
    print(f"{'='*50}{C.RESET}")
    for key, result in results.items():
        status = f"{C.GREEN}✅ SUCCESS{C.RESET}" if result.get('success') else f"{C.RED}❌ FAILED{C.RESET}"
        print(f"  {key.upper():<10} {status}")
    print(f"{C.BOLD}{'='*50}{C.RESET}\n")

if __name__ == '__main__':
    main()
