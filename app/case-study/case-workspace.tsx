"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Assignment } from "../../lib/content";

type CaseRecord = { id?: number; title: string; stage: string; problem: string; hypothesis: string; evidence: string; recommendation: string; updatedAt?: string };
const blankCase: CaseRecord = { title: "", stage: "Framing", problem: "", hypothesis: "", evidence: "", recommendation: "" };

export default function CaseWorkspace({ assignments }: { assignments: Assignment[] }) {
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [draft, setDraft] = useState<CaseRecord>(blankCase);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("Đang tải workspace...");

  useEffect(() => {
    fetch("/api/cases").then((response) => response.json()).then((data) => { setCases(data.cases ?? []); setStatus("Đã đồng bộ database"); }).catch(() => setStatus("Chưa kết nối database"));
  }, []);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    setSaving(true);
    const response = await fetch("/api/cases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const data = await response.json();
    if (response.ok) {
      const saved = data.case as CaseRecord;
      setCases((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
      setDraft(saved);
      setStatus("Đã lưu lúc " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }));
    } else setStatus(data.error ?? "Không thể lưu");
    setSaving(false);
  };

  const startFromAssignment = (assignment: Assignment) => setDraft({ ...blankCase, title: assignment.title, stage: "Framing", problem: assignment.brief });

  return <main className="case-shell"><section className="case-hero"><div><p className="kicker">PORTFOLIO LAB</p><h1>Case Study <em>Workspace.</em></h1><p>Biến kiến thức thành bằng chứng năng lực: problem → hypothesis → evidence → recommendation.</p></div><div className="workspace-status"><i />{status}</div></section><section className="case-layout"><aside className="case-sidebar"><div className="case-sidebar-head"><span>MY CASES</span><button onClick={() => setDraft(blankCase)}>+ New</button></div><div className="case-list">{cases.length ? cases.map((item) => <button key={item.id} className={draft.id === item.id ? "active" : ""} onClick={() => setDraft(item)}><span>{item.stage}</span><strong>{item.title}</strong><small>{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("vi-VN") : "Draft"}</small></button>) : <p>Chưa có case. Chọn một assignment để bắt đầu.</p>}</div><div className="assignment-starters"><span>START FROM ROADMAP</span>{assignments.map((assignment) => <button key={assignment.module} onClick={() => startFromAssignment(assignment)}><b>M{assignment.module}</b>{assignment.title}</button>)}</div></aside><form className="case-editor" onSubmit={save}><div className="editor-top"><label><span>CASE TITLE</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Ví dụ: Giảm stockout cho ngành hàng đồ uống" /></label><label><span>STAGE</span><select value={draft.stage} onChange={(event) => setDraft({ ...draft, stage: event.target.value })}>{["Framing","Analysis","Modelling","Recommendation","Portfolio-ready"].map((stage) => <option key={stage}>{stage}</option>)}</select></label></div><div className="editor-grid"><label><span>01 · PROBLEM STATEMENT</span><small>Gap hiện tại, phạm vi, KPI và business impact.</small><textarea value={draft.problem} onChange={(event) => setDraft({ ...draft, problem: event.target.value })} placeholder="Hiện tại... trong phạm vi... gây tác động..." /></label><label><span>02 · HYPOTHESIS / ISSUE TREE</span><small>Các nguyên nhân có thể kiểm chứng.</small><textarea value={draft.hypothesis} onChange={(event) => setDraft({ ...draft, hypothesis: event.target.value })} placeholder="H1: Forecast bias... H2: Lead time variability..." /></label><label><span>03 · EVIDENCE & ANALYSIS</span><small>Data, metrics, model, scenario và assumptions.</small><textarea value={draft.evidence} onChange={(event) => setDraft({ ...draft, evidence: event.target.value })} placeholder="Dữ liệu cho thấy... Model giả định..." /></label><label><span>04 · RECOMMENDATION</span><small>Action, owner, impact, risk và next step.</small><textarea value={draft.recommendation} onChange={(event) => setDraft({ ...draft, recommendation: event.target.value })} placeholder="Đề xuất... kỳ vọng... rủi ro..." /></label></div><div className="editor-footer"><p>Dữ liệu được lưu riêng theo tài khoản của mày.</p><button className="primary-action" disabled={saving || !draft.title.trim()}>{saving ? "Đang lưu..." : "Lưu case →"}</button></div></form></section></main>;
}
