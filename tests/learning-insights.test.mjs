import assert from "node:assert/strict";
import test from "node:test";
import { buildLearningInsights } from "../lib/learning-insights.mjs";

test("learning insights compare truthful Applied progress with the learner schedule", () => {
  const insight = buildLearningInsights({
    settings: { startDate: "2026-01-01", weeklyHours: 6 },
    progress: [{ completed: true }, { completed: true }],
    now: "2026-01-21T12:00:00Z",
  });

  assert.equal(insight.expectedApplied, 3);
  assert.equal(insight.applied, 2);
  assert.equal(insight.pace.status, "watch");
  assert.equal(insight.pace.gap, -1);
  assert.deepEqual(insight.workload, { remainingWeeks: 22, weeklyHours: 6, estimatedHours: 132 });
});

test("learning pace follows due-day boundaries and caps at 24 weeks", () => {
  const beforeFirstDue = buildLearningInsights({ settings: { startDate: "2026-01-01" }, now: "2026-01-06T23:59:59Z" });
  const firstDueDay = buildLearningInsights({ settings: { startDate: "2026-01-01" }, now: "2026-01-07T00:00:00Z" });
  const afterCourse = buildLearningInsights({ settings: { startDate: "2026-01-01" }, now: "2028-01-01T00:00:00Z" });

  assert.equal(beforeFirstDue.expectedApplied, 0);
  assert.equal(firstDueDay.expectedApplied, 1);
  assert.equal(afterCourse.expectedApplied, 24);
});

test("learning insights prioritize recovery without inventing mastery", () => {
  const insight = buildLearningInsights({
    settings: { startDate: "2026-01-01", weeklyHours: 5 },
    submissions: [{ week: 4, status: "needs-revision" }],
    labs: [{ week: 3, score: 60, passed: false, attemptCount: 2 }],
    quizzes: [
      { module: 1, score: 60 },
      { module: 1, score: 75 },
      { module: 2, score: 90 },
    ],
    now: "2026-01-02T00:00:00Z",
  });

  assert.deepEqual(insight.attention, { needsRevision: 1, failedLabs: 1, lowAssessments: 1, total: 3 });
  assert.deepEqual(insight.priorityActions.map((action) => action.kind), ["revision", "lab", "assessment"]);
  assert.equal(insight.priorityActions[2].href, "/week/4#buoc-4");
});

test("learning insights use only the latest mentor review for each submission", () => {
  const insight = buildLearningInsights({
    settings: { startDate: "2026-08-01" },
    reviews: [
      { submissionId: 7, version: 1, createdAt: "2026-01-01T00:00:00Z", scores: { logic: 20, evidence: 90 } },
      { submissionId: 7, version: 2, createdAt: "2026-01-02T00:00:00Z", scores: { logic: 80, evidence: 70 } },
      { submissionId: 8, version: 1, createdAt: "2026-01-03T00:00:00Z", scores: { logic: 80, evidence: 50 } },
    ],
    now: "2026-07-13T00:00:00Z",
  });

  assert.equal(insight.pace.status, "scheduled");
  assert.deepEqual(insight.weakestRubric, { key: "evidence", label: "Evidence", score: 60, samples: 2 });
});

test("a higher submission version wins when reviews share the same timestamp", () => {
  const insight = buildLearningInsights({
    settings: { startDate: "2026-01-01" },
    reviews: [
      { submissionId: 9, version: 1, createdAt: "2026-01-03T12:00:00Z", scores: { logic: 30, evidence: 90 } },
      { submissionId: 9, version: 2, createdAt: "2026-01-03T12:00:00Z", scores: { logic: 90, evidence: 60 } },
    ],
    now: "2026-01-03T12:00:00Z",
  });

  assert.deepEqual(insight.weakestRubric, { key: "evidence", label: "Evidence", score: 60, samples: 1 });
});
