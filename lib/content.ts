import assignmentsData from "../content/assignments.json";
import curriculumData from "../content/curriculum.json";
import glossaryData from "../content/glossary.json";
import quizzesData from "../content/quizzes.json";
import sourcesData from "../content/sources.json";
import sourceExcerptsData from "../content/source-excerpts.json";

export type SourceRef = {
  sourceId: string;
  chapter: string;
  pages: string;
  note: string;
};

export type LessonSection = {
  heading: string;
  body: string;
};

export type LessonExample = {
  title: string;
  narrative: string;
  steps: string[];
  takeaway: string;
};

export type SelfCheckItem = {
  question: string;
  answer: string;
};

export type WeekLesson = {
  coreIdea: string;
  sections: LessonSection[];
  workedExample: LessonExample;
  selfCheck: SelfCheckItem[];
};

export type Week = {
  week: number;
  module: number;
  moduleName: string;
  title: string;
  titleEn: string;
  hours: string;
  level: string;
  tools: string[];
  objectives: string[];
  summary: string;
  summaryEn: string;
  concepts: string[];
  practice: string[];
  deliverable: string;
  portfolio: string;
  sourceRefs: SourceRef[];
  lesson: WeekLesson;
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type ModuleQuiz = {
  module: number;
  title: string;
  sourceIds: string[];
  questions: QuizQuestion[];
};

export type Source = {
  id: string;
  title: string;
  author: string;
  file: string;
  libraryPath: string;
  sha256: string;
  group: string;
  pageCount: number;
  usedFor: number[];
  note: string;
};
export type SourceExcerpt = {
  week: number;
  sourceId: string;
  title: string;
  author: string;
  chapter: string;
  pages: string;
  note: string;
  pdfPageStart: number;
  excerpt: string;
};

export type Assignment = {
  module: number;
  weeks: string;
  title: string;
  brief: string;
  outputs: string[];
  rubric: { criterion: string; weight: number }[];
};

export const curriculum = curriculumData as Week[];
export const sources = sourcesData as Source[];
export const sourceExcerpts = sourceExcerptsData as SourceExcerpt[];
export const glossary = glossaryData;
export const quizzes = quizzesData as ModuleQuiz[];
export const assignments = assignmentsData as Assignment[];

export function getWeek(week: number) {
  return curriculum.find((item) => item.week === week);
}

export function getQuizForModule(module: number) {
  return quizzes.find((quiz) => quiz.module === module);
}

export function getSource(sourceId: string) {
  return sources.find((source) => source.id === sourceId);
}

export function getSourceExcerptsForWeek(week: number) {
  return sourceExcerpts.filter((item) => item.week === week);
}

export const modules = Array.from(
  new Map(curriculum.map((week) => [week.module, week.moduleName])).entries(),
).map(([id, name]) => ({ id, name }));
