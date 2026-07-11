"use client";

import Link from "next/link";
import { useState } from "react";
import type { BossChallenge } from "../../../content/boss-challenges";

export default function BossWorkspace({ challenge }: { challenge: BossChallenge }) {
  const [evidence, setEvidence] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [defense, setDefense] = useState(["", "", ""]);
  const [reflection, setReflection] = useState("");
  const [status, setStatus] = useState("Chưa lưu boss attempt.");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true); setStatus("Đang lưu attempt...");
    try {
      const response = await fetch("/api/cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: `Boss M${challenge.module}: ${challenge.title}`, stage: "Recommendation", problem: `${challenge.context}\n\nDecision: ${challenge.decision}`, hypothesis: challenge.defense.map((question, index) => `${question}\n${defense[index]}`).join("\n\n"), evidence, recommendation, assignmentModule: challenge.module, rubricScores: {}, reflection }) });
      const data = await response.json() as { case?: { id: number }; error?: string };
      if (!response.ok || !data.case) throw new Error(data.error ?? "Không lưu được boss attempt.");
      setStatus("Boss attempt đã lưu vào Case workspace. Tiếp tục mentor review và revision ở đó.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Không lưu được boss attempt."); }
    finally { setBusy(false); }
  };
  return <main className="app-shell boss-shell" id="main-content"><section className="boss-hero"><p className="kicker">MODULE {challenge.module} · BOSS DECISION</p><h1>{challenge.title}</h1><p>{challenge.context}</p><div className="boss-decision"><span>QUYẾT ĐỊNH</span><strong>{challenge.decision}</strong></div></section><section className="boss-grid"><article><p className="kicker">REQUIRED PROOF</p><h2>Bằng chứng bắt buộc</h2><ol>{challenge.evidence.map((item) => <li key={item}>{item}</li>)}</ol><p className="boss-pass-rule"><strong>Pass rule:</strong> {challenge.passRule}</p></article><article className="boss-form"><label>Evidence & analysis<textarea value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Dán số liệu, link output, validation và lập luận..." /></label><label>Recommendation<textarea value={recommendation} onChange={(event) => setRecommendation(event.target.value)} placeholder="Chọn một quyết định, trade-off, owner và next step..." /></label>{challenge.defense.map((question, index) => <label key={question}>{question}<textarea value={defense[index]} onChange={(event) => setDefense((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} /></label>)}<label>Reflection sau attempt<textarea value={reflection} onChange={(event) => setReflection(event.target.value)} /></label><button className="primary-action" type="button" disabled={busy || evidence.length < 120 || recommendation.length < 80 || defense.some((item) => item.length < 40)} onClick={() => void save()}>{busy ? "Đang lưu..." : "Lưu boss attempt →"}</button><p className="sync-status saved" role="status">{status}</p></article></section><nav className="boss-nav"><Link href={`/week/${challenge.module * 4}`}>← Ôn tuần cuối module</Link><Link href="/case-study">Mở Case workspace →</Link></nav></main>;
}
