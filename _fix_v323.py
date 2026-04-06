# -*- coding: utf-8 -*-
"""V323 - Fix Index.html: Use JSON.stringify for all onclick values = zero escapes"""
import io, sys, os, subprocess

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Index.html'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

lines = content.split('\n')

# STEP 1: Kill orphaned h+= before first function
new_lines = []
past_f1 = False
for i, line in enumerate(lines):
    s = line.strip()
    if s.startswith('function ') and not past_f1:
        past_f1 = True
    if not past_f1 and s.startswith('h+='):
        print(f'[DEL] Line {i+1}')
        continue
    new_lines.append(line)
lines = new_lines

# STEP 2: For each broken line, write its CORRECT replacement using JSON.stringify
# This guarantees zero escaping issues.
# Pattern: h+="<div ... onclick='func("+JSON.stringify(id)+")'>...</div>";

for i in range(len(lines)):
    line = lines[i]
    
    # window.open: replace with JSON.stringify version
    if 'window.open' in line and 'onclick' in line:
        lines[i] = '  if(j.folder)h+="<div class=\'b2 ba\' onclick=\'window.open("+"JSON.stringify(j.folder)+'+",\'_blank\')\'>folder</div>";'
        lines[i] = "  if(j.folder)h+=\"<div class='b2 ba' onclick='window.open('+JSON.stringify(j.folder)+',\\\"_blank\\\")'><!--folder--></div>\";"
        # Simpler:
        lines[i] = "  if(j.folder)h+=`<div class=\"b2 ba\" onclick=\"window.open(${JSON.stringify(j.folder)},'_blank')\">folder</div>`;"
        print(f'[FIX {i+1}] window.open')
    
    # cSt buttons
    elif 'cSt(' in line and 'onclick' in line:
        status = '__placeholder__'
        if '\u0E23\u0E2D\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23' in line or 'on' in line.lower():
            status = '\u0E23\u0E2D\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23'
        elif 'InProgress' in line:
            status = 'InProgress'
        elif 'Completed' in line:
            status = 'Completed'
        elif '\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01' in line:
            status = '\u0E22\u0E01\u0E40\u0E25\u0E34\u0E01'
        
        color = 'ba'
        if status == 'InProgress': color = 'bb'
        elif status == 'Completed': color = 'bp'
        elif '\u0E22\u0E01' in status: color = 'bx'
        
        # Use backtick for template literal - no escaping needed!
        lines[i] = f"  h+=`<div class=\"b2 {color}\" onclick=\"cSt(${{JSON.stringify(id)}},${{JSON.stringify(status)}})\">{status}</div>`;"
        print(f'[FIX {i+1}] cSt -> {status}')
    
    # sv button with arg1
    elif 'arg1' in line and 'onclick' in line:
        lines[i] = "  h+=\"<button class='btn' onclick='sv('+JSON.stringify(id)+')'>save</button>\";"
        print(f'[FIX {i+1}] sv arg1->id')

# SAVE
result = '\n'.join(lines)
with open(path, 'w', encoding='utf-8') as f:
    f.write(result)

print(f'\nSaved: {os.path.getsize(path)} bytes')

# VERIFY
r = subprocess.run(
    ['node', '-e',
     f'const fs=require("fs");const c=fs.readFileSync("{path}","utf8");'
     'const m=c.match(/<script>([\\s\\S]*?)<\\/script>/);'
     'if(!m){console.log("NO SCRIPT");process.exit(1)}'
     'try{new Function(m[1]);console.log("VALID")}catch(e){console.log("ERROR: "+e.message)}'],
    capture_output=True, text=True
)
print(r.stdout.strip() if r.stdout else '')
if r.stderr and 'Error' in r.stderr:
    print(r.stderr[:300])
