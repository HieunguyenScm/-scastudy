import labsData from "../content/interactive-labs.json";

export type LabAnswer = string | number;
export type LabAnswers = Record<string, LabAnswer>;

type BaseQuestion = {
  id: string;
  prompt: string;
  points: number;
  hint: string;
  explanation: string;
};

export type NumberLabQuestion = BaseQuestion & {
  kind: "number";
  expected: number;
  tolerance: number;
  unit?: string;
};

export type ChoiceLabQuestion = BaseQuestion & {
  kind: "choice";
  options: string[];
  correctIndex: number;
};

export type TextLabQuestion = BaseQuestion & {
  kind: "text";
  keywords: string[];
  minKeywords: number;
};

export type LabQuestion = NumberLabQuestion | ChoiceLabQuestion | TextLabQuestion;

export type InteractiveLab = {
  week: number;
  title: string;
  businessQuestion: string;
  instructions: string[];
  columns: string[];
  rows: Array<Array<string | number | null>>;
  expectedOutput: string;
  passScore: number;
  questions: LabQuestion[];
};

export type PublicLabQuestion = {
  id: string;
  kind: LabQuestion["kind"];
  prompt: string;
  points: number;
  hint: string;
  unit?: string;
  options?: string[];
};
export type PublicInteractiveLab = Omit<InteractiveLab, "questions"> & {
  questions: PublicLabQuestion[];
};

export type LabQuestionResult = {
  id: string;
  correct: boolean;
  earned: number;
  points: number;
  explanation: string;
  expectedLabel: string;
};

export type LabGrade = {
  score: number;
  passed: boolean;
  earned: number;
  possible: number;
  results: LabQuestionResult[];
};

export const interactiveLabs = labsData as InteractiveLab[];

export function getInteractiveLab(week: number): InteractiveLab | undefined {
  return interactiveLabs.find((lab) => lab.week === week);
}

export function getPublicInteractiveLab(week: number): PublicInteractiveLab | undefined {
  const lab = getInteractiveLab(week);
  if (!lab) return undefined;
  return {
    ...lab,
    questions: lab.questions.map((question) => {
      if (question.kind === "choice") {
        return {
          id: question.id,
          kind: question.kind,
          prompt: question.prompt,
          options: question.options,
          points: question.points,
          hint: question.hint,
        };
      }
      return {
        id: question.id,
        kind: question.kind,
        prompt: question.prompt,
        points: question.points,
        hint: question.hint,
        ...(question.kind === "number" && question.unit ? { unit: question.unit } : {}),
      };
    }),
  };
}

export function gradeInteractiveLab(lab: InteractiveLab, answers: LabAnswers): LabGrade {
  const possible = lab.questions.reduce((sum, question) => sum + question.points, 0);
  const results = lab.questions.map((question): LabQuestionResult => {
    const answer = answers[question.id];
    let correct = false;
    let expectedLabel = "";

    if (question.kind === "number") {
      const numeric = parseNumericAnswer(answer);
      correct = numeric !== null && Math.abs(numeric - question.expected) <= question.tolerance;
      expectedLabel = `${question.expected}${question.unit ? ` ${question.unit}` : ""}`;
    } else if (question.kind === "choice") {
      const selected = typeof answer === "number" ? answer : Number(answer);
      correct = Number.isInteger(selected) && selected === question.correctIndex;
      expectedLabel = question.options[question.correctIndex] ?? "";
    } else {
      const normalized = normalizeText(typeof answer === "string" ? answer : String(answer ?? ""));
      const matches = question.keywords.filter((keyword) => normalized.includes(normalizeText(keyword)));
      correct = matches.length >= question.minKeywords;
      expectedLabel = `Có ít nhất ${question.minKeywords} ý: ${question.keywords.join(", ")}`;
    }

    return {
      id: question.id,
      correct,
      earned: correct ? question.points : 0,
      points: question.points,
      explanation: question.explanation,
      expectedLabel,
    };
  });
  const earned = results.reduce((sum, result) => sum + result.earned, 0);
  const score = possible > 0 ? Math.round((earned / possible) * 100) : 0;
  return { score, passed: score >= lab.passScore, earned, possible, results };
}

function parseNumericAnswer(value: LabAnswer | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
