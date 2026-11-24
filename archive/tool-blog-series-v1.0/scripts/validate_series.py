#!/usr/bin/env python3
"""Static content/structure checks. No browser tests or API calls."""
import json, pathlib, sys
root = pathlib.Path(__file__).resolve().parents[1]
items=json.loads((root/'data/tool-catalog.json').read_text(encoding='utf-8'))
errs=[]
if len(items)!=24:errs.append(f'Expected 24 tools, got {len(items)}')
if len({x['slug'] for x in items})!=len(items):errs.append('Duplicate tool slug')
mandatory=['## 1.','## 2.','## 3.','## 4.','## 5.','## 6.','## 7.','## 8.','## 9.','## 10.','## 11.','## 12.','## 13.']
for x in items:
 a=root/x['article'];p=root/x['prompt'];
 if not a.is_file():errs.append(f'Missing article {a}') ; continue
 if not p.is_file():errs.append(f'Missing prompt {p}')
 s=a.read_text(encoding='utf-8')
 for marker in mandatory:
  if marker not in s:errs.append(f'{x["slug"]} missing {marker}')
 if 'status: "outline"' not in s:errs.append(f'{x["slug"]}: unexpected status in outline')
 if x['official_url'] not in s:errs.append(f'{x["slug"]}: missing official source')
 if x['primary_case'] not in s:errs.append(f'{x["slug"]}: missing case marker')
for key in ['E1','M1','S1']:
 if len(list((root/'cases').glob(key+'-*.md')))!=1:errs.append('Case missing or duplicate: '+key)
for p in (root/'codex-prompts').glob('0*.md'):
 if len(p.read_text(encoding='utf-8'))<100:errs.append(f'Empty prompt: {p.name}')
print(f'Articles: {len(items)} | Full: {sum(x["tier"]=="完整篇" for x in items)} | Topic: {sum(x["tier"]=="专题篇" for x in items)} | Brief: {sum(x["tier"]=="短篇" for x in items)}')
if errs:
 for e in errs:print('ERROR:',e)
 sys.exit(1)
print('STATIC VALIDATION PASSED (does not verify commands, tool availability, real runs or article correctness)')
