#!/usr/bin/env python3
"""Validate this planning kit without running a browser or external services.

Uses only stdlib for structural checks; optional jsonschema/PyYAML deepen checks.
The existence of this script does not imply that P0–P7 demo implementation exists.
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED_FILES = [
    'README.md','README.en.md','AGENTS.md','AGENTS.zh-CN.md','00_START_HERE.md',
    'docs/02-端到端执行流程.md','docs/03-业务规则与真相源.md',
    'prompts/00-总控-交给Codex.md','prompts/01-P0-仓库体检.md',
    'contracts/cases/E1.yaml','contracts/cases/M1.yaml','contracts/cases/S1.yaml',
    'contracts/exploration-charter.schema.json','contracts/finding.schema.json',
    'contracts/evidence.schema.json','contracts/run-manifest.schema.json',
    'fixtures/seed-manifest.json', 'templates/Go-NoGo决策.md',
    'legacy-v1.0/README.md'
]
SCHEMA_EXAMPLES = {
    'exploration-charter': ['E1-charter','M1-charter','S1-charter'],
    'finding': ['sample-finding'], 'run-manifest': ['sample-run-manifest'],
    'evidence': ['sample-evidence']
}
errors=[]
checks=[]
for rel in REQUIRED_FILES:
    if not (ROOT / rel).is_file(): errors.append('MISSING: '+rel)
checks.append(f'required files checked: {len(REQUIRED_FILES)}')
for path in sorted(ROOT.rglob('*.json')):
    try:
        json.loads(path.read_text(encoding='utf-8'))
    except (ValueError, UnicodeError) as e:
        errors.append(f'INVALID JSON {path.relative_to(ROOT)}: {e}')
checks.append('all JSON files parse')
for path in (ROOT/'contracts').glob('*.schema.json'):
    data=json.loads(path.read_text(encoding='utf-8'))
    if data.get('$schema')!='https://json-schema.org/draft/2020-12/schema':
        errors.append(f'wrong JSON schema dialect: {path.name}')
try:
    import yaml
except ImportError:
    checks.append('PyYAML unavailable: YAML parse checks SKIPPED')
else:
    for path in (ROOT/'contracts/cases').glob('*.yaml'):
        try:
            obj=yaml.safe_load(path.read_text(encoding='utf-8'))
            if obj.get('case_id')!=path.stem: errors.append(f'case_id mismatch: {path.name}')
        except Exception as e:
            errors.append(f'INVALID YAML {path.name}: {e}')
    checks.append('three business case YAML contracts parsed')
try:
    import jsonschema
except ImportError:
    checks.append('jsonschema unavailable: schema validation SKIPPED')
else:
    for schema_name, examples in SCHEMA_EXAMPLES.items():
        schema=json.loads((ROOT/'contracts'/f'{schema_name}.schema.json').read_text())
        try: jsonschema.Draft202012Validator.check_schema(schema)
        except Exception as e: errors.append(f'BAD JSON SCHEMA {schema_name}: {e}')
        val=jsonschema.Draft202012Validator(schema, format_checker=jsonschema.FormatChecker())
        for example_name in examples:
            sample=json.loads((ROOT/'contracts/examples'/f'{example_name}.json').read_text())
            for err in val.iter_errors(sample):
                errors.append(f'example {example_name}: {err.message}')
    # Verify that a dangerous false confirmation is rejected.
    schema=json.loads((ROOT/'contracts/finding.schema.json').read_text())
    val=jsonschema.Draft202012Validator(schema, format_checker=jsonschema.FormatChecker())
    sample=json.loads((ROOT/'contracts/examples/sample-finding.json').read_text())
    sample['status']='confirmed_defect'
    if val.is_valid(sample): errors.append('UNSAFE: unreviewed finding accepted as confirmed_defect')
    schema=json.loads((ROOT/'contracts/exploration-charter.schema.json').read_text())
    val=jsonschema.Draft202012Validator(schema)
    sample=json.loads((ROOT/'contracts/examples/E1-charter.json').read_text())
    sample['budget']['max_writes']=1
    if val.is_valid(sample): errors.append('UNSAFE: unapproved write-enabled charter accepted')
    sample['budget']['max_writes']=0
    sample['allowed_origin']='https://prod.example.com'
    if val.is_valid(sample): errors.append('UNSAFE: production origin accepted in local demo charter')
    checks.append('JSON Schemas, positive examples, negative policy tests')
for check in checks: print('CHECK:',check)
for err in errors: print('ERROR:',err,file=sys.stderr)
if errors:
    print(f'FAIL: {len(errors)} errors',file=sys.stderr)
    sys.exit(1)
print('PASS: planning kit static checks only — browser/Demo runs are NOT RUN')
