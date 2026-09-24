import re, json, glob
funcs = {}
for f in glob.glob('vba_src/*.bas'):
    code = open(f, encoding='utf-8').read().replace('\r','')
    # join line continuations
    code2 = re.sub(r' _\n\s*', ' ', code)
    mod = f.split('/')[-1][:-4]
    for m in re.finditer(r'^\s*Public Function (\w+)\s*\((.*?)\)\s*(As \w+)?\s*$', code2, re.M):
        name, params = m.group(1), m.group(2)
        ps = []
        for p in params.split(','):
            p = p.strip()
            if not p: continue
            p = re.sub(r'^(Optional\s+)?(ByVal|ByRef)\s+', r'\1', p)
            ps.append(p)
        funcs.setdefault(name, {})['module'] = mod
        funcs[name]['params'] = ps
    for m in re.finditer(r'MacroOptions\s+Macro:="(\w+)",\s*Description:=(".*?"),\s*Category:=\w+(?:,\s*ArgumentDescriptions:=Array\((.*?)\))?\s*\n', code2, re.S):
        name = m.group(1)
        desc = m.group(2)
        args = m.group(3)
        desc = ' & '.join([desc]) 
        d = funcs.setdefault(name, {})
        d['desc'] = re.sub(r'"\s*&\s*"', '', desc).strip('"')
        if args:
            d['args'] = [a.replace('""','"') for a in re.findall(r'"((?:[^"]|"")*)"', args)]
json.dump(funcs, open('sigs.json','w',encoding='utf-8'), ensure_ascii=False, indent=1)
pub = [n for n in funcs if 'params' in n or True]
print(len(funcs))
for n,v in sorted(funcs.items()):
    print(n, v.get('params'), '| args:', len(v.get('args',[])), '| desc:', 'Y' if v.get('desc') else '-')
