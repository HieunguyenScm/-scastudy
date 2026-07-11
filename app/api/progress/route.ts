import { and, asc, eq } from "drizzle-orm";
import { deriveProgressState } from "../../../db/mastery";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { progress } from "../../../db/schema";
import { recomputeLearningState } from "../../../db/learning-state";
import {
  ApiRequestError,
  createRequestId,
  errorResponse,
  handleApiError,
  hasOwn,
  isLocalDatabaseUnavailable,
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
    const db = getDb();
    const rows = await db
      .select()
      .from(progress)
      .where(eq(progress.userEmail, user.email))
      .orderBy(asc(progress.week));

    const truthfulRows = await Promise.all(rows.map((row) => recomputeLearningState(db, user.email, row.week)));
    return jsonResponse({ progress: truthfulRows.filter(Boolean), requestId }, { requestId });
  } catch (error) {
    if (isLocalDatabaseUnavailable(error)) {
      return jsonResponse({ progress: [], degraded: true, requestId }, { requestId });
    }
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

    if (hasOwn(body, "action")) {
      throw new ApiRequestError(
        "INVALID_ACTION",
        400,
        "Review cannot be recorded by a click. Submit a retrieval-practice response instead.",
      );
    }
    await ensureDatabase();
    const db = getDb();
    const [existing] = await db
      .select()
      .from(progress)
      .where(and(eq(progress.userEmail, user.email), eq(progress.week, week)))
      .limit(1);
    const nextConfidence = confidence ?? existing?.confidence ?? 0;
    const nextPracticeMask = practiceMask ?? existing?.practiceMask ?? 0;
    const nextReflection = reflection ?? existing?.reflection ?? "";
    const quizScore = existing?.quizScore ?? null;
    const initialState = deriveProgressState({
      week,
      confidence: nextConfidence,
      practiceMask: nextPracticeMask,
      reflection: nextReflection,
      quizScore,
      reviewCount: existing?.reviewCount ?? 0,
      evidencePassed: false,
    });
    const updatedAt = new Date().toISOString();

    const [saved] = await db
      .insert(progress)
      .values({
        userEmail: user.email,
        week,
        completed: initialState.completed,
        confidence: nextConfidence,
        quizScore,
        practiceMask: nextPracticeMask,
        reflection: nextReflection,
        masteryStatus: initialState.masteryStatus,
        reviewCount: existing?.reviewCount ?? 0,
        lastReviewedAt: existing?.lastReviewedAt ?? null,
        nextReviewAt: existing?.nextReviewAt ?? null,
        updatedAt,
      })
      .onConflictDoUpdate({
        target: [progress.userEmail, progress.week],
        set: {
          confidence: nextConfidence,
          practiceMask: nextPracticeMask,
          reflection: nextReflection,
          updatedAt,
        },
      })
      .returning();

    const truthful = await recomputeLearningState(db, user.email, week);
    return jsonResponse({ progress: truthful ?? saved, requestId }, { requestId });
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
