# Clarity verification baseline — 2026-11-16

Scope: GitHub `hilt21/Clarity` v0.2.0, source retrieved from `main` commit `4a7f9d2daac6de0bc718659033874a160e2084b4`. This review does **not** connect to a real account or judgment model.

## Verified results

- Six pre-defined propositions exist: problem specificity, goal outcome, evidence provenance, constraints, acceptance testability, and disclosed uncertainty.
- A direct execution of `workflow-core.js` in an isolated JavaScript runtime passed 25 targeted API/threshold checks. The separate repository `tests/test_workflow.js` contains 19 checks.
- 300 deterministic randomized event sequences (30 events each) produced 20,776 passing assertions for event acceptance, immutability, restored-state validity, challenge/review prerequisites and explicit unknown behavior.
- 18 rule-only fixtures (six fields × non-empty, explicit unknown, empty input) all matched expected `REVIEW_REQUIRED` / `UNKNOWN`; zero semantic YES/NO claims and zero model calls.
- For `decideProbability`, the boundaries `p <= 0.35`, `0.35 < p < 0.65`, and `p >= 0.65` correctly map to `NO`, `UNKNOWN`, and `YES`, respectively. Thresholds have **not** been calibrated on a labeled dataset.
- The page's CSP blocks external requests (`connect-src 'none'`). No real user identity, external model credential or API integration was observed in the inspected source.

## P0 found: script loader blocked by CSP

The original `index.html` included `<script src="./workflow-core.js"></script>`, while its CSP was `script-src 'unsafe-inline'` (without `'self'`). Modern browsers block that external script, leaving `ClarityFlow` undefined. The existing browser smoke test injects the core as an inline script, thus **bypassing the exact browser loading path** that fails.

Fix proposed here: `script-src 'self' 'unsafe-inline'`; add a static contract test and run it in CI. Browser tests using injected source alone **do not** establish that static-server or file navigation works. Retest the actual served app in a normal browser before deployment acceptance.

## P1: heuristic score can be a false positive

The current `assess()` function uses length and keyword checks (such as `必须` and `测试`) plus two predefined fixture choices. In a controlled check, repeating the meaningless phrase `胡言乱语` seven times in multiple fields and adding the keywords generated a **10/10** score. The UI labels it as a structural heuristic; it must **not** be interpreted as a valid semantic quality assessment.

Proposed action: rename it clearly as `结构完整度` or replace the global score with a check-list until the semantic criteria are independently validated. Never use this heuristic to auto-approve work.

## P1: propositions are not fully atomic

Some existing yes/no questions combine multiple tests (e.g. user + scenario + observable gap, or target outcome + absence of an implementation prescription). A single `P(yes)` does not identify which subcondition failed.

Proposed action: split into single-criterion judgments, keep the parent dimension for UI grouping, and define a deterministic aggregation policy (e.g. mandatory criteria = AND, UNKNOWN blocks automated pass).

## Missing verification

1. **Semantic performance**: no judge is connected. No sensitivity, specificity, calibration, false-positive, false-negative, or abstention rate can be measured yet. Labeled Chinese examples across domains and adverse boundary conditions are required.
2. **Actual browser load**: the previous smoke test inline-injects the dependency. Static browser launch and mobile interaction still need real-origin validation with the fixed CSP.
3. **CI completion**: verify GitHub Actions status on the PR; the connected GitHub API available in this chat did not provide a positive completed job result.
4. **Security**: current `'unsafe-inline'` policy is not the long-term security target. A future refactor can use nonce/hash or external-only scripts. Do not enable `connect-src` until an explicit account/data permission design is approved.

## Next verification gate

- Pass actual-browser launch, fixed workflow regression tests and static contract tests.
- Keep real account/model access disabled.
- Create a manually labeled evaluation set with accepted YES, NO, and UNKNOWN examples for each *atomic* criterion. Track false positive and abstention rates per criterion and domain. Do not treat 0.65/0.35 as calibrated thresholds.
- Promote a judgment provider only after the model's output format, error handling, abstention, privacy and budget constraints pass testing.
