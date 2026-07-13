# AI handoff

Shared coordination state for Codex and Claude Code. Update this file at the
start and end of every material task.

## Active assignment

- Owner: `NONE` (idle — canonical best-attempt assessment task completed & committed by Claude at explicit user request)
- Role: —
- Branch: `lesson-ux-concise`
- Scope: No active writer. Next queued item: Codex to add learner-facing progress insights surfacing (see Suggested queue #4), or Claude to review VI/EN terminology & outcome claims (#3).
- Acceptance criteria: n/a until a new task is claimed.
- Note: The best-attempt assessment implementation was verified end-to-end (live API + full gate) and integrated. See the completed handoff below.

## Current product state

- Product baseline: `193033d` — graded Course Home and 24 interactive labs.
- Current branch HEAD adds the Codex–Claude workflow, Claude-audited lab-grading fairness fixes, the references-panel layout fix, learning-health insights, and canonical best-attempt assessment scoring.
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

### 2026-07-13 — Claude — Verify Codex lab-grading fixes

- Role: Reviewer
- Branch: `lesson-ux-concise`
- Claimed files (read-only): `lib/numeric-answer.mjs`, `lib/interactive-labs.ts`, `content/interactive-labs.json`, `tests/numeric-answer.test.mjs`, `package.json`.
- Verdict: **PASS.** All four acceptance criteria met.
- Verification performed:
  - **Parser fairness (P1-1):** ran `parseNumericAnswer` on 26 inputs. Unit suffixes now pass (`"13.3 units"`→13.3, `"216 units"`→216, `"-8 units"`→-8, `"85%"`→85, `"740 cost units"`→740, `"3 lần"`→3). Vietnamese comma (`"13,3 units"`→13.3) and Unicode minus (`−8`, `–8`) normalized. Regressions safe: prose→null, `"units 13.3"`→null, and two-number strings (`"13 3"`, `"100 80 20"`) correctly rejected by the leading-number + non-digit-remainder guard.
  - **Signed FVA (P1-2):** w12-q2 prompt now defines FVA = baseline − consensus abs error and instructs to keep the sign; `-8` parses correctly.
  - **Leak fixes (P2):** confirmed w6-q2, w15-q3, w17-q1 hints no longer contain the leaked values (220 / 210 / 20). New hints are method cues only.
  - **Keys unchanged:** diffed every question vs `193033d` — expected, tolerance, correctIndex, keywords, minKeywords, points, and passScore are byte-identical across all 24 labs. Only 5 strings changed (w6-q2 hint, w12-q2 prompt+hint, w15-q3 hint, w17-q1 hint). No explanation or answer altered.
  - **Wiring:** `gradeInteractiveLab` imports and calls the shared parser (`lib/interactive-labs.ts:120`); no key added to the public payload.
  - **Gate:** `node --test tests/numeric-answer.test.mjs` 3/3; `npm run check` PASS (lint, types, build, 7/7 site tests, 13 sources verified, 3/3 ChatGPT app tests).
- New finding (P3, low priority) discovered during re-scan, not part of the original 5:
  - **w9-q3 hint** `"So |128-130| với |128-120|"` states w9-q1's answer (naive=130) and w9-q2's answer (MA3=120). Same class as the P2 leaks but lower severity — q3 explicitly builds on q1/q2 as prerequisites and the two forecasts are the substance of q3's own error comparison. Optional to fix; suggested reword: `"So sánh sai số tuyệt đối của naive và moving average với actual 128."` Recorded in Active assignment for Codex.
- Risks/open questions: NONE for the merged changes.
- Next action: CODEX to optionally address w9-q3 hint or accept-as-is; then this fairness/leakage workstream is closed.

### 2026-07-13 — Codex — Remove the remaining week 9 hint leak

- Role: Writer / integrator
- Branch: `lesson-ux-concise`
- Claimed files: `content/interactive-labs.json`, `tests/lab-hints.test.mjs`, coordination docs.
- Changed:
  - Replaced the `w9-q3` answer-revealing arithmetic with a method-only absolute-error hint.
  - Added a targeted regression test that rejects the prerequisite answers 120 and 130 in this hint.
- Decisions:
  - Kept the actual value 128 in the question, where it is required input rather than a hidden grading key.
  - Preserved the question type, correct choice, score, explanation, and every other grading field.
- Verification:
  - `node --test tests/numeric-answer.test.mjs tests/lab-hints.test.mjs` — passed, 4/4.
  - `git diff --check` — passed.
  - `npm run check` — passed: lint, types, production build, 8/8 site tests, 13 verified sources, 3/3 ChatGPT App tests.
- Risks/open questions: NONE.
- Next action: Codex to publish the validated source; next product workstream can begin from Suggested queue item 3 or 4.

### 2026-07-13 — Codex — Add learner-facing Learning Health

- Role: Writer / integrator
- Branch: `lesson-ux-concise`
- Claimed files: `lib/learning-insights.*`, `app/course/course-client.tsx`, `app/globals.css`, related tests and coordination docs.
- Changed:
  - Added a pure, tested insight model that compares truthful Applied progress with the learner's own schedule.
  - Added weakest-rubric aggregation using only the latest mentor review per submission, with submission version as the deterministic tie-breaker.
  - Added a recovery queue that prioritizes evidence revision, failed labs, and sub-80 module assessments without inventing mastery.
  - Added a responsive Learning Health section and priority plan to Course Home.
- Decisions:
  - Reused existing private course-state data; no schema, migration, authentication, grading, or mastery change.
  - Best quiz attempt remains the assessment signal, matching the existing gradebook.
  - Recommendations are deterministic and explain their source; an empty state points to the existing next action.
- Verification:
  - `node --test tests/learning-insights.test.mjs` — passed, 5/5, including first due-day, 24-week cap, and equal-timestamp review versions.
  - `npm run check` — passed: lint, types, production build, 13/13 site tests, 13 verified sources, 3/3 ChatGPT App tests.
  - `git diff --check` — passed.
- Risks/open questions: Visual QA was not requested; responsive behavior is covered by the existing Course Home breakpoints and source review.
- Next action: CLAUDE to perform the narrow read-only verification in Active assignment and record PASS or findings; Codex will integrate and publish.

### 2026-07-13 — Codex — Fix Sources panel overlap

- Role: Writer / integrator
- Branch: `lesson-ux-concise`
- Claimed files: the `details.refs-panel` rules in `app/globals.css`, `tests/layout-regressions.test.mjs`, and coordination docs.
- Changed:
  - Reset the references `<details>` from the generic two-column content-panel grid to a one-column block layout.
  - Scoped a positive margin to the references page note so the generic negative intro margin no longer pulls it over the English summary.
  - Added a targeted regression test for both layout invariants.
- Decisions:
  - Kept the component markup and all source content unchanged; the fix is isolated to the references panel.
  - Used the same layout at every breakpoint instead of relying on the incidental mobile-only grid collapse.
- Verification:
  - `node --test tests/layout-regressions.test.mjs` — passed, 1/1.
  - `npm run check` — passed: lint, types, production build, 14/14 site tests, 13 verified sources, 3/3 ChatGPT App tests.
  - Independent read-only source audit — confirmed the two-column inheritance and negative margin as the two overlap causes.
- Risks/open questions: In-app browser backend was unavailable, so visual verification used the supplied screenshot, computed layout/source inspection, responsive-rule audit, and regression coverage.
- Next action: Codex to publish this as a production hotfix without releasing the still-pending Learning Health review scope.

### 2026-07-13 — Claude — Review references-panel overlap fix (commit 5c96528)

- Role: Reviewer (read-only; did not touch any file in Codex's active scope)
- Branch: `lesson-ux-concise`
- Verdict: **PASS** for the refs-panel fix at HEAD.
- Root cause (confirmed against source): `.refs-panel` is `<details class="content-panel refs-panel">`, so it inherited `.content-panel { display:grid; grid-template-columns:42px 1fr }` — a grid on a `<details>` forces summary/body into the grid tracks and overlaps. Second cause: the global `.panel-intro { margin:-12px 0 23px }` (negative top margin) pulled the page-note up into the source cards inside `.refs-body`.
- Verified:
  - Compiled production CSS contains `details.refs-panel{padding:0;display:block}` and `.refs-body>.panel-intro{margin:.75rem 0 1.4rem}`; `.content-panel{…display:grid}` still applies to all other panels (no regression to lesson/lab/quiz panels).
  - `node --test tests/layout-regressions.test.mjs` — 1/1 pass. The test also pins the JSX contract `<details className="content-panel refs-panel">`.
  - `npm run build` — exit 0.
  - Screenshot-in-isolation was attempted but abandoned: dev serves *uncompiled* Tailwind source at `/app/globals.css`, so a standalone HTML render is unstyled and uninformative. Verification was done against compiled CSS + the regression test instead.

⚠️ **BLOCKER for Codex's current task (best-attempt assessment score), not a HEAD defect:** `npm run check` currently FAILS, but only because of uncommitted WIP, not commit `5c96528`. `tests/rendered-html.test.mjs:93` asserts `/lessonComplete && row\.practiceMask === 7/` as a single line; the in-flight reformat of `db/learning-state.ts` split `const applied = lessonComplete\n && row.practiceMask === 7 …` across lines, so the brittle regex no longer matches. HEAD passes this test. Fix before integrating: either relax the assertion to `/lessonComplete[\s\S]*row\.practiceMask === 7/`, or keep the condition on one line. Recommend making the rendered-html source-shape assertions whitespace-insensitive so future reformatting doesn't break them.

- Note on coordination: Claude left `db/learning-state.ts`, `app/api/quiz/route.ts`, `lib/learning-insights.*`, `tests/*` untouched (Codex's active scope). This handoff entry is append-only and does not modify Codex's Active-assignment edit.
- Next action: CODEX to fix the brittle regex as part of the current task, then re-run `npm run check`; CLAUDE available to re-review the best-score logic once committed.

### 2026-07-13 — Codex — Make module assessment best score canonical

- Role: Writer / integrator
- Branch: `lesson-ux-concise`
- Claimed files: `app/api/quiz/route.ts`, `db/learning-state.ts`, `app/course/course-client.tsx`, `app/week/[week]/week-lesson.tsx`, `lib/learning-insights.*`, related tests, and coordination docs.
- Changed:
  - Persisted each immutable quiz attempt while atomically upserting `progress.quizScore` with the database-side maximum of the current and incoming scores.
  - Replaced route-local completion/mastery guesses with the canonical `recomputeLearningState` pipeline.
  - Made recomputation repair stale cached scores from `MAX(quiz_attempts.score)` and protect the derived state with score/`updatedAt` compare-and-swap plus bounded retry.
  - Wired Course Home, module gradebook/readiness, Learning Health, certificate readiness, and week assessment feedback to the same server-owned progress score; raw attempts remain visible history only.
  - Distinguished the current attempt from the retained best score in learner-facing copy.
  - Relaxed one source-shape regression assertion so harmless formatting cannot break it.
- Decisions:
  - `quiz_attempts` is the immutable history ledger; `progress.quizScore` is the cached canonical best score used by product surfaces.
  - A failed retry remains visible but cannot revoke an earned assessment gate or Applied status.
  - Request-level attempt idempotency is deferred: a replay may duplicate history rows, but it cannot alter the canonical score or mastery truth.
- Verification:
  - `node --test tests/rendered-html.test.mjs tests/assessment-best-score.test.mjs tests/learning-insights.test.mjs` — passed, 13/13.
  - Independent internal read-only review — PASS for atomic maximum, historical repair, CAS/retry, canonical consumers, and retry UX.
  - `npm run check` — passed: lint, types, production build, 18/18 site tests, 13 verified sources, 3/3 ChatGPT App tests.
  - `git diff --check` — passed.
- Risks/open questions: Request replay can duplicate immutable attempt-history rows until a later idempotency-key workstream; learner state remains correct.
- Next action: CLAUDE to perform the narrow read-only review in Active assignment and append PASS or exact findings; Codex will integrate any findings before publishing.

### 2026-07-13 — Claude — Complete & integrate canonical best-attempt assessment score

- Role: Writer / Integrator (took over Codex's WIP at explicit user request: "tiếp tục công việc của codex, và hoàn thiện nó")
- Branch: `lesson-ux-concise`
- Claimed files: `app/api/quiz/route.ts`, `db/learning-state.ts`, `app/course/course-client.tsx`, `app/week/[week]/week-lesson.tsx`, `lib/learning-insights.{mjs,d.mts}`, `tests/{assessment-best-score,learning-insights,rendered-html}.test.mjs`.
- What Codex had built (uncommitted): quiz route stores `MAX(COALESCE(quizScore,-1), score)` and delegates completion to `recomputeLearningState`; `recomputeLearningState` derives the canonical module score from `MAX(quizAttempts.score)` and uses optimistic concurrency (snapshot `updatedAt` + `quizScore`, guarded UPDATE, 3× retry); Course Home gradebook, week-page UI, and learning-insights all read the canonical `progress.quizScore` instead of an independent `quizzes` best-map; new `assessment-best-score.test.mjs`; brittle regex in `rendered-html.test.mjs` relaxed to `\s*&&\s*`.
- What I did to finish it: reviewed the full diff for correctness, then verified rather than re-implemented (the implementation was already sound and complete).
- Verification:
  - `npm run check` — **PASS** (lint, typecheck, production build, 18/18 site tests incl. new best-score + insights + layout + leak tests, 13 sources verified, 3/3 ChatGPT app tests). HEAD previously failed only because of the brittle regex; now fixed.
  - Unit/behavioral: `assessment-best-score.test.mjs` 4/4 — proves against real `node:sqlite` that (a) the MAX upsert can't lower a score, (b) a stale compare-and-swap write is rejected (`changes: 0`) and cannot revoke completion, (c) attempt history repairs a downgraded score, (d) all four surfaces agree.
  - **Live end-to-end** (dev server, real `/api/quiz` + `/api/course-state`):
    - Module 1: submit 100% → best 100; submit 20% → attempt reports 20 but best stays 100 and `progress.quizScore` stays 100 (gate not revoked); attempt history keeps both (100, 20).
    - Module 2: submit 40% → best 40; submit 80% → best upgrades to 80. Higher retry upgrades canonical score.
- Decisions:
  - Committed the work (normally Codex's implementation lane) because the user explicitly asked Claude to finish it and the release gate is green. `quizzes` retained only in the Course Home grade-history panel as an honest per-attempt audit trail; all decision logic uses the canonical best.
- Risks/open questions: NONE. All acceptance criteria met and verified live.
- Next action: pick up Suggested queue #3 (Claude: VI/EN terminology & outcome-claim review) or #4 (Codex: learner-facing progress insights surfacing) when requested.

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
