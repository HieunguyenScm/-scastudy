import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { getDb } from ".";
import { isModuleEndWeek, nextReviewDate } from "./mastery";
import {
  lessonBlockProgress,
  progress,
  quizAttempts,
  retrievalAttempts,
  submissions,
  type MasteryStatus,
} from "./schema";
import { getWeek } from "../lib/content";
import { getLessonBlocks } from "../lib/learning";

type Db = ReturnType<typeof getDb>;

export async function recomputeLearningState(db: Db, userEmail: string, week: number) {
  for (let retry = 0; retry < 3; retry += 1) {
    const [row] = await db
      .select()
      .from(progress)
      .where(and(eq(progress.userEmail, userEmail), eq(progress.week, week)))
      .limit(1);
    if (!row) return null;

    const [submission] = await db
      .select({ status: submissions.status })
      .from(submissions)
      .where(and(eq(submissions.userEmail, userEmail), eq(submissions.week, week)))
      .limit(1);
    const attempts = await db
      .select()
      .from(retrievalAttempts)
      .where(and(eq(retrievalAttempts.userEmail, userEmail), eq(retrievalAttempts.week, week)))
      .orderBy(desc(retrievalAttempts.createdAt));
    const lessonRows = await db
      .select()
      .from(lessonBlockProgress)
      .where(and(eq(lessonBlockProgress.userEmail, userEmail), eq(lessonBlockProgress.week, week)));

    const selectedWeek = getWeek(week);
    const requiredLessonBlocks = selectedWeek
      ? getLessonBlocks(selectedWeek).filter((block) => block.type === "learn" || block.type === "example").length
      : 0;
    const completedLessonBlocks = lessonRows.filter((block) => block.completed).length;
    const lessonComplete = requiredLessonBlocks > 0 && completedLessonBlocks >= requiredLessonBlocks;

    let canonicalQuizScore = row.quizScore;
    if (isModuleEndWeek(week)) {
      const [bestAttempt] = await db
        .select({ score: sql<number | null>`MAX(${quizAttempts.score})` })
        .from(quizAttempts)
        .where(and(eq(quizAttempts.userEmail, userEmail), eq(quizAttempts.module, week / 4)));
      canonicalQuizScore = bestAttempt?.score ?? row.quizScore;
    }

    const passed = attempts.filter((attempt) => attempt.passed && !attempt.assisted);
    const hasTransfer = passed.some((attempt) => attempt.itemType === "transfer");
    const evidencePassed = submission?.status === "passed" || submission?.status === "portfolio-ready";
    const applied = lessonComplete
      && row.practiceMask === 7
      && row.reflection.trim().length >= 20
      && evidencePassed
      && (!isModuleEndWeek(week) || (canonicalQuizScore ?? -1) >= 80);
    const retained = applied && passed.length >= 2 && hasTransfer;
    const hasActivity = lessonRows.length > 0
      || row.practiceMask > 0
      || row.confidence > 0
      || row.reflection.trim().length > 0
      || canonicalQuizScore !== null
      || attempts.length > 0
      || Boolean(submission);
    const masteryStatus: MasteryStatus = retained
      ? "mastered"
      : applied
        ? "completed"
        : hasActivity
          ? "in-progress"
          : "not-started";
    const latestPassed = passed[0];
    const nextReviewAt = latestPassed
      ? nextReviewDate(passed.length, new Date(latestPassed.createdAt))
      : null;
    const scoreSnapshot = row.quizScore;
    const scoreSnapshotGuard = scoreSnapshot === null
      ? isNull(progress.quizScore)
      : eq(progress.quizScore, scoreSnapshot);

    const [saved] = await db
      .update(progress)
      .set({
        quizScore: canonicalQuizScore,
        completed: applied,
        masteryStatus,
        reviewCount: passed.length,
        lastReviewedAt: latestPassed?.createdAt ?? null,
        nextReviewAt,
        updatedAt: new Date().toISOString(),
      })
      .where(and(
        eq(progress.userEmail, userEmail),
        eq(progress.week, week),
        eq(progress.updatedAt, row.updatedAt),
        scoreSnapshotGuard,
      ))
      .returning();

    if (!saved) continue;
    return {
      ...saved,
      lessonComplete,
      completedLessonBlocks,
      requiredLessonBlocks,
      evidencePassed,
      retained,
      passedRetrievals: passed.length,
      transferPassed: hasTransfer,
    };
  }

  throw new Error("Learning state changed repeatedly while it was being recomputed. Please retry.");
}
