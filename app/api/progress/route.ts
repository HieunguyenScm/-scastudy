import { and, asc, eq, sql } from "drizzle-orm";
import { deriveProgressState, isModuleEndWeek, nextReviewDate } from "../../../db/mastery";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { progress, type MasteryStatus } from "../../../db/schema";
import {
  ApiRequestError,
  createRequestId,
  errorResponse,
  handleApiError,
  hasOwn,
  jsonResponse,
  readJsonObject,
} from "../../../lib/http";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) {
      return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);
    }

    await ensureDatabase();
    const rows = await getDb()
      .select()
      .from(progress)
      .where(eq(progress.userEmail, user.email))
      .orderBy(asc(progress.week));

    return jsonResponse({ progress: rows, requestId }, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) {
      return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);
    }

    const body = await readJsonObject(request, 16_384);
    const week = requireInteger(body.week, "INVALID_WEEK", "week must be an integer from 1 to 24.");
    if (week < 1 || week > 24) {
      throw new ApiRequestError("INVALID_WEEK", 400, "week must be an integer from 1 to 24.");
    }

    const confidence = hasOwn(body, "confidence")
      ? requireInteger(
          body.confidence,
          "INVALID_CONFIDENCE",
          "confidence must be an integer from 0 to 5.",
        )
      : undefined;
    if (confidence !== undefined && (confidence < 0 || confidence > 5)) {
      throw new ApiRequestError(
        "INVALID_CONFIDENCE",
        400,
        "confidence must be an integer from 0 to 5.",
      );
    }

    const practiceMask = hasOwn(body, "practiceMask")
      ? requireInteger(
          body.practiceMask,
          "INVALID_PRACTICE_MASK",
          "practiceMask must be an integer from 0 to 7.",
        )
      : undefined;
    if (practiceMask !== undefined && (practiceMask < 0 || practiceMask > 7)) {
      throw new ApiRequestError(
        "INVALID_PRACTICE_MASK",
        400,
        "practiceMask must be an integer from 0 to 7.",
      );
    }

    let reflection: string | undefined;
    if (hasOwn(body, "reflection")) {
      if (typeof body.reflection !== "string") {
        throw new ApiRequestError(
          "INVALID_REFLECTION",
          400,
          "reflection must be a string with at most 2000 characters.",
        );
      }
      reflection = body.reflection.trim();
      if (reflection.length > 2000) {
        throw new ApiRequestError(
          "INVALID_REFLECTION",
          400,
          "reflection must be a string with at most 2000 characters.",
        );
      }
    }

    if (hasOwn(body, "action") && body.action !== "review") {
      throw new ApiRequestError(
        "INVALID_ACTION",
        400,
        'action must be "review" when provided.',
      );
    }
    const isReview = body.action === "review";

    const initialConfidence = confidence ?? 0;
    const initialPracticeMask = practiceMask ?? 0;
    const initialReflection = reflection ?? "";
    const initialReviewCount = isReview ? 1 : 0;
    const initialState = deriveProgressState({
      week,
      confidence: initialConfidence,
      practiceMask: initialPracticeMask,
      reflection: initialReflection,
      quizScore: null,
      reviewCount: initialReviewCount,
    });
    const now = new Date();

    const nextConfidence =
      confidence === undefined
        ? sql<number>`${progress.confidence}`
        : sql<number>`${confidence}`;
    const nextPracticeMask =
      practiceMask === undefined
        ? sql<number>`${progress.practiceMask}`
        : sql<number>`${practiceMask}`;
    const nextReflection =
      reflection === undefined
        ? sql<string>`${progress.reflection}`
        : sql<string>`${reflection}`;
    const nextReviewCount = isReview
      ? sql<number>`${progress.reviewCount} + 1`
      : sql<number>`${progress.reviewCount}`;
    const moduleQuizRequirement = isModuleEndWeek(week)
      ? sql`COALESCE(${progress.quizScore}, -1) >= 80`
      : sql`1 = 1`;
    const completionCondition = sql`
      ${nextPracticeMask} = 7
      AND ${nextConfidence} >= 3
      AND length(trim(${nextReflection})) >= 20
      AND ${moduleQuizRequirement}
    `;
    const activityCondition = sql`
      ${nextPracticeMask} > 0
      OR ${nextConfidence} > 0
      OR length(trim(${nextReflection})) > 0
      OR ${progress.quizScore} IS NOT NULL
      OR ${nextReviewCount} > 0
    `;
    const completedUpdate = sql<boolean>`CASE WHEN ${completionCondition} THEN 1 ELSE 0 END`;
    const masteryUpdate = sql<MasteryStatus>`CASE
      WHEN ${completionCondition} AND ${nextReviewCount} >= 1 AND ${nextConfidence} >= 4
        THEN 'mastered'
      WHEN ${completionCondition} THEN 'completed'
      WHEN ${activityCondition} THEN 'in-progress'
      ELSE 'not-started'
    END`;

    await ensureDatabase();
    const db = getDb();
    if (isReview) {
      const [existing] = await db
        .select({ completed: progress.completed })
        .from(progress)
        .where(and(eq(progress.userEmail, user.email), eq(progress.week, week)))
        .limit(1);
      if (!existing?.completed) {
        throw new ApiRequestError(
          "REVIEW_REQUIRES_COMPLETION",
          409,
          "A review can only be recorded after the week is completed.",
        );
      }
    }
    const [saved] = await db
      .insert(progress)
      .values({
        userEmail: user.email,
        week,
        completed: initialState.completed,
        confidence: initialConfidence,
        quizScore: null,
        practiceMask: initialPracticeMask,
        reflection: initialReflection,
        masteryStatus: initialState.masteryStatus,
        reviewCount: initialReviewCount,
        lastReviewedAt: isReview ? now.toISOString() : null,
        nextReviewAt: isReview ? nextReviewDate(1, now) : null,
      })
      .onConflictDoUpdate({
        target: [progress.userEmail, progress.week],
        set: {
          completed: completedUpdate,
          confidence:
            confidence === undefined ? sql`${progress.confidence}` : confidence,
          practiceMask:
            practiceMask === undefined ? sql`${progress.practiceMask}` : practiceMask,
          reflection:
            reflection === undefined ? sql`${progress.reflection}` : reflection,
          masteryStatus: masteryUpdate,
          reviewCount: nextReviewCount,
          lastReviewedAt: isReview
            ? sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
            : sql`${progress.lastReviewedAt}`,
          nextReviewAt: isReview
            ? sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now', CASE
                WHEN ${progress.reviewCount} = 0 THEN '+1 day'
                WHEN ${progress.reviewCount} = 1 THEN '+7 days'
                WHEN ${progress.reviewCount} = 2 THEN '+21 days'
                ELSE '+45 days'
              END)`
            : sql`${progress.nextReviewAt}`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      })
      .returning();

    return jsonResponse({ progress: saved, requestId }, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

function requireInteger(value: unknown, code: string, message: string): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new ApiRequestError(code, 400, message);
  }
  return value;
}
