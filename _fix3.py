# -*- coding: utf-8 -*-
import os, subprocess

path = r"C:\Users\Server\.openclaw\workspace\Shop_vnext\src\Index.html"

with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Strip orphaned h+= lines before first function
new = []
past_fn = False
for i, line in enumerate(lines):
    s = line.strip()
    if s.startswith("function ") and not past_fn:
        past_fn = True
    if not past_fn and s.startswith("h+="):
        print(f"[DEL] Line {i+1}: orphan")
        continue
    new.append(line)

# Fix specific broken lines
for i in range(len(new)):
    line = new[i]
    
    # window.open broken
    if "window.open" in line and "onclick" in line:
        new[i] = "  if(j.folder)h+=`<div class=\"b2 ba\" onclick=\"window.open(${JSON.stringify(j.folder)},'_blank')\">folder</div>`;\n"
        print(f"[FIX {i+1}] window.open")
    
    # cSt broken
    elif "cSt(" in line and "onclick" in line:
        if "InProgress" in line:
            new[i] = "  h+=`<div class=\"b2 bb\" onclick=\"cSt(${JSON.stringify(id)},'InProgress')\">InProgress</div>`;\n"
        elif "Completed" in line:
            new[i] = "  h+=`<div class=\"b2 bp\" onclick=\"cSt(${JSON.stringify(id)},'Completed')\">Completed</div>`;\n"
        else:
            new[i] = "  h+=`<div class=\"b2 bx\" onclick=\"cSt(${JSON.stringify(id)},'cancel')\">cancel</div>`;\n"
        print(f"[FIX {i+1}] cSt")
    
    # arg1 broken
    elif "arg1" in line and "onclick" in line:
        new[i] = "  h+=`<button class=\"btn\" onclick=\"save(${JSON.stringify(id)})\">save</button>`;\n"
        print(f"[FIX {i+1}] arg1->id")

with open(path, "w", encoding="utf-8") as f:
    f.writelines(new)

print(f"Saved: {os.path.getsize(path)} bytes")

# Verify
r = subprocess.run(
    ["node", "-e",
     f"const fs=require('fs');const c=fs.readFileSync('{path}','utf8');"
     "const m=c.match(/<script>([\\s\\S]*?)<\\/script>/);"
     "if(!m){console.log('NO SCRIPT');process.exit(1)}"
     "try{new Function(m[1]);console.log('VALID')}catch(e){console.log('ERROR: '+e.message)}"],
    capture_output=True, text=True
)
print(r.stdout.strip())
if r.stderr:
    print(r.stderr[:200])
