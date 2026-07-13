import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("the atomic SQLite upsert cannot replace a higher score with a lower retry", () => {
  const database = new DatabaseSync(":memory:");
  database.exec("CREATE TABLE progress (user_email TEXT, week INTEGER, quiz_score INTEGER, completed INTEGER DEFAULT 0, mastery_status TEXT DEFAULT 'in-progress', updated_at TEXT, PRIMARY KEY (user_email, week))");
  const saveScore = database.prepare(`
    INSERT INTO progress (user_email, week, quiz_score, updated_at)
    VALUES ('learner@example.com', 4, ?, ?)
    ON CONFLICT (user_email, week) DO UPDATE SET
      quiz_score = MAX(COALESCE(progress.quiz_score, -1), excluded.quiz_score),
      updated_at = excluded.updated_at
  `);
  const readScore = database.prepare("SELECT quiz_score FROM progress WHERE user_email = 'learner@example.com' AND week = 4");

  saveScore.run(100, "2026-01-01T00:00:00.000Z");
  saveScore.run(60, "2026-01-01T00:00:01.000Z");
  assert.equal(readScore.get().quiz_score, 100);

  database.exec("DELETE FROM progress");
  saveScore.run(60, "2026-01-01T00:00:00.000Z");
  saveScore.run(100, "2026-01-01T00:00:01.000Z");
  assert.equal(readScore.get().quiz_score, 100);
  database.close();
});

test("a stale lower-score recomputation loses compare-and-swap and cannot revoke completion", () => {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE progress (
      user_email TEXT,
      week INTEGER,
      quiz_score INTEGER,
      completed INTEGER,
      mastery_status TEXT,
      updated_at TEXT,
      PRIMARY KEY (user_email, week)
    );
    INSERT INTO progress VALUES ('learner@example.com', 4, 60, 0, 'in-progress', 'snapshot-60');
  `);
  const staleSnapshot = database.prepare("SELECT * FROM progress").get();

  database.prepare("UPDATE progress SET quiz_score = 100, completed = 1, mastery_status = 'completed', updated_at = 'fresh-100'").run();
  const staleWrite = database.prepare(`
    UPDATE progress
    SET quiz_score = 60, completed = 0, mastery_status = 'in-progress', updated_at = 'stale-write'
    WHERE user_email = 'learner@example.com'
      AND week = 4
      AND updated_at = ?
      AND quiz_score = ?
  `).run(staleSnapshot.updated_at, staleSnapshot.quiz_score);

  assert.equal(staleWrite.changes, 0);
  assert.deepEqual(
    { ...database.prepare("SELECT quiz_score, completed, mastery_status FROM progress").get() },
    { quiz_score: 100, completed: 1, mastery_status: "completed" },
  );
  database.close();
});

test("attempt history repairs a historically downgraded progress score", () => {
  const database = new DatabaseSync(":memory:");
  database.exec(`
    CREATE TABLE progress (user_email TEXT, week INTEGER, quiz_score INTEGER, updated_at TEXT, PRIMARY KEY (user_email, week));
    CREATE TABLE quiz_attempts (user_email TEXT, module INTEGER, score INTEGER);
    INSERT INTO progress VALUES ('learner@example.com', 4, 60, 'corrupt-60');
    INSERT INTO quiz_attempts VALUES ('learner@example.com', 1, 100), ('learner@example.com', 1, 60);
  `);
  const bestScore = database.prepare("SELECT MAX(score) AS score FROM quiz_attempts WHERE user_email = 'learner@example.com' AND module = 1").get().score;
  database.prepare("UPDATE progress SET quiz_score = ?, updated_at = 'repaired' WHERE user_email = 'learner@example.com' AND week = 4 AND updated_at = 'corrupt-60' AND quiz_score = 60").run(bestScore);

  assert.equal(database.prepare("SELECT quiz_score FROM progress").get().quiz_score, 100);
  database.close();
});

test("assessment retries preserve one canonical best score across server and learner UI", async () => {
  const [quizRoute, learningState, weekLesson, courseHome] = await Promise.all([
    read("../app/api/quiz/route.ts"),
    read("../db/learning-state.ts"),
    read("../app/week/[week]/week-lesson.tsx"),
    read("../app/course/course-client.tsx"),
  ]);

  assert.match(quizRoute, /MAX\(COALESCE\([^)]*quizScore[^)]*\),\s*\$\{score\}\)/);
  assert.match(quizRoute, /recomputeLearningState\(db, user\.email, moduleEndWeek\)/);
  assert.match(quizRoute, /bestScore/);
  assert.match(learningState, /MAX\(\$\{quizAttempts\.score\}\)/);
  assert.match(learningState, /canonicalQuizScore/);
  assert.match(learningState, /eq\(progress\.updatedAt, row\.updatedAt\)/);
  assert.match(learningState, /scoreSnapshotGuard/);
  assert.match(weekLesson, /Best score.*vẫn được giữ; completion gate không bị hạ/);
  assert.match(courseHome, /assessmentScoreMap/);
  assert.doesNotMatch(courseHome, /bestQuizMap/);
});
