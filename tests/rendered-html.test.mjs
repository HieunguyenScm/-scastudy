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
  assert.equal(quizzes.length, 6);
  assert.ok(quizzes.every((quiz) => quiz.questions.length === 5));
  assert.equal(assignments.length, 6);
  assert.ok(glossary.length >= 50);
});

test("private learning surfaces and persistence are wired", async () => {
  const [page, dashboard, weekPage, tutorRoute, progressRoute, caseRoute, migration, layout] = await Promise.all([
    read("../app/page.tsx"),
    read("../app/dashboard-client.tsx"),
    read("../app/week/[week]/page.tsx"),
    read("../app/api/tutor/route.ts"),
    read("../app/api/progress/route.ts"),
    read("../app/api/cases/route.ts"),
    read("../drizzle/0000_dazzling_albert_cleary.sql"),
    read("../app/layout.tsx"),
  ]);

  assert.match(page, /requireChatGPTUser/);
  assert.match(weekPage, /requireChatGPTUser/);
  assert.match(dashboard, /24 tuần, 6 năng lực/);
  assert.match(dashboard, /CTN TUTOR/);
  assert.match(tutorRoute, /api\.openai\.com\/v1\/responses/);
  assert.match(tutorRoute, /OPENAI_API_KEY/);
  assert.match(progressRoute, /onConflictDoUpdate/);
  assert.match(caseRoute, /caseStudies/);
  assert.match(migration, /CREATE TABLE `progress`/);
  assert.match(migration, /CREATE TABLE `case_studies`/);
  assert.match(layout, /robots: \{ index: false, follow: false \}/);
  assert.doesNotMatch(dashboard + layout, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});
