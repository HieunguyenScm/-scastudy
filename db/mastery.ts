import type { MasteryStatus } from "./schema";

export const REVIEW_INTERVAL_DAYS = [1, 7, 21, 45] as const;

export type MasteryInputs = {
  week: number;
  confidence: number;
  practiceMask: number;
  reflection: string;
  quizScore: number | null;
  reviewCount: number;
};

export function isModuleEndWeek(week: number): boolean {
  return week % 4 === 0;
}

export function deriveProgressState(inputs: MasteryInputs): {
  completed: boolean;
  masteryStatus: MasteryStatus;
} {
  const completed =
    inputs.practiceMask === 7 &&
    inputs.confidence >= 3 &&
    inputs.reflection.trim().length >= 20 &&
    (!isModuleEndWeek(inputs.week) || (inputs.quizScore ?? -1) >= 80);

  if (completed && inputs.reviewCount >= 1 && inputs.confidence >= 4) {
    return { completed: true, masteryStatus: "mastered" };
  }
  if (completed) return { completed: true, masteryStatus: "completed" };

  const hasActivity =
    inputs.practiceMask > 0 ||
    inputs.confidence > 0 ||
    inputs.reflection.trim().length > 0 ||
    inputs.quizScore !== null ||
    inputs.reviewCount > 0;
  return {
    completed: false,
    masteryStatus: hasActivity ? "in-progress" : "not-started",
  };
}

export function nextReviewDate(reviewCount: number, from = new Date()): string {
  const intervalIndex = Math.min(
    Math.max(reviewCount - 1, 0),
    REVIEW_INTERVAL_DAYS.length - 1,
  );
  const next = new Date(from.getTime());
  next.setUTCDate(next.getUTCDate() + REVIEW_INTERVAL_DAYS[intervalIndex]);
  return next.toISOString();
}
