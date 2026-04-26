#!/usr/bin/env python3
"""
Auto-fix version headers in all .gs files
Updates all COMPHONE SUPER APP version references to v5.9.0-phase2d
"""

import os
import re
import sys

def fix_version_in_file(filepath):
    """Fix version header in a single file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Pattern 1: // COMPHONE SUPER APP V5.5 (or V5.6, etc.)
        # Replace with: // COMPHONE SUPER APP v5.9.0-phase2d
        pattern1 = r'(//\s*COMPHONE SUPER APP\s+)(V\d+\.\d+[^-\s]*|v\d+\.\d+[^-\s]*)'
        replacement1 = r'\1v5.9.0-phase2d'
        content = re.sub(pattern1, replacement1, content)
        
        # Pattern 2: // COMPHONE SUPER APP V5.5+ — filename.gs
        # Replace with: // COMPHONE SUPER APP v5.9.0-phase2d — filename.gs
        pattern2 = r'(//\s*COMPHONE SUPER APP\s+)(V\d+\.\d+\+\s*—\s*\S+)'
        replacement2 = r'\1v5.9.0-phase2d — \2'
        # More precise handling for pattern with filename
        def replace_with_filename(match):
            prefix = match.group(1)
            rest = match.group(2)
            # Extract filename after —
            if '—' in rest:
                parts = rest.split('—', 1)
                if len(parts) > 1:
                    filename = parts[1].strip()
                    return f"{prefix}v5.9.0-phase2d — {filename}"
            return f"{prefix}v5.9.0-phase2d"
        
        content = re.sub(pattern2, replace_with_filename, content)
        
        # Pattern 3: // filename.gs — COMPHONE SUPER APP V5.5
        # Replace with: // filename.gs — COMPHONE SUPER APP v5.9.0-phase2d
        pattern3 = r'(//\s*\S+\.gs\s*—\s*COMPHONE SUPER APP\s+)(V\d+\.\d+[^-\s]*|v\d+\.\d+[^-\s]*)'
        replacement3 = r'\1v5.9.0-phase2d'
        content = re.sub(pattern3, replacement3, content)
        
        # Pattern 4: // COMPHONE SUPER APP v5.6.5 — RouterSplit.gs
        # Replace with: // COMPHONE SUPER APP v5.9.0-phase2d — RouterSplit.gs
        pattern4 = r'(//\s*COMPHONE SUPER APP\s+)(v\d+\.\d+\.\d+\s*—\s*\S+)'
        def replace_pattern4(match):
            prefix = match.group(1)
            rest = match.group(2)
            if '—' in rest:
                parts = rest.split('—', 1)
                if len(parts) > 1:
                    filename = parts[1].strip()
                    return f"{prefix}v5.9.0-phase2d — {filename}"
            return f"{prefix}v5.9.0-phase2d"
        content = re.sub(pattern4, replace_pattern4, content)
        
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, "Updated"
        else:
            return False, "No change needed"
            
    except Exception as e:
        return False, f"Error: {e}"

def main():
    # Find all .gs files in clasp-ready/
    clasp_ready_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'clasp-ready')
    clasp_ready_dir = os.path.normpath(clasp_ready_dir)
    
    if not os.path.exists(clasp_ready_dir):
        print(f"Error: Directory {clasp_ready_dir} not found")
        sys.exit(1)
    
    gs_files = []
    for f in os.listdir(clasp_ready_dir):
        if f.endswith('.gs'):
            gs_files.append(os.path.join(clasp_ready_dir, f))
    
    gs_files.sort()
    
    print(f"Found {len(gs_files)} .gs files")
    print("=" * 60)
    
    updated_count = 0
    error_count = 0
    unchanged_count = 0
    
    for filepath in gs_files:
        filename = os.path.basename(filepath)
        updated, status = fix_version_in_file(filepath)
        
        if updated:
            print(f"✅ {filename}: {status}")
            updated_count += 1
        elif "Error" in status:
            print(f"❌ {filename}: {status}")
            error_count += 1
        else:
            # print(f"⏭️  {filename}: {status}")
            unchanged_count += 1
    
    print("=" * 60)
    print(f"Summary:")
    print(f"  ✅ Updated: {updated_count} files")
    print(f"  ⏭️  Unchanged: {unchanged_count} files")
    print(f"  ❌ Errors: {error_count} files")
    print(f"  📊 Total: {len(gs_files)} files")

if __name__ == "__main__":
    main()
