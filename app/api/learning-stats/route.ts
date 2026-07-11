import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { progress, retrievalAttempts, submissions } from "../../../db/schema";
import { createRequestId, errorResponse, handleApiError, jsonResponse } from "../../../lib/http";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);
    await ensureDatabase();
    const db = getDb();
    const [progressRows, submissionRows, attempts] = await Promise.all([
      db.select().from(progress).where(eq(progress.userEmail, user.email)),
      db.select().from(submissions).where(eq(submissions.userEmail, user.email)),
      db.select().from(retrievalAttempts).where(eq(retrievalAttempts.userEmail, user.email)),
    ]);
    const passedSubmissions = submissionRows.filter((item) => item.status === "passed" || item.status === "portfolio-ready");
    const unassistedPassed = attempts.filter((item) => item.passed && !item.assisted);
    const confidenceGap = attempts.length ? Math.round(attempts.reduce((sum, item) => sum + Math.abs(item.confidence * 20 - item.score), 0) / attempts.length) : null;
    const now = Date.now();
    const activeDays = new Set([...attempts.map((item) => item.createdAt), ...submissionRows.map((item) => item.updatedAt)].filter((value) => now - new Date(value).getTime() <= 7 * 86_400_000).map((value) => value.slice(0, 10))).size;
    return jsonResponse({ stats: { encountered: progressRows.filter((item) => item.masteryStatus !== "not-started").length, applied: passedSubmissions.length, retained: progressRows.filter((item) => item.masteryStatus === "mastered").length, retrievalPasses: unassistedPassed.length, revisions: submissionRows.filter((item) => item.latestVersion > 1).length, confidenceGap, activeDays }, requestId }, { requestId });
  } catch (error) { return handleApiError(error, requestId); }
}
