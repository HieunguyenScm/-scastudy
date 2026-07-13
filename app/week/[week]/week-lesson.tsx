"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { curriculum, type SourceExcerpt, type Week } from "../../../lib/content";
import TutorAnswer, { type TutorPayload } from "../../tutor-answer";
import SubmissionWorkspace from "./submission-workspace";
import type { LearningAsset, LessonBlock } from "../../../lib/learning";
import type { TeachingNote } from "../../../content/teaching-notes";
import RetrievalPractice from "./retrieval-practice";
import LessonReader from "./lesson-reader";
import InteractiveLab from "./interactive-lab";
import type { PublicInteractiveLab } from "../../../lib/interactive-labs";

export type LessonQuiz = {
  module: number;
  title: string;
  questions: Array<{ id: string; question: string; options: string[] }>;
};

type ProgressRow = {
  week: number;
  completed: boolean;
  confidence: number;
  quizScore: number | null;
  practiceMask: number;
  reflection: string;
  masteryStatus: string;
  reviewCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
  lessonComplete?: boolean;
  completedLessonBlocks?: number;
  requiredLessonBlocks?: number;
};
type ProgressPatch = Partial<Pick<ProgressRow, "confidence" | "practiceMask" | "reflection">>;
type SourceItem = {
  sourceId: string;
  title: string;
  author: string;
  pageCount: number;
  chapter: string;
  pages: string;
  note: string;
};
type QuizResult = {
  attempt: { score: number; correct: number; total: number };
  bestScore: number;
  results: Array<{ id: string; correct: boolean; correctIndex: number; explanation: string }>;
};
type SyncState = "loading" | "saving" | "saved" | "error";

const confidenceLabels = [
  "Mới làm quen",
  "Nhớ ý chính",
  "Tự làm có hỗ trợ",
  "Tự làm độc lập",
  "Có thể giải thích cho người khác",
];

function emptyProgress(week: number): ProgressRow {
  return {
    week,
    completed: false,
    confidence: 0,
    quizScore: null,
    practiceMask: 0,
    reflection: "",
    masteryStatus: "not_started",
    reviewCount: 0,
    lastReviewedAt: null,
    nextReviewAt: null,
  };
}

function normalizeProgress(item: Partial<ProgressRow> | undefined, week: number): ProgressRow {
  return {
    week,
    completed: Boolean(item?.completed),
    confidence: Number(item?.confidence ?? 0),
    quizScore: item?.quizScore == null ? null : Number(item.quizScore),
    practiceMask: Number(item?.practiceMask ?? 0),
    reflection: String(item?.reflection ?? ""),
    masteryStatus: String(item?.masteryStatus ?? "not_started"),
    reviewCount: Number(item?.reviewCount ?? 0),
    lastReviewedAt: item?.lastReviewedAt ?? null,
    nextReviewAt: item?.nextReviewAt ?? null,
    lessonComplete: Boolean(item?.lessonComplete),
    completedLessonBlocks: Number(item?.completedLessonBlocks ?? 0),
    requiredLessonBlocks: Number(item?.requiredLessonBlocks ?? 0),
  };
}

function masteryCopy(status: string) {
  const normalized = status.toLowerCase().replaceAll("-", "_");
  if (normalized.includes("mastered")) return { label: "Retained · Đã nhớ và transfer", className: "mastered" };
  if (normalized.includes("completed")) return { label: "Applied · Bài nộp đã đạt", className: "reviewing" };
  if (normalized.includes("due")) return { label: "Review due", className: "due" };
  if (normalized.includes("review")) return { label: "Đang củng cố", className: "reviewing" };
  if (normalized.includes("learning") || normalized.includes("progress")) return { label: "Encountered · Đang học", className: "learning" };
  return { label: "Chưa bắt đầu", className: "not-started" };
}

function formatDate(value: string | null) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export default function WeekLesson({
  week,
  quiz,
  sourceMap,
  sourceExcerpts,
  teachingNote,
  lessonBlocks,
  learningAssets,
  rubric,
  interactiveLab,
}: {
  week: Week;
  quiz: LessonQuiz | null;
  sourceMap: SourceItem[];
  sourceExcerpts: SourceExcerpt[];
  teachingNote: TeachingNote;
  lessonBlocks: LessonBlock[];
  learningAssets: LearningAsset[];
  rubric: Array<{ id: string; label: string; weight: number }>;
  interactiveLab: PublicInteractiveLab;
}) {
  const [progress, setProgress] = useState<ProgressRow>(() => emptyProgress(week.week));
  const [syncState, setSyncState] = useState<SyncState>("loading");
  const [syncMessage, setSyncMessage] = useState("Đang tải tiến độ...");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [quizStatus, setQuizStatus] = useState("");
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [tutorResponse, setTutorResponse] = useState<TutorPayload | null>(null);
  const [tutorError, setTutorError] = useState("");
  const [asking, setAsking] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState("not-started");
  const [lessonRead, setLessonRead] = useState({ completed: 0, total: 0 });
  const [reviewClock, setReviewClock] = useState(0);

  const pendingPatchRef = useRef<ProgressPatch>({});
  const flushingRef = useRef(false);
  const flushTimerRef = useRef<number | null>(null);
  const flushProgressRef = useRef<() => Promise<void>>(async () => undefined);

  const loadProgress = useCallback(async (signal?: AbortSignal) => {
    setSyncState("loading");
    setSyncMessage("Đang tải tiến độ...");
    try {
      const response = await fetch("/api/progress", { signal });
      const data = (await response.json().catch(() => ({}))) as {
        progress?: Partial<ProgressRow>[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Không thể tải tiến độ.");
      const row = Array.isArray(data.progress)
        ? data.progress.find((item) => Number(item.week) === week.week)
        : undefined;
      setProgress({ ...normalizeProgress(row, week.week), ...pendingPatchRef.current });
      setReviewClock(Date.now());
      setSyncState("saved");
      setSyncMessage("Tiến độ đã đồng bộ");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSyncState("error");
      setSyncMessage(error instanceof Error ? error.message : "Không thể tải tiến độ.");
    }
  }, [week.week]);

  const flushProgress = useCallback(async () => {
    if (flushingRef.current || !Object.keys(pendingPatchRef.current).length) return;
    if (flushTimerRef.current != null) window.clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
    flushingRef.current = true;
    const patch = pendingPatchRef.current;
    pendingPatchRef.current = {};
    let failed = false;

    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: week.week, ...patch }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        progress?: Partial<ProgressRow>;
        error?: string;
      };
      if (!response.ok || !data.progress) {
        throw new Error(data.error ?? "Không thể lưu thay đổi.");
      }
      setProgress({ ...normalizeProgress(data.progress, week.week), ...pendingPatchRef.current });
      if (Object.keys(pendingPatchRef.current).length) {
        setSyncState("saving");
        setSyncMessage("Đang lưu thay đổi mới nhất...");
      } else {
        setSyncState("saved");
        setSyncMessage("Đã lưu mọi thay đổi");
      }
    } catch (error) {
      failed = true;
      pendingPatchRef.current = { ...patch, ...pendingPatchRef.current };
      setSyncState("error");
      setSyncMessage(error instanceof Error ? error.message : "Thay đổi chưa được lưu.");
    } finally {
      flushingRef.current = false;
      if (!failed && Object.keys(pendingPatchRef.current).length) {
        flushTimerRef.current = window.setTimeout(() => void flushProgressRef.current(), 0);
      }
    }
  }, [week.week]);

  useEffect(() => {
    flushProgressRef.current = flushProgress;
  }, [flushProgress]);

  const queueProgress = useCallback((patch: ProgressPatch, debounce = false) => {
    pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
    setProgress((current) => ({ ...current, ...patch }));
    setSyncState("saving");
    setSyncMessage(debounce ? "Có thay đổi đang chờ lưu..." : "Đang lưu thay đổi...");
    if (flushTimerRef.current != null) window.clearTimeout(flushTimerRef.current);
    flushTimerRef.current = window.setTimeout(
      () => void flushProgressRef.current(),
      debounce ? 650 : 0,
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadProgress(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      if (flushTimerRef.current != null) window.clearTimeout(flushTimerRef.current);
    };
  }, [loadProgress]);

  const retrySync = () => {
    if (Object.keys(pendingPatchRef.current).length) {
      setSyncState("saving");
      setSyncMessage("Đang thử lưu lại...");
      void flushProgressRef.current();
    } else {
      void loadProgress();
    }
  };

  const practiceComplete = (progress.practiceMask & 0b111) === 0b111;
  const reflectionLength = progress.reflection.trim().length;
  const gateItems = [
    { met: lessonRead.total > 0 && lessonRead.completed >= lessonRead.total, label: `Đọc và xác nhận toàn bộ lesson blocks (${lessonRead.completed}/${lessonRead.total || "…"})` },
    { met: practiceComplete, label: "Hoàn thành đủ 3/3 task thực hành" },
    { met: reflectionLength >= 20, label: `Reflection tối thiểu 20 ký tự (${reflectionLength}/20)` },
    { met: submissionStatus === "passed" || submissionStatus === "portfolio-ready", label: `Evidence đã qua mentor review (${submissionStatus})` },
    ...(quiz ? [{ met: (progress.quizScore ?? 0) >= 80, label: `Module assessment đạt ≥80% (${progress.quizScore ?? 0}%)` }] : []),
  ];
  const gateReady = gateItems.every((item) => item.met);
  const mastery = masteryCopy(progress.masteryStatus);
  const reviewDue = progress.nextReviewAt
    ? reviewClock > 0 && new Date(progress.nextReviewAt).getTime() <= reviewClock
    : false;
  const quizResultMap = useMemo(
    () => new Map((quizResult?.results ?? []).map((result) => [result.id, result])),
    [quizResult],
  );

  const submitQuiz = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!quiz || quizSubmitting || Object.keys(answers).length !== quiz.questions.length) return;
    setQuizSubmitting(true);
    setQuizStatus("Đang chấm bài trên server...");
    try {
      const response = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: quiz.module, answers }),
      });
      const data = (await response.json().catch(() => ({}))) as Partial<QuizResult> & {
        score?: number;
        bestScore?: number;
        correct?: number;
        total?: number;
        error?: string;
      };
      const attempt = data.attempt ?? (
        typeof data.score === "number" && typeof data.correct === "number" && typeof data.total === "number"
          ? { score: data.score, correct: data.correct, total: data.total }
          : undefined
      );
      if (!response.ok || !attempt || !Array.isArray(data.results)) {
        throw new Error(data.error ?? "Không thể chấm bài lúc này.");
      }
      const bestScore = typeof data.bestScore === "number" ? data.bestScore : attempt.score;
      const result = { attempt, bestScore, results: data.results };
      setQuizResult(result);
      setProgress((current) => ({ ...current, quizScore: result.bestScore }));
      setQuizStatus(
        result.attempt.score >= 80
          ? `Kết quả lượt này ${result.attempt.score}%, đúng ${result.attempt.correct}/${result.attempt.total}. Best score ${result.bestScore}% — đã đạt completion gate.`
          : result.bestScore >= 80
            ? `Kết quả lượt này ${result.attempt.score}%, đúng ${result.attempt.correct}/${result.attempt.total}. Best score ${result.bestScore}% vẫn được giữ; completion gate không bị hạ.`
            : `Kết quả lượt này ${result.attempt.score}%, đúng ${result.attempt.correct}/${result.attempt.total}. Best score ${result.bestScore}%; cần đạt 80%, hãy xem giải thích và thử lại.`,
      );

      try {
        const progressResponse = await fetch("/api/progress");
        const progressData = (await progressResponse.json().catch(() => ({}))) as { progress?: Partial<ProgressRow>[] };
        const saved = progressData.progress?.find((item) => Number(item.week) === week.week);
        if (progressResponse.ok && saved) {
          setProgress({ ...normalizeProgress(saved, week.week), ...pendingPatchRef.current });
        }
      } catch {
        // The assessment result remains valid; the next progress load will reconcile computed status.
      }
    } catch (error) {
      setQuizStatus(error instanceof Error ? error.message : "Không thể chấm bài lúc này.");
    } finally {
      setQuizSubmitting(false);
    }
  };

  const retryQuiz = () => {
    setAnswers({});
    setQuizResult(null);
    setQuizStatus("Đã mở lượt làm mới. Chọn lại đáp án rồi nộp bài.");
  };

  const openRetrievalPractice = () => document.getElementById("retrieval-practice")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const askTutor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim() || asking) return;
    setAsking(true);
    setTutorResponse(null);
    setTutorError("");
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, week: week.week }),
      });
      const data = (await response.json().catch(() => ({}))) as Partial<TutorPayload> & { error?: string };
      if (!response.ok || !data.answer) throw new Error(data.error ?? "AI Tutor chưa phản hồi.");
      setTutorResponse({
        answer: data.answer,
        model: data.model,
        degraded: Boolean(data.degraded),
        requestId: data.requestId ?? "không-có-id",
        sources: Array.isArray(data.sources) ? data.sources : [],
      });
    } catch (error) {
      setTutorError(error instanceof Error ? error.message : "Không thể kết nối AI Tutor lúc này.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <main className="lesson-shell" id="main-content">
      <section className="lesson-hero">
        <div className="breadcrumb">
          <Link href="/">Dashboard</Link><span>/</span><span>Module {week.module}</span><span>/</span><strong>Week {String(week.week).padStart(2, "0")}</strong>
        </div>
        <div className="lesson-hero-grid">
          <div>
            <p className="kicker">WEEK {String(week.week).padStart(2, "0")} · {week.moduleName.toUpperCase()}</p>
            <h1>{week.title}</h1>
            <p className="lesson-english-title">{week.titleEn}</p>
            <p>{week.summary}</p>
            <div className="tag-row">{week.tools.map((tool) => <span key={tool}>{tool}</span>)}<span>{week.hours}</span><span>{week.level}</span></div>
          </div>

          <aside className="lesson-status-card" id="completion-gate" aria-labelledby="completion-gate-title">
            <span>WEEK STATUS</span>
            <strong>{progress.completed ? "COMPLETED" : gateReady && syncState === "saving" ? "SYNCING GATE" : "IN PROGRESS"}</strong>

            <div className={`sync-status ${syncState}`} role="status" aria-live="polite">
              <span>{syncMessage}</span>
              {syncState === "error" ? <button type="button" onClick={retrySync}>Thử lại</button> : null}
            </div>

            <fieldset className="confidence-block" disabled={syncState === "loading"}>
              <legend>Mức tự tin hiện tại</legend>
              <div>
                {confidenceLabels.map((confidenceLabel, index) => {
                  const level = index + 1;
                  return (
                    <button
                      key={level}
                      type="button"
                      className={progress.confidence === level ? "active" : ""}
                      aria-label={`${level} — ${confidenceLabel}`}
                      aria-pressed={progress.confidence === level}
                      title={confidenceLabel}
                      onClick={() => queueProgress({ confidence: level })}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
              <small>{progress.confidence ? confidenceLabels[progress.confidence - 1] : "Chưa chọn mức tự tin"}</small>
            </fieldset>

            <div className="completion-gate-list">
              <p id="completion-gate-title">COMPLETION GATE · TỰ ĐỘNG</p>
              <ul>
                {gateItems.map((item) => <li key={item.label} className={item.met ? "met" : ""}><span aria-hidden="true">{item.met ? "✓" : "○"}</span>{item.label}</li>)}
              </ul>
              <small>{progress.completed ? "Gate đã được xác nhận trên server." : "Tuần chỉ complete khi mọi điều kiện đều đạt."}</small>
            </div>

            <div className="mastery-summary">
              <div><span>MASTERY</span><strong className={mastery.className}>{mastery.label}</strong></div>
              <dl>
                <div><dt>Review</dt><dd>{progress.reviewCount} lượt</dd></div>
                <div><dt>Ôn tiếp</dt><dd>{reviewDue ? "Đang đến hạn" : formatDate(progress.nextReviewAt)}</dd></div>
              </dl>
              <button
                type="button"
                className="review-complete-button"
                disabled={syncState !== "saved"}
                onClick={openRetrievalPractice}
              >
                Làm retrieval practice
              </button>
              {!progress.completed ? <small>Applied cần evidence qua mentor review; Retained cần retrieval không mở ghi chú và một transfer case.</small> : null}
            </div>
          </aside>
        </div>
      </section>

      <section className="lesson-content-layout">
        <div className="lesson-main-column">
          <section className="content-panel week-overview">
            <div className="panel-index">01</div>
            <div>
              <p className="kicker">MỤC TIÊU TUẦN {String(week.week).padStart(2, "0")}</p>
              <h2>Sau tuần này, bạn làm được gì?</h2>
              <ul className="objective-list">{week.objectives.map((item) => <li key={item}>{item}</li>)}</ul>
              <div className="concept-chips" aria-label="Khái niệm cốt lõi tuần này">{week.concepts.map((concept) => <span key={concept}>{concept}</span>)}</div>
            </div>
          </section>

          <div className="step-marker" id="buoc-1">
            <span>BƯỚC 1</span>
            <div><h2>Học bài</h2><p>Đọc từng thẻ, tự diễn giải lại bằng lời của mình, rồi đánh dấu đã hiểu. Khoảng 20 phút.</p></div>
          </div>
          {teachingNote.mistake || teachingNote.decision ? (
            <div className="lesson-callouts">
              <div className="callout warning"><span>Sai lầm thường gặp</span><p>{teachingNote.mistake}</p></div>
              <div className="callout decision"><span>Quyết định phải làm được</span><p>{teachingNote.decision}</p></div>
            </div>
          ) : null}

          <LessonReader week={week.week} blocks={lessonBlocks} onProgress={setLessonRead} />

          <div className="step-marker" id="buoc-2">
            <span>BƯỚC 2</span>
            <div><h2>Tự kiểm tra</h2><p>Nhớ lại và áp dụng trước khi mở ghi chú — đây là bước tạo mastery thật, không phải click.</p></div>
          </div>
          <RetrievalPractice week={week.week} onProgress={(saved) => setProgress((current) => normalizeProgress({ ...current, ...saved }, week.week))} />

          <div className="step-marker" id="buoc-3">
            <span>BƯỚC 3</span>
            <div><h2>Làm lab và nộp sản phẩm</h2><p>Học bằng output: hoàn thành các task, viết reflection, rồi nộp bằng chứng để mentor chấm.</p></div>
          </div>
          <InteractiveLab
            lab={interactiveLab}
            onPass={(saved) => {
              if (saved) {
                setProgress((current) => normalizeProgress({ ...current, ...(saved as Partial<ProgressRow>) }, week.week));
              } else {
                queueProgress({ practiceMask: 7 });
              }
            }}
          />
          <section className="content-panel practice-panel">
            <div className="panel-index">3b</div>
            <div>
              <p className="kicker">APPLIED WORK · FULL LEARNING PACK</p>
              <h2>Mở rộng lab thành sản phẩm thật</h2>
              <p className="panel-intro">Mini-lab phía trên kiểm tra logic cốt lõi. Tiếp theo, dùng workbook/dataset đầy đủ và đánh dấu từng task sau khi thực sự tạo được output.</p>
              <ol className="practice-list">
                {week.practice.map((item, index) => {
                  const bit = 1 << index;
                  const checked = (progress.practiceMask & bit) === bit;
                  const inputId = `practice-${week.week}-${index}`;
                  return (
                    <li key={item} className={checked ? "task-complete" : ""}>
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={checked}
                        disabled={syncState === "loading"}
                        onChange={() => queueProgress({ practiceMask: checked ? progress.practiceMask & ~bit : progress.practiceMask | bit })}
                      />
                      <label htmlFor={inputId}>
                        <span aria-hidden="true">{checked ? "✓" : index + 1}</span>
                        <div><strong>Task {index + 1}</strong><p>{item}</p></div>
                      </label>
                    </li>
                  );
                })}
              </ol>

              <div className="reflection-block">
                <label htmlFor={`reflection-${week.week}`}>Reflection sau khi thực hành</label>
                <p>Viết điều bạn hiểu rõ hơn, điểm còn vướng, hoặc cách áp dụng vào FMCG.</p>
                <textarea
                  id={`reflection-${week.week}`}
                  value={progress.reflection}
                  minLength={20}
                  maxLength={2000}
                  disabled={syncState === "loading"}
                  onChange={(event) => queueProgress({ reflection: event.target.value }, true)}
                  placeholder="Ví dụ: Sau khi tự tính safety stock, tôi hiểu tăng service level sẽ đổi trade-off tồn kho như thế nào..."
                />
                <div className={reflectionLength >= 20 ? "reflection-count complete" : "reflection-count"}>
                  <span>{reflectionLength >= 20 ? "✓ Đủ điều kiện" : "Cần ít nhất 20 ký tự"}</span>
                  <output>{reflectionLength} ký tự</output>
                </div>
              </div>

              <div className="deliverable-banner"><span>DELIVERABLE</span><h3>{week.deliverable}</h3><p>{week.portfolio}</p><Link href="/case-study">Đưa vào Case workspace →</Link></div>
            </div>
          </section>

          {quiz ? (
            <>
            <div className="step-marker" id="buoc-4">
              <span>BƯỚC 4</span>
              <div><h2>Bài kiểm tra cuối module</h2><p>Chấm trên server; cần đạt ít nhất 80% để hoàn thành tuần.</p></div>
            </div>
            <section className="content-panel quiz-panel">
              <div className="panel-index">4a</div>
              <div>
                <p className="kicker">MODULE ASSESSMENT</p>
                <h2>{quiz.title}</h2>
                <form onSubmit={submitQuiz}>
                  <div className="quiz-list">
                    {quiz.questions.map((question, index) => {
                      const result = quizResultMap.get(question.id);
                      return (
                        <fieldset key={question.id}>
                          <legend><span>{index + 1}</span>{question.question}</legend>
                          {question.options.map((option, optionIndex) => {
                            const selected = answers[question.id] === optionIndex;
                            const correct = result != null && optionIndex === result.correctIndex;
                            const wrong = result != null && selected && !result.correct;
                            return (
                              <label key={option} className={`${selected ? "selected" : ""} ${correct ? "correct" : ""} ${wrong ? "wrong" : ""}`}>
                                <input
                                  type="radio"
                                  name={`${quiz.module}-${question.id}`}
                                  checked={selected}
                                  disabled={quizResult != null || quizSubmitting}
                                  onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                                />
                                <span>{String.fromCharCode(65 + optionIndex)}</span>{option}
                              </label>
                            );
                          })}
                          {result ? <p className={`quiz-explanation ${result.correct ? "correct" : "wrong"}`}><strong>{result.correct ? "Đúng." : "Chưa đúng."}</strong> {result.explanation}</p> : null}
                        </fieldset>
                      );
                    })}
                  </div>

                  {quizResult ? (
                    <div className="quiz-result-actions">
                      <div className="quiz-result" role="status" aria-live="assertive">
                        <strong>{quizResult.attempt.score}%</strong>
                        <div><b>{quizResult.bestScore >= 80 ? "Đạt module assessment" : "Cần ôn và thử lại"}</b><p>Đúng {quizResult.attempt.correct}/{quizResult.attempt.total} câu · Best score {quizResult.bestScore}%.</p></div>
                      </div>
                      <button type="button" className="secondary-button" onClick={retryQuiz}>Làm lại assessment</button>
                    </div>
                  ) : (
                    <button className="primary-action quiz-submit" disabled={quizSubmitting || Object.keys(answers).length < quiz.questions.length}>
                      {quizSubmitting ? "Đang chấm..." : "Nộp assessment →"}
                    </button>
                  )}
                  <p className="quiz-live-status" role="status" aria-live="assertive">{quizStatus}</p>
                </form>
              </div>
            </section>
            </>
          ) : null}
          <SubmissionWorkspace week={week.week} blocks={lessonBlocks} assets={learningAssets} rubric={rubric} deliverable={week.deliverable} onStatusChange={setSubmissionStatus} />

          <details className="content-panel refs-panel">
            <summary><span className="kicker">NGUỒN & ĐỐI CHIẾU</span><h2>Đọc đúng chương, đúng trang</h2></summary>
            <div className="refs-body">
              <div className="english-summary"><span>ENGLISH SUMMARY</span><p>{week.summaryEn}</p></div>
              <p className="panel-intro">Số trang là số trang in trong sách; không phải số thứ tự của trình đọc PDF.</p>
              <div className="source-list">
                {sourceMap.length ? sourceMap.map((source) => (
                  <article key={`${source.sourceId}-${source.chapter}`}>
                    <div className="source-book"><span>{source.pageCount}P</span><div><strong>{source.title}</strong><small>{source.author}</small></div></div>
                    <div><b>{source.chapter}</b><p>{source.pages}</p><small>{source.note}</small></div>
                  </article>
                )) : <p className="empty-state">Tuần này chưa có source map.</p>}
              </div>
              {sourceExcerpts.some((item) => item.excerpt.trim()) ? (
                <div className="source-reading-list">
                  <h3>Đối chiếu đoạn gốc</h3>
                  {sourceExcerpts.slice(0, 4).filter((item) => item.excerpt.trim()).map((item) => (
                    <details key={`${item.sourceId}-${item.chapter}`}>
                      <summary>{item.title} · {item.chapter}</summary>
                      <p lang="en">{item.excerpt}</p>
                    </details>
                  ))}
                </div>
              ) : null}
            </div>
          </details>
        </div>

        <aside className="lesson-side-column">
          <div className="sticky-card">
            <p className="kicker">AI MENTOR · WEEK {String(week.week).padStart(2, "0")}</p>
            <h3>Chọn chế độ hỗ trợ</h3>
            <div className="quick-questions">
              <button type="button" onClick={() => setMessage("Giải thích các khái niệm tuần này bằng ví dụ FMCG đơn giản.")}>Giải thích đơn giản</button>
              <button type="button" onClick={() => setMessage("Guide: hướng dẫn guided lab từng bước nhưng không làm thay; dừng sau bước đầu để tôi tự làm.")}>Guide lab</button>
              <button type="button" onClick={() => setMessage("Hint cấp 1: cho tôi một gợi ý nhỏ để tự giải bài, chưa đưa đáp án.")}>Hint cấp 1</button>
              <button type="button" onClick={() => setMessage("Challenge: kiểm tra hiểu biết của tôi bằng 3 câu Socratic, hỏi từng câu một.")}>Kiểm tra tôi</button>
              <button type="button" onClick={() => setMessage("Plan: dựa vào output tuần này, cho tôi checklist ngắn và thứ tự làm tiếp theo.")}>Plan tiếp theo</button>
              <button type="button" onClick={() => setMessage("Interview: mô phỏng một câu phỏng vấn Supply Chain liên quan tuần này, chờ tôi trả lời rồi phản biện.")}>Mock interview</button>
            </div>
            <div className="side-answer" role="status" aria-live="polite" aria-busy={asking}>
              {tutorResponse ? <TutorAnswer response={tutorResponse} /> : tutorError ? <div className="inline-error"><strong>Chưa gửi được.</strong><p>{tutorError}</p></div> : <p className="tutor-placeholder">Tutor sẽ trả lời kèm nguồn tham chiếu ở đây.</p>}
            </div>
            <form onSubmit={askTutor}>
              <label className="sr-only" htmlFor={`week-${week.week}-tutor-message`}>Câu hỏi cho CTN Tutor</label>
              <textarea id={`week-${week.week}-tutor-message`} value={message} maxLength={3000} onChange={(event) => setMessage(event.target.value)} placeholder="Hỏi CTN Tutor..." required />
              <button disabled={asking || !message.trim()}>{asking ? "Đang nghĩ..." : "Gửi câu hỏi ↗"}</button>
            </form>
          </div>
          <nav className="course-outline" aria-label="Nội dung module hiện tại">
            <div><span>COURSE OUTLINE</span><Link href="/course">Xem toàn khoá →</Link></div>
            <strong>Module {week.module} · {week.moduleName}</strong>
            {curriculum.filter((item) => item.module === week.module).map((item) => (
              <Link key={item.week} href={`/week/${item.week}`} aria-current={item.week === week.week ? "page" : undefined}>
                <span>W{String(item.week).padStart(2, "0")}</span><b>{item.title}</b>{item.week === week.week ? <em>Đang học</em> : null}
              </Link>
            ))}
          </nav>
          <nav className="week-navigation" aria-label="Điều hướng giữa các tuần">
            <span>ĐIỀU HƯỚNG</span>
            {week.week > 1 ? <Link href={`/week/${week.week - 1}`}>← Tuần {String(week.week - 1).padStart(2, "0")}</Link> : null}
            {week.week < 24 ? <Link href={`/week/${week.week + 1}`}>Tuần {String(week.week + 1).padStart(2, "0")} →</Link> : null}
          </nav>
        </aside>
      </section>
    </main>
  );
}
