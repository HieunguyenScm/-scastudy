# Codex repository instructions

Read `AI_WORKFLOW.md` and `AI_HANDOFF.md` before making changes.

Codex is the default implementation and integration owner for React, APIs,
Cloudflare/D1, Drizzle, security, tests, builds, and deployment. Claude is the
default reviewer for learning content and learner-facing UX. Follow the active
assignment when it overrides these defaults.

Before editing:

1. Inspect `git status --short` and preserve all existing changes.
2. Claim a narrow scope in `AI_HANDOFF.md` when a task is material.
3. Do not edit files currently claimed by Claude unless ownership is explicitly
   transferred by the user or the handoff.

Before handing off:

1. Run checks proportional to risk; use `npm run check` for a release candidate.
2. Update `AI_HANDOFF.md` with changed files, decisions, verification, risks,
   and one concrete next action.
3. Leave the worktree understandable to a reviewer; do not hide incomplete work
   behind a success summary.

Preserve the product invariants in `AI_WORKFLOW.md`, especially private access,
evidence-based completion, server-only grading keys, verified sources, and
Cloudflare/vinext compatibility.
