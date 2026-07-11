import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { lessonBlockProgress } from "../../../db/schema";
import { progress } from "../../../db/schema";
import { recomputeLearningState } from "../../../db/learning-state";
import { getWeek } from "../../../lib/content";
import { getLessonBlocks } from "../../../lib/learning";
import {
  ApiRequestError,
  createRequestId,
  errorResponse,
  handleApiError,
  jsonResponse,
  readJsonObject,
} from "../../../lib/http";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);
    const week = requireWeek(new URL(request.url).searchParams.get("week"));
    await ensureDatabase();
    const rows = await getDb()
      .select()
      .from(lessonBlockProgress)
      .where(and(eq(lessonBlockProgress.userEmail, user.email), eq(lessonBlockProgress.week, week)))
      .orderBy(asc(lessonBlockProgress.blockId));
    return jsonResponse({ blocks: rows, requestId }, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);
    const body = await readJsonObject(request, 4_096);
    const week = requireWeek(body.week);
    if (typeof body.blockId !== "string" || body.blockId.length > 100) {
      throw new ApiRequestError("INVALID_BLOCK", 400, "blockId is required.");
    }
    if (typeof body.completed !== "boolean") {
      throw new ApiRequestError("INVALID_COMPLETION", 400, "completed must be a boolean.");
    }
    const selectedWeek = getWeek(week)!;
    const validBlocks = getLessonBlocks(selectedWeek)
      .filter((block) => block.type === "learn" || block.type === "example")
      .map((block) => block.id);
    if (!validBlocks.includes(body.blockId)) {
      throw new ApiRequestError("INVALID_BLOCK", 400, "blockId does not belong to this lesson.");
    }

    await ensureDatabase();
    const [saved] = await getDb()
      .insert(lessonBlockProgress)
      .values({ userEmail: user.email, week, blockId: body.blockId, completed: body.completed })
      .onConflictDoUpdate({
        target: [lessonBlockProgress.userEmail, lessonBlockProgress.week, lessonBlockProgress.blockId],
        set: { completed: body.completed, updatedAt: new Date().toISOString() },
      })
      .returning();
    const db = getDb();
    await db.insert(progress).values({ userEmail: user.email, week }).onConflictDoNothing();
    const learningState = await recomputeLearningState(db, user.email, week);
    return jsonResponse({ block: saved, progress: learningState, requestId }, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

function requireWeek(value: unknown) {
  const week = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof week !== "number" || !Number.isInteger(week) || !getWeek(week)) {
    throw new ApiRequestError("INVALID_WEEK", 400, "week must be an integer from 1 to 24.");
  }
  return week;
}
