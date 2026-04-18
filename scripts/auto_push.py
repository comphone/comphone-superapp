#!/usr/bin/env python3
"""
auto_push.py — COMPHONE SUPER APP V5.5
File Watcher: ตรวจจับการเปลี่ยนแปลงไฟล์ → auto git add + commit + push

ใช้งาน:
  python3 auto_push.py                    # รันปกติ
  python3 auto_push.py --debounce 30      # รอ 30 วินาทีก่อน commit
  python3 auto_push.py --dry-run          # ทดสอบโดยไม่ push จริง
  python3 auto_push.py --branch feature   # ระบุ branch
"""

import os
import sys
import time
import subprocess
import argparse
import hashlib
import json
from pathlib import Path
from datetime import datetime

# ─── Config ────────────────────────────────────────────────
WATCH_DIRS = ['pwa', 'clasp-ready', 'memory', 'scripts']
WATCH_EXTENSIONS = {'.js', '.gs', '.html', '.css', '.json', '.md', '.yml', '.yaml'}
IGNORE_PATTERNS = {
    '.git', 'node_modules', '__pycache__', '.DS_Store',
    'backups', '*.log', '*.tmp', '*.swp', '*.bak'
}
DEFAULT_DEBOUNCE = 15   # วินาที — รอหลังจากไฟล์เปลี่ยนแปลงก่อน commit
MAX_COMMIT_INTERVAL = 300  # วินาที — commit อย่างน้อยทุก 5 นาที ถ้ามีการเปลี่ยนแปลง

# ─── Color output ───────────────────────────────────────────
class C:
    RESET = '\033[0m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'

def log(msg, color=C.RESET):
    ts = datetime.now().strftime('%H:%M:%S')
    print(f"{C.BLUE}[{ts}]{C.RESET} {color}{msg}{C.RESET}", flush=True)

# ─── Git helpers ────────────────────────────────────────────
def run_git(args, cwd, dry_run=False):
    """รัน git command และ return (success, output)"""
    cmd = ['git'] + args
    if dry_run and args[0] not in ['status', 'diff', 'log', 'rev-parse']:
        log(f"[DRY-RUN] {' '.join(cmd)}", C.YELLOW)
        return True, ''
    try:
        result = subprocess.run(
            cmd, cwd=cwd, capture_output=True, text=True, timeout=60
        )
        return result.returncode == 0, result.stdout.strip() + result.stderr.strip()
    except subprocess.TimeoutExpired:
        return False, 'timeout'
    except Exception as e:
        return False, str(e)

def get_changed_files(repo_path):
    """ดึงรายการไฟล์ที่เปลี่ยนแปลง (modified + untracked)"""
    ok, out = run_git(['status', '--porcelain'], repo_path)
    if not ok:
        return []
    files = []
    for line in out.splitlines():
        if line.strip():
            status = line[:2].strip()
            filepath = line[3:].strip()
            files.append((status, filepath))
    return files

def should_ignore(path_str):
    """ตรวจสอบว่าควร ignore ไฟล์นี้หรือไม่"""
    parts = Path(path_str).parts
    for part in parts:
        if part in IGNORE_PATTERNS:
            return True
    return False

def generate_commit_message(changed_files):
    """สร้าง commit message อัตโนมัติจากไฟล์ที่เปลี่ยน"""
    if not changed_files:
        return None

    # จัดกลุ่มตาม directory
    groups = {}
    for status, filepath in changed_files:
        parts = Path(filepath).parts
        group = parts[0] if len(parts) > 1 else 'root'
        groups.setdefault(group, []).append((status, filepath))

    # สร้าง summary
    summary_parts = []
    for group, files in sorted(groups.items()):
        added = sum(1 for s, _ in files if s in ('?', 'A'))
        modified = sum(1 for s, _ in files if s == 'M')
        deleted = sum(1 for s, _ in files if s == 'D')
        parts_msg = []
        if added: parts_msg.append(f"+{added}")
        if modified: parts_msg.append(f"~{modified}")
        if deleted: parts_msg.append(f"-{deleted}")
        summary_parts.append(f"{group}({','.join(parts_msg)})")

    ts = datetime.now().strftime('%Y-%m-%d %H:%M')
    total = len(changed_files)
    summary = ' '.join(summary_parts)

    return f"🔄 Auto-update {total} files: {summary} [{ts}]"

# ─── File Watcher ────────────────────────────────────────────
class FileWatcher:
    def __init__(self, repo_path, debounce=DEFAULT_DEBOUNCE, dry_run=False, branch='main'):
        self.repo_path = Path(repo_path).resolve()
        self.debounce = debounce
        self.dry_run = dry_run
        self.branch = branch
        self.file_hashes = {}
        self.last_change_time = None
        self.last_commit_time = time.time()
        self.pending_changes = set()
        self.stats = {'commits': 0, 'pushes': 0, 'errors': 0}

    def get_file_hash(self, filepath):
        """คำนวณ hash ของไฟล์"""
        try:
            with open(filepath, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except:
            return None

    def scan_files(self):
        """สแกนไฟล์ทั้งหมดใน watch directories"""
        current_hashes = {}
        for watch_dir in WATCH_DIRS:
            dir_path = self.repo_path / watch_dir
            if not dir_path.exists():
                continue
            for filepath in dir_path.rglob('*'):
                if filepath.is_file() and filepath.suffix in WATCH_EXTENSIONS:
                    rel_path = str(filepath.relative_to(self.repo_path))
                    if not should_ignore(rel_path):
                        h = self.get_file_hash(filepath)
                        if h:
                            current_hashes[rel_path] = h
        return current_hashes

    def detect_changes(self):
        """ตรวจจับไฟล์ที่เปลี่ยนแปลง"""
        current = self.scan_files()
        changed = set()

        # ไฟล์ใหม่หรือเปลี่ยนแปลง
        for path, h in current.items():
            if path not in self.file_hashes or self.file_hashes[path] != h:
                changed.add(path)

        # ไฟล์ที่ถูกลบ
        for path in self.file_hashes:
            if path not in current:
                changed.add(path)

        self.file_hashes = current
        return changed

    def do_commit_and_push(self, changed_files_git):
        """ทำ git add + commit + push"""
        if not changed_files_git:
            return True

        commit_msg = generate_commit_message(changed_files_git)
        if not commit_msg:
            return True

        log(f"📝 Committing {len(changed_files_git)} changes...", C.CYAN)

        # git add -A
        ok, out = run_git(['add', '-A'], self.repo_path, self.dry_run)
        if not ok:
            log(f"❌ git add failed: {out}", C.RED)
            self.stats['errors'] += 1
            return False

        # git commit
        ok, out = run_git(['commit', '-m', commit_msg], self.repo_path, self.dry_run)
        if not ok:
            if 'nothing to commit' in out:
                log("ℹ️ Nothing to commit", C.YELLOW)
                return True
            log(f"❌ git commit failed: {out}", C.RED)
            self.stats['errors'] += 1
            return False

        self.stats['commits'] += 1
        log(f"✅ Committed: {commit_msg[:60]}...", C.GREEN)

        # git push
        log(f"🚀 Pushing to origin/{self.branch}...", C.CYAN)
        for attempt in range(1, 4):
            ok, out = run_git(['push', 'origin', self.branch], self.repo_path, self.dry_run)
            if ok:
                self.stats['pushes'] += 1
                log(f"✅ Pushed to GitHub (origin/{self.branch})", C.GREEN)
                return True
            else:
                log(f"⚠️ Push attempt {attempt}/3 failed: {out[:100]}", C.YELLOW)
                if attempt < 3:
                    time.sleep(5)

        log(f"❌ Push failed after 3 attempts", C.RED)
        self.stats['errors'] += 1
        return False

    def run(self):
        """Main loop"""
        log(f"{'='*60}", C.BOLD)
        log(f"🔍 COMPHONE Auto-Push Watcher", C.BOLD)
        log(f"   Repo: {self.repo_path}", C.CYAN)
        log(f"   Branch: {self.branch}", C.CYAN)
        log(f"   Debounce: {self.debounce}s", C.CYAN)
        log(f"   Watching: {', '.join(WATCH_DIRS)}", C.CYAN)
        log(f"   Dry-run: {'YES' if self.dry_run else 'NO'}", C.YELLOW if self.dry_run else C.GREEN)
        log(f"{'='*60}", C.BOLD)
        log("👀 Watching for changes... (Ctrl+C to stop)", C.GREEN)

        # Initial scan
        self.file_hashes = self.scan_files()
        log(f"📁 Tracking {len(self.file_hashes)} files", C.CYAN)

        try:
            while True:
                time.sleep(2)  # poll ทุก 2 วินาที

                changed = self.detect_changes()
                if changed:
                    self.pending_changes.update(changed)
                    self.last_change_time = time.time()
                    for f in changed:
                        log(f"📄 Changed: {f}", C.YELLOW)

                # ตรวจสอบว่าถึงเวลา commit หรือยัง
                should_commit = False
                if self.pending_changes and self.last_change_time:
                    time_since_change = time.time() - self.last_change_time
                    time_since_commit = time.time() - self.last_commit_time

                    if time_since_change >= self.debounce:
                        should_commit = True
                    elif time_since_commit >= MAX_COMMIT_INTERVAL:
                        should_commit = True
                        log(f"⏰ Max interval reached — forcing commit", C.YELLOW)

                if should_commit:
                    changed_files_git = get_changed_files(self.repo_path)
                    if changed_files_git:
                        self.do_commit_and_push(changed_files_git)
                    self.pending_changes.clear()
                    self.last_change_time = None
                    self.last_commit_time = time.time()

        except KeyboardInterrupt:
            log(f"\n{'='*60}", C.BOLD)
            log(f"🛑 Watcher stopped", C.YELLOW)
            log(f"📊 Stats: {self.stats['commits']} commits, {self.stats['pushes']} pushes, {self.stats['errors']} errors", C.CYAN)
            log(f"{'='*60}", C.BOLD)

            # Commit pending changes ก่อนออก
            if self.pending_changes:
                log("💾 Committing pending changes before exit...", C.YELLOW)
                changed_files_git = get_changed_files(self.repo_path)
                if changed_files_git:
                    self.do_commit_and_push(changed_files_git)

# ─── Main ────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description='COMPHONE Auto-Push File Watcher',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
ตัวอย่าง:
  python3 auto_push.py                    รันปกติ (debounce 15s)
  python3 auto_push.py --debounce 60      รอ 60 วินาทีก่อน commit
  python3 auto_push.py --dry-run          ทดสอบโดยไม่ push จริง
  python3 auto_push.py --branch develop   push ไปยัง branch develop
        """
    )
    parser.add_argument('--repo', default='.', help='Path to git repository')
    parser.add_argument('--debounce', type=int, default=DEFAULT_DEBOUNCE,
                        help=f'วินาทีที่รอหลังไฟล์เปลี่ยนก่อน commit (default: {DEFAULT_DEBOUNCE})')
    parser.add_argument('--branch', default='main', help='Git branch ที่จะ push (default: main)')
    parser.add_argument('--dry-run', action='store_true', help='ทดสอบโดยไม่ push จริง')
    parser.add_argument('--once', action='store_true', help='Commit & push ครั้งเดียวแล้วออก')

    args = parser.parse_args()

    # หา repo root
    repo_path = Path(args.repo).resolve()
    if not (repo_path / '.git').exists():
        # ลองหา repo root จาก cwd
        try:
            result = subprocess.run(['git', 'rev-parse', '--show-toplevel'],
                                    capture_output=True, text=True, cwd=str(repo_path))
            if result.returncode == 0:
                repo_path = Path(result.stdout.strip())
        except:
            pass

    if not (repo_path / '.git').exists():
        print(f"❌ ไม่พบ git repository ที่: {repo_path}")
        sys.exit(1)

    if args.once:
        # Commit & push ครั้งเดียว
        watcher = FileWatcher(repo_path, args.debounce, args.dry_run, args.branch)
        changed_files_git = get_changed_files(repo_path)
        if changed_files_git:
            log(f"📝 Found {len(changed_files_git)} changed files", C.CYAN)
            watcher.do_commit_and_push(changed_files_git)
        else:
            log("ℹ️ No changes to commit", C.YELLOW)
    else:
        watcher = FileWatcher(repo_path, args.debounce, args.dry_run, args.branch)
        watcher.run()

if __name__ == '__main__':
    main()
