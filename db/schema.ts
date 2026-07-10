import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const progress = sqliteTable(
  "progress",
  {
    userEmail: text("user_email").notNull(),
    week: integer("week").notNull(),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    confidence: integer("confidence").notNull().default(0),
    quizScore: integer("quiz_score"),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [primaryKey({ columns: [table.userEmail, table.week] })],
);

export const caseStudies = sqliteTable("case_studies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userEmail: text("user_email").notNull(),
  title: text("title").notNull(),
  stage: text("stage").notNull().default("Framing"),
  problem: text("problem").notNull().default(""),
  hypothesis: text("hypothesis").notNull().default(""),
  evidence: text("evidence").notNull().default(""),
  recommendation: text("recommendation").notNull().default(""),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
