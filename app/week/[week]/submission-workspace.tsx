"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import type { LearningAsset, LessonBlock } from "../../../lib/learning";

type Submission = { id: number; week: number; title: string; evidence: string; fileUrl: string | null; assumptions: string; reflection: string; status: string; latestVersion: number };
type Review = { decision: string; scores: Record<string, number>; strengths: string; gaps: string; feedback: string; sources: string[] };

export default function SubmissionWorkspace({ week, blocks, assets, rubric, deliverable, onStatusChange }: { week: number; blocks: LessonBlock[]; assets: LearningAsset[]; rubric: Array<{ id: string; label: string; weight: number }>; deliverable: string; onStatusChange?: (status: string) => void }) {
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [evidence, setEvidence] = useState("");
  const [assumptions, setAssumptions] = useState("");
  const [reflection, setReflection] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [status, setStatus] = useState("Đang tải workspace...");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const submissionReady = evidence.trim().length >= 120 && assumptions.trim().length >= 20 && reflection.trim().length >= 40;

  useEffect(() => { void (async () => { const response = await fetch(`/api/submissions?week=${week}`); const data = await response.json() as { submissions?: Submission[]; reviews?: Review[]; error?: string }; const item = data.submissions?.[0]; if (item) { setSubmission(item); onStatusChange?.(item.status); setEvidence(item.evidence); setAssumptions(item.assumptions); setReflection(item.reflection); setFileUrl(item.fileUrl ?? ""); setReview(data.reviews?.find((r) => (r as Review & { submissionId?: number; version?: number }).submissionId === item.id && (r as Review & { version?: number }).version === item.latestVersion) ?? null); } setStatus(response.ok ? "Workspace đã sẵn sàng" : data.error ?? "Không tải được workspace"); })(); }, [week, onStatusChange]);
  const save = async (action: "save" | "submit") => { setBusy(true); setStatus(action === "submit" ? "Đang submit evidence..." : "Đang lưu draft..."); try { const response = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ week, title: deliverable, evidence, assumptions, reflection, fileUrl: fileUrl || null, action }) }); const data = await response.json() as { submission?: Submission; error?: string }; if (!response.ok || !data.submission) throw new Error(data.error); setSubmission(data.submission); onStatusChange?.(data.submission.status); setReview(null); setStatus(action === "submit" ? "Đã submit. Bấm Request mentor review để nhận feedback." : "Draft đã được lưu."); } catch (error) { setStatus(error instanceof Error ? error.message : "Không lưu được."); } finally { setBusy(false); } };
  const uploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setStatus(`Đang upload ${file.name}...`);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await response.json() as { fileUrl?: string; error?: string };
      if (!response.ok || !data.fileUrl) throw new Error(data.error ?? "Upload không thành công.");
      setFileUrl(data.fileUrl);
      setStatus(`Đã upload ${file.name}. Hãy lưu draft hoặc submit evidence.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload không thành công.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };
  const requestReview = async () => { setBusy(true); setStatus("AI Mentor đang chấm theo rubric..."); try { const response = await fetch("/api/mentor-review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ week }) }); const data = await response.json() as { review?: Review; error?: string }; if (!response.ok || !data.review) throw new Error(data.error); setReview(data.review); onStatusChange?.(data.review.decision); setSubmission((current) => current ? { ...current, status: data.review!.decision } : current); setStatus(data.review.decision === "passed" ? "Đã đạt. Evidence này có thể đưa vào portfolio." : "Cần sửa và resubmit theo feedback."); } catch (error) { setStatus(error instanceof Error ? error.message : "Mentor review chưa chạy được."); } finally { setBusy(false); } };
  return <section className="content-panel submission-panel" id="submission-workspace">
    <div className="panel-index">05</div><div>
      <p className="kicker">LESSON + LAB + EVIDENCE</p><h2>Học bài, làm lab, nộp sản phẩm</h2>
      <div className="lesson-block-list">{blocks.filter((block) => ["lab", "check", "done"].includes(block.type)).map((block, index) => <article className={`lesson-block lesson-block-${block.type}`} key={block.id}><span>{String(index + 1).padStart(2, "0")}</span><div><p className="kicker">{block.type.toUpperCase()}</p><h3>{block.title}</h3><p>{block.body}</p>{block.steps ? <ol>{block.steps.map((step) => <li key={step}>{step}</li>)}</ol> : null}{block.qa ? <ul className="lesson-block-qa">{block.qa.map((item) => <li key={item.question}><details><summary>{item.question}</summary><p>{item.answer}</p></details></li>)}</ul> : null}</div></article>)}</div>
      <div className="asset-strip"><strong>Learning assets</strong><div>{assets.map((asset) => <a key={asset.id} href={asset.href} download><span>{asset.kind}</span><b>{asset.label} ↗</b><small>{asset.description}</small></a>)}</div></div>
      <div className="submission-form"><div className="submission-heading"><div><p className="kicker">SUBMISSION WORKSPACE</p><h3>{deliverable}</h3></div><span className={`submission-status status-${submission?.status ?? "not-started"}`}>{submission?.status ?? "not-started"}</span></div>
        <label>Evidence <small>Link, bảng số liệu, kết quả hoặc mô tả output</small><textarea value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="Dán link hoặc mô tả chính xác output đã tạo..." /></label>
        <label>Assumption log <small>Grain, giả định, giới hạn dữ liệu</small><textarea value={assumptions} onChange={(e) => setAssumptions(e.target.value)} placeholder="Ví dụ: grain là SKU-channel-week..." /></label>
        <label>Upload file evidence <small>CSV, Excel, PDF hoặc ảnh; tối đa 10 MB, lưu trong private storage.</small><input type="file" accept=".csv,.xlsx,.xls,.pdf,.png,.jpg,.jpeg" disabled={uploading || busy} onChange={(event) => void uploadFile(event)} /></label>
        <label>File/link output <small>{fileUrl.startsWith("/api/uploads") ? "File private đã upload; chỉ tài khoản của bạn truy cập được." : "Có thể dán thêm link Google Drive, GitHub hoặc dashboard."}</small><input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="Upload ở trên hoặc dán https://..." />{fileUrl ? <a className="evidence-file-link" href={fileUrl} target="_blank" rel="noreferrer">Mở file evidence ↗</a> : null}</label>
        <label>Reflection <small>Điều đã hiểu và bước sửa tiếp theo</small><textarea value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder="Tôi đã học được..." /></label>
        <ul className="submission-readiness"><li className={evidence.trim().length >= 120 ? "met" : ""}>Evidence {evidence.trim().length}/120</li><li className={assumptions.trim().length >= 20 ? "met" : ""}>Assumption {assumptions.trim().length}/20</li><li className={reflection.trim().length >= 40 ? "met" : ""}>Reflection {reflection.trim().length}/40</li></ul>
        <div className="submission-actions"><button type="button" className="secondary-button" disabled={busy || uploading} onClick={() => void save("save")}>Lưu draft</button><button type="button" className="primary-action" disabled={busy || uploading || !submissionReady} onClick={() => void save("submit")}>Submit evidence →</button><button type="button" className="secondary-button" disabled={busy || uploading || submission?.status !== "submitted"} onClick={() => void requestReview()}>Request mentor review</button></div>
        <p className="sync-status saved" role="status">{status}</p>
      </div>
      <div className="rubric-card"><p className="kicker">MENTOR RUBRIC</p><div className="rubric-grid">{rubric.map((item) => <div key={item.id}><strong>{item.label}</strong><span>{item.weight}%</span></div>)}</div>{review ? <div className={`mentor-review review-${review.decision}`}><h3>{review.decision === "passed" ? "Passed — có thể đưa vào portfolio" : "Needs revision — sửa rồi gửi lại"}</h3><p>{review.feedback}</p><p><strong>Điểm mạnh:</strong> {review.strengths}</p><p><strong>Cần sửa:</strong> {review.gaps}</p><dl>{Object.entries(review.scores).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}/100</dd></div>)}</dl></div> : <p className="empty-state">Submit evidence rồi yêu cầu mentor review để nhận feedback theo rubric.</p>}</div>
    </div>
  </section>;
}
