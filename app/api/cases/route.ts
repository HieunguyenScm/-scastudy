import { and, desc, eq, isNull, sql, type SQL } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import {
  caseStages,
  caseStudies,
  type CaseStage,
  type RubricScores,
} from "../../../db/schema";
import { assignments } from "../../../lib/content";
import {
  ApiRequestError,
  createRequestId,
  errorResponse,
  handleApiError,
  hasOwn,
  jsonResponse,
  readJsonObject,
  type JsonObject,
} from "../../../lib/http";
import { getChatGPTUser } from "../../chatgpt-auth";

const TEXT_LIMITS = {
  problem: 5000,
  hypothesis: 5000,
  evidence: 8000,
  recommendation: 5000,
  reflection: 5000,
} as const;

type CaseRow = typeof caseStudies.$inferSelect;

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
      .from(caseStudies)
      .where(and(eq(caseStudies.userEmail, user.email), isNull(caseStudies.deletedAt)))
      .orderBy(desc(caseStudies.updatedAt));

    return jsonResponse(
      { cases: rows.map(serializeCase), requestId },
      { requestId },
    );
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
    const body = await readJsonObject(request, 64 * 1024);
    const id = readOptionalPositiveInteger(body, "id", "INVALID_CASE_ID");

    await ensureDatabase();
    const db = getDb();
    const existing = id === undefined
      ? undefined
      : (
          await db
            .select()
            .from(caseStudies)
            .where(
              and(
                eq(caseStudies.id, id),
                eq(caseStudies.userEmail, user.email),
                isNull(caseStudies.deletedAt),
              ),
            )
            .limit(1)
        )[0];
    if (id !== undefined && !existing) {
      return errorResponse("CASE_NOT_FOUND", 404, "Case not found.", requestId);
    }

    const suppliedRevision = readOptionalPositiveInteger(
      body,
      "revision",
      "INVALID_REVISION",
    );
    if (
      existing &&
      suppliedRevision !== undefined &&
      suppliedRevision !== existing.revision
    ) {
      return errorResponse(
        "REVISION_CONFLICT",
        409,
        "This case was updated by another request. Reload it before saving.",
        requestId,
      );
    }

    const values = parseCaseValues(body, existing);
    enforcePortfolioReadiness(values);

    let saved: CaseRow | undefined;
    if (existing) {
      [saved] = await db
        .update(caseStudies)
        .set({
          ...values,
          revision: existing.revision + 1,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(
          and(
            eq(caseStudies.id, existing.id),
            eq(caseStudies.userEmail, user.email),
            eq(caseStudies.revision, existing.revision),
            isNull(caseStudies.deletedAt),
          ),
        )
        .returning();
      if (!saved) {
        return errorResponse(
          "REVISION_CONFLICT",
          409,
          "This case was updated by another request. Reload it before saving.",
          requestId,
        );
      }
    } else {
      [saved] = await db
        .insert(caseStudies)
        .values({ userEmail: user.email, ...values, revision: 1 })
        .returning();
    }

    return jsonResponse(
      { case: serializeCase(saved), requestId },
      { status: existing ? 200 : 201, requestId },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function DELETE(request: Request) {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) {
      return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);
    }
    const body = await readJsonObject(request, 4096);
    const id = readRequiredPositiveInteger(body.id, "INVALID_CASE_ID");
    const revision = readOptionalPositiveInteger(body, "revision", "INVALID_REVISION");

    await ensureDatabase();
    const filters: SQL[] = [
      eq(caseStudies.id, id),
      eq(caseStudies.userEmail, user.email),
      isNull(caseStudies.deletedAt),
    ];
    if (revision !== undefined) filters.push(eq(caseStudies.revision, revision));
    const [deleted] = await getDb()
      .update(caseStudies)
      .set({ deletedAt: sql`CURRENT_TIMESTAMP`, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(and(...filters))
      .returning({ id: caseStudies.id });
    if (!deleted) {
      return errorResponse("CASE_NOT_FOUND", 404, "Case not found.", requestId);
    }

    return jsonResponse({ deleted: true, id, requestId }, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

function parseCaseValues(body: JsonObject, existing?: CaseRow) {
  const title = readString(body, "title", existing?.title ?? "", 160, true);
  if (!title) {
    throw new ApiRequestError("TITLE_REQUIRED", 400, "title is required.");
  }

  const stageValue = hasOwn(body, "stage") ? body.stage : (existing?.stage ?? "Framing");
  if (
    typeof stageValue !== "string" ||
    !caseStages.includes(stageValue as CaseStage)
  ) {
    throw new ApiRequestError(
      "INVALID_STAGE",
      400,
      `stage must be one of: ${caseStages.join(", ")}.`,
    );
  }

  const assignmentModule = hasOwn(body, "assignmentModule")
    ? parseAssignmentModule(body.assignmentModule)
    : (existing?.assignmentModule ?? null);
  const rubricScores = hasOwn(body, "rubricScores")
    ? parseRubricScores(body.rubricScores)
    : (existing?.rubricScores ?? {});

  return {
    title,
    stage: stageValue as CaseStage,
    problem: readString(
      body,
      "problem",
      existing?.problem ?? "",
      TEXT_LIMITS.problem,
    ),
    hypothesis: readString(
      body,
      "hypothesis",
      existing?.hypothesis ?? "",
      TEXT_LIMITS.hypothesis,
    ),
    evidence: readString(
      body,
      "evidence",
      existing?.evidence ?? "",
      TEXT_LIMITS.evidence,
    ),
    recommendation: readString(
      body,
      "recommendation",
      existing?.recommendation ?? "",
      TEXT_LIMITS.recommendation,
    ),
    assignmentModule,
    rubricScores,
    reflection: readString(
      body,
      "reflection",
      existing?.reflection ?? "",
      TEXT_LIMITS.reflection,
    ),
  };
}

function enforcePortfolioReadiness(values: ReturnType<typeof parseCaseValues>) {
  if (values.stage !== "Portfolio-ready") return;
  const weightedScore = calculateWeightedRubric(
    values.assignmentModule,
    values.rubricScores,
  );
  if (
    !values.evidence.trim() ||
    !values.recommendation.trim() ||
    !values.reflection.trim() ||
    weightedScore === null ||
    weightedScore < 70
  ) {
    throw new ApiRequestError(
      "PORTFOLIO_REQUIREMENTS_NOT_MET",
      400,
      "Portfolio-ready requires evidence, recommendation, reflection, and a complete weighted rubric score of at least 70.",
    );
  }
}

function serializeCase(row: CaseRow) {
  return {
    ...row,
    weightedRubricScore: calculateWeightedRubric(
      row.assignmentModule,
      row.rubricScores,
    ),
  };
}

function calculateWeightedRubric(
  assignmentModule: number | null,
  scores: RubricScores,
): number | null {
  if (assignmentModule === null) return null;
  const assignment = assignments.find((item) => item.module === assignmentModule);
  if (!assignment || assignment.rubric.length === 0) return null;

  let weightedTotal = 0;
  let totalWeight = 0;
  for (const item of assignment.rubric) {
    const score = scores[item.criterion];
    if (typeof score !== "number") return null;
    weightedTotal += score * item.weight;
    totalWeight += item.weight;
  }
  if (totalWeight <= 0) return null;
  return Math.round((weightedTotal / totalWeight) * 100) / 100;
}

function readString(
  body: JsonObject,
  key: string,
  fallback: string,
  maxLength: number,
  trim = false,
): string {
  if (!hasOwn(body, key)) return fallback;
  const value = body[key];
  if (typeof value !== "string") {
    throw new ApiRequestError(
      "INVALID_FIELD_TYPE",
      400,
      `${key} must be a string.`,
    );
  }
  const normalized = trim ? value.trim() : value;
  if (normalized.length > maxLength) {
    throw new ApiRequestError(
      "FIELD_TOO_LONG",
      400,
      `${key} must be at most ${maxLength} characters.`,
    );
  }
  return normalized;
}

function parseAssignmentModule(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 6) {
    throw new ApiRequestError(
      "INVALID_ASSIGNMENT_MODULE",
      400,
      "assignmentModule must be an integer from 1 to 6 or null.",
    );
  }
  return value;
}

function parseRubricScores(value: unknown): RubricScores {
  if (!isPlainObject(value)) {
    throw new ApiRequestError(
      "INVALID_RUBRIC_SCORES",
      400,
      "rubricScores must be a JSON object with scores from 0 to 100.",
    );
  }
  const entries = Object.entries(value);
  if (entries.length > 50) {
    throw new ApiRequestError(
      "INVALID_RUBRIC_SCORES",
      400,
      "rubricScores must be a JSON object with scores from 0 to 100.",
    );
  }

  const scores: RubricScores = {};
  for (const [criterion, score] of entries) {
    if (
      !criterion ||
      criterion.length > 160 ||
      typeof score !== "number" ||
      !Number.isFinite(score) ||
      score < 0 ||
      score > 100
    ) {
      throw new ApiRequestError(
        "INVALID_RUBRIC_SCORES",
        400,
        "rubricScores must be a JSON object with scores from 0 to 100.",
      );
    }
    scores[criterion] = score;
  }
  return scores;
}

function readOptionalPositiveInteger(
  body: JsonObject,
  key: string,
  code: string,
): number | undefined {
  if (!hasOwn(body, key)) return undefined;
  return readRequiredPositiveInteger(body[key], code);
}

function readRequiredPositiveInteger(value: unknown, code: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new ApiRequestError(code, 400, "A positive integer is required.");
  }
  return value;
}

function isPlainObject(value: unknown): value is JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
