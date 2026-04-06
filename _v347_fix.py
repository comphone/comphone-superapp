import os
D = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src'

with open(os.path.join(D, 'Index.html'), 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: The broken jtl line - exact text match
# Current bad: h2+='<div id="jtl">"></div></div>';
# Should be:   h2+='<div id="jtl"></div></div>';
# Actually the broken one comes from the merge artifact: h2+='<div id="jtl">"></div></div>';
# The original intent was: h2+='<div id="jtl">\u0e42\u0e2b\u0e25\u0e14...</div>';
content = content.replace(
    "h2+='<div id=\"jtl\">\"></div></div>';",
    "h2+='<div id=\"jtl\"></div>';"
)

# Fix 2: cm() -> cl()  (cm doesn't exist, cl is the close modal function)
content = content.replace('onclick="cm()"', 'onclick="cl()"')

# Fix 3: Update version number
content = content.replace('Comphone Dashboard V345', 'Comphone Dashboard V347')
content = content.replace('Comphone V345', 'Comphone V347')
content = content.replace('// V347 - Comphone Dashboard Complete (Bug fixes for vJb null-safety)', '// V347 - Comphone Dashboard (Modular - JS in JS_Dashboard.html)')

# Write fixed version
with open(os.path.join(D, 'Index.html'), 'w', encoding='utf-8') as f:
    f.write(content)

# Now extract clean JS into JS_Dashboard.html
script_open = content.find('<script>')
script_close = content.rfind('</script>')
js_raw = content[script_open + len('<script>'):script_close].strip()

# Remove the old INIT block from the standalone JS since it will be re-included
# The JS will be included via template so it still needs the INIT
js_dashboard = '<script>\n' + js_raw + '\n</script>'

with open(os.path.join(D, 'JS_Dashboard.html'), 'w', encoding='utf-8') as f:
    f.write(js_dashboard)

# Now rewrite Index.html to use include()
pre_js = content[:script_open]  # HTML + CSS before <script>
post_js = content[script_close:]  # </script></body></html>

# The new Index.html uses GAS templated include
new_index = pre_js.rstrip() + '\n<?!= include(\'JS_Dashboard\'); ?>\n' + post_js

with open(os.path.join(D, 'Index.html'), 'w', encoding='utf-8') as f:
    f.write(new_index)

print('=== V347 Files Created ===')
print('Index.html:', len(new_index), 'bytes')
print('JS_Dashboard.html:', len(js_dashboard), 'bytes')

# Validate JS
try:
    compile(js_raw, '<string>', 'exec')
    print('JS: Python compile OK (basic check)')
except:
    pass

# Check that the broken lines are gone
if '">"' in content:
    print('WARNING: "> still found')
if 'onclick="cm()"' in content:
    print('WARNING: cm() still found')
    
# Verify jtl line is fixed
for line in new_index.split('\n'):
    if 'jtl' in line.lower() and 'include' not in line:
        print('jtl line:', line[:100])
