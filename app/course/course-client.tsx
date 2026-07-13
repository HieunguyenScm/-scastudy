"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { assignments, curriculum, modules } from "../../lib/content";

type Settings = { startDate: string; weeklyHours: number; updatedAt?: string };
type ProgressRow = {
  week: number;
  completed: boolean;
  masteryStatus: string;
  lessonComplete?: boolean;
  completedLessonBlocks?: number;
  requiredLessonBlocks?: number;
  quizScore: number | null;
};
type SubmissionRow = { week: number; status: string; title: string; latestVersion: number };
type LabRow = { week: number; score: number; passed: boolean; attemptCount: number };
type LabHistoryRow = { week: number; score: number; passed: boolean; createdAt: string };
type QuizRow = { module: number; score: number; correct: number; total: number; createdAt: string };
type CaseRow = { id: number; assignmentModule: number | null; stage: string; title: string; updatedAt: string };
type CourseState = {
  settings: Settings;
  progress: ProgressRow[];
  submissions: SubmissionRow[];
  labs: LabRow[];
  labHistory: LabHistoryRow[];
  quizzes: QuizRow[];
  cases: CaseRow[];
};

const emptyState: CourseState = {
  settings: { startDate: new Date().toISOString().slice(0, 10), weeklyHours: 6 },
  progress: [], submissions: [], labs: [], labHistory: [], quizzes: [], cases: [],
};

export default function CourseClient({ learnerName }: { learnerName: string }) {
  const [state, setState] = useState<CourseState>(emptyState);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("Đang tải hồ sơ khoá học...");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<Settings>(emptyState.settings);

  const loadCourse = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/course-state", { signal });
      const data = (await response.json().catch(() => ({}))) as Partial<CourseState> & { error?: string };
      if (!response.ok || !data.settings) throw new Error(data.error ?? "Không thể tải khoá học.");
      const next: CourseState = {
        settings: data.settings,
        progress: Array.isArray(data.progress) ? data.progress : [],
        submissions: Array.isArray(data.submissions) ? data.submissions : [],
        labs: Array.isArray(data.labs) ? data.labs : [],
        labHistory: Array.isArray(data.labHistory) ? data.labHistory : [],
        quizzes: Array.isArray(data.quizzes) ? data.quizzes : [],
        cases: Array.isArray(data.cases) ? data.cases : [],
      };
      setState(next);
      setSettingsDraft(next.settings);
      setStatus("Hồ sơ khoá học đã đồng bộ.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setStatus(error instanceof Error ? error.message : "Không thể tải khoá học.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadCourse(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadCourse]);

  const progressMap = useMemo(() => new Map(state.progress.map((row) => [row.week, row])), [state.progress]);
  const submissionMap = useMemo(() => new Map(state.submissions.map((row) => [row.week, row])), [state.submissions]);
  const labMap = useMemo(() => new Map(state.labs.map((row) => [row.week, row])), [state.labs]);
  const bestQuizMap = useMemo(() => {
    const map = new Map<number, QuizRow>();
    state.quizzes.forEach((row) => {
      if (!map.has(row.module) || row.score > map.get(row.module)!.score) map.set(row.module, row);
    });
    return map;
  }, [state.quizzes]);
  const portfolioCaseMap = useMemo(() => {
    const map = new Map<number, CaseRow>();
    state.cases.forEach((row) => {
      if (row.assignmentModule && (!map.has(row.assignmentModule) || row.stage === "Portfolio-ready")) map.set(row.assignmentModule, row);
    });
    return map;
  }, [state.cases]);

  const appliedCount = state.progress.filter((row) => row.completed).length;
  const retainedCount = state.progress.filter((row) => isMastered(row.masteryStatus)).length;
  const lessonCount = state.progress.filter((row) => row.lessonComplete).length;
  const labPassedCount = state.labs.filter((row) => row.passed).length;
  const evidencePassedCount = state.submissions.filter((row) => row.status === "passed" || row.status === "portfolio-ready").length;
  const quizPassedCount = Array.from(bestQuizMap.values()).filter((row) => row.score >= 80).length;
  const portfolioReadyCount = Array.from(portfolioCaseMap.values()).filter((row) => row.stage === "Portfolio-ready").length;
  const milestoneCount = lessonCount + labPassedCount + evidencePassedCount + appliedCount;
  const overallPercent = Math.round((milestoneCount / (24 * 4)) * 100);
  const currentWeek = curriculum.find((week) => !progressMap.get(week.week)?.completed) ?? curriculum[23];
  const currentSubmission = submissionMap.get(currentWeek.week);
  const nextAction = getNextAction(currentWeek.week, progressMap.get(currentWeek.week), labMap.get(currentWeek.week), currentSubmission);
  const targetDate = addDays(state.settings.startDate, 24 * 7 - 1);
  const certificateReady = appliedCount === 24 && labPassedCount === 24 && quizPassedCount === 6 && portfolioReadyCount === 6;

  const saveSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (savingSettings) return;
    setSavingSettings(true);
    setStatus("Đang cập nhật lịch học...");
    try {
      const response = await fetch("/api/course-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: settingsDraft.startDate, weeklyHours: Number(settingsDraft.weeklyHours) }),
      });
      const data = (await response.json().catch(() => ({}))) as { settings?: Settings; error?: string };
      if (!response.ok || !data.settings) throw new Error(data.error ?? "Không thể lưu lịch học.");
      setState((current) => ({ ...current, settings: data.settings! }));
      setSettingsDraft(data.settings);
      setStatus("Đã cập nhật deadline cho toàn bộ 24 tuần.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không thể lưu lịch học.");
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <main className="course-shell" id="main-content">
      <section className="course-hero">
        <div className="course-hero-copy">
          <p className="kicker">PRIVATE PROFESSIONAL CERTIFICATE</p>
          <h1>Supply Chain &amp; AI<br />Professional Path</h1>
          <p>Học từ bộ tài liệu đã cung cấp, thực hành trên FMCG synthetic data, nộp evidence và chỉ tiến cấp khi đạt rubric.</p>
          <div className="course-meta"><span>24 tuần</span><span>6 modules</span><span>{state.settings.weeklyHours} giờ/tuần</span><span>Vietnamese + English terms</span></div>
          <div className="course-hero-actions">
            <Link className="primary-action" href={nextAction.href}>{nextAction.label} →</Link>
            <a className="secondary-button" href="#syllabus">Xem syllabus</a>
          </div>
        </div>
        <aside className="course-progress-card" aria-label={`Tiến độ tổng thể ${overallPercent}%`}>
          <div className="course-progress-ring" style={{ "--course-progress": `${overallPercent * 3.6}deg` } as CSSProperties}>
            <span><strong>{overallPercent}%</strong><small>course progress</small></span>
          </div>
          <dl>
            <div><dt>Applied</dt><dd>{appliedCount}/24</dd></div>
            <div><dt>Retained</dt><dd>{retainedCount}/24</dd></div>
            <div><dt>Target finish</dt><dd>{formatDate(targetDate)}</dd></div>
          </dl>
        </aside>
      </section>

      <nav className="course-tabs" aria-label="Mục trong khoá học">
        <a href="#overview">Tổng quan</a><a href="#syllabus">Nội dung</a><a href="#gradebook">Điểm</a><a href="#certificate">Chứng nhận</a>
      </nav>

      <div className="course-container">
        <section className="course-next-action" id="overview">
          <div>
            <p className="kicker">TIẾP TỤC HỌC</p>
            <span>WEEK {String(currentWeek.week).padStart(2, "0")} · MODULE {currentWeek.module}</span>
            <h2>{currentWeek.title}</h2>
            <p>{nextAction.reason}</p>
          </div>
          <Link href={nextAction.href}>{nextAction.label}<span>→</span></Link>
        </section>

        <section className="course-overview-grid">
          <article>
            <p className="kicker">LEARNING OUTCOMES</p>
            <h2>Đầu ra nghề nghiệp</h2>
            <ul>
              <li>Map và chẩn đoán end-to-end supply chain.</li>
              <li>Phân tích dữ liệu bằng Excel, SQL, Python và Power BI.</li>
              <li>Xây forecast, inventory policy và planning cadence.</li>
              <li>Tối ưu network, transportation và decision scenarios.</li>
              <li>Thiết kế AI guardrails và kể câu chuyện điều hành.</li>
            </ul>
          </article>
          <form className="course-schedule-card" onSubmit={saveSettings}>
            <p className="kicker">LỊCH HỌC CÁ NHÂN</p>
            <h2>Deadline tự động</h2>
            <label>Ngày bắt đầu<input type="date" value={settingsDraft.startDate} onChange={(event) => setSettingsDraft((current) => ({ ...current, startDate: event.target.value }))} required /></label>
            <label>Giờ học mỗi tuần<input type="number" min={1} max={40} value={settingsDraft.weeklyHours} onChange={(event) => setSettingsDraft((current) => ({ ...current, weeklyHours: Number(event.target.value) }))} required /></label>
            <p>Ngày hoàn thành dự kiến: <strong>{formatDate(addDays(settingsDraft.startDate, 24 * 7 - 1))}</strong></p>
            <button disabled={savingSettings}>{savingSettings ? "Đang lưu..." : "Cập nhật lịch"}</button>
          </form>
        </section>

        <section className="course-section" id="syllabus">
          <div className="course-section-head">
            <div><p className="kicker">SYLLABUS · 24 WEEKS</p><h2>Nội dung và deadline</h2><p>Mỗi tuần đi qua lesson → lab → evidence → review → mastery.</p></div>
            <span>{appliedCount}/24 tuần Applied</span>
          </div>
          <div className="course-module-list">
            {modules.map((module) => {
              const moduleWeeks = curriculum.filter((week) => week.module === module.id);
              const moduleApplied = moduleWeeks.filter((week) => progressMap.get(week.week)?.completed).length;
              const assignment = assignments.find((item) => item.module === module.id);
              return (
                <details key={module.id} open={module.id === currentWeek.module}>
                  <summary>
                    <span>{String(module.id).padStart(2, "0")}</span>
                    <div><small>MODULE {module.id} · WEEKS {moduleWeeks[0].week}–{moduleWeeks[3].week}</small><strong>{module.name}</strong></div>
                    <div className="module-summary-progress"><i><b style={{ width: `${moduleApplied * 25}%` }} /></i><em>{moduleApplied}/4 Applied</em></div>
                  </summary>
                  <div className="course-week-table">
                    <div className="course-week-table-head"><span>Tuần / bài học</span><span>Deadline</span><span>Lab</span><span>Evidence</span><span>Trạng thái</span><span /></div>
                    {moduleWeeks.map((week) => {
                      const row = progressMap.get(week.week);
                      const submission = submissionMap.get(week.week);
                      const lab = labMap.get(week.week);
                      const dueDate = addDays(state.settings.startDate, week.week * 7 - 1);
                      return (
                        <div className="course-week-line" key={week.week}>
                          <span><small>W{String(week.week).padStart(2, "0")}</small><strong>{week.title}</strong><em>{week.hours} · {week.tools.slice(0, 2).join(" + ")}</em></span>
                          <time dateTime={dueDate}>{formatDate(dueDate)}</time>
                          <span className={lab?.passed ? "grade-chip passed" : "grade-chip"}>{lab ? `${lab.score}%` : "—"}</span>
                          <span className={`status-chip ${submission?.status ?? "not-started"}`}>{submissionLabel(submission?.status)}</span>
                          <span className={`status-chip ${statusClass(row, submission)}`}>{weekStatus(row, submission, lab)}</span>
                          <Link href={`/week/${week.week}`} aria-label={`Mở tuần ${week.week}`}>Mở →</Link>
                        </div>
                      );
                    })}
                    <div className="module-project-line"><span>MODULE PROJECT</span><strong>{assignment?.title}</strong><p>{assignment?.brief}</p><Link href="/case-study">Mở Case workspace →</Link></div>
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        <section className="course-section" id="gradebook">
          <div className="course-section-head">
            <div><p className="kicker">GRADEBOOK</p><h2>Điểm và evidence</h2><p>Điểm lab lấy best attempt; assessment cần ≥80%; project chỉ đạt khi Portfolio-ready.</p></div>
            <span>{quizPassedCount}/6 assessments đạt</span>
          </div>
          <div className="gradebook-table">
            <div className="gradebook-head"><span>Module</span><span>Lab average</span><span>Assessment</span><span>Project artifact</span><span>Kết quả</span></div>
            {modules.map((module) => {
              const weekNumbers = curriculum.filter((week) => week.module === module.id).map((week) => week.week);
              const labs = weekNumbers.map((week) => labMap.get(week)).filter((row): row is LabRow => Boolean(row));
              const labAverage = labs.length ? Math.round(labs.reduce((sum, row) => sum + row.score, 0) / labs.length) : null;
              const assessment = bestQuizMap.get(module.id);
              const artifact = portfolioCaseMap.get(module.id);
              const ready = weekNumbers.every((week) => progressMap.get(week)?.completed) && labs.filter((row) => row.passed).length === 4 && (assessment?.score ?? 0) >= 80 && artifact?.stage === "Portfolio-ready";
              return (
                <div className="gradebook-line" key={module.id}>
                  <span><small>M{module.id}</small><strong>{module.name}</strong></span>
                  <b>{labAverage == null ? "—" : `${labAverage}%`}</b>
                  <b className={(assessment?.score ?? 0) >= 80 ? "pass-text" : ""}>{assessment ? `${assessment.score}%` : "—"}</b>
                  <span>{artifact ? artifact.stage : "Chưa có"}</span>
                  <strong className={ready ? "module-ready" : "module-working"}>{ready ? "Module passed" : "Đang hoàn thiện"}</strong>
                </div>
              );
            })}
          </div>
          <details className="grade-history-panel">
            <summary>Lịch sử điểm gần đây ({state.labHistory.length + state.quizzes.length} lượt)</summary>
            <div>
              {[...state.labHistory.map((item) => ({ label: `Lab tuần ${item.week}`, score: item.score, passed: item.passed, createdAt: item.createdAt })), ...state.quizzes.map((item) => ({ label: `Assessment module ${item.module}`, score: item.score, passed: item.score >= 80, createdAt: item.createdAt }))]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 20)
                .map((item, index) => <div key={`${item.label}-${item.createdAt}-${index}`}><span>{item.label}</span><strong>{item.score}% · {item.passed ? "Passed" : "Needs revision"}</strong><time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time></div>)}
              {!state.labHistory.length && !state.quizzes.length ? <p>Chưa có lượt chấm. Bắt đầu mini-lab tuần 1 để tạo grade history.</p> : null}
            </div>
          </details>
        </section>

        <section className="course-section certificate-section" id="certificate">
          <div className="course-section-head">
            <div><p className="kicker">CERTIFICATE &amp; LEARNING REPORT</p><h2>Chuẩn hoàn thành thật</h2><p>Không cấp chứng nhận bằng click. Bốn nhóm evidence dưới đây phải đồng thời đạt.</p></div>
            <span>{certificateReady ? "READY TO ISSUE" : "IN PROGRESS"}</span>
          </div>
          <div className="certificate-grid">
            <div className="certificate-checklist">
              <CompletionLine label="24 tuần Applied" value={appliedCount} target={24} />
              <CompletionLine label="24 interactive labs Passed" value={labPassedCount} target={24} />
              <CompletionLine label="6 module assessments ≥80%" value={quizPassedCount} target={6} />
              <CompletionLine label="6 module projects Portfolio-ready" value={portfolioReadyCount} target={6} />
              <Link href={nextAction.href} className="primary-action">Hoàn thành bước còn thiếu →</Link>
            </div>
            <article className={`certificate-preview ${certificateReady ? "issued" : "locked"}`}>
              <span>ctnascm · PRIVATE CERTIFICATE</span>
              <p>Chứng nhận hoàn thành lộ trình</p>
              <h3>Supply Chain &amp; AI<br />Professional Path</h3>
              <small>Trao cho</small>
              <strong>{learnerName}</strong>
              <dl><div><dt>Applied weeks</dt><dd>{appliedCount}/24</dd></div><div><dt>Retained weeks</dt><dd>{retainedCount}/24</dd></div><div><dt>Portfolio artifacts</dt><dd>{portfolioReadyCount}/6</dd></div></dl>
              <button type="button" disabled={!certificateReady} onClick={() => window.print()}>{certificateReady ? "In certificate & report" : "Chưa đủ điều kiện"}</button>
            </article>
          </div>
          <div className="capstone-report">
            <div><span>5-MINUTE DEMO OUTLINE</span><ol><li>Problem &amp; business stakes — 45 giây</li><li>Data, assumptions &amp; method — 75 giây</li><li>Insight &amp; scenario comparison — 90 giây</li><li>Recommendation, impact &amp; guardrail — 60 giây</li><li>Reflection &amp; next experiment — 30 giây</li></ol></div>
            <div><span>PORTFOLIO READINESS</span><p>{portfolioReadyCount}/6 module artifacts đã Portfolio-ready; {evidencePassedCount}/24 weekly submissions đã qua evidence review.</p><Link href="/portfolio">Mở portfolio report →</Link></div>
          </div>
        </section>

        <p className={`course-live-status ${loading ? "loading" : ""}`} role="status" aria-live="polite">{status}{!loading && status.includes("Không thể") ? <button onClick={() => void loadCourse()}>Thử lại</button> : null}</p>
      </div>
    </main>
  );
}

function CompletionLine({ label, value, target }: { label: string; value: number; target: number }) {
  const percent = Math.min(100, Math.round((value / target) * 100));
  return <div className={value >= target ? "completion-line complete" : "completion-line"}><div><span>{value >= target ? "✓" : "○"}</span><strong>{label}</strong><b>{value}/{target}</b></div><i><span style={{ width: `${percent}%` }} /></i></div>;
}

function isMastered(status: string) { return status.toLowerCase().includes("mastered"); }

function submissionLabel(status?: string) {
  if (status === "portfolio-ready") return "Portfolio-ready";
  if (status === "needs-revision") return "Needs revision";
  if (status === "submitted") return "Submitted";
  if (status === "passed") return "Passed";
  if (status === "in-progress") return "Draft";
  return "Chưa nộp";
}

function statusClass(progress?: ProgressRow, submission?: SubmissionRow) {
  if (isMastered(progress?.masteryStatus ?? "")) return "mastered";
  if (progress?.completed) return "completed";
  if (submission?.status === "needs-revision") return "needs-revision";
  if (progress || submission) return "in-progress";
  return "not-started";
}

function weekStatus(progress?: ProgressRow, submission?: SubmissionRow, lab?: LabRow) {
  if (isMastered(progress?.masteryStatus ?? "")) return "Retained";
  if (progress?.completed) return "Applied";
  if (submission?.status === "needs-revision") return "Cần sửa bài";
  if (submission?.status === "submitted") return "Chờ review";
  if (lab?.passed) return "Lab passed";
  if (progress || submission || lab) return "Đang học";
  return "Chưa bắt đầu";
}

function getNextAction(week: number, progress?: ProgressRow, lab?: LabRow, submission?: SubmissionRow) {
  if (!progress?.lessonComplete) return { href: `/week/${week}#buoc-1`, label: `Học tuần ${week}`, reason: "Đọc lesson blocks và xác nhận từng phần đã hiểu." };
  if (!lab?.passed) return { href: `/week/${week}#interactive-lab`, label: "Làm interactive lab", reason: "Làm trực tiếp trên web và đạt tối thiểu 70%." };
  if (!submission || submission.status === "in-progress" || submission.status === "not-started") return { href: `/week/${week}#submission-workspace`, label: "Nộp evidence", reason: "Mở rộng mini-lab thành deliverable và nộp evidence." };
  if (submission.status === "needs-revision") return { href: `/week/${week}#submission-workspace`, label: "Sửa bài theo review", reason: "Mentor đã chỉ ra gap; sửa và resubmit phiên bản mới." };
  if (submission.status === "submitted") return { href: `/week/${week}#submission-workspace`, label: "Yêu cầu mentor review", reason: "Bài đã nộp và đang chờ quyết định theo rubric." };
  return { href: `/week/${week}#retrieval-practice`, label: "Củng cố mastery", reason: "Evidence đã đạt; làm retrieval và transfer để chuyển sang Retained." };
}

function addDays(startDate: string, days: number) {
  const date = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return startDate;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}
