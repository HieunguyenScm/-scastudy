import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { recomputeLearningState } from "../../../db/learning-state";
import {
  caseStudies,
  courseSettings,
  labAttemptHistory,
  labAttempts,
  mentorReviews,
  progress,
  quizAttempts,
  submissions,
} from "../../../db/schema";
import {
  ApiRequestError,
  createRequestId,
  errorResponse,
  handleApiError,
  jsonResponse,
  readJsonObject,
} from "../../../lib/http";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);

    await ensureDatabase();
    const db = getDb();
    let [settings] = await db
      .select()
      .from(courseSettings)
      .where(eq(courseSettings.userEmail, user.email))
      .limit(1);
    if (!settings) {
      [settings] = await db
        .insert(courseSettings)
        .values({ userEmail: user.email, startDate: new Date().toISOString().slice(0, 10), weeklyHours: 6 })
        .onConflictDoNothing()
        .returning();
      if (!settings) {
        [settings] = await db.select().from(courseSettings).where(eq(courseSettings.userEmail, user.email)).limit(1);
      }
    }

    const [progressRows, weeklySubmissions, labs, labHistory, quizzes, cases, reviews] = await Promise.all([
      db.select().from(progress).where(eq(progress.userEmail, user.email)).orderBy(asc(progress.week)),
      db.select().from(submissions).where(eq(submissions.userEmail, user.email)).orderBy(asc(submissions.week)),
      db.select().from(labAttempts).where(eq(labAttempts.userEmail, user.email)).orderBy(asc(labAttempts.week)),
      db.select({ week: labAttemptHistory.week, score: labAttemptHistory.score, passed: labAttemptHistory.passed, createdAt: labAttemptHistory.createdAt }).from(labAttemptHistory).where(eq(labAttemptHistory.userEmail, user.email)).orderBy(desc(labAttemptHistory.createdAt)),
      db.select({ module: quizAttempts.module, score: quizAttempts.score, correct: quizAttempts.correct, total: quizAttempts.total, createdAt: quizAttempts.createdAt }).from(quizAttempts).where(eq(quizAttempts.userEmail, user.email)).orderBy(desc(quizAttempts.createdAt)),
      db.select({ id: caseStudies.id, assignmentModule: caseStudies.assignmentModule, stage: caseStudies.stage, title: caseStudies.title, updatedAt: caseStudies.updatedAt }).from(caseStudies).where(and(eq(caseStudies.userEmail, user.email), isNull(caseStudies.deletedAt))).orderBy(desc(caseStudies.updatedAt)),
      db.select({ submissionId: mentorReviews.submissionId, version: mentorReviews.version, decision: mentorReviews.decision, scores: mentorReviews.scores, createdAt: mentorReviews.createdAt }).from(mentorReviews).where(eq(mentorReviews.userEmail, user.email)).orderBy(desc(mentorReviews.createdAt)),
    ]);
    const truthfulProgress = await Promise.all(progressRows.map((row) => recomputeLearningState(db, user.email, row.week)));

    return jsonResponse({
      settings,
      progress: truthfulProgress.filter(Boolean),
      submissions: weeklySubmissions,
      labs,
      labHistory,
      quizzes,
      cases,
      reviews,
      requestId,
    }, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);
    const body = await readJsonObject(request, 4096);
    const startDate = readStartDate(body.startDate);
    const weeklyHours = body.weeklyHours;
    if (typeof weeklyHours !== "number" || !Number.isInteger(weeklyHours) || weeklyHours < 1 || weeklyHours > 40) {
      throw new ApiRequestError("INVALID_WEEKLY_HOURS", 400, "weeklyHours must be an integer from 1 to 40.");
    }

    await ensureDatabase();
    const [settings] = await getDb()
      .insert(courseSettings)
      .values({ userEmail: user.email, startDate, weeklyHours, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({
        target: courseSettings.userEmail,
        set: { startDate, weeklyHours, updatedAt: new Date().toISOString() },
      })
      .returning();
    return jsonResponse({ settings, requestId }, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

function readStartDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ApiRequestError("INVALID_START_DATE", 400, "startDate must use YYYY-MM-DD.");
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new ApiRequestError("INVALID_START_DATE", 400, "startDate must be a real calendar date.");
  }
  return value;
}
