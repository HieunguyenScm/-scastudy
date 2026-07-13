import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { recomputeLearningState } from "../../../db/learning-state";
import { retrievalAttempts } from "../../../db/schema";
import { getWeek } from "../../../lib/content";
import { getRetrievalItems, scoreRetrievalResponse } from "../../../lib/learning";
import { ApiRequestError, createRequestId, errorResponse, handleApiError, jsonResponse, readJsonObject } from "../../../lib/http";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);
    const weekNumber = Number(new URL(request.url).searchParams.get("week"));
    const week = getWeek(weekNumber);
    if (!week) throw new ApiRequestError("INVALID_WEEK", 400, "week must be from 1 to 24.");
    await ensureDatabase();
    const attempts = await getDb().select().from(retrievalAttempts).where(and(eq(retrievalAttempts.userEmail, user.email), eq(retrievalAttempts.week, weekNumber))).orderBy(asc(retrievalAttempts.createdAt));
    const items = getRetrievalItems(week);
    const passedIds = new Set(attempts.filter((item) => item.passed && !item.assisted).map((item) => item.promptId));
    const nextItem = items.find((item) => !passedIds.has(item.id)) ?? items[attempts.length % items.length];
    return jsonResponse({ item: { id: nextItem.id, type: nextItem.type, prompt: nextItem.prompt, hint: nextItem.hint }, attempts, summary: { passed: passedIds.size, retained: passedIds.size >= 2 && attempts.some((item) => item.passed && !item.assisted && item.itemType === "transfer") }, requestId }, { requestId });
  } catch (error) { return handleApiError(error, requestId); }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);
    const body = await readJsonObject(request, 12_000);
    const weekNumber = body.week;
    const week = typeof weekNumber === "number" && Number.isInteger(weekNumber) ? getWeek(weekNumber) : undefined;
    if (!week) throw new ApiRequestError("INVALID_WEEK", 400, "week must be from 1 to 24.");
    const item = getRetrievalItems(week).find((candidate) => candidate.id === body.promptId);
    if (!item) throw new ApiRequestError("INVALID_PROMPT", 400, "Prompt does not belong to this week.");
    if (typeof body.response !== "string" || body.response.trim().length < 40 || body.response.length > 5000) throw new ApiRequestError("INVALID_RESPONSE", 400, "Câu trả lời cần ít nhất 40 và tối đa 5000 ký tự.");
    if (typeof body.confidence !== "number" || !Number.isInteger(body.confidence) || body.confidence < 1 || body.confidence > 5) throw new ApiRequestError("INVALID_CONFIDENCE", 400, "confidence must be from 1 to 5.");
    const assisted = body.assisted === true;
    const grade = scoreRetrievalResponse(item, body.response, assisted);
    await ensureDatabase();
    const db = getDb();
    const priorForPrompt = await db
      .select({ id: retrievalAttempts.id })
      .from(retrievalAttempts)
      .where(and(
        eq(retrievalAttempts.userEmail, user.email),
        eq(retrievalAttempts.week, week.week),
        eq(retrievalAttempts.promptId, item.id),
      ));
    const [attempt] = await db.insert(retrievalAttempts).values({ userEmail: user.email, week: week.week, promptId: item.id, itemType: item.type, response: body.response.trim(), confidence: body.confidence, assisted, score: grade.score, passed: grade.passed }).returning();
    const learningState = await recomputeLearningState(db, user.email, week.week);
    // Reveal the model answer only once the learner has demonstrated a genuine effort:
    // on a passing attempt, or from the second attempt of this prompt onward. This keeps
    // retrieval's try-then-check pedagogy while preventing a one-shot junk answer from
    // harvesting the model answer to paste back and pass.
    const revealModelAnswer = grade.passed || priorForPrompt.length >= 1;
    return jsonResponse({ attempt, grade, modelAnswer: revealModelAnswer ? item.modelAnswer : null, learningState, requestId }, { requestId });
  } catch (error) { return handleApiError(error, requestId); }
}
