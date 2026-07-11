import { sql } from "drizzle-orm";
import { getDb } from "../../db";
import { aiDailyUsage, aiExecutions } from "../../db/schema";

export type AiExecutionInput = {
  requestId: string;
  userEmail: string;
  week: number | null;
  status: "success" | "degraded" | "rejected";
  errorCode: string | null;
  model: string | null;
  providerStatus: number | null;
  attemptCount: number;
  latencyMs: number;
  inputChars: number;
  outputChars: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
};

export function parseDailyRequestLimit(value: string | undefined): number {
  if (value === undefined || !/^\d+$/.test(value.trim())) return 40;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 10_000
    ? parsed
    : 40;
}

export async function consumeDailyAiRequest(
  userEmail: string,
  limit: number,
): Promise<{ allowed: boolean; count: number; limit: number }> {
  const usageDate = new Date().toISOString().slice(0, 10);
  const db = getDb();
  const [updated] = await db
    .insert(aiDailyUsage)
    .values({ userEmail, usageDate, requestCount: 1 })
    .onConflictDoUpdate({
      target: [aiDailyUsage.userEmail, aiDailyUsage.usageDate],
      set: {
        requestCount: sql`${aiDailyUsage.requestCount} + 1`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
      setWhere: sql`${aiDailyUsage.requestCount} < ${limit}`,
    })
    .returning({ requestCount: aiDailyUsage.requestCount });

  if (updated) return { allowed: true, count: updated.requestCount, limit };
  const [current] = await db
    .select({ requestCount: aiDailyUsage.requestCount })
    .from(aiDailyUsage)
    .where(
      sql`${aiDailyUsage.userEmail} = ${userEmail} AND ${aiDailyUsage.usageDate} = ${usageDate}`,
    )
    .limit(1);
  return { allowed: false, count: current?.requestCount ?? limit, limit };
}

export async function recordAiExecution(input: AiExecutionInput): Promise<boolean> {
  try {
    await getDb().insert(aiExecutions).values({
      ...input,
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
    });
    return true;
  } catch {
    return false;
  }
}
