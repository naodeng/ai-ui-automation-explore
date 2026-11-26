# P4 Visual Dry Run

This local-only harness replays one existing P3-A E1 seeded-fault observation through the Oracle comparison gate. It demonstrates how a candidate discrepancy is routed to human review without treating the candidate as a confirmed defect.

Run `npm run p4:dry-run`. The runner reads only the referenced local `observation.json` and `oracle.json` files. It does not read screenshot pixels, start a browser, invoke a model, or make a network request. Its result is a process-flow check, not a visual evaluation or a new P4 finding.
