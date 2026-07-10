import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { caseStudies } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await ensureDatabase();
  const rows = await getDb()
    .select()
    .from(caseStudies)
    .where(eq(caseStudies.userEmail, user.email))
    .orderBy(desc(caseStudies.updatedAt));
  return Response.json({ cases: rows });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  const title = String(body.title ?? "").trim();
  if (!title) return Response.json({ error: "title is required" }, { status: 400 });

  const values = {
    title,
    stage: String(body.stage ?? "Framing").slice(0, 40),
    problem: String(body.problem ?? "").slice(0, 5000),
    hypothesis: String(body.hypothesis ?? "").slice(0, 5000),
    evidence: String(body.evidence ?? "").slice(0, 8000),
    recommendation: String(body.recommendation ?? "").slice(0, 5000),
  };

  await ensureDatabase();
  const db = getDb();
  const id = Number(body.id);
  if (Number.isInteger(id) && id > 0) {
    await db
      .update(caseStudies)
      .set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(eq(caseStudies.id, id), eq(caseStudies.userEmail, user.email)));
    const [saved] = await db
      .select()
      .from(caseStudies)
      .where(and(eq(caseStudies.id, id), eq(caseStudies.userEmail, user.email)))
      .limit(1);
    if (!saved) return Response.json({ error: "Case not found" }, { status: 404 });
    return Response.json({ case: saved });
  }

  const [created] = await db
    .insert(caseStudies)
    .values({ userEmail: user.email, ...values })
    .returning();
  return Response.json({ case: created }, { status: 201 });
}
