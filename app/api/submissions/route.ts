import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { mentorReviews, submissions, submissionVersions } from "../../../db/schema";
import { getWeek } from "../../../lib/content";
import { ApiRequestError, createRequestId, errorResponse, handleApiError, jsonResponse, readJsonObject } from "../../../lib/http";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);
    const weekParam = new URL(request.url).searchParams.get("week");
    await ensureDatabase();
    const db = getDb();
    const rows = await db.select().from(submissions).where(
      weekParam ? and(eq(submissions.userEmail, user.email), eq(submissions.week, Number(weekParam))) : eq(submissions.userEmail, user.email),
    ).orderBy(desc(submissions.updatedAt));
    const reviews = rows.length ? await db.select().from(mentorReviews).where(eq(mentorReviews.userEmail, user.email)).orderBy(desc(mentorReviews.createdAt)) : [];
    return jsonResponse({ submissions: rows, reviews, requestId }, { requestId });
  } catch (error) { return handleApiError(error, requestId); }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);
    const body = await readJsonObject(request, 20_000);
    const week = body.week;
    if (typeof week !== "number" || !Number.isInteger(week) || !getWeek(week)) throw new ApiRequestError("INVALID_WEEK", 400, "week must be an integer from 1 to 24.");
    const title = typeof body.title === "string" ? body.title.trim() : getWeek(week)!.deliverable;
    const evidence = requireText(body.evidence, "evidence", 12000);
    const assumptions = requireText(body.assumptions, "assumptions", 5000);
    const reflection = requireText(body.reflection, "reflection", 5000);
    const fileUrl = body.fileUrl == null ? null : requireText(body.fileUrl, "fileUrl", 500);
    const action = body.action === "submit" ? "submitted" : "in-progress";
    await ensureDatabase();
    const db = getDb();
    const existing = await db.select().from(submissions).where(and(eq(submissions.userEmail, user.email), eq(submissions.week, week))).limit(1);
    const current = existing[0];
    const nextVersion = (current?.latestVersion ?? 0) + 1;
    const [saved] = await db.insert(submissions).values({ userEmail: user.email, week, title, evidence, fileUrl, assumptions, reflection, status: action, latestVersion: nextVersion }).onConflictDoUpdate({ target: [submissions.userEmail, submissions.week], set: { title, evidence, fileUrl, assumptions, reflection, status: action, latestVersion: nextVersion, updatedAt: new Date().toISOString() } }).returning();
    await db.insert(submissionVersions).values({ submissionId: saved.id, userEmail: user.email, version: nextVersion, evidence, fileUrl, assumptions, reflection });
    return jsonResponse({ submission: saved, requestId }, { requestId });
  } catch (error) { return handleApiError(error, requestId); }
}

function requireText(value: unknown, name: string, max: number) {
  if (typeof value !== "string" || value.length > max) throw new ApiRequestError(`INVALID_${name.toUpperCase()}`, 400, `${name} is required and must be at most ${max} characters.`);
  return value.trim();
}
