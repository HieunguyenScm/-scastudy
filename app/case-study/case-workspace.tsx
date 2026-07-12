"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { Assignment } from "../../lib/content";

type CaseRecord = {
  id?: number;
  title: string;
  stage: string;
  problem: string;
  hypothesis: string;
  evidence: string;
  recommendation: string;
  assignmentModule: number | null;
  rubricScores: Record<string, number>;
  reflection: string;
  revision: number;
  updatedAt?: string;
};
type WorkspaceStatus = { message: string; tone: "neutral" | "success" | "warning" | "error" };

const stages = ["Framing", "Analysis", "Modelling", "Recommendation", "Portfolio-ready"];

function blankCase(): CaseRecord {
  return {
    title: "",
    stage: "Framing",
    problem: "",
    hypothesis: "",
    evidence: "",
    recommendation: "",
    assignmentModule: null,
    rubricScores: {},
    reflection: "",
    revision: 1,
  };
}

function normalizeCase(item: Partial<CaseRecord>): CaseRecord {
  const scores = item.rubricScores && typeof item.rubricScores === "object" ? item.rubricScores : {};
  return {
    id: item.id,
    title: String(item.title ?? ""),
    stage: String(item.stage ?? "Framing"),
    problem: String(item.problem ?? ""),
    hypothesis: String(item.hypothesis ?? ""),
    evidence: String(item.evidence ?? ""),
    recommendation: String(item.recommendation ?? ""),
    assignmentModule: item.assignmentModule == null ? null : Number(item.assignmentModule),
    rubricScores: Object.fromEntries(
      Object.entries(scores).map(([criterion, score]) => [criterion, Math.max(0, Math.min(100, Number(score) || 0))]),
    ),
    reflection: String(item.reflection ?? ""),
    revision: Math.max(1, Number(item.revision ?? 1)),
    updatedAt: item.updatedAt,
  };
}

export default function CaseWorkspace({ assignments }: { assignments: Assignment[] }) {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [draft, setDraft] = useState<CaseRecord>(() => blankCase());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [saveConflict, setSaveConflict] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<WorkspaceStatus>({ message: "Đang tải workspace...", tone: "neutral" });

  const loadCases = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(false);
    setSaveConflict(false);
    setStatus({ message: "Đang tải workspace...", tone: "neutral" });
    try {
      const response = await fetch("/api/cases", { signal });
      const data = (await response.json().catch(() => ({}))) as { cases?: Partial<CaseRecord>[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Không thể tải case.");
      const loadedCases = Array.isArray(data.cases) ? data.cases.map(normalizeCase) : [];
      setCases(loadedCases);
      if (loadedCases[0]) setDraft(loadedCases[0]);
      setDirty(false);
      setStatus({
        message: loadedCases.length ? `Đã đồng bộ ${loadedCases.length} case` : "Workspace đã sẵn sàng — chưa có case nào",
        tone: "success",
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setLoadError(true);
      setStatus({ message: error instanceof Error ? error.message : "Chưa kết nối được workspace.", tone: "error" });
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void loadCases(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadCases]);

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.module === draft.assignmentModule),
    [assignments, draft.assignmentModule],
  );
  const rubricComplete = Boolean(selectedAssignment?.rubric.every((item) => Object.hasOwn(draft.rubricScores, item.criterion)));
  const weightedScore = selectedAssignment
    ? Math.round((selectedAssignment.rubric.reduce(
      (sum, item) => sum + (draft.rubricScores[item.criterion] ?? 0) * item.weight,
      0,
    ) / selectedAssignment.rubric.reduce((sum, item) => sum + item.weight, 0)) * 100) / 100
    : null;
  const portfolioChecks = [
    { met: Boolean(selectedAssignment) && rubricComplete, label: "Gắn assignment và chấm đủ rubric" },
    { met: Boolean(draft.evidence.trim()), label: "Có Evidence & Analysis" },
    { met: Boolean(draft.recommendation.trim()), label: "Có Recommendation" },
    { met: Boolean(draft.reflection.trim()), label: "Có Reflection after feedback" },
    { met: (weightedScore ?? 0) >= 70, label: `Weighted score ≥70% (${weightedScore ?? 0}%)` },
  ];
  const portfolioReady = portfolioChecks.every((item) => item.met);

  const updateDraft = (patch: Partial<CaseRecord>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setDirty(true);
    setSaveError(false);
    if (!dirty) setStatus({ message: "Có thay đổi chưa lưu", tone: "warning" });
  };

  const canReplaceDraft = () => !dirty || window.confirm("Case hiện tại có thay đổi chưa lưu. Bỏ các thay đổi này?");

  const selectCase = (item: CaseRecord) => {
    if (!canReplaceDraft()) return;
    setDraft(item);
    setDirty(false);
    setSaveError(false);
    setStatus({ message: `Đang xem “${item.title}”`, tone: "neutral" });
  };

  const startNewCase = () => {
    if (!canReplaceDraft()) return;
    setDraft(blankCase());
    setDirty(false);
    setSaveError(false);
    setStatus({ message: "Case mới — chọn assignment hoặc bắt đầu framing", tone: "neutral" });
  };

  const startFromAssignment = (assignment: Assignment) => {
    if (!canReplaceDraft()) return;
    setDraft({
      ...blankCase(),
      title: assignment.title,
      problem: assignment.brief,
      assignmentModule: assignment.module,
    });
    setDirty(true);
    setSaveError(false);
    setStatus({ message: `Đã nạp brief Module ${assignment.module}. Case này chưa được lưu.`, tone: "warning" });
  };

  const changeAssignment = (moduleValue: string) => {
    const assignmentModule = moduleValue ? Number(moduleValue) : null;
    updateDraft({ assignmentModule, rubricScores: {} });
  };

  const updateRubricScore = (criterion: string, score: number) => {
    updateDraft({
      rubricScores: {
        ...draft.rubricScores,
        [criterion]: Math.max(0, Math.min(100, score)),
      },
    });
  };

  const changeStage = (nextStage: string) => {
    if (nextStage === "Portfolio-ready" && !portfolioReady) {
      setStatus({ message: "Chưa thể chuyển Portfolio-ready: hoàn thành checklist readiness trước.", tone: "error" });
      return;
    }
    updateDraft({ stage: nextStage });
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.title.trim() || saving) return;
    if (draft.stage === "Portfolio-ready" && !portfolioReady) {
      setSaveError(true);
      setStatus({ message: "Case đang gắn nhãn Portfolio-ready nhưng không còn đạt đủ requirements.", tone: "error" });
      return;
    }
    setSaving(true);
    setSaveError(false);
    setSaveConflict(false);
    setStatus({ message: "Đang lưu case...", tone: "neutral" });
    try {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = (await response.json().catch(() => ({}))) as { case?: Partial<CaseRecord>; error?: string };
      if (!response.ok || !data.case) {
        if (response.status === 409) setSaveConflict(true);
        throw new Error(data.error ?? "Không thể lưu case.");
      }
      const saved = normalizeCase(data.case);
      setCases((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
      setDraft(saved);
      setDirty(false);
      setStatus({
        message: `Đã lưu lúc ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`,
        tone: "success",
      });
    } catch (error) {
      setSaveError(true);
      setStatus({
        message: `${error instanceof Error ? error.message : "Không thể lưu case."} Nội dung vẫn còn trên màn hình; hãy thử lại.`,
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="case-shell" id="main-content">
      <section className="case-hero">
        <div><p className="kicker">PORTFOLIO LAB</p><h1>Case Study <em>Workspace.</em></h1><p>Biến kiến thức thành bằng chứng năng lực: problem → hypothesis → evidence → recommendation → revision.</p></div>
        <div className={`workspace-status ${status.tone}`} role="status" aria-live="polite" aria-atomic="true">
          <i aria-hidden="true" /><span>{status.message}</span>
          {loadError || saveConflict ? <button type="button" onClick={() => void loadCases()}>{saveConflict ? "Tải bản mới" : "Tải lại"}</button> : null}
        </div>
      </section>

      <section className="case-layout" aria-busy={loading || saving}>
        <aside className="case-sidebar" aria-label="Danh sách case">
          <div className="case-sidebar-head"><span>MY CASES</span><button type="button" onClick={startNewCase}>+ New</button></div>
          <div className="case-list">
            {loading ? <p>Đang tải case...</p> : cases.length ? cases.map((item) => (
              <button
                type="button"
                key={item.id}
                className={draft.id === item.id ? "active" : ""}
                aria-pressed={draft.id === item.id}
                onClick={() => selectCase(item)}
              >
                <span>{item.stage} · R{item.revision}</span>
                <strong>{item.title}</strong>
                <small>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("vi-VN") : "Draft"}</small>
              </button>
            )) : (
              <div className="empty-state case-empty"><strong>Chưa có case.</strong><p>Chọn một assignment bên dưới để bắt đầu từ brief và rubric chuẩn.</p></div>
            )}
          </div>
          <div className="assignment-starters">
            <span>START FROM ROADMAP</span>
            {assignments.map((assignment) => <button type="button" key={assignment.module} onClick={() => startFromAssignment(assignment)}><b>M{assignment.module}</b>{assignment.title}</button>)}
          </div>
        </aside>

        <form className="case-editor" onSubmit={save}>
          <div className="editor-top expanded">
            <label htmlFor="case-title"><span>CASE TITLE</span><input id="case-title" required maxLength={160} value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} placeholder="Ví dụ: Giảm stockout cho ngành hàng đồ uống" /></label>
            <label htmlFor="case-stage"><span>STAGE</span><select id="case-stage" value={draft.stage} onChange={(event) => changeStage(event.target.value)}>{stages.map((stage) => <option key={stage} disabled={stage === "Portfolio-ready" && !portfolioReady && draft.stage !== stage}>{stage}</option>)}</select></label>
            <label htmlFor="case-assignment"><span>ASSIGNMENT</span><select id="case-assignment" value={draft.assignmentModule ?? ""} onChange={(event) => changeAssignment(event.target.value)}><option value="">Chưa gắn assignment</option>{assignments.map((assignment) => <option key={assignment.module} value={assignment.module}>M{assignment.module} · {assignment.title}</option>)}</select></label>
            <div className="revision-display"><span>REVISION</span><strong>R{draft.revision}</strong><small>{draft.id ? `Lần lưu tiếp theo tạo R${draft.revision + 1}` : "Revision đầu tiên được tạo khi lưu"}</small></div>
          </div>

          {selectedAssignment ? (
            <section className="assignment-context" aria-labelledby="assignment-context-title">
              <div><span>MODULE {selectedAssignment.module} · W{selectedAssignment.weeks}</span><h2 id="assignment-context-title">{selectedAssignment.title}</h2><p>{selectedAssignment.brief}</p></div>
              <ul>{selectedAssignment.outputs.map((output) => <li key={output}>{output}</li>)}</ul>
            </section>
          ) : (
            <div className="empty-state assignment-empty"><strong>Chưa có rubric.</strong><p>Gắn case với một assignment để mở self-scoring và Portfolio-ready gate.</p></div>
          )}

          <div className="editor-grid">
            <label htmlFor="case-problem"><span>01 · PROBLEM STATEMENT</span><small>Gap hiện tại, phạm vi, KPI và business impact.</small><textarea id="case-problem" maxLength={5000} value={draft.problem} onChange={(event) => updateDraft({ problem: event.target.value })} placeholder="Hiện tại... trong phạm vi... gây tác động..." /></label>
            <label htmlFor="case-hypothesis"><span>02 · HYPOTHESIS / ISSUE TREE</span><small>Các nguyên nhân có thể kiểm chứng.</small><textarea id="case-hypothesis" maxLength={5000} value={draft.hypothesis} onChange={(event) => updateDraft({ hypothesis: event.target.value })} placeholder="H1: Forecast bias... H2: Lead time variability..." /></label>
            <label htmlFor="case-evidence"><span>03 · EVIDENCE & ANALYSIS</span><small>Data, metrics, model, scenario và assumptions.</small><textarea id="case-evidence" maxLength={8000} value={draft.evidence} onChange={(event) => updateDraft({ evidence: event.target.value })} placeholder="Dữ liệu cho thấy... Model giả định..." /></label>
            <label htmlFor="case-recommendation"><span>04 · RECOMMENDATION</span><small>Action, owner, impact, risk và next step.</small><textarea id="case-recommendation" maxLength={5000} value={draft.recommendation} onChange={(event) => updateDraft({ recommendation: event.target.value })} placeholder="Đề xuất... kỳ vọng... rủi ro..." /></label>
          </div>

          <section className="case-mastery-grid">
            <div className="rubric-card">
              <div className="rubric-card-head"><div><p className="kicker">SELF-SCORING RUBRIC</p><h2>Chấm bằng evidence</h2></div><div className={weightedScore != null && weightedScore >= 70 ? "weighted-score ready" : "weighted-score"}><strong>{weightedScore ?? "--"}%</strong><span>WEIGHTED</span></div></div>
              {selectedAssignment ? (
                <div className="rubric-controls">
                  {selectedAssignment.rubric.map((item, index) => {
                    const score = draft.rubricScores[item.criterion];
                    const inputId = `rubric-${selectedAssignment.module}-${index}`;
                    return (
                      <div className="rubric-control" key={item.criterion}>
                        <label htmlFor={inputId}><span>{item.criterion}</span><small>Weight {item.weight}%</small></label>
                        <div><input id={inputId} type="range" min={0} max={100} step={5} value={score ?? 0} aria-valuetext={score == null ? "Chưa chấm" : `${score} phần trăm`} onChange={(event) => updateRubricScore(item.criterion, Number(event.target.value))} /><output htmlFor={inputId}>{score == null ? "Chưa chấm" : `${score}%`}</output></div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="empty-state compact">Chọn assignment để hiện rubric đúng module.</p>}
            </div>

            <div className="portfolio-ready-card" id="portfolio-ready-requirements">
              <p className="kicker">PORTFOLIO-READY GATE</p>
              <h2>{portfolioReady ? "Sẵn sàng để bảo vệ." : "Còn việc trước khi publish."}</h2>
              <ul>{portfolioChecks.map((item) => <li key={item.label} className={item.met ? "met" : ""}><span aria-hidden="true">{item.met ? "✓" : "○"}</span>{item.label}</li>)}</ul>
              <p>Chỉ khi đủ 5 điều kiện, stage <strong>Portfolio-ready</strong> mới được mở.</p>
            </div>
          </section>

          <label className="case-reflection" htmlFor="case-reflection">
            <span>REFLECTION AFTER FEEDBACK</span>
            <small>Feedback nào làm bạn đổi hypothesis, analysis hoặc recommendation?</small>
            <textarea id="case-reflection" maxLength={5000} value={draft.reflection} onChange={(event) => updateDraft({ reflection: event.target.value })} placeholder="Sau feedback, tôi nhận ra... Vì vậy ở revision này tôi đã..." />
            <output>{draft.reflection.trim().length} ký tự</output>
          </label>

          <div className="editor-footer">
            <p>{dirty ? "Có thay đổi chưa lưu. Dữ liệu vẫn ở màn hình nếu save lỗi." : "Mọi thay đổi đã lưu theo tài khoản của bạn."}</p>
            <button className="primary-action" disabled={saving || !draft.title.trim()}>{saving ? "Đang lưu..." : saveError ? "Thử lưu lại →" : draft.id ? "Lưu revision →" : "Lưu case →"}</button>
          </div>
        </form>
      </section>
    </main>
  );
}
