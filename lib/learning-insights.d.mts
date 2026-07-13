export type LearningInsightInput = {
  settings?: { startDate?: string; weeklyHours?: number };
  progress?: Array<{ week: number; completed?: boolean; quizScore?: number | null }>;
  labs?: Array<{ week: number; score: number; passed: boolean; attemptCount: number }>;
  submissions?: Array<{ week: number; status: string }>;
  reviews?: Array<{ submissionId: number; version: number; scores: Record<string, number>; createdAt: string }>;
  now?: string;
};

export type LearningInsights = {
  applied: number;
  expectedApplied: number;
  pace: { status: "scheduled" | "ahead" | "on-track" | "watch" | "behind"; label: string; detail: string; gap: number };
  weakestRubric: { key: string; label: string; score: number; samples: number } | null;
  attention: { needsRevision: number; failedLabs: number; lowAssessments: number; total: number };
  priorityActions: Array<{ kind: "revision" | "lab" | "assessment"; eyebrow: string; title: string; detail: string; href: string }>;
  workload: { remainingWeeks: number; weeklyHours: number; estimatedHours: number };
};

export function buildLearningInsights(input: LearningInsightInput): LearningInsights;
