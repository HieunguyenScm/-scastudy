import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
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

  assert.ok(curriculum.every((week) => week.lesson), "every week needs authored lesson content, not just a summary");
  assert.ok(curriculum.every((week) => week.lesson.coreIdea.length >= 20));
  assert.ok(curriculum.every((week) => week.lesson.sections.length >= 2));
  assert.ok(curriculum.every((week) => week.lesson.sections.every((section) => section.heading && section.body.length >= 80)));
  assert.ok(curriculum.every((week) => week.lesson.workedExample.steps.length >= 2));
  assert.ok(curriculum.every((week) => week.lesson.selfCheck.length >= 4));
  assert.ok(curriculum.every((week) => week.lesson.selfCheck.every((item) => item.question && item.answer.length >= 20)));
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

test("learning progression requires evidence and retrieval, not clicks", async () => {
  const [mastery, learningState, retrievalRoute, mentorRoute, weekLesson, teachingNotes, migration, bosses, dashboard, lessonReader, lessonProgressRoute, uploadsRoute, submissionRoute, learning, hosting, workbookStat] = await Promise.all([
    read("../db/mastery.ts"),
    read("../db/learning-state.ts"),
    read("../app/api/retrieval/route.ts"),
    read("../app/api/mentor-review/route.ts"),
    read("../app/week/[week]/week-lesson.tsx"),
    read("../content/teaching-notes.ts"),
    read("../drizzle/0003_truthful_mastery.sql"),
    read("../content/boss-challenges.ts"),
    read("../app/dashboard-client.tsx"),
    read("../app/week/[week]/lesson-reader.tsx"),
    read("../app/api/lesson-progress/route.ts"),
    read("../app/api/uploads/route.ts"),
    read("../app/api/submissions/route.ts"),
    read("../lib/learning.ts"),
    read("../.openai/hosting.json"),
    stat(new URL("../public/assets/CTNASCM_FMCG_Learning_Pack.xlsx", import.meta.url)),
  ]);
  assert.match(mastery, /evidencePassed === true/);
  assert.match(mastery, /passedRetrievals/);
  assert.match(learningState, /submission.*status|evidencePassed/s);
  assert.match(learningState, /itemType === "transfer"/);
  assert.match(learningState, /lessonComplete && row\.practiceMask === 7/);
  assert.match(retrievalRoute, /scoreRetrievalResponse/);
  assert.match(mentorRoute, /cannot issue a pass|không cấp Passed/);
  assert.match(weekLesson, /BƯỚC 1[\s\S]*Học bài/);
  assert.match(weekLesson, /Sai lầm thường gặp/);
  assert.match(weekLesson, /NGUỒN & ĐỐI CHIẾU/);
  assert.match(teachingNotes, /24:/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS `retrieval_attempts`/);
  assert.match(bosses, /module: 6/);
  assert.match(dashboard, /Boss Challenge/);
  assert.match(lessonReader, /Học bài theo từng block/);
  assert.match(lessonProgressRoute, /recomputeLearningState/);
  assert.match(migration, /lesson_block_progress/);
  assert.match(uploadsRoute, /Private file storage|private, no-store/);
  assert.match(submissionRoute, /SUBMISSION_NOT_READY/);
  assert.match(learning, /Independent challenge/);
  assert.match(learning, /CTNASCM_FMCG_Learning_Pack\.xlsx/);
  assert.match(hosting, /"r2": "FILES"/);
  assert.ok(workbookStat.size > 100_000, "learning pack must be a substantive workbook, not a placeholder");
});
