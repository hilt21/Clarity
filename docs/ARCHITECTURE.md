# Clarity · deterministic-first architecture

## Product contract

Clarity trains a person to turn an ambiguous request into a verifiable requirement. It is a single-page app with **one question per turn**. Preserve the user's authorship. Never fabricate answers, evidence, acceptance thresholds, or success.

**Workflow owns the process; judges only classify atomic questions.**

```text
setup ── START ──> interview[0..6] ── ANSWER*7 ──> challenge ── FINISH ──> review
                      ↑                                 │
                      └───────────── REVISE ────────────┘
                                             [two choices required]
```

`workflow-core.js` exports a pure `transition(state,event)` reducer. The UI must send events; UI code must not bypass lifecycle guards. It also exports `restore` to validate local progress, `canReview` to guard completion, and `rulePrecheck` to conservatively classify missing/unknown content. There is **no AI or external request** in v0.2.

### State and deterministic transitions

- `setup`: choose simulated case or supply a personal request; `START` requires nonempty input.
- `interview`: seven fixed questions in order; `ANSWER`, `BACK`, `MARK_UNKNOWN`. Unknown is legitimate, remains explicitly visible and is not silently completed.
- `challenge`: counterexample and Teach-Back choices. `CHOOSE` accepts only approved fields and option indices. `FINISH` is blocked until both choices exist.
- `review`: shows the seven user-written fields, rule-based *heuristic* feedback and a Markdown export. Nothing is submitted remotely.
- `REVISE` invalidates challenge answers; `RESTART` resets the working state.

The UI's current 0–10 score uses text-length/keyword heuristics and fixture-choice checks. **This is only structure coaching, not a semantic correctness verdict**. Do not use it to auto-approve consequential requirements.

## Future binary judgment adapter (not connected)

An adapter takes a single authored proposition and strictly limited context, then emits a probability. The app controls all follow-up actions and the next fixed question.

```ts
interface Proposition {
  id: string;
  question: string;  // a single yes/no criterion
  evidence: string;  // user's answer, not invented facts
}
interface JudgeOutput {
  pYes: number;      // finite number, 0..1
}
type Decision = "YES" | "NO" | "UNKNOWN";
```

Sample atomic propositions are produced deterministically by `propositions(session)`: specificity of the problem, outcome orientation, factual grounding, boundary clarity, testability, and visible unknowns.

`decideProbability(pYes, {yes:0.65,no:0.35})` maps `pYes >= 0.65` to YES, `pYes <= 0.35` to NO, and the region between to UNKNOWN. These thresholds are an **illustrative policy**, not calibrated performance claims. In production, tune them on labeled Chinese training examples, stratified by domain and failure severity. Never convert an absent judge response into YES.

Optional backend interface (not implemented): `POST /api/judge` accepts at most `{session_id, proposition_id, evidence, question}`, replies with `{proposition_id,pYes,model_version}`, and never returns generated prose. Do not expose provider keys in the browser. User chooses which text may leave their device.

### What should remain deterministic

- Question order, state transitions, form validation, allowed answer formats, output schema, scoring aggregation, export and unknown handling.
- Audit trace of transitions (without automatically collecting sensitive free text).
- Simulated regression fixtures and policy thresholds.
- Permissions, retry/failure behavior and whether to escalate to a human.

### When judgment is legitimately needed

A binary model such as TypeSafe Jev may decide **one given proposition** about the user's free text. It does not automatically discover missing propositions, correct stale inputs or verify facts against authoritative evidence. Identifying hidden assumptions in arbitrary requirements may need manual questioning, evidence retrieval, or carefully bounded generation. A fixed question sequence keeps v0.2 entirely model-free.

For safety, unsupported semantic assertions remain `REVIEW_REQUIRED` or `UNKNOWN`. A high `P(yes)` is not independent proof of correctness.

## Permissions before any real account connection

| Capability | Minimum permission | v0.2 |
|---|---|---|
| Offline training and mock cases | none | enabled |
| Persistence on same browser | localStorage, best effort; clear button | enabled |
| External judgment | explicitly selected evidence text, a backend provider credential scoped to inference only, rate limits and budget | disabled |
| Account login | OIDC openid and user id; email only if needed | disabled |
| Cross-device records | per-user CRUD, deletion and retention policy | disabled |
| GitHub/Drive import | selected-file read only, only if feature added | disabled |
| External account write access | per-action confirmation and separate narrow grant | disabled |

Clarity should never request email, cloud drive, GitHub or calendar permissions as a prerequisite for its core training loop. The public repo must not contain private real-world engineering examples, account tokens, session transcripts or API keys.

## Verification and regression

- `node tests/test_workflow.js` checks state invariants and YES/NO/UNKNOWN mapping.
- `python3 tests/browser_smoke.py` checks browser flows using Playwright and a local Chromium binary if available.
- Existing local integration tests additionally exercised 40 browser assertions with three simulations and custom input.
- Model calls = 0; mandatory external API calls = 0.

## Research basis

- Design Council, Double Diamond: https://www.designcouncil.org.uk/resources/the-double-diamond/
- Right Question Institute, QFT: https://rightquestion.org/what-is-the-qft/
- INCOSE, Guide to Writing Requirements: https://www.incose.org/
- AHRQ, Teach-Back: https://www.ahrq.gov/teamstepps-program/curriculum/communication/tools/teachback.html
- DeepEval, Jev typed decisions: https://deepeval.com/blog/introducing-jev-in-deepeval
- Jev limitations, empirical paper: https://arxiv.org/abs/2610.24929
