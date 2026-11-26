# P4-B | Visual Experiment Review

**Status: DRY RUN ONLY; visual evaluation NOT RUN.** This report records a local mock of the candidate-to-Oracle review gate. No visual model or computer-use tool was invoked.

## Scope and evidence

- Case: synthetic E1, rule E1-R01, the 99-unit C20 threshold boundary.
- Input: the existing P3-A seeded-fault `observation.json` and the matching read-only `oracle.json` under [the P3 evidence directory](../evidence/e1/run-contexts/p3-a/e1-6af9cb0d-4777-42ae-b538-acba74461fed/).
- The canned observation reports payable 7,900 cents and discount 2,000 cents; its same-Run, same-quote Oracle reports payable 9,900 cents and discount 0 cents.
- The harness reports an Oracle mismatch and routes the candidate to human review. It always leaves `defect_confirmed` false.
- The fixture is deterministic P3 evidence, not a visual model's interpretation. The harness does not open the corresponding screenshot.

## Run record

| Item | Result |
|---|---|
| Command | `npm run --silent p4:dry-run > evidence/p4/e1-99-mock-dry-run.json` |
| Exit code | 0 (after the output redirection was corrected) |
| Runtime | Node.js 26.13.1; npm 11.20.0 |
| Model / browser / external request | NOT RUN / NOT RUN / none |
| Model cost | 0; no provider was called |
| Output | [Dry-run result JSON](../evidence/p4/e1-99-mock-dry-run.json) |

## Findings and limits

- New visual findings: none. P3 overlap rate: NOT MEASURED; this single input replays existing P3 seeded-fault evidence and is not a sample of visual-tool output.
- False-positive rate, repeated-run success rate, latency, and actual tool cost: NOT MEASURED.
- Midscene is not installed in this workspace. No version/API investigation or dependency installation was performed because no model provider and screenshot data flow have been approved.
- No page or screenshot was uploaded. This dry run created no new E1 business Run. P5 and Agent execution remain deferred until all MVP v0.1-v0.3 functionality and acceptance are complete.

## Next gate

Before a real P4 visual trial, approve a specific tool/provider and whether the two local synthetic E1 screenshots (desktop and mobile, 99-unit boundary) may be sent to that provider. Then verify the provider's current official API and data handling, pin the tool version, and run the same scenario three times with P3 Oracle review. Do not describe this dry run as visual validation or a completed P4 evaluation.
