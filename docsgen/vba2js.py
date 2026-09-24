"""Transpile simple VBA Public Functions (scalar math UDFs) into JavaScript.

Covers the subset used by modReserves / modInflow / modAtmInflow:
If/ElseIf/Else/End If, Dim (with inline init), assignments, Exit Function,
CVErr, IsNumeric, CDbl, VBA.Log/Sqr/Sin/Tan/Exp, arithmetic, And/Or/Not,
comparison operators, string literals and '&' concatenation.
"""
import re, sys, json

FUNCS = {'VBA.Log': 'Math.log', 'VBA.Sqr': 'Math.sqrt', 'VBA.Sin': 'Math.sin',
         'VBA.Tan': 'Math.tan', 'VBA.Exp': 'Math.exp', 'VBA.Cos': 'Math.cos',
         'VBA.Abs': 'Math.abs'}
ERRS = {'xlErrValue': 'ERR_VALUE', 'xlErrDiv0': 'ERR_DIV0', 'xlErrNum': 'ERR_NUM'}


def split_strings(s):
    """Yield (is_string, text) chunks so we never rewrite inside string literals."""
    out, i, buf = [], 0, ''
    while i < len(s):
        if s[i] == '"':
            if buf: out.append((False, buf)); buf = ''
            j = i + 1; lit = ''
            while j < len(s):
                if s[j] == '"' and j + 1 < len(s) and s[j + 1] == '"':
                    lit += '"'; j += 2; continue
                if s[j] == '"': break
                lit += s[j]; j += 1
            out.append((True, lit)); i = j + 1
        else:
            buf += s[i]; i += 1
    if buf: out.append((False, buf))
    return out


def conv_expr(expr, cond=False):
    parts = []
    for is_str, t in split_strings(expr):
        if is_str:
            parts.append(json.dumps(t, ensure_ascii=False)); continue
        for k, v in FUNCS.items():
            t = t.replace(k + '(', v + '(')
        t = re.sub(r'\bSqr\(', 'Math.sqrt(', t)
        t = re.sub(r'\bCVErr\((\w+)\)', lambda m: ERRS[m.group(1)], t)
        t = re.sub(r'\bIsNumeric\(', 'isNum(', t)
        t = re.sub(r'\bCDbl\(', 'num(', t)
        t = re.sub(r'(\d)#', r'\1', t)
        t = t.replace('^', '**')
        t = t.replace('&', '+')
        if cond:
            t = t.replace('<>', ' !== ')
            t = re.sub(r'(?<![<>=!])=(?![=])', ' === ', t)
            t = re.sub(r'\bAnd\b', '&&', t)
            t = re.sub(r'\bOr\b', '||', t)
            t = re.sub(r'\bNot\b', '!', t)
        parts.append(t)
    return ''.join(parts)


def transpile_module(code, only=None):
    code = code.replace('\r', '')
    code = re.sub(r' _\n\s*', ' ', code)
    lines = code.split('\n')
    out = []; fn = None; names = []
    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("'") or line.startswith('Attribute'):
            continue
        m = re.match(r'Public Function (\w+)\s*\((.*)\)\s*As \w+$', line)
        if m:
            fn = m.group(1)
            if only and fn not in only:
                fn = None; continue
            params = [re.sub(r'^(Optional\s+)?(ByVal|ByRef)\s+', '', p.strip()).split(' ')[0]
                      for p in m.group(2).split(',') if p.strip()]
            out.append(f'function {fn}({", ".join(params)}) {{\n  let __ret;')
            names.append(fn); continue
        if fn is None:
            continue
        if line == 'End Function':
            out.append('  return __ret;\n}'); fn = None; continue
        if line == 'Exit Function':
            out.append('  return __ret;'); continue
        if line == 'End If':
            out.append('  }'); continue
        if line == 'Else':
            out.append('  } else {'); continue
        m = re.match(r'ElseIf (.*) Then$', line)
        if m:
            out.append(f'  }} else if ({conv_expr(m.group(1), True)}) {{'); continue
        m = re.match(r'If (.*) Then$', line)
        if m:
            out.append(f'  if ({conv_expr(m.group(1), True)}) {{'); continue
        m = re.match(r'If (.*) Then (.+)$', line)
        if m:
            out.append(f'  if ({conv_expr(m.group(1), True)}) {{ {stmt(m.group(2), fn)} }}'); continue
        # Dim with inline init  "Dim x As Double: x = expr"
        m = re.match(r'Dim (\w+) As \w+:\s*\1\s*=\s*(.+)$', line)
        if m:
            out.append(f'  let {m.group(1)} = {conv_expr(m.group(2))};'); continue
        m = re.match(r'Dim (.+)$', line)
        if m:
            vars_ = [v.strip().split(' ')[0] for v in m.group(1).split(',')]
            out.append(f'  let {", ".join(vars_)};'); continue
        out.append('  ' + stmt(line, fn))
    return '\n'.join(out), names


def stmt(line, fn):
    m = re.match(r'(\w+)\s*=\s*(.+)$', line)
    if not m:
        raise ValueError('Unsupported statement: ' + line)
    target = '__ret' if m.group(1) == fn else m.group(1)
    return f'{target} = {conv_expr(m.group(2))};'


if __name__ == '__main__':
    header = """// AUTO-GENERATED from the VBA source of hydro_proto_v_0_2.xlsm by vba2js.py.
// Do not edit by hand: re-run the generator after changing the add-in.
"""
    body = [header]
    allnames = []
    for path in sys.argv[2:]:
        code = open(path, encoding='utf-8').read()
        js, names = transpile_module(code)
        body.append(f'// ---- {path.split("/")[-1]} ----\n' + js)
        allnames += names
    body.append('const GENERATED_NAMES = ' + json.dumps(allnames) + ';')
    open(sys.argv[1], 'w', encoding='utf-8').write('\n\n'.join(body) + '\n')
    print(len(allnames), 'functions transpiled')
