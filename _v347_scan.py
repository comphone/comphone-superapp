import os
D = r'C:\Users\Server\.openclaw\workspace\Shop_vnext\src'

with open(os.path.join(D, 'Index.html'), 'r', encoding='utf-8') as f:
    content = f.read()

script_open = content.find('<script>')
script_close = content.rfind('</script>')

pre_js = content[:script_open]
js = content[script_open + len('<script>'):script_close]

print('Pre-JS:', len(pre_js))
print('JS:', len(js))

# Find problem lines
for i, line in enumerate(js.split('\n')):
    if 'jtl' in line:
        print('JS Line %d: %s' % (i+1, line[:120]))
    if 'cm()' in line:
        print('JS Line %d (cm call): %s' % (i+1, line[:120]))
    if 'function cm' in line:
        print('JS Line %d (cm def): %s' % (i+1, line[:120]))
