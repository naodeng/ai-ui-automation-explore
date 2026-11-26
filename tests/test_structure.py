"""Static package tests; NOT UI end-to-end tests."""
import json
import unittest
from pathlib import Path
R=Path(__file__).resolve().parents[1]
class TestStructure(unittest.TestCase):
    def test_three_case_contracts(self):
        for case in ('E1','M1','S1'):
            with self.subTest(case=case):
                self.assertTrue((R/'contracts/cases'/f'{case}.yaml').is_file())
    def test_all_24_tool_drafts(self):
        a=json.loads((R/'data/tool-catalog.json').read_text(encoding='utf-8'))
        self.assertEqual(len(a),24)
        for x in a:
            with self.subTest(tool=x['slug']):
                p=R/'content/blog/drafts/tools'/Path(x['article']).name
                self.assertTrue(p.is_file())
                self.assertIn(x['status'], {'outline','draft'})
                self.assertIn(f'status: "{x["status"]}"',p.read_text(encoding='utf-8'))
    def test_preserved_history(self):
        self.assertTrue((R/'archive/codex-kit-v2.0/AGENTS.md').is_file())
        self.assertTrue((R/'archive/tool-blog-series-v1.0/AGENTS.md').is_file())
if __name__=='__main__':unittest.main()
