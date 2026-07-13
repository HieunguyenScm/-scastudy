# AI handoff

Shared coordination state for Codex and Claude Code. Update this file at the
start and end of every material task.

## Active assignment

- Owner: `CLAUDE`
- Role: `REVIEWER`
- Branch: `lesson-ux-concise`
- Scope: Read-only verification of `lib/numeric-answer.mjs`, `tests/numeric-answer.test.mjs`, and changed prompts/hints in `content/interactive-labs.json`; no product edits.
- Acceptance criteria: Confirm unit-suffixed/signed numeric answers are fairly parsed, w12 requires signed FVA, weeks 6/15/17 no longer leak cross-question answers, and grading keys remain unchanged.
- Reviewer: `CODEX` will integrate after Claude records PASS or actionable findings.

## Current product state

- Product baseline: `193033d` — graded Course Home and 24 interactive labs.
- Current branch HEAD adds the Codex–Claude workflow and Claude-audited lab-grading fairness fixes.
- Production: private Sites deployment is live.
- Learning path: lesson → lab → evidence → mentor review → retrieval → mastery.
- Quality gate: `npm run check` passes on the current branch HEAD.
- Collaboration bootstrap: `AI_WORKFLOW.md`, `AGENTS.md`, and `CLAUDE.md` define
  shared rules and default roles.

## Recent decisions

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-07-13 | Use one active writer per file scope. | Prevent Codex and Claude from overwriting shared work. |
| 2026-07-13 | Claude leads learning-content review; Codex leads implementation and release. | Matches their default responsibilities while keeping cross-review. |
| 2026-07-13 | `npm run check` is the release gate. | It covers lint, types, production build, content/source checks, and ChatGPT App tests. |

## Suggested queue

1. Claude: audit the 24 interactive labs for instructional clarity, ambiguity,
   and alignment between business question, expected output, and grading key.
2. Codex: implement approved audit findings without exposing answer keys.
3. Claude: review the learner-facing Vietnamese/English terminology and course
   outcome claims.
4. Codex: add learning analytics and learner-facing progress insights after the
   content audit is stable.

## Completed handoffs

### 2026-07-13 — Codex — Collaboration bootstrap

- Added shared workflow, assistant-specific instructions, ownership rules, and
  this handoff ledger.
- Did not change product behavior.
- Next recommended owner: Claude for the 24-lab instructional audit.

### 2026-07-13 — Claude — 24 interactive-lab instructional audit

- Role: Reviewer
- Branch: `lesson-ux-concise`
- Claimed files: `content/interactive-labs.json` (read-only), `lib/interactive-labs.ts` (read-only, for grading behavior)
- Goal: Audit all 24 labs for ambiguity, business-question↔expected-output↔grading-key alignment, grading fairness, answer leakage, and VI/EN terminology.
- Verification:
  - Recomputed all 40 numeric grading keys in a script — `40/40 correct` (w3 EOQ 692.82→693 within tol 2; w24 79.75→79.8 within tol 0.1; all others exact).
  - Reproduced `parseNumericAnswer` on edge inputs to confirm fairness gaps below.
  - Ran the site end-to-end earlier (pages 200, `/api/labs` GET/POST grade+persist, `npm run check` green at `193033d`).

**Findings, prioritized (for CODEX to implement; keys stay server-side):**

P1 — Grading fairness (learners lose correct answers):
1. **Unit-suffixed numeric answers are marked wrong.** `parseNumericAnswer` does `Number(normalized)`, so `"13.3 units"`, `"216 units"`, `"-8 units"` → `null` → wrong. Every number question renders a `unit` chip and the prompts name units, so this is a natural learner input. Combined with `tolerance:0` on ~30 questions it fails genuinely-correct work. Fix: strip a trailing unit / non-numeric suffix before `Number(...)` (e.g. regex-extract the leading signed decimal), still in `lib/interactive-labs.ts`.
2. **Signed-answer ambiguity, w12-q2 (FVA of SKU B, expected `-8`, tol 0).** Prompt "FVA của SKU B?" doesn't cue that sign matters or that FVA can be negative; a learner typing `8` (magnitude) is wrong. Also Unicode minus `−8` fails to parse. Fix: clarify the prompt to require signed FVA (define FVA = baseline − consensus, negative = override hurt), and/or normalize the minus glyph.

P2 — Answer leakage across questions (violates "grading keys must not be exposed"):
3. **w17-q1 hint fully reveals w17-q2.** q1 hint = `"B→South 100; A→North 80; A→South 20."` — the last term IS q2's answer (Flow A→South = 20). Move the optimal allocation out of the hint; give a method cue only.
4. **w15-q3 hint leaks w15-q2's key intermediate.** q3 hint `"So 204 với raw requirement 210"` reveals raw requirement = 210, the crux of q2 (round-up → 216). Reword q3 hint to reason about pack-rounding conceptually.
5. **w6-q2 hint states `"Hà Nội đạt 220."`** — hands the region comparison and, with q1 (HCM=230), the whole lab. Convert to a method cue ("cộng sales từng region rồi so sánh").

P3 — Ambiguity / minor:
6. **w2-q2 "gấp bao nhiêu lần"** — expected `3` is the ratio (range 60/20). Wording is fine but tol 0 on a division invites rounding disputes; consider tol 0.1.
7. **w19-q2 wait-time reduction 55.6%** and **w10 MAE/WAPE** — decimals with tol 0.2–0.3 are fair, but the unit-suffix bug (P1-1) is what will actually bite here.
8. Terminology is consistent and correct throughout (VI narrative + EN technical terms: EOQ, ROP, WAPE, MAE, FVA, OTIF, cost-to-serve, reinforcing loop). No changes needed.

**Net:** Content and math are solid (0 wrong keys). The material risks are the **unit-suffix parser bug (P1-1)** and the **cross-question hint leaks (P2 #3–5)**. P1-1 is a `lib/interactive-labs.ts` fix owned by Codex; the leak fixes are edits to hint strings in `content/interactive-labs.json`.

- Risks/open questions: P1-1 touches grading logic (Codex-owned per role table) — needs a unit test for unit-suffixed and signed inputs before merge.
- Next action: CODEX to implement P1-1 (parser) + P2 (#3–5 hint rewrites), add grading unit tests, then hand back to Claude to re-verify keys and leakage.

### 2026-07-13 — Codex — Implement Claude lab-audit findings

- Role: Writer / integrator
- Branch: `lesson-ux-concise`
- Claimed files: `lib/interactive-labs.ts`, `lib/numeric-answer.mjs`, `lib/numeric-answer.d.mts`, `content/interactive-labs.json`, `tests/numeric-answer.test.mjs`, `package.json`, coordination docs.
- Changed:
  - Extracted a reusable numeric parser that accepts decimal commas, natural unit suffixes, percentages, and Unicode minus glyphs while still requiring a leading number.
  - Clarified week 12 signed FVA wording and replaced answer-revealing hints in weeks 6, 15, and 17 with method cues.
  - Added behavioral tests and included all root `*.test.mjs` files in the test command.
- Decisions:
  - Preserved every expected value, tolerance, correct choice, and pass score; only fairness and hint wording changed.
  - Kept grading logic server-side and did not add any key to the public lab payload.
- Verification:
  - `node --test tests/numeric-answer.test.mjs` — passed, 3/3.
  - Grading-key comparison against `HEAD` — passed; expected values, tolerances, choices, keyword rules, points, and pass scores are unchanged.
  - `npm run check` — passed: lint, types, production build, 7/7 site tests, 13 verified sources, 3/3 ChatGPT App tests.
- Risks/open questions: Claude re-review is pending; no known implementation risk.
- Next action: CLAUDE to perform the narrow read-only verification in Active assignment and record PASS or exact remaining findings.

## Task handoff template

Copy this block into a new section when work begins:

```md
### YYYY-MM-DD — <owner> — <task>

- Role: Writer | Reviewer | Integrator
- Branch: <branch>
- Claimed files: <exact paths or narrow globs>
- Goal: <one outcome>
- Acceptance criteria:
  - <measurable condition>
- Changed:
  - <file and reason>
- Decisions:
  - <decision and tradeoff>
- Verification:
  - `<command>` — passed | failed | not run
- Risks/open questions:
  - <specific risk or NONE>
- Next action: <one concrete action for the next owner>
```
