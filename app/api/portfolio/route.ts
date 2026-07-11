import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { caseStudies, submissions } from "../../../db/schema";
import { createRequestId, errorResponse, handleApiError, jsonResponse } from "../../../lib/http";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);
    await ensureDatabase();
    const db = getDb();
    const weekly = await db.select().from(submissions).where(eq(submissions.userEmail, user.email)).orderBy(desc(submissions.updatedAt));
    const cases = await db.select().from(caseStudies).where(eq(caseStudies.userEmail, user.email)).orderBy(desc(caseStudies.updatedAt));
    return jsonResponse({ weekly, cases, requestId }, { requestId });
  } catch (error) { return handleApiError(error, requestId); }
}
