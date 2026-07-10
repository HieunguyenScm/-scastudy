"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { assignments, curriculum, glossary, modules } from "../lib/content";

type LanguageMode = "vi" | "en" | "bi";
type ProgressRow = {
  week: number;
  completed: boolean;
  confidence: number;
  quizScore: number | null;
};

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
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    const languageTimer = window.setTimeout(() => {
      const savedLanguage = window.localStorage.getItem("ctnascm-language");
      if (savedLanguage === "vi" || savedLanguage === "en" || savedLanguage === "bi") {
        setLanguage(savedLanguage);
      }
    }, 0);
    fetch("/api/progress")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setProgress(data.progress ?? []))
      .catch(() => setProgress([]))
      .finally(() => setLoadingProgress(false));
    return () => window.clearTimeout(languageTimer);
  }, []);

  const progressMap = useMemo(
    () => new Map(progress.map((item) => [item.week, item])),
    [progress],
  );
  const completedCount = progress.filter((item) => item.completed).length;
  const completionRate = Math.round((completedCount / 24) * 100);
  const quizScores = progress.flatMap((item) => (item.quizScore == null ? [] : [item.quizScore]));
  const averageQuiz = quizScores.length
    ? Math.round(quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length)
    : 0;
  const currentWeek = curriculum.find((week) => !progressMap.get(week.week)?.completed) ?? curriculum[23];

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

  const toggleComplete = async (week: number) => {
    const current = progressMap.get(week);
    const next: ProgressRow = {
      week,
      completed: !current?.completed,
      confidence: current?.confidence ?? 0,
      quizScore: current?.quizScore ?? null,
    };
    setProgress((rows) => [...rows.filter((row) => row.week !== week), next]);
    const response = await fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!response.ok) {
      setProgress((rows) => rows.filter((row) => row.week !== week).concat(current ? [current] : []));
    }
  };

  const askTutor = async (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim() || asking) return;
    setAsking(true);
    setAnswer("");
    try {
      const response = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, week: currentWeek.week }),
      });
      const data = await response.json();
      setAnswer(response.ok ? data.answer : data.error ?? "AI Tutor chưa phản hồi.");
    } catch {
      setAnswer("Không thể kết nối AI Tutor lúc này. Hãy thử lại sau.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand-lockup" href="/">
          <span className="brand-symbol">CT</span>
          <span><strong>ctnascm</strong><small>Chàng trai năm ấy</small></span>
        </a>
        <nav className="main-nav" aria-label="Điều hướng chính">
          <a href="#dashboard">Dashboard</a>
          <a href="#roadmap">24 tuần</a>
          <a href="/glossary">Glossary</a>
          <a href="/case-study">Case workspace</a>
        </nav>
        <div className="header-actions">
          <div className="language-switch" aria-label="Chế độ ngôn ngữ">
            {(["vi", "en", "bi"] as LanguageMode[]).map((mode) => (
              <button key={mode} className={language === mode ? "active" : ""} onClick={() => setLanguageMode(mode)}>{mode === "bi" ? "VI+EN" : mode.toUpperCase()}</button>
            ))}
          </div>
          <div className="user-chip" title={user.email}>
            <span>{user.displayName.slice(0, 1).toUpperCase()}</span>
            <div><strong>{user.displayName}</strong><a href={signOutPath}>Đăng xuất</a></div>
          </div>
        </div>
      </header>

      <section className="hero-dashboard" id="dashboard">
        <div className="hero-main">
          <div className="status-pill"><span /> PRIVATE LEARNING OS · 24 WEEKS</div>
          <p className="kicker">SUPPLY CHAIN AI · DEMAND PLANNING · FMCG</p>
          <h1>{label(language, "Từ intern đến", "From intern to")}<br /><em>Supply Chain AI.</em></h1>
          <p className="hero-description">
            {label(
              language,
              "Một hệ thống học 6 tháng, đi từ nền tảng tới forecasting, planning, optimization và portfolio có thể bảo vệ trong phỏng vấn.",
              "A six-month learning system from fundamentals to forecasting, planning, optimization and an interview-ready portfolio.",
            )}
          </p>
          <div className="hero-buttons">
            <a className="primary-action" href={`/week/${currentWeek.week}`}>Tiếp tục tuần {String(currentWeek.week).padStart(2, "0")} <span>→</span></a>
            <a className="secondary-action" href="#roadmap">Xem toàn bộ roadmap</a>
          </div>
        </div>
        <div className="control-tower" aria-label="Minh họa control tower">
          <div className="tower-top"><span>LEARNING CONTROL TOWER</span><b>LIVE</b></div>
          <div className="tower-core">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="tower-node node-one">DATA</div>
            <div className="tower-node node-two">PLAN</div>
            <div className="tower-node node-three">AI</div>
            <div className="tower-center"><strong>{completionRate}%</strong><small>COMPLETE</small></div>
          </div>
          <div className="tower-bottom"><span>Global · FMCG</span><span>Updated now</span></div>
        </div>
      </section>

      <section className="metric-grid" aria-label="Chỉ số tiến độ">
        <article><span className="metric-label">TIẾN ĐỘ</span><strong>{String(completedCount).padStart(2, "0")}<small>/24 tuần</small></strong><div className="meter"><i style={{ width: `${completionRate}%` }} /></div></article>
        <article><span className="metric-label">QUIZ SCORE</span><strong>{averageQuiz || "--"}<small>{averageQuiz ? "%" : "chưa có"}</small></strong><p>{quizScores.length} module đã đánh giá</p></article>
        <article><span className="metric-label">PORTFOLIO</span><strong>03<small>projects</small></strong><p>Demand · Planning · AI</p></article>
        <article><span className="metric-label">STACK</span><strong>06<small>tools</small></strong><p>Excel · SQL · BI · Python · AnyLogic · AI</p></article>
      </section>

      <section className="section-block current-focus">
        <div className="section-title-row">
          <div><p className="kicker">CURRENT FOCUS</p><h2>Tuần tiếp theo của mày</h2></div>
          <span>{loadingProgress ? "Đang đồng bộ..." : "Tiến độ đã đồng bộ"}</span>
        </div>
        <div className="focus-grid">
          <article className="focus-card">
            <div className="week-badge">W{String(currentWeek.week).padStart(2, "0")}</div>
            <div className="focus-copy">
              <p>{currentWeek.moduleName}</p>
              <h3>{language === "en" ? currentWeek.titleEn : currentWeek.title}</h3>
              {language === "bi" && <small className="translation-line">{currentWeek.titleEn}</small>}
              <p className="focus-summary">{language === "en" ? currentWeek.summaryEn : currentWeek.summary}</p>
              {language === "bi" && <p className="focus-summary en-copy">{currentWeek.summaryEn}</p>}
              <div className="tag-row">{currentWeek.tools.map((tool) => <span key={tool}>{tool}</span>)}<span>{currentWeek.hours}</span></div>
            </div>
            <a className="round-link" href={`/week/${currentWeek.week}`} aria-label={`Mở tuần ${currentWeek.week}`}>↗</a>
          </article>
          <article className="deliverable-card">
            <p className="kicker">WEEKLY OUTPUT</p>
            <h3>{currentWeek.deliverable}</h3>
            <p>{currentWeek.portfolio}</p>
            <button onClick={() => toggleComplete(currentWeek.week)} className={progressMap.get(currentWeek.week)?.completed ? "complete-button done" : "complete-button"}>
              {progressMap.get(currentWeek.week)?.completed ? "✓ Đã hoàn thành" : "Đánh dấu hoàn thành"}
            </button>
          </article>
        </div>
      </section>

      <section className="section-block" id="roadmap">
        <div className="section-title-row roadmap-title">
          <div><p className="kicker">THE ROADMAP</p><h2>24 tuần, 6 năng lực</h2></div>
          <p>Bộ lọc giúp mày tìm theo tuần, thuật ngữ hoặc tool.</p>
        </div>
        <div className="search-toolbar">
          <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm forecasting, SQL, inventory..." /></label>
          <div className="filter-chips"><button className={moduleFilter === 0 ? "active" : ""} onClick={() => setModuleFilter(0)}>Tất cả</button>{modules.map((module) => <button key={module.id} className={moduleFilter === module.id ? "active" : ""} onClick={() => setModuleFilter(module.id)}>M{module.id}</button>)}</div>
        </div>

        <div className="module-grid">
          {modules.map((module, index) => {
            const moduleWeeks = curriculum.filter((week) => week.module === module.id);
            const moduleCompleted = moduleWeeks.filter((week) => progressMap.get(week.week)?.completed).length;
            const assignment = assignments.find((item) => item.module === module.id);
            return (
              <article className={`module-card ${moduleMeta[index].accent}`} key={module.id}>
                <div className="module-card-head"><span>{moduleMeta[index].icon}</span><b>{moduleMeta[index].code}</b><small>{moduleCompleted}/4</small></div>
                <h3>{module.name}</h3>
                <p>Tuần {String(moduleWeeks[0].week).padStart(2, "0")}—{String(moduleWeeks[3].week).padStart(2, "0")}</p>
                <div className="module-progress"><i style={{ width: `${moduleCompleted * 25}%` }} /></div>
                <strong>{assignment?.title}</strong>
              </article>
            );
          })}
        </div>

        <div className="week-list">
          {filteredWeeks.map((week) => {
            const row = progressMap.get(week.week);
            return (
              <article className={row?.completed ? "week-row completed" : "week-row"} key={week.week}>
                <button className="week-check" onClick={() => toggleComplete(week.week)} aria-label={`Đánh dấu tuần ${week.week}`}>{row?.completed ? "✓" : ""}</button>
                <span className="week-number">W{String(week.week).padStart(2, "0")}</span>
                <div className="week-copy"><p>M{week.module} · {week.moduleName}</p><a href={`/week/${week.week}`}>{language === "en" ? week.titleEn : week.title}</a>{language === "bi" && <small>{week.titleEn}</small>}</div>
                <div className="week-tools">{week.tools.slice(0, 3).map((tool) => <span key={tool}>{tool}</span>)}</div>
                <span className="week-time">{week.hours}</span>
                <a className="week-open" href={`/week/${week.week}`}>Mở →</a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section-block assignment-section">
        <div className="section-title-row"><div><p className="kicker">PORTFOLIO SYSTEM</p><h2>6 assignment, 3 project lớn</h2></div><a href="/case-study">Mở Case workspace →</a></div>
        <div className="assignment-grid">
          {assignments.map((assignment) => (
            <article key={assignment.module}><span>MODULE {assignment.module} · W{assignment.weeks}</span><h3>{assignment.title}</h3><p>{assignment.brief}</p><ul>{assignment.outputs.slice(0, 3).map((output) => <li key={output}>{output}</li>)}</ul></article>
          ))}
        </div>
      </section>

      <section className="section-block tutor-section">
        <div className="tutor-intro"><p className="kicker">AI STUDY COMPANION</p><h2>Hỏi CTN Tutor</h2><p>AI hiểu roadmap hiện tại và giải thích bằng tiếng Việt, với thuật ngữ Supply Chain bằng English.</p><div className="tutor-prompt-list"><button onClick={() => setMessage("Giải thích bài tuần này bằng ví dụ FMCG thật đơn giản.")}>Giải thích bằng ví dụ FMCG</button><button onClick={() => setMessage("Cho tao một bài tập 20 phút và tiêu chí tự chấm.")}>Tạo bài tập 20 phút</button><button onClick={() => setMessage("Hỏi tao 5 câu phỏng vấn liên quan tới tuần này.")}>Mock interview</button></div></div>
        <div className="tutor-console">
          <div className="console-head"><span><i /> CTN TUTOR</span><small>Powered by OpenAI</small></div>
          <div className="console-body">
            {answer ? <div className="tutor-answer">{answer}</div> : <div className="tutor-empty"><b>W{String(currentWeek.week).padStart(2, "0")}</b><p>Tao đang có context của tuần <strong>{currentWeek.title}</strong>. Hỏi bất cứ điều gì mày chưa rõ.</p></div>}
          </div>
          <form onSubmit={askTutor} className="tutor-form"><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Ví dụ: Safety stock khác reorder point thế nào?" /><button disabled={asking}>{asking ? "Đang nghĩ..." : "Gửi ↗"}</button></form>
        </div>
      </section>

      <section className="section-block glossary-strip">
        <div><p className="kicker">GLOSSARY</p><h2>Ngôn ngữ Supply Chain</h2><p>{glossary.length} thuật ngữ có định nghĩa tiếng Việt và ví dụ.</p><a href="/glossary">Mở toàn bộ glossary →</a></div>
        <div className="term-cloud">{glossary.slice(0, 18).map((item) => <span key={item.term}>{item.term}</span>)}</div>
      </section>

      <footer className="site-footer"><div className="brand-lockup"><span className="brand-symbol">CT</span><span><strong>ctnascm</strong><small>Private Supply Chain Learning OS</small></span></div><p>Built from 13 core references · Vietnamese-first · Global FMCG context</p><span>© 2026 Chàng trai năm ấy</span></footer>
    </main>
  );
}
