import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("curriculum is complete and traceable", async () => {
  const [curriculum, sources, quizzes, assignments, glossary] = await Promise.all([
    read("../content/curriculum.json").then(JSON.parse),
    read("../content/sources.json").then(JSON.parse),
    read("../content/quizzes.json").then(JSON.parse),
    read("../content/assignments.json").then(JSON.parse),
    read("../content/glossary.json").then(JSON.parse),
  ]);

  assert.equal(curriculum.length, 24);
  assert.deepEqual(curriculum.map((week) => week.week), Array.from({ length: 24 }, (_, index) => index + 1));
  assert.equal(new Set(curriculum.map((week) => week.module)).size, 6);
  assert.ok(curriculum.every((week) => week.summary && week.summaryEn && week.sourceRefs.length >= 2));
  assert.ok(curriculum.flatMap((week) => week.sourceRefs).every((ref) => sources.some((source) => source.id === ref.sourceId)));
  assert.ok(sources.every((source) => source.libraryPath && /^[a-f0-9]{64}$/.test(source.sha256)));
  assert.equal(quizzes.length, 6);
  assert.ok(quizzes.every((quiz) => quiz.questions.length === 5));
  assert.ok(quizzes.every((quiz) => quiz.sourceIds.length >= 2 && quiz.sourceIds.every((id) => sources.some((source) => source.id === id))));
  assert.ok(quizzes.every((quiz) => quiz.questions.every((question) => question.options.length >= 2 && Number.isInteger(question.answerIndex))));
  assert.equal(assignments.length, 6);
  assert.ok(glossary.length >= 50);
});

test("private learning surfaces and persistence are wired", async () => {
  const [page, dashboard, weekPage, tutorRoute, progressRoute, quizRoute, caseRoute, migration, masteryMigration, layout] = await Promise.all([
    read("../app/page.tsx"),
    read("../app/dashboard-client.tsx"),
    read("../app/week/[week]/page.tsx"),
    read("../app/api/tutor/route.ts"),
    read("../app/api/progress/route.ts"),
    read("../app/api/quiz/route.ts"),
    read("../app/api/cases/route.ts"),
    read("../drizzle/0000_dazzling_albert_cleary.sql"),
    read("../drizzle/0001_left_skaar.sql"),
    read("../app/layout.tsx"),
  ]);

  assert.match(page, /requireChatGPTUser/);
  assert.match(weekPage, /requireChatGPTUser/);
  assert.match(dashboard, /24 tuần, 6 năng lực/);
  assert.match(dashboard, /CTN TUTOR/);
  assert.match(tutorRoute, /api\.openai\.com\/v1\/responses/);
  assert.match(tutorRoute, /OPENAI_API_KEY/);
  assert.match(progressRoute, /onConflictDoUpdate/);
  assert.match(quizRoute, /answerIndex/);
  assert.match(quizRoute, /quizAttempts/);
  assert.match(caseRoute, /caseStudies/);
  assert.match(migration, /CREATE TABLE `progress`/);
  assert.match(migration, /CREATE TABLE `case_studies`/);
  assert.match(masteryMigration, /CREATE TABLE `quiz_attempts`/);
  assert.match(masteryMigration, /case_studies_snapshot_after_revision/);
  assert.match(layout, /robots: \{ index: false, follow: false \}/);
  assert.doesNotMatch(dashboard + layout, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});
