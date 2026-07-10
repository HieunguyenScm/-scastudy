import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuizForModule, getSource, getWeek } from "../../../lib/content";
import { chatGPTSignOutPath, requireChatGPTUser } from "../../chatgpt-auth";
import WeekLesson from "./week-lesson";

export const dynamic = "force-dynamic";

export default async function WeekPage({ params }: { params: Promise<{ week: string }> }) {
  const { week: weekParam } = await params;
  const week = getWeek(Number(weekParam));
  if (!week) notFound();
  const user = await requireChatGPTUser(`/week/${week.week}`);
  const quiz = getQuizForModule(week.module);
  if (!quiz) notFound();
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
      <header className="site-header lesson-header">
        <Link className="brand-lockup" href="/"><span className="brand-symbol">CT</span><span><strong>ctnascm</strong><small>Chàng trai năm ấy</small></span></Link>
        <nav className="lesson-nav"><Link href="/">Dashboard</Link><Link href="/glossary">Glossary</Link><Link href="/case-study">Case workspace</Link></nav>
        <div className="user-chip"><span>{user.displayName.slice(0, 1).toUpperCase()}</span><div><strong>{user.displayName}</strong><a href={chatGPTSignOutPath(`/week/${week.week}`)}>Đăng xuất</a></div></div>
      </header>
      <WeekLesson week={week} quiz={quiz} sourceMap={sourceMap} />
    </>
  );
}
