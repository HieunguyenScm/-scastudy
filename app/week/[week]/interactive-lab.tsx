"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  LabAnswers,
  LabGrade,
  LabQuestionResult,
  PublicInteractiveLab,
} from "../../../lib/interactive-labs";

type SavedAttempt = {
  answers: LabAnswers;
  results: LabQuestionResult[];
  score: number;
  passed: boolean;
  attemptCount: number;
  updatedAt: string;
};

type HistoryItem = { score: number; passed: boolean; createdAt: string };

export default function InteractiveLab({
  lab,
  onPass,
}: {
  lab: PublicInteractiveLab;
  onPass: (progress?: Record<string, unknown> | null) => void;
}) {
  const [answers, setAnswers] = useState<LabAnswers>({});
  const [attempt, setAttempt] = useState<SavedAttempt | null>(null);
  const [grade, setGrade] = useState<LabGrade | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [revealedHints, setRevealedHints] = useState<Set<string>>(() => new Set());
  const [status, setStatus] = useState("Đang tải lab...");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch(`/api/labs?week=${lab.week}`, { signal: controller.signal });
        const data = (await response.json().catch(() => ({}))) as {
          attempt?: SavedAttempt | null;
          history?: HistoryItem[];
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "Không thể tải lab.");
        if (data.attempt) {
          setAttempt(data.attempt);
          setAnswers(data.attempt.answers ?? {});
          if (data.attempt.results?.length) {
            setGrade({
              score: data.attempt.score,
              passed: data.attempt.passed,
              earned: data.attempt.results.reduce((sum, item) => sum + item.earned, 0),
              possible: data.attempt.results.reduce((sum, item) => sum + item.points, 0),
              results: data.attempt.results,
            });
          }
          setStatus(data.attempt.passed ? `Lab đã đạt · best score ${data.attempt.score}%` : "Đã khôi phục bản làm gần nhất.");
        } else {
          setStatus("Lab sẵn sàng. Câu trả lời chỉ được chấm khi bạn bấm Nộp chấm điểm.");
        }
        setHistory(Array.isArray(data.history) ? data.history : []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus(error instanceof Error ? error.message : "Không thể tải lab.");
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [lab.week]);

  const resultMap = useMemo(
    () => new Map((grade?.results ?? []).map((result) => [result.id, result])),
    [grade],
  );
  const complete = lab.questions.every((question) => {
    const value = answers[question.id];
    return value !== undefined && value !== null && String(value).trim() !== "";
  });

  const updateAnswer = (id: string, value: string | number) => {
    setAnswers((current) => ({ ...current, [id]: value }));
    setGrade(null);
    setStatus("Có thay đổi chưa chấm. Hãy lưu nháp hoặc nộp chấm điểm.");
  };

  const submit = async (action: "save" | "grade") => {
    if (saving) return;
    setSaving(true);
    setStatus(action === "save" ? "Đang lưu bản nháp..." : "Đang chấm theo expected output...");
    try {
      const response = await fetch("/api/labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week: lab.week, action, answers }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        attempt?: SavedAttempt;
        grade?: LabGrade;
        progress?: Record<string, unknown> | null;
        preserved?: boolean;
        error?: string;
      };
      if (!response.ok || !data.attempt) throw new Error(data.error ?? "Không thể lưu lab.");
      setAttempt(data.attempt);
      if (action === "save") {
        setStatus(data.preserved
          ? "Lab đã đạt nên bản làm đạt được giữ nguyên; chỉnh sửa mới không ghi đè kết quả đã pass."
          : "Đã lưu bản nháp. Bạn có thể rời trang và quay lại sau.");
      } else if (data.grade) {
        setGrade(data.grade);
        const now = new Date().toISOString();
        setHistory((current) => [{ score: data.grade!.score, passed: data.grade!.passed, createdAt: now }, ...current].slice(0, 10));
        setStatus(data.grade.passed
          ? `Đạt ${data.grade.score}%. Lab đã mở completion gate của phần thực hành.`
          : `Đạt ${data.grade.score}%. Cần ${lab.passScore}% — xem feedback và sửa câu chưa đúng.`);
        if (data.grade.passed) onPass(data.progress);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Không thể lưu lab.");
    } finally {
      setSaving(false);
    }
  };

  const handleGrade = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (complete) void submit("grade");
  };

  return (
    <section className="content-panel interactive-lab" id="interactive-lab" aria-labelledby={`lab-title-${lab.week}`}>
      <div className="panel-index">3a</div>
      <div>
        <div className="lab-heading-row">
          <div>
            <p className="kicker">GUIDED LAB · LÀM TRỰC TIẾP TRÊN WEB</p>
            <h2 id={`lab-title-${lab.week}`}>{lab.title}</h2>
          </div>
          <span className={attempt?.passed ? "lab-pass-badge passed" : "lab-pass-badge"}>
            {attempt?.passed ? `PASSED · ${attempt.score}%` : `PASS ≥ ${lab.passScore}%`}
          </span>
        </div>
        <div className="lab-question-card">
          <span>BUSINESS QUESTION</span>
          <p>{lab.businessQuestion}</p>
        </div>

        <div className="lab-two-column">
          <div>
            <h3>Cách làm</h3>
            <ol>{lab.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol>
          </div>
          <div>
            <h3>Expected output</h3>
            <p>{lab.expectedOutput}</p>
          </div>
        </div>

        <div className="lab-table-wrap" tabIndex={0} aria-label="Bảng dữ liệu synthetic cho lab">
          <table>
            <thead><tr>{lab.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
            <tbody>
              {lab.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell == null ? <em>missing</em> : String(cell)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleGrade} className="lab-form">
          {lab.questions.map((question, index) => {
            const result = resultMap.get(question.id);
            const hintVisible = revealedHints.has(question.id);
            return (
              <fieldset key={question.id} className={result ? (result.correct ? "lab-correct" : "lab-wrong") : ""}>
                <legend><span>{index + 1}</span>{question.prompt}<small>{question.points} điểm</small></legend>
                {question.kind === "choice" ? (
                  <div className="lab-choice-grid">
                    {(question.options ?? []).map((option, optionIndex) => (
                      <label key={option} className={Number(answers[question.id]) === optionIndex ? "selected" : ""}>
                        <input
                          type="radio"
                          name={question.id}
                          checked={Number(answers[question.id]) === optionIndex}
                          disabled={loading || saving}
                          onChange={() => updateAnswer(question.id, optionIndex)}
                        />
                        <span>{String.fromCharCode(65 + optionIndex)}</span>{option}
                      </label>
                    ))}
                  </div>
                ) : question.kind === "number" ? (
                  <div className="lab-number-input">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={answers[question.id] ?? ""}
                      disabled={loading || saving}
                      onChange={(event) => updateAnswer(question.id, event.target.value)}
                      placeholder="Nhập kết quả"
                      aria-label={question.prompt}
                    />
                    {question.unit ? <span>{question.unit}</span> : null}
                  </div>
                ) : (
                  <textarea
                    value={answers[question.id] ?? ""}
                    disabled={loading || saving}
                    maxLength={2000}
                    onChange={(event) => updateAnswer(question.id, event.target.value)}
                    placeholder="Viết câu trả lời ngắn, nêu rõ logic và quyết định..."
                    aria-label={question.prompt}
                  />
                )}
                <button
                  type="button"
                  className="lab-hint-button"
                  aria-expanded={hintVisible}
                  aria-controls={`lab-hint-${question.id}`}
                  onClick={() => setRevealedHints((current) => {
                    const next = new Set(current);
                    if (next.has(question.id)) next.delete(question.id); else next.add(question.id);
                    return next;
                  })}
                >
                  {hintVisible ? "Ẩn hint" : "Mở hint cấp 1"}
                </button>
                {hintVisible ? <p className="lab-hint" id={`lab-hint-${question.id}`}>{question.hint}</p> : null}
                {result ? (
                  <div className="lab-feedback" role="status">
                    <strong>{result.correct ? `Đúng · +${result.earned}` : "Chưa đúng · +0"}</strong>
                    <p>{result.explanation}</p>
                    {!result.correct ? <small>Expected: {result.expectedLabel}</small> : null}
                  </div>
                ) : null}
              </fieldset>
            );
          })}

          <div className="lab-submit-bar">
            <div>
              <strong>{grade ? `${grade.score}%` : attempt ? `Best ${attempt.score}%` : "Chưa chấm"}</strong>
              <span role="status" aria-live="polite">{status}</span>
            </div>
            <div>
              <button type="button" className="secondary-button" disabled={loading || saving} onClick={() => void submit("save")}>Lưu bản nháp</button>
              <button className="primary-action" disabled={loading || saving || !complete}>{saving ? "Đang xử lý..." : "Nộp chấm điểm →"}</button>
            </div>
          </div>
        </form>

        {history.length ? (
          <details className="lab-history">
            <summary>Lịch sử {history.length} lượt chấm gần nhất</summary>
            <ol>{history.map((item, index) => <li key={`${item.createdAt}-${index}`}><span>Lượt {history.length - index}</span><strong>{item.score}% · {item.passed ? "Passed" : "Needs revision"}</strong><time dateTime={item.createdAt}>{formatDateTime(item.createdAt)}</time></li>)}</ol>
          </details>
        ) : null}
      </div>
    </section>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Vừa xong";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}
