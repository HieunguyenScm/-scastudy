# Codex × Claude collaboration workflow

This repository is developed by the user, Codex, and Claude Code. The goal is
to let both assistants contribute without overwriting work or weakening the
learning model.

## Source of truth

Before changing files, every assistant must read, in this order:

1. `AI_WORKFLOW.md` — stable collaboration rules.
2. `AI_HANDOFF.md` — current owner, scope, decisions, and next work.
3. Its own instruction file: `AGENTS.md` for Codex or `CLAUDE.md` for Claude.
4. `git status --short` and the latest commit.

Code, checked-in content, migrations, and tests are authoritative. A chat
summary is not a substitute for repository state.

## Default roles

| Area | Primary | Reviewer |
| --- | --- | --- |
| Learning outcomes, lesson accuracy, case briefs, rubrics | Claude | Codex |
| Information architecture, learner flow, UX copy | Claude | Codex |
| React, APIs, D1/Drizzle, authentication, security | Codex | Claude |
| Tests, build verification, deployment | Codex | Claude |
| Source traceability and citation review | Claude | Codex |

These are defaults, not hard restrictions. A task in `AI_HANDOFF.md` may assign
a different owner. The explicit user request always wins.

## One active writer per scope

- Only one assistant may be the active writer for a file or tightly coupled
  area at a time.
- Record the owner, branch, file scope, and acceptance criteria in
  `AI_HANDOFF.md` before editing.
- A reviewer should return findings or a patch plan. The reviewer must not edit
  files inside the active writer's scope unless the handoff explicitly transfers
  ownership.
- High-conflict files require exclusive ownership: `app/globals.css`,
  `app/layout.tsx`, `db/schema.ts`, `db/ensure.ts`, `package.json`, migrations,
  and shared curriculum JSON.
- Never discard, reset, or rewrite another assistant's uncommitted changes.

## Branch and commit convention

- Claude branches: `claude/<short-task>`.
- Codex branches: `codex/<short-task>`.
- Integration may happen on the user's current branch when the user explicitly
  asks for direct work.
- Keep commits cohesive and name the outcome, for example:
  `Improve week 5 forecasting lab rubric`.
- Do not mix unrelated cleanup with a feature handoff.

## Delivery loop

1. **Claim:** update the Active assignment in `AI_HANDOFF.md`.
2. **Inspect:** read the relevant implementation, tests, and source material.
3. **Build or review:** stay inside the claimed scope.
4. **Verify:** run the smallest relevant checks, then the full gate when the
   change is ready for integration.
5. **Handoff:** update changed files, decisions, risks, checks, and the exact
   next action in `AI_HANDOFF.md`.
6. **Integrate:** the integrator reviews the diff, resolves conflicts, runs the
   full gate, and only then commits, pushes, or deploys.

## Verification gates

Use checks proportional to the change:

- Content-only: validate JSON/data shape and source references.
- UI-only: `npm run lint`, `npm run typecheck`, and the relevant tests.
- API/schema: lint, typecheck, build/tests, migration inspection, and security
  review for authentication and answer leakage.
- Release candidate: `npm run check`.

A reviewer must not describe work as complete when checks were skipped or
failed. Record the exact gap in `AI_HANDOFF.md`.

## Product invariants

- The site is private and authentication-gated.
- Learning completion comes from evidence and demonstrated mastery, not clicks.
- The canonical sequence is lesson → lab → evidence → mentor review → retrieval
  → mastery.
- Lab answers and grading keys must not be exposed to the client.
- New learning claims must be grounded in the repository's verified sources.
- Database changes require an idempotent development schema update and a
  production migration.
- Preserve Cloudflare/vinext compatibility and `.openai/hosting.json`.

## Conflict resolution

When assistant outputs disagree:

1. Prefer the explicit user requirement.
2. Prefer tests and verified source material over prose claims.
3. Prefer the smaller reversible change.
4. Record the decision and rejected alternative in `AI_HANDOFF.md`.
5. Ask the user only when the choice materially changes product behavior or
   scope.
