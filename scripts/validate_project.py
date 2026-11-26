#!/usr/bin/env python3
"""Planning and content static checks ONLY; no browser or external network."""
import json
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
errors=[]
needed=[
    'README.md','README.zh-CN.md','AGENTS.md','00_START_HERE.md',
    'docs/project/ROADMAP.zh-CN.md','docs/quality/QUALITY_GATES.zh-CN.md',
    'contracts/cases/E1.yaml','contracts/cases/M1.yaml','contracts/cases/S1.yaml',
    'data/tool-catalog.json','content/blog/drafts/README.md',
    'content/blog/editorial/02-全工具目录.md','prompts/00-repo-bootstrap.zh-CN.md',
]
for rel in needed:
    if not (ROOT/rel).is_file(): errors.append('Missing '+rel)
items=json.loads((ROOT/'data/tool-catalog.json').read_text(encoding='utf-8'))
# Verified or later states require evidence and human review, so package integrity accepts only editable draft states.
article_statuses={'outline','draft'}
if len(items)!=24:errors.append(f'Expected 24 tools, got {len(items)}')
if len(set(x['slug'] for x in items))!=24:errors.append('Duplicate slugs')
for x in items:
    slug=x['slug']
    article=ROOT/Path(x['article'])
    prompt=ROOT/Path(x['prompt'])
    tool=ROOT/'tools'/slug/'README.md'
    for path in [article,prompt,tool]:
        if not path.is_file():errors.append('Missing '+str(path.relative_to(ROOT)))
    if article.is_file():
        s=article.read_text(encoding='utf-8')
        status=x.get('status')
        if status not in article_statuses:errors.append('Invalid article state '+slug)
        elif f'status: "{status}"' not in s:errors.append('Article/catalog state mismatch '+slug)
        if x['official_url'] not in s:errors.append('Official URL missing '+slug)
for case in ('E1','M1','S1'):
    if len(list((ROOT/'content/blog/cases').glob(case+'-*.md')))!=1:errors.append('Case note not unique '+case)
for f in ROOT.rglob('*.json'):
    if 'archive' in f.relative_to(ROOT).parts:continue
    try:json.loads(f.read_text(encoding='utf-8'))
    except Exception as e:errors.append(f'Invalid JSON {f}: {e}')
for sub,expected in [('tools',24),('series',1),('practices',3)]:
    n=len(list((ROOT/'content/blog/drafts'/sub).glob('*.md')))
    if n!=expected:errors.append(f'Expected {expected} draft documents in {sub}, found {n}')
try:
    import yaml
except ImportError:
    print('OPTIONAL PyYAML not installed: skipping YAML checks')
else:
    for key in ('E1','M1','S1'):
        try:
            d=yaml.safe_load((ROOT/'contracts/cases'/f'{key}.yaml').read_text(encoding='utf-8'))
            if d.get('case_id')!=key:errors.append('Invalid case ID '+key)
        except Exception as e:errors.append('Invalid YAML '+key+str(e))
try:
    import jsonschema
except ImportError:
    print('OPTIONAL jsonschema not installed: skipping schema example checks')
else:
    examples={'exploration-charter':['E1-charter','E1-blind-readonly-charter','M1-charter','S1-charter'],
        'finding':['sample-finding'],'run-manifest':['sample-run-manifest'],'evidence':['sample-evidence']}
    for schema,exs in examples.items():
        o=json.loads((ROOT/'contracts'/f'{schema}.schema.json').read_text(encoding='utf-8'))
        v=jsonschema.Draft202012Validator(o,format_checker=jsonschema.FormatChecker())
        for ex in exs:
            value=json.loads((ROOT/'contracts/examples'/f'{ex}.json').read_text(encoding='utf-8'))
            for e in v.iter_errors(value):errors.append(f'{ex}: {e.message}')
print(f'Tool drafts: {len(items)}; previous packages: 2; long drafts: 4')
if errors:
    for e in errors:print('ERROR',e,file=sys.stderr)
    sys.exit(1)
print(
    'PASS: static package integrity. This validator does not execute demos or browser tests; '
    'see docs/reviews/P2-E1-review.md for E1 results. '
    'E1/M1/S1 local synthetic demos are implemented; see P2 review docs for rule-level results and remaining limits. '
    'Comparative tool installs NOT RUN; see P2 review docs for runtime status.'
)
