import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { progress } from "../../../db/schema";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await ensureDatabase();
  const rows = await getDb()
    .select()
    .from(progress)
    .where(eq(progress.userEmail, user.email))
    .orderBy(asc(progress.week));

  return Response.json({ progress: rows });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    week?: number;
    completed?: boolean;
    confidence?: number;
    quizScore?: number | null;
  };
  const week = Number(body.week);
  if (!Number.isInteger(week) || week < 1 || week > 24) {
    return Response.json({ error: "week must be between 1 and 24" }, { status: 400 });
  }
  const confidence = Math.max(0, Math.min(5, Number(body.confidence ?? 0)));
  const quizScore = body.quizScore == null
    ? null
    : Math.max(0, Math.min(100, Math.round(Number(body.quizScore))));

  await ensureDatabase();
  const db = getDb();
  await db
    .insert(progress)
    .values({
      userEmail: user.email,
      week,
      completed: Boolean(body.completed),
      confidence,
      quizScore,
    })
    .onConflictDoUpdate({
      target: [progress.userEmail, progress.week],
      set: {
        completed: Boolean(body.completed),
        confidence,
        quizScore,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });

  const [saved] = await db
    .select()
    .from(progress)
    .where(and(eq(progress.userEmail, user.email), eq(progress.week, week)))
    .limit(1);
  return Response.json({ progress: saved });
}
