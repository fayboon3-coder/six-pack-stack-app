"""Writes Boon's Stack Check verdicts into the ask-boon server function (LIBRARY block).
Run after changing src/data/stackcheck.json, then redeploy the function."""
import json, re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
items = json.load(open(root / 'src/data/stackcheck.json'))
clean = lambda s: re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s or '')).replace('`', "'").replace('${', '$ {').strip()
lines = [f"{clean(v['name'])} (also: {', '.join(v.get('aliases', [])[:4])}) | {clean(v['verdict'])} | swap: {clean(v.get('swap_short'))} | {clean(v.get('headline'))}" for v in items]
fn = root / 'supabase/functions/ask-boon/index.ts'
src = fn.read_text()
block = '// LIBRARY:START\nconst LIBRARY = `' + '\n'.join(lines) + '`;\n// LIBRARY:END'
src = re.sub(r'// LIBRARY:START.*?// LIBRARY:END', lambda m: block, src, flags=re.S)
fn.write_text(src)
print(f'{len(lines)} verdicts written to {fn.relative_to(root)}')
