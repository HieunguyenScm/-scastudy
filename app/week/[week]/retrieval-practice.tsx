"use client";

import { useCallback, useEffect, useState } from "react";

type Item = { id: string; type: "recall" | "application" | "transfer"; prompt: string; hint: string };
type ProgressPayload = { completed?: boolean; masteryStatus?: string; reviewCount?: number; lastReviewedAt?: string | null; nextReviewAt?: string | null };

export default function RetrievalPractice({ week, onProgress }: { week: number; onProgress: (value: ProgressPayload) => void }) {
  const [item, setItem] = useState<Item | null>(null);
  const [response, setResponse] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [assisted, setAssisted] = useState(false);
  const [status, setStatus] = useState("Đang chuẩn bị câu hỏi retrieval...");
  const [result, setResult] = useState<{ score: number; passed: boolean; modelAnswer: string | null } | null>(null);
  const [summary, setSummary] = useState<{ passed: number; retained: boolean }>({ passed: 0, retained: false });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const responseData = await fetch(`/api/retrieval?week=${week}`);
    const data = await responseData.json() as { item?: Item; summary?: { passed: number; retained: boolean }; error?: string };
    if (!responseData.ok || !data.item) throw new Error(data.error ?? "Không tải được retrieval set.");
    setItem(data.item); setSummary(data.summary ?? { passed: 0, retained: false }); setStatus("Trả lời trước khi mở ghi chú.");
  }, [week]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load().catch((error) => setStatus(error instanceof Error ? error.message : "Không tải được câu hỏi.")), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const submit = async () => {
    if (!item || response.trim().length < 40 || busy) return;
    setBusy(true); setStatus("Đang kiểm tra lập luận...");
    try {
      const apiResponse = await fetch("/api/retrieval", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ week, promptId: item.id, response, confidence, assisted }) });
      const data = await apiResponse.json() as { grade?: { score: number; passed: boolean }; modelAnswer?: string | null; learningState?: ProgressPayload; error?: string };
      if (!apiResponse.ok || !data.grade) throw new Error(data.error ?? "Không chấm được câu trả lời.");
      setResult({ ...data.grade, modelAnswer: data.modelAnswer ?? null });
      if (data.learningState) onProgress(data.learningState);
      setStatus(data.grade.passed ? "Đạt retrieval. Đọc đối chiếu rồi chuyển câu tiếp theo." : "Chưa đạt. Xem điểm thiếu, viết lại bằng lập luận rõ hơn.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Không chấm được câu trả lời."); }
    finally { setBusy(false); }
  };

  const next = async () => { setResponse(""); setResult(null); setAssisted(false); await load(); };

  return <section className="content-panel retrieval-panel" id="retrieval-practice">
    <div className="panel-index">04</div><div>
      <div className="retrieval-title"><div><p className="kicker">RETRIEVAL PRACTICE · KHÔNG HỌC BẰNG CLICK</p><h2>Nhớ lại, áp dụng, rồi mới được công nhận</h2></div><span>{summary.passed}/3 passed</span></div>
      <p className="panel-intro">Mastery không dùng confidence để cấp điểm. Cần ít nhất hai lượt đúng không mở ghi chú, trong đó có một transfer case.</p>
      {item ? <div className="retrieval-card"><span className={`retrieval-type ${item.type}`}>{item.type}</span><h3>{item.prompt}</h3><details><summary>Xem một gợi ý nhỏ</summary><p>{item.hint}</p></details><label>Câu trả lời của bạn<textarea value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Viết cơ chế, bằng chứng, trade-off và hành động..." maxLength={5000} /></label><div className="retrieval-controls"><label>Confidence trước khi xem đáp án<select value={confidence} onChange={(event) => setConfidence(Number(event.target.value))}>{[1,2,3,4,5].map((value) => <option value={value} key={value}>{value}/5</option>)}</select></label><label className="assisted-check"><input type="checkbox" checked={assisted} onChange={(event) => setAssisted(event.target.checked)} /> Tôi đã mở ghi chú (assisted)</label></div><button type="button" className="primary-action" disabled={busy || response.trim().length < 40 || result != null} onClick={() => void submit()}>{busy ? "Đang kiểm tra..." : "Nộp câu trả lời retrieval →"}</button></div> : null}
      <div role="status" aria-live="polite">
        {result ? <div className={`retrieval-result ${result.passed ? "passed" : "retry"}`}><strong>{result.score}/100 · {result.passed ? "Đạt" : "Cần thử lại"}</strong>{result.modelAnswer ? <p><b>Đáp án đối chiếu:</b> {result.modelAnswer}</p> : <p className="retrieval-withheld">Chưa mở đáp án đối chiếu ở lượt đầu chưa đạt — thử lại với lập luận rõ hơn; đáp án sẽ hiện khi bạn đạt hoặc ở lượt kế tiếp của cùng câu.</p>}<button type="button" className="secondary-button" onClick={() => void next()}>{result.passed ? "Câu tiếp theo →" : "Viết lại với câu mới →"}</button></div> : null}
      </div>
      <p className="sync-status saved" role="status" aria-live="polite">{summary.retained ? "Retained: đã có bằng chứng nhớ và transfer." : status}</p>
    </div>
  </section>;
}
