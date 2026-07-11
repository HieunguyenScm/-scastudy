"use client";

import { useEffect, useMemo, useState } from "react";
import type { LessonBlock } from "../../../lib/learning";

type SavedBlock = { blockId: string; completed: boolean };

export default function LessonReader({ week, blocks, onProgress }: { week: number; blocks: LessonBlock[]; onProgress?: (value: { completed: number; total: number }) => void }) {
  const lessonBlocks = useMemo(
    () => blocks.filter((block) => block.type === "learn" || block.type === "example"),
    [blocks],
  );
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState("Đang tải tiến độ bài đọc...");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch(`/api/lesson-progress?week=${week}`, { signal: controller.signal });
        const data = await response.json() as { blocks?: SavedBlock[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Không tải được tiến độ bài đọc.");
        const savedIds = new Set((data.blocks ?? []).filter((item) => item.completed).map((item) => item.blockId));
        setCompletedIds(savedIds);
        onProgress?.({ completed: lessonBlocks.filter((block) => savedIds.has(block.id)).length, total: lessonBlocks.length });
        setStatus("Tiến độ bài đọc đã đồng bộ");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus(error instanceof Error ? error.message : "Không tải được tiến độ bài đọc.");
      }
    })();
    return () => controller.abort();
  }, [lessonBlocks, onProgress, week]);

  const toggle = async (blockId: string) => {
    const completed = !completedIds.has(blockId);
    const previous = new Set(completedIds);
    const next = new Set(completedIds);
    if (completed) next.add(blockId); else next.delete(blockId);
    setCompletedIds(next);
    onProgress?.({ completed: lessonBlocks.filter((block) => next.has(block.id)).length, total: lessonBlocks.length });
    setBusyId(blockId);
    setStatus("Đang lưu tiến độ bài đọc...");
    try {
      const response = await fetch("/api/lesson-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ week, blockId, completed }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Không lưu được tiến độ.");
      setStatus(completed ? "Đã ghi nhận block này là Encountered." : "Đã mở lại block để học.");
      const index = lessonBlocks.findIndex((block) => block.id === blockId);
      if (completed && index >= 0 && index < lessonBlocks.length - 1) {
        window.setTimeout(() => document.getElementById(`lesson-block-${lessonBlocks[index + 1].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
      }
    } catch (error) {
      setCompletedIds(previous);
      onProgress?.({ completed: lessonBlocks.filter((block) => previous.has(block.id)).length, total: lessonBlocks.length });
      setStatus(error instanceof Error ? error.message : "Không lưu được tiến độ.");
    } finally {
      setBusyId("");
    }
  };

  const completedCount = lessonBlocks.filter((block) => completedIds.has(block.id)).length;
  const percent = lessonBlocks.length ? Math.round(completedCount / lessonBlocks.length * 100) : 0;
  const nextBlock = lessonBlocks.find((block) => !completedIds.has(block.id));

  return (
    <section className="content-panel lesson-reader-panel" id="full-lesson">
      <div className="panel-index">04</div>
      <div>
        <div className="lesson-reader-heading">
          <div>
            <p className="kicker">FULL LESSON · 25–40 PHÚT</p>
            <h2>Học bài theo từng block</h2>
            <p className="panel-intro">Đọc, tự giải thích lại rồi mới đánh dấu. Hoàn thành block chỉ ghi nhận Encountered; evidence và retrieval mới tạo mastery.</p>
          </div>
          <div className="lesson-reader-progress" aria-label={`${percent}% bài đọc đã hoàn thành`}>
            <strong>{completedCount}/{lessonBlocks.length}</strong>
            <span>blocks</span>
          </div>
        </div>
        <div className="lesson-progress-track" aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>
        <p className="lesson-reader-status" role="status">{status}</p>

        <div className="lesson-reader-list">
          {lessonBlocks.map((block, index) => {
            const completed = completedIds.has(block.id);
            return (
              <article id={`lesson-block-${block.id}`} key={block.id} className={`lesson-reader-block ${completed ? "completed" : ""}`}>
                <div className="lesson-reader-index"><span>{String(index + 1).padStart(2, "0")}</span><small>{block.type === "example" ? "FMCG CASE" : "LESSON"}</small></div>
                <div className="lesson-reader-body">
                  <h3>{block.title}</h3>
                  <p>{block.body}</p>
                  {block.steps?.length ? <ol>{block.steps.map((step) => <li key={step}>{step}</li>)}</ol> : null}
                  <button type="button" disabled={busyId === block.id} onClick={() => void toggle(block.id)}>
                    {completed ? "✓ Đã học · mở lại" : "Đã hiểu block này →"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {nextBlock ? <button className="continue-block-button" type="button" onClick={() => document.getElementById(`lesson-block-${nextBlock.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>Tiếp tục: {nextBlock.title} →</button> : <div className="lesson-reader-complete"><strong>Đã đọc hết bài.</strong><span>Tiếp theo: tự kiểm tra → guided lab → nộp evidence.</span></div>}
      </div>
    </section>
  );
}
