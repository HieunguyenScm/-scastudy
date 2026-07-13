import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { recomputeLearningState } from "../../../db/learning-state";
import { labAttemptHistory, labAttempts, progress } from "../../../db/schema";
import {
  getInteractiveLab,
  getPublicInteractiveLab,
  gradeInteractiveLab,
  redactUnearnedResults,
  type LabAnswers,
  type LabQuestion,
} from "../../../lib/interactive-labs";
import {
  ApiRequestError,
  createRequestId,
  errorResponse,
  handleApiError,
  jsonResponse,
  readJsonObject,
  type JsonObject,
} from "../../../lib/http";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);

    const week = readWeek(new URL(request.url).searchParams.get("week"));
    const lab = getPublicInteractiveLab(week);
    if (!lab) throw new ApiRequestError("LAB_NOT_FOUND", 404, "Interactive lab not found.");

    await ensureDatabase();
    const db = getDb();
    const [attempt] = await db
      .select()
      .from(labAttempts)
      .where(and(eq(labAttempts.userEmail, user.email), eq(labAttempts.week, week)))
      .limit(1);
    const history = await db
      .select({ score: labAttemptHistory.score, passed: labAttemptHistory.passed, createdAt: labAttemptHistory.createdAt })
      .from(labAttemptHistory)
      .where(and(eq(labAttemptHistory.userEmail, user.email), eq(labAttemptHistory.week, week)))
      .orderBy(desc(labAttemptHistory.createdAt))
      .limit(10);

    const safeAttempt = attempt
      ? { ...attempt, results: redactUnearnedResults(attempt.results) }
      : null;
    return jsonResponse({ lab, attempt: safeAttempt, history, requestId }, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);

    const body = await readJsonObject(request, 32_768);
    const week = readWeek(body.week);
    const action = body.action;
    if (action !== "save" && action !== "grade") {
      throw new ApiRequestError("INVALID_ACTION", 400, "action must be save or grade.");
    }
    const lab = getInteractiveLab(week);
    if (!lab) throw new ApiRequestError("LAB_NOT_FOUND", 404, "Interactive lab not found.");
    const answers = readAnswers(body.answers, lab.questions, action === "grade");

    await ensureDatabase();
    const db = getDb();
    const [existing] = await db
      .select()
      .from(labAttempts)
      .where(and(eq(labAttempts.userEmail, user.email), eq(labAttempts.week, week)))
      .limit(1);
    const updatedAt = new Date().toISOString();

    if (action === "save") {
      const preservePassedWork = Boolean(existing?.passed);
      const [saved] = await db
        .insert(labAttempts)
        .values({
          userEmail: user.email,
          week,
          answers,
          results: [],
          score: 0,
          passed: false,
          attemptCount: 0,
          updatedAt,
        })
        .onConflictDoUpdate({
          target: [labAttempts.userEmail, labAttempts.week],
          set: preservePassedWork ? { updatedAt } : { answers, updatedAt },
        })
        .returning();
      const safeSavedAttempt = { ...saved, results: redactUnearnedResults(saved.results) };
      // When the lab is already passed we intentionally keep the passing answers on
      // record; signal that so the client can tell the learner instead of implying the
      // new draft was stored.
      return jsonResponse({ attempt: safeSavedAttempt, saved: true, preserved: preservePassedWork, requestId }, { requestId });
    }

    const grade = gradeInteractiveLab(lab, answers);
    await db.insert(labAttemptHistory).values({
      userEmail: user.email,
      week,
      answers,
      results: grade.results,
      score: grade.score,
      passed: grade.passed,
    });

    const keepExistingBest = Boolean(existing && existing.score > grade.score);
    const [saved] = await db
      .insert(labAttempts)
      .values({
        userEmail: user.email,
        week,
        answers,
        results: grade.results,
        score: grade.score,
        passed: grade.passed,
        attemptCount: 1,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: [labAttempts.userEmail, labAttempts.week],
        set: {
          answers: keepExistingBest ? existing!.answers : answers,
          results: keepExistingBest ? existing!.results : grade.results,
          score: keepExistingBest ? existing!.score : grade.score,
          passed: Boolean(existing?.passed) || grade.passed,
          attemptCount: (existing?.attemptCount ?? 0) + 1,
          updatedAt,
        },
      })
      .returning();

    let learningProgress = null;
    if (grade.passed) {
      await db
        .insert(progress)
        .values({ userEmail: user.email, week, practiceMask: 7 })
        .onConflictDoUpdate({
          target: [progress.userEmail, progress.week],
          set: { practiceMask: 7, updatedAt: sql`CURRENT_TIMESTAMP` },
        });
      learningProgress = await recomputeLearningState(db, user.email, week);
    }

    const safeGrade = { ...grade, results: redactUnearnedResults(grade.results) };
    const safeSaved = { ...saved, results: redactUnearnedResults(saved.results) };
    return jsonResponse({ attempt: safeSaved, grade: safeGrade, progress: learningProgress, requestId }, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

function readWeek(value: unknown): number {
  const week = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(week) || week < 1 || week > 24) {
    throw new ApiRequestError("INVALID_WEEK", 400, "week must be an integer from 1 to 24.");
  }
  return week;
}

function readAnswers(value: unknown, questions: LabQuestion[], requireComplete: boolean): LabAnswers {
  if (!isPlainObject(value)) {
    throw new ApiRequestError("INVALID_ANSWERS", 400, "answers must be an object.");
  }
  const validIds = new Set(questions.map((question) => question.id));
  if (Object.keys(value).some((id) => !validIds.has(id))) {
    throw new ApiRequestError("INVALID_QUESTION_ID", 400, "answers contains an unknown question.");
  }

  const answers: LabAnswers = {};
  for (const question of questions) {
    const answer = value[question.id];
    if (answer === undefined || answer === null || answer === "") {
      if (requireComplete) {
        throw new ApiRequestError("INCOMPLETE_LAB", 400, "Answer every lab question before grading.");
      }
      continue;
    }
    if (typeof answer !== "string" && typeof answer !== "number") {
      throw new ApiRequestError("INVALID_ANSWER", 400, "Every answer must be text or a number.");
    }
    if (typeof answer === "string" && answer.length > 2000) {
      throw new ApiRequestError("ANSWER_TOO_LONG", 400, "A lab answer cannot exceed 2000 characters.");
    }
    if (question.kind === "choice") {
      const selected = typeof answer === "number" ? answer : Number(answer);
      if (!Number.isInteger(selected) || selected < 0 || selected >= question.options.length) {
        throw new ApiRequestError("INVALID_CHOICE", 400, "A choice answer is outside the available options.");
      }
      answers[question.id] = selected;
    } else {
      answers[question.id] = answer;
    }
  }
  return answers;
}

function isPlainObject(value: unknown): value is JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
