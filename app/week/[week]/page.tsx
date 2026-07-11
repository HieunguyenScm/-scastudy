import { notFound } from "next/navigation";
import { getQuizForModule, getSource, getWeek } from "../../../lib/content";
import { chatGPTSignOutPath, requireChatGPTUser } from "../../chatgpt-auth";
import SiteNavigation from "../../site-navigation";
import WeekLesson, { type LessonQuiz } from "./week-lesson";

export const dynamic = "force-dynamic";

export default async function WeekPage({ params }: { params: Promise<{ week: string }> }) {
  const { week: weekParam } = await params;
  const week = getWeek(Number(weekParam));
  if (!week) notFound();
  const user = await requireChatGPTUser(`/week/${week.week}`);
  let quiz: LessonQuiz | null = null;
  if (week.week % 4 === 0) {
    const moduleQuiz = getQuizForModule(week.module);
    if (!moduleQuiz) notFound();
    quiz = {
      module: moduleQuiz.module,
      title: moduleQuiz.title,
      questions: moduleQuiz.questions.map((question) => ({
        id: question.id,
        question: question.question,
        options: question.options,
      })),
    };
  }
  const sourceMap = week.sourceRefs.map((reference) => {
    const source = getSource(reference.sourceId);
    return {
      ...reference,
      title: source?.title ?? reference.sourceId,
      author: source?.author ?? "",
      pageCount: source?.pageCount ?? 0,
    };
  });

  return (
    <>
      <SiteNavigation
        current="lesson"
        user={{ displayName: user.displayName, email: user.email }}
        signOutPath={chatGPTSignOutPath(`/week/${week.week}`)}
      />
      <WeekLesson week={week} quiz={quiz} sourceMap={sourceMap} />
    </>
  );
}
