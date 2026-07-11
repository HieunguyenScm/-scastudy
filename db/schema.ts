import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const masteryStatuses = [
  "not-started",
  "in-progress",
  "completed",
  "mastered",
] as const;

export type MasteryStatus = (typeof masteryStatuses)[number];

export const caseStages = [
  "Framing",
  "Analysis",
  "Modelling",
  "Recommendation",
  "Portfolio-ready",
] as const;

export type CaseStage = (typeof caseStages)[number];
export type RubricScores = Record<string, number>;

export const progress = sqliteTable(
  "progress",
  {
    userEmail: text("user_email").notNull(),
    week: integer("week").notNull(),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    confidence: integer("confidence").notNull().default(0),
    quizScore: integer("quiz_score"),
    practiceMask: integer("practice_mask").notNull().default(0),
    reflection: text("reflection").notNull().default(""),
    masteryStatus: text("mastery_status")
      .$type<MasteryStatus>()
      .notNull()
      .default("not-started"),
    reviewCount: integer("review_count").notNull().default(0),
    lastReviewedAt: text("last_reviewed_at"),
    nextReviewAt: text("next_review_at"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.userEmail, table.week] }),
    index("progress_user_mastery_idx").on(table.userEmail, table.masteryStatus),
    index("progress_user_next_review_idx").on(table.userEmail, table.nextReviewAt),
    check("progress_week_check", sql`${table.week} BETWEEN 1 AND 24`),
    check("progress_confidence_check", sql`${table.confidence} BETWEEN 0 AND 5`),
    check("progress_quiz_score_check", sql`${table.quizScore} IS NULL OR ${table.quizScore} BETWEEN 0 AND 100`),
    check("progress_practice_mask_check", sql`${table.practiceMask} BETWEEN 0 AND 7`),
    check("progress_reflection_length_check", sql`length(${table.reflection}) <= 2000`),
    check(
      "progress_mastery_status_check",
      sql`${table.masteryStatus} IN ('not-started', 'in-progress', 'completed', 'mastered')`,
    ),
    check("progress_review_count_check", sql`${table.reviewCount} >= 0`),
  ],
);

export const caseStudies = sqliteTable(
  "case_studies",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userEmail: text("user_email").notNull(),
    title: text("title").notNull(),
    stage: text("stage").$type<CaseStage>().notNull().default("Framing"),
    problem: text("problem").notNull().default(""),
    hypothesis: text("hypothesis").notNull().default(""),
    evidence: text("evidence").notNull().default(""),
    recommendation: text("recommendation").notNull().default(""),
    assignmentModule: integer("assignment_module"),
    rubricScores: text("rubric_scores", { mode: "json" })
      .$type<RubricScores>()
      .notNull()
      .default(sql`'{}'`),
    reflection: text("reflection").notNull().default(""),
    revision: integer("revision").notNull().default(1),
    deletedAt: text("deleted_at"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("case_studies_user_active_updated_idx").on(
      table.userEmail,
      table.deletedAt,
      table.updatedAt,
    ),
    check("case_studies_title_length_check", sql`length(${table.title}) BETWEEN 1 AND 160`),
    check(
      "case_studies_stage_check",
      sql`${table.stage} IN ('Framing', 'Analysis', 'Modelling', 'Recommendation', 'Portfolio-ready')`,
    ),
    check("case_studies_problem_length_check", sql`length(${table.problem}) <= 5000`),
    check("case_studies_hypothesis_length_check", sql`length(${table.hypothesis}) <= 5000`),
    check("case_studies_evidence_length_check", sql`length(${table.evidence}) <= 8000`),
    check(
      "case_studies_recommendation_length_check",
      sql`length(${table.recommendation}) <= 5000`,
    ),
    check(
      "case_studies_assignment_module_check",
      sql`${table.assignmentModule} IS NULL OR ${table.assignmentModule} BETWEEN 1 AND 6`,
    ),
    check("case_studies_rubric_scores_json_check", sql`json_valid(${table.rubricScores})`),
    check("case_studies_reflection_length_check", sql`length(${table.reflection}) <= 5000`),
    check("case_studies_revision_check", sql`${table.revision} >= 1`),
  ],
);

export const caseRevisions = sqliteTable(
  "case_revisions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    caseId: integer("case_id")
      .notNull()
      .references(() => caseStudies.id),
    userEmail: text("user_email").notNull(),
    revision: integer("revision").notNull(),
    title: text("title").notNull(),
    stage: text("stage").$type<CaseStage>().notNull(),
    problem: text("problem").notNull(),
    hypothesis: text("hypothesis").notNull(),
    evidence: text("evidence").notNull(),
    recommendation: text("recommendation").notNull(),
    assignmentModule: integer("assignment_module"),
    rubricScores: text("rubric_scores", { mode: "json" })
      .$type<RubricScores>()
      .notNull(),
    reflection: text("reflection").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex("case_revisions_case_revision_uidx").on(table.caseId, table.revision),
    index("case_revisions_user_created_idx").on(table.userEmail, table.createdAt),
    check("case_revisions_revision_check", sql`${table.revision} >= 1`),
    check("case_revisions_rubric_scores_json_check", sql`json_valid(${table.rubricScores})`),
  ],
);

export const quizAttempts = sqliteTable(
  "quiz_attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userEmail: text("user_email").notNull(),
    module: integer("module").notNull(),
    answers: text("answers", { mode: "json" })
      .$type<Record<string, number>>()
      .notNull(),
    score: integer("score").notNull(),
    correct: integer("correct").notNull(),
    total: integer("total").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("quiz_attempts_user_module_created_idx").on(
      table.userEmail,
      table.module,
      table.createdAt,
    ),
    check("quiz_attempts_module_check", sql`${table.module} BETWEEN 1 AND 6`),
    check("quiz_attempts_answers_json_check", sql`json_valid(${table.answers})`),
    check("quiz_attempts_score_check", sql`${table.score} BETWEEN 0 AND 100`),
    check("quiz_attempts_correct_check", sql`${table.correct} BETWEEN 0 AND ${table.total}`),
    check("quiz_attempts_total_check", sql`${table.total} > 0`),
  ],
);

export const aiDailyUsage = sqliteTable(
  "ai_daily_usage",
  {
    userEmail: text("user_email").notNull(),
    usageDate: text("usage_date").notNull(),
    requestCount: integer("request_count").notNull().default(0),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    primaryKey({ columns: [table.userEmail, table.usageDate] }),
    index("ai_daily_usage_date_idx").on(table.usageDate),
    check("ai_daily_usage_count_check", sql`${table.requestCount} >= 0`),
  ],
);

export const aiExecutions = sqliteTable(
  "ai_executions",
  {
    requestId: text("request_id").primaryKey(),
    userEmail: text("user_email").notNull(),
    week: integer("week"),
    status: text("status").notNull(),
    errorCode: text("error_code"),
    model: text("model"),
    providerStatus: integer("provider_status"),
    attemptCount: integer("attempt_count").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    inputChars: integer("input_chars").notNull(),
    outputChars: integer("output_chars").notNull().default(0),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("ai_executions_user_created_idx").on(table.userEmail, table.createdAt),
    index("ai_executions_status_created_idx").on(table.status, table.createdAt),
    check("ai_executions_week_check", sql`${table.week} IS NULL OR ${table.week} BETWEEN 1 AND 24`),
    check("ai_executions_attempt_count_check", sql`${table.attemptCount} BETWEEN 0 AND 2`),
    check("ai_executions_latency_check", sql`${table.latencyMs} >= 0`),
    check("ai_executions_input_chars_check", sql`${table.inputChars} >= 0`),
    check("ai_executions_output_chars_check", sql`${table.outputChars} >= 0`),
  ],
);
