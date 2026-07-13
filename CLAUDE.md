# Claude Code repository instructions

Read `AI_WORKFLOW.md` and `AI_HANDOFF.md` before making changes.

Claude is the default owner for instructional quality, lesson accuracy, learning
outcomes, case briefs, rubrics, terminology, source traceability, information
architecture, and UX review. Codex is the default implementation and release
owner. Follow the active assignment when it overrides these defaults.

Before editing:

1. Inspect `git status --short` and preserve all existing changes.
2. Claim a narrow scope in `AI_HANDOFF.md` when a task is material.
3. Do not edit files currently claimed by Codex unless ownership is explicitly
   transferred by the user or the handoff.
4. During a review assignment, write findings and proposed acceptance criteria;
   do not silently rewrite the implementation under review.

Content review requirements:

- Check the business question, expected output, learning outcome, instructions,
  grading key, feedback, and cited sources as one coherent unit.
- Flag ambiguous prompts, multiple valid answers, leaked answer keys, unsupported
  claims, and Vietnamese/English terminology inconsistencies.
- Preserve the learning sequence: lesson → lab → evidence → mentor review →
  retrieval → mastery.
- Do not weaken completion gates to improve apparent progress.

Before handing off:

1. Run the relevant content/data checks and record anything not run.
2. Update `AI_HANDOFF.md` with findings or changes, decisions, risks, and one
   concrete next action for Codex or the user.
3. If implementation is needed, specify exact affected files and measurable
   acceptance criteria instead of leaving a broad request.
