"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { assignments, curriculum, glossary, modules } from "../lib/content";
import SiteNavigation, { type LanguageMode } from "./site-navigation";
import TutorAnswer, { type TutorPayload } from "./tutor-answer";

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
};
type SubmissionRow = { week: number; status: string; latestVersion: number };
type LearningStats = { encountered: number; applied: number; retained: number; retrievalPasses: number; revisions: number; confidenceGap: number | null; activeDays: number };

const moduleMeta = [
  { code: "FOUNDATION", icon: "01", accent: "cyan" },
  { code: "DATA & BI", icon: "02", accent: "blue" },
  { code: "DEMAND", icon: "03", accent: "violet" },
  { code: "PLANNING", icon: "04", accent: "amber" },
  { code: "OPTIMIZE", icon: "05", accent: "coral" },
  { code: "AI & CAREER", icon: "06", accent: "green" },
];

function label(mode: LanguageMode, vi: string, en: string) {
  if (mode === "vi") return vi;
  if (mode === "en") return en;
  return `${vi} · ${en}`;
}

function normalizeProgress(item: Partial<ProgressRow>): ProgressRow {
  return {
    week: Number(item.week),
    completed: Boolean(item.completed),
    confidence: Number(item.confidence ?? 0),
    quizScore: item.quizScore == null ? null : Number(item.quizScore),
    practiceMask: Number(item.practiceMask ?? 0),
    reflection: String(item.reflection ?? ""),
    masteryStatus: String(item.masteryStatus ?? "not_started"),
    reviewCount: Number(item.reviewCount ?? 0),
    lastReviewedAt: item.lastReviewedAt ?? null,
    nextReviewAt: item.nextReviewAt ?? null,
  };
}

function isMastered(status: string) {
  return status.toLowerCase().includes("mastered");
}

function masteryLabel(status: string) {
  const normalized = status.toLowerCase().replaceAll("-", "_");
  if (normalized.includes("mastered")) return "Retained";
  if (normalized.includes("completed")) return "Applied";
  if (normalized.includes("due")) return "Cần ôn";
  if (normalized.includes("review")) return "Đang ôn";
  if (normalized.includes("learning") || normalized.includes("progress")) return "Encountered";
  return "Chưa bắt đầu";
}

function dueLabel(value: string, now: number) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Đến hạn ôn";
  const overdueDays = Math.max(0, Math.floor((now - timestamp) / 86_400_000));
  if (overdueDays === 0) return "Đến hạn hôm nay";
  return `Quá hạn ${overdueDays} ngày`;
}

export default function DashboardClient({
  user,
  signOutPath,
}: {
  user: { displayName: string; email: string };
  signOutPath: string;
}) {
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [query, setQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState(0);
  const [language, setLanguage] = useState<LanguageMode>("vi");
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [progressMessage, setProgressMessage] = useState("Đang đồng bộ tiến độ...");
  const [progressError, setProgressError] = useState(false);
  const [reviewClock, setReviewClock] = useState(0);
  const [message, setMessage] = useState("");
  const [tutorResponse, setTutorResponse] = useState<TutorPayload | null>(null);
  const [tutorError, setTutorError] = useState("");
  const [asking, setAsking] = useState(false);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [learningStats, setLearningStats] = useState<LearningStats>({ encountered: 0, applied: 0, retained: 0, retrievalPasses: 0, revisions: 0, confidenceGap: null, activeDays: 0 });

  const loadProgress = useCallback(async (signal?: AbortSignal) => {
    setLoadingProgress(true);
    setProgressError(false);
    setProgressMessage("Đang đồng bộ tiến độ...");
    try {
      const response = await fetch("/api/progress", { signal });
      const data = (await response.json().catch(() => ({}))) as {
        progress?: Partial<ProgressRow>[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Không thể tải tiến độ.");
      const rows = Array.isArray(data.progress)
        ? data.progress
          .map(normalizeProgress)
          .filter((row) => Number.isInteger(row.week) && row.week >= 1 && row.week <= 24)
        : [];
      setProgress(rows);
      setReviewClock(Date.now());
      setProgressMessage("Tiến độ đã đồng bộ");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setProgressError(true);
      setProgressMessage(error instanceof Error ? error.message : "Không thể tải tiến độ.");
    } finally {
      if (!signal?.aborted) setLoadingProgress(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const savedLanguage = window.localStorage.getItem("ctnascm-language");
      if (savedLanguage === "vi" || savedLanguage === "en" || savedLanguage === "bi") {
        setLanguage(savedLanguage);
      }
      void loadProgress(controller.signal);
      void fetch("/api/submissions").then((response) => response.json() as Promise<{ submissions?: SubmissionRow[] }>).then((data) => setSubmissions(Array.isArray(data.submissions) ? data.submissions : [])).catch(() => setSubmissions([]));
      void fetch("/api/learning-stats").then((response) => response.json() as Promise<{ stats?: LearningStats }>).then((data) => data.stats && setLearningStats(data.stats)).catch(() => undefined);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadProgress]);

  const progressMap = useMemo(
    () => new Map(progress.map((item) => [item.week, item])),
    [progress],
  );
  const completedCount = progress.filter((item) => item.completed).length;
  const masteredCount = progress.filter((item) => isMastered(item.masteryStatus)).length;
  const completionRate = Math.round((completedCount / 24) * 100);
  const encounteredRate = Math.round((learningStats.encountered / 24) * 100);
  const dueReviews = useMemo(() => progress
    .filter((row) => {
      if (!row.completed || !row.nextReviewAt) return false;
      const dueAt = new Date(row.nextReviewAt).getTime();
      return Number.isFinite(dueAt) && reviewClock > 0 && dueAt <= reviewClock;
    })
    .sort((a, b) => new Date(a.nextReviewAt ?? 0).getTime() - new Date(b.nextReviewAt ?? 0).getTime()), [progress, reviewClock]);
  const currentWeek = curriculum.find((week) => !progressMap.get(week.week)?.completed) ?? curriculum[23];
  const currentSubmission = submissions.find((item) => item.week === currentWeek.week);
  const currentProgress = progressMap.get(currentWeek.week);
  const nextAction = dueReviews[0]
    ? { href: `/week/${dueReviews[0].week}#retrieval-practice`, label: `Ôn retrieval tuần ${String(dueReviews[0].week).padStart(2, "0")}` }
    : currentSubmission?.status === "submitted"
      ? { href: `/week/${currentWeek.week}#submission-workspace`, label: "Request mentor review" }
      : currentSubmission?.status === "needs-revision"
        ? { href: `/week/${currentWeek.week}#submission-workspace`, label: "Sửa bài theo feedback" }
        : currentProgress
          ? { href: `/week/${currentWeek.week}`, label: `Tiếp tục tuần ${String(currentWeek.week).padStart(2, "0")}` }
          : { href: `/week/${currentWeek.week}`, label: `Bắt đầu tuần ${String(currentWeek.week).padStart(2, "0")}` };

  const filteredWeeks = curriculum.filter((week) => {
    if (moduleFilter && week.module !== moduleFilter) return false;
    const haystack = [week.title, week.titleEn, week.moduleName, ...week.tools, ...week.concepts]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  const setLanguageMode = (mode: LanguageMode) => {
    setLanguage(mode);
    window.localStorage.setItem("ctnascm-language", mode);
  };

  const askTutor = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim() || asking) return;
    setAsking(true);
    setTutorResponse(null);
    setTutorError("");
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, week: currentWeek.week }),
      });
      const data = (await response.json().catch(() => ({}))) as Partial<TutorPayload> & { error?: string };
      if (!response.ok || !data.answer) {
        throw new Error(data.error ?? "AI Tutor chưa phản hồi.");
      }
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
    <>
      <SiteNavigation
        current="dashboard"
        user={user}
        signOutPath={signOutPath}
        language={language}
        onLanguageChange={setLanguageMode}
      />
      <main className="app-shell" id="main-content">
        <section className="hero-dashboard" id="dashboard">
          <div className="hero-main">
            <div className="status-pill"><span /> PRIVATE LEARNING OS · 24 WEEKS</div>
            <p className="kicker">SUPPLY CHAIN AI · DEMAND PLANNING · FMCG</p>
            <h1><span>{label(language, "Từ intern đến", "From intern to")} </span><br /><em>Supply Chain AI.</em></h1>
            <p className="hero-description">
              {label(
                language,
                "Một hệ thống học 6 tháng, đi từ nền tảng tới forecasting, planning, optimization và portfolio có thể bảo vệ trong phỏng vấn.",
                "A six-month learning system from fundamentals to forecasting, planning, optimization and an interview-ready portfolio.",
              )}
            </p>
            <div className="hero-buttons">
              <Link className="primary-action" href={nextAction.href}>
                {nextAction.label} <span>→</span>
              </Link>
              <Link className="secondary-action" href="/course">Mở Course Home</Link>
            </div>
          </div>
          <div className="control-tower" aria-label={`Đã hoàn thành ${completionRate}% lộ trình`}>
            <div className="tower-top"><span>LEARNING CONTROL TOWER</span><b>LIVE</b></div>
            <div className="tower-core">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="tower-node node-one">DATA</div>
              <div className="tower-node node-two">PLAN</div>
              <div className="tower-node node-three">AI</div>
              <div className="tower-center"><strong>{completionRate}%</strong><small>COMPLETE</small></div>
            </div>
            <div className="tower-bottom"><span>{masteredCount} retained</span><span>{dueReviews.length} review due</span></div>
          </div>
        </section>

        <section className="metric-grid" aria-label="Chỉ số tiến độ">
          <article>
            <span className="metric-label">ENCOUNTERED · ĐÃ HỌC</span>
            <strong>{String(learningStats.encountered).padStart(2, "0")}<small>/24 tuần</small></strong>
            <div className="meter" aria-hidden="true"><i style={{ width: `${encounteredRate}%` }} /></div>
          </article>
          <article>
            <span className="metric-label">APPLIED · EVIDENCE ĐẠT</span>
            <strong>{String(learningStats.applied).padStart(2, "0")}<small>/24 tuần</small></strong>
            <p>{learningStats.revisions} bài đã có revision</p>
          </article>
          <article>
            <span className="metric-label">RETAINED · NHỚ VÀ TRANSFER</span>
            <strong>{String(learningStats.retained).padStart(2, "0")}<small>/24 tuần</small></strong>
            <p>{learningStats.retrievalPasses} retrieval pass · calibration gap {learningStats.confidenceGap ?? "--"}</p>
          </article>
          <article className={dueReviews.length ? "metric-urgent" : ""}>
            <span className="metric-label">LEARNING RHYTHM</span>
            <strong>{learningStats.activeDays}<small>/3 ngày tuần này</small></strong>
            <p>{dueReviews.length ? `${dueReviews.length} retrieval đang đến hạn` : "Nhịp học không bị phạt nếu nghỉ"}</p>
          </article>
        </section>

        <section className={`review-queue ${dueReviews.length ? "has-due" : ""}`} aria-labelledby="review-queue-title">
          <div className="review-queue-copy">
            <p className="kicker">SPACED REVIEW QUEUE</p>
            <h2 id="review-queue-title">{dueReviews.length ? "Ôn trước khi quên." : "Review queue đang sạch."}</h2>
            <p>
              {dueReviews.length
                ? `${dueReviews.length} tuần đã tới lịch củng cố. Mở bài, tự trả lời retrieval prompt rồi xem feedback.`
                : "Khi một tuần tới hạn, nó sẽ xuất hiện ở đây theo thứ tự ưu tiên."}
            </p>
          </div>
          <div className="review-queue-list">
            {dueReviews.length ? dueReviews.map((row) => {
              const lesson = curriculum.find((item) => item.week === row.week);
              if (!lesson || !row.nextReviewAt) return null;
              return (
                <Link key={row.week} href={`/week/${row.week}`} className="review-queue-item">
                  <span>W{String(row.week).padStart(2, "0")}</span>
                  <div><strong>{lesson.title}</strong><time dateTime={row.nextReviewAt}>{dueLabel(row.nextReviewAt, reviewClock)}</time></div>
                  <b>Ôn ngay →</b>
                </Link>
              );
            }) : <p className="empty-state compact">Chưa có bài cần ôn. Cứ tiếp tục tuần hiện tại.</p>}
          </div>
        </section>

        <section className="section-block current-focus">
          <div className="section-title-row">
            <div><p className="kicker">CURRENT FOCUS</p><h2>Tuần tiếp theo của bạn</h2></div>
            <div className={`sync-inline ${progressError ? "error" : ""}`} role="status" aria-live="polite">
              <span>{progressMessage}</span>
              {progressError ? <button type="button" onClick={() => void loadProgress()}>Thử lại</button> : null}
            </div>
          </div>
          <div className="focus-grid" aria-busy={loadingProgress}>
            <article className="focus-card">
              <div className="week-badge">W{String(currentWeek.week).padStart(2, "0")}</div>
              <div className="focus-copy">
                <p>{currentWeek.moduleName}</p>
                <h3>{language === "en" ? currentWeek.titleEn : currentWeek.title}</h3>
                {language === "bi" ? <small className="translation-line">{currentWeek.titleEn}</small> : null}
                <p className="focus-summary">{language === "en" ? currentWeek.summaryEn : currentWeek.summary}</p>
                {language === "bi" ? <p className="focus-summary en-copy">{currentWeek.summaryEn}</p> : null}
                <div className="tag-row">{currentWeek.tools.map((tool) => <span key={tool}>{tool}</span>)}<span>{currentWeek.hours}</span></div>
              </div>
              <Link className="round-link" href={`/week/${currentWeek.week}`} aria-label={`Mở tuần ${currentWeek.week}`}>↗</Link>
            </article>
            <article className="deliverable-card">
              <p className="kicker">WEEKLY OUTPUT</p>
              <h3>{currentWeek.deliverable}</h3>
              <p>{currentWeek.portfolio}</p>
                  <Link className="complete-button" href={nextAction.href}>
                {nextAction.label} →
              </Link>
            </article>
          </div>
        </section>

        <section className="section-block" id="roadmap">
          <div className="section-title-row roadmap-title">
            <div><p className="kicker">THE ROADMAP</p><h2>24 tuần, 6 năng lực</h2></div>
            <p>Encountered là đã học; Applied là evidence đã đạt; Retained là retrieval và transfer thành công.</p>
          </div>

          <div className="module-grid">
            {modules.map((module, index) => {
              const moduleWeeks = curriculum.filter((week) => week.module === module.id);
              const moduleCompleted = moduleWeeks.filter((week) => progressMap.get(week.week)?.completed).length;
              const moduleMastered = moduleWeeks.filter((week) => isMastered(progressMap.get(week.week)?.masteryStatus ?? "")).length;
              const assignment = assignments.find((item) => item.module === module.id);
              return (
                <article className={`module-card ${moduleMeta[index].accent}`} key={module.id}>
                  <div className="module-card-head"><span>{moduleMeta[index].icon}</span><b>{moduleMeta[index].code}</b><small>{moduleCompleted}/4 applied</small></div>
                  <h3>{module.name}</h3>
                  <p>Tuần {String(moduleWeeks[0].week).padStart(2, "0")}—{String(moduleWeeks[3].week).padStart(2, "0")}</p>
                  <div className="module-progress" aria-label={`${moduleCompleted} trên 4 tuần hoàn thành`}><i style={{ width: `${moduleCompleted * 25}%` }} /></div>
                  <strong>{moduleMastered}/4 retained · {assignment?.title}</strong>
                  <Link className="module-boss-link" href={`/boss/${module.id}`}>Mở Boss Challenge →</Link>
                </article>
              );
            })}
          </div>

          <details className="roadmap-disclosure">
            <summary>
              <span>Xem và tìm trong 24 tuần</span>
              <small>Filter theo module, thuật ngữ hoặc tool</small>
            </summary>
            <div className="roadmap-disclosure-body">
              <div className="search-toolbar">
                <label className="search-box" htmlFor="roadmap-search">
                  <span aria-hidden="true">⌕</span>
                  <span className="sr-only">Tìm trong lộ trình</span>
                  <input id="roadmap-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm forecasting, SQL, inventory..." />
                </label>
                <div className="filter-chips" role="group" aria-label="Lọc theo module">
                  <button type="button" aria-pressed={moduleFilter === 0} className={moduleFilter === 0 ? "active" : ""} onClick={() => setModuleFilter(0)}>Tất cả</button>
                  {modules.map((module) => (
                    <button type="button" key={module.id} aria-pressed={moduleFilter === module.id} className={moduleFilter === module.id ? "active" : ""} onClick={() => setModuleFilter(module.id)}>M{module.id}</button>
                  ))}
                </div>
              </div>

              <div className="week-list">
                {filteredWeeks.length ? filteredWeeks.map((week) => {
                  const row = progressMap.get(week.week);
                  const mastered = isMastered(row?.masteryStatus ?? "");
                  return (
                    <article className={`${row?.completed ? "completed" : ""} ${mastered ? "mastered" : ""} week-row`} key={week.week}>
                      <span className="week-check" aria-hidden="true">{mastered ? "◆" : row?.completed ? "✓" : ""}</span>
                      <span className="sr-only">{mastered ? "Đã mastery" : row?.completed ? "Đã hoàn thành" : "Chưa hoàn thành"}</span>
                      <span className="week-number">W{String(week.week).padStart(2, "0")}</span>
                      <div className="week-copy">
                        <p>M{week.module} · {week.moduleName}</p>
                        <Link href={`/week/${week.week}`} aria-current={week.week === currentWeek.week ? "step" : undefined}>{language === "en" ? week.titleEn : week.title}</Link>
                        {language === "bi" ? <small>{week.titleEn}</small> : null}
                      </div>
                      <div className="week-tools">{week.tools.slice(0, 3).map((tool) => <span key={tool}>{tool}</span>)}<span>{week.hours}</span></div>
                      <div className="week-status-stack">
                        <span className={row?.completed ? "completion-chip done" : "completion-chip"}>{row?.completed ? "Applied" : row ? "Encountered" : "Not started"}</span>
                        <span className={mastered ? "mastery-chip mastered" : "mastery-chip"}>{masteryLabel(row?.masteryStatus ?? "")}</span>
                      </div>
                      <Link className="week-open" href={`/week/${week.week}`}>Mở →</Link>
                    </article>
                  );
                }) : <p className="empty-state">Không có tuần nào khớp bộ lọc này.</p>}
              </div>
            </div>
          </details>
        </section>

        <section className="section-block assignment-section">
          <details className="portfolio-disclosure">
            <summary>
              <div><p className="kicker">PORTFOLIO SYSTEM</p><h2>6 assignment, 3 project lớn</h2></div>
              <span>Xem assignment +</span>
            </summary>
            <div className="assignment-grid">
              {assignments.map((assignment) => (
                <article key={assignment.module}>
                  <span>MODULE {assignment.module} · W{assignment.weeks}</span>
                  <h3>{assignment.title}</h3>
                  <p>{assignment.brief}</p>
                  <ul>{assignment.outputs.slice(0, 3).map((output) => <li key={output}>{output}</li>)}</ul>
                </article>
              ))}
            </div>
            <Link className="disclosure-action" href="/case-study">Mở Case workspace →</Link>
          </details>
        </section>

        <section className="section-block tutor-section">
          <div className="tutor-intro">
            <p className="kicker">AI STUDY COMPANION</p>
            <h2>Hỏi CTN Tutor</h2>
            <p>AI hiểu roadmap hiện tại, giải thích bằng tiếng Việt và chỉ rõ nguồn đã dùng.</p>
            <div className="tutor-prompt-list">
              <button type="button" onClick={() => setMessage("Giải thích bài tuần này bằng ví dụ FMCG thật đơn giản.")}>Giải thích bằng ví dụ FMCG</button>
              <button type="button" onClick={() => setMessage("Cho tôi một bài tập 20 phút và tiêu chí tự chấm.")}>Tạo bài tập 20 phút</button>
              <button type="button" onClick={() => setMessage("Hỏi tôi 5 câu phỏng vấn liên quan tới tuần này.")}>Mock interview</button>
            </div>
          </div>
          <div className="tutor-console">
            <div className="console-head"><span><i /> CTN TUTOR</span><small>Source-aware</small></div>
            <div className="console-body" role="status" aria-live="polite" aria-busy={asking}>
              {tutorResponse ? <TutorAnswer response={tutorResponse} /> : tutorError ? (
                <div className="inline-error"><strong>Chưa gửi được câu hỏi.</strong><p>{tutorError}</p></div>
              ) : (
                <div className="tutor-empty"><b>W{String(currentWeek.week).padStart(2, "0")}</b><p>Trợ lý đang có context của tuần <strong>{currentWeek.title}</strong>. Hỏi bất cứ điều gì bạn chưa rõ.</p></div>
              )}
            </div>
            <form onSubmit={askTutor} className="tutor-form">
              <label className="sr-only" htmlFor="dashboard-tutor-message">Câu hỏi cho CTN Tutor</label>
              <textarea id="dashboard-tutor-message" value={message} maxLength={3000} onChange={(event) => setMessage(event.target.value)} placeholder="Ví dụ: Safety stock khác reorder point thế nào?" required />
              <button disabled={asking || !message.trim()}>{asking ? "Đang nghĩ..." : "Gửi ↗"}</button>
            </form>
          </div>
        </section>

        <section className="section-block glossary-strip">
          <div><p className="kicker">GLOSSARY</p><h2>Ngôn ngữ Supply Chain</h2><p>{glossary.length} thuật ngữ có định nghĩa tiếng Việt và ví dụ.</p><Link href="/glossary">Mở toàn bộ glossary →</Link></div>
          <div className="term-cloud">{glossary.slice(0, 18).map((item) => <span key={item.term}>{item.term}</span>)}</div>
        </section>

        <footer className="site-footer">
          <div className="brand-lockup"><span className="brand-symbol">CT</span><span><strong>ctnascm</strong><small>Private Supply Chain Learning OS</small></span></div>
          <p>Built from 13 core references · Vietnamese-first · Global FMCG context</p>
          <span>© 2026 Chàng trai năm ấy</span>
        </footer>
      </main>
    </>
  );
}
