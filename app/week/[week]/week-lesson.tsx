"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { FormEvent, useEffect, useState } from "react";
import type { ModuleQuiz, Week } from "../../../lib/content";

type ProgressRow = { week: number; completed: boolean; confidence: number; quizScore: number | null };
type SourceItem = { sourceId: string; title: string; author: string; pageCount: number; chapter: string; pages: string; note: string };

export default function WeekLesson({ week, quiz, sourceMap }: { week: Week; quiz: ModuleQuiz; sourceMap: SourceItem[] }) {
  const [progress, setProgress] = useState<ProgressRow>({ week: week.week, completed: false, confidence: 0, quizScore: null });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [tutorAnswer, setTutorAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    fetch("/api/progress")
      .then((response) => response.json())
      .then((data) => {
        const row = (data.progress ?? []).find((item: ProgressRow) => item.week === week.week);
        if (row) setProgress(row);
      })
      .catch(() => undefined);
  }, [week.week]);

  const saveProgress = async (next: ProgressRow) => {
    setProgress(next);
    await fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
  };

  const submitQuiz = async () => {
    const correct = quiz.questions.filter((question) => answers[question.id] === question.answerIndex).length;
    const score = Math.round((correct / quiz.questions.length) * 100);
    setSubmitted(true);
    await saveProgress({ ...progress, quizScore: score });
  };

  const askTutor = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim() || asking) return;
    setAsking(true);
    setTutorAnswer("");
    try {
      const response = await fetch("/api/tutor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, week: week.week }) });
      const data = await response.json();
      setTutorAnswer(response.ok ? data.answer : data.error);
    } catch {
      setTutorAnswer("Không thể kết nối AI Tutor lúc này.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <main className="lesson-shell">
      <section className="lesson-hero">
        <div className="breadcrumb"><a href="/">Dashboard</a><span>/</span><span>Module {week.module}</span><span>/</span><strong>Week {String(week.week).padStart(2, "0")}</strong></div>
        <div className="lesson-hero-grid">
          <div><p className="kicker">WEEK {String(week.week).padStart(2, "0")} · {week.moduleName.toUpperCase()}</p><h1>{week.title}</h1><p className="lesson-english-title">{week.titleEn}</p><p>{week.summary}</p><div className="tag-row">{week.tools.map((tool) => <span key={tool}>{tool}</span>)}<span>{week.hours}</span><span>{week.level}</span></div></div>
          <aside className="lesson-status-card"><span>WEEK STATUS</span><strong>{progress.completed ? "COMPLETE" : "IN PROGRESS"}</strong><div className="confidence-block"><p>Mức tự tin</p><div>{[1,2,3,4,5].map((level) => <button key={level} className={progress.confidence >= level ? "active" : ""} onClick={() => saveProgress({ ...progress, confidence: level })}>{level}</button>)}</div></div><button className={progress.completed ? "complete-button done" : "complete-button"} onClick={() => saveProgress({ ...progress, completed: !progress.completed })}>{progress.completed ? "✓ Đã hoàn thành" : "Đánh dấu hoàn thành"}</button></aside>
        </div>
      </section>

      <section className="lesson-content-layout">
        <article className="lesson-main-column">
          <section className="content-panel"><div className="panel-index">01</div><div><p className="kicker">LEARNING OBJECTIVES</p><h2>Sau tuần này, mày làm được gì?</h2><ul className="objective-list">{week.objectives.map((item) => <li key={item}>{item}</li>)}</ul></div></section>
          <section className="content-panel"><div className="panel-index">02</div><div><p className="kicker">CORE CONCEPTS</p><h2>Khái niệm cần nắm</h2><div className="concept-grid">{week.concepts.map((concept, index) => <article key={concept}><span>{String(index + 1).padStart(2, "0")}</span><strong>{concept}</strong></article>)}</div><div className="english-summary"><span>ENGLISH SUMMARY</span><p>{week.summaryEn}</p></div></div></section>
          <section className="content-panel"><div className="panel-index">03</div><div><p className="kicker">PRACTICE PLAN</p><h2>Học bằng output</h2><ol className="practice-list">{week.practice.map((item, index) => <li key={item}><span>{index + 1}</span><div><strong>Task {index + 1}</strong><p>{item}</p></div></li>)}</ol><div className="deliverable-banner"><span>DELIVERABLE</span><h3>{week.deliverable}</h3><p>{week.portfolio}</p><a href="/case-study">Đưa vào Case workspace →</a></div></div></section>

          <section className="content-panel source-panel"><div className="panel-index">04</div><div><p className="kicker">SOURCE MAP</p><h2>Đọc đúng chương, đúng trang</h2><p className="panel-intro">Số trang dưới đây là số trang in trong sách khi extract được; không phải số thứ tự của trình đọc PDF.</p><div className="source-list">{sourceMap.map((source) => <article key={`${source.sourceId}-${source.chapter}`}><div className="source-book"><span>{source.pageCount}P</span><div><strong>{source.title}</strong><small>{source.author}</small></div></div><div><b>{source.chapter}</b><p>{source.pages}</p><small>{source.note}</small></div></article>)}</div></div></section>

          <section className="content-panel quiz-panel"><div className="panel-index">05</div><div><p className="kicker">MODULE CHECK</p><h2>{quiz.title}</h2><p className="panel-intro">Quiz dùng chung cho 4 tuần trong module {week.module}. Kết quả được lưu vào tracker.</p><div className="quiz-list">{quiz.questions.map((question, index) => <fieldset key={question.id}><legend><span>{index + 1}</span>{question.question}</legend>{question.options.map((option, optionIndex) => { const selected = answers[question.id] === optionIndex; const correct = submitted && optionIndex === question.answerIndex; const wrong = submitted && selected && optionIndex !== question.answerIndex; return <label key={option} className={`${selected ? "selected" : ""} ${correct ? "correct" : ""} ${wrong ? "wrong" : ""}`}><input type="radio" name={question.id} checked={selected} disabled={submitted} onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))} /><span>{String.fromCharCode(65 + optionIndex)}</span>{option}</label>;})}{submitted && <p className="quiz-explanation">{question.explanation}</p>}</fieldset>)}</div>{submitted ? <div className="quiz-result"><strong>{progress.quizScore}%</strong><div><b>{(progress.quizScore ?? 0) >= 80 ? "Đạt mục tiêu" : "Cần ôn lại"}</b><p>Điểm đã được lưu vào dashboard.</p></div></div> : <button className="primary-action quiz-submit" disabled={Object.keys(answers).length < quiz.questions.length} onClick={submitQuiz}>Nộp bài quiz →</button>}</div></section>
        </article>

        <aside className="lesson-side-column">
          <div className="sticky-card"><p className="kicker">AI TUTOR · WEEK {String(week.week).padStart(2, "0")}</p><h3>Hỏi ngay trong bài</h3><div className="quick-questions"><button onClick={() => setMessage("Giải thích các khái niệm tuần này bằng ví dụ FMCG đơn giản.")}>Giải thích đơn giản</button><button onClick={() => setMessage("Kiểm tra hiểu biết của tao bằng 3 câu hỏi Socratic.")}>Kiểm tra tao</button><button onClick={() => setMessage("Cho tao checklist hoàn thành deliverable tuần này.")}>Tạo checklist</button></div>{tutorAnswer && <div className="side-answer">{tutorAnswer}</div>}<form onSubmit={askTutor}><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Hỏi CTN Tutor..." /><button disabled={asking}>{asking ? "Đang nghĩ..." : "Gửi câu hỏi ↗"}</button></form></div>
          <div className="week-navigation"><span>ĐIỀU HƯỚNG</span>{week.week > 1 && <a href={`/week/${week.week - 1}`}>← Tuần {String(week.week - 1).padStart(2, "0")}</a>}{week.week < 24 && <a href={`/week/${week.week + 1}`}>Tuần {String(week.week + 1).padStart(2, "0")} →</a>}</div>
        </aside>
      </section>
    </main>
  );
}
