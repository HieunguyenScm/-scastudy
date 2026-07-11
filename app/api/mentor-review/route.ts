import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { mentorReviews, submissions } from "../../../db/schema";
import { getWeek } from "../../../lib/content";
import { getRubric, getSourceLabels } from "../../../lib/learning";
import { requestTutorAnswer } from "../../../lib/ai/openai";
import { ApiRequestError, createRequestId, errorResponse, handleApiError, jsonResponse, readJsonObject } from "../../../lib/http";
import { getChatGPTUser } from "../../chatgpt-auth";

const endpoint = "https://api.openai.com/v1/responses";
const fallbackReview = (week: ReturnType<typeof getWeek>, evidence: string, assumptions: string, reflection: string) => {
  const evidenceReady = evidence.trim().length >= 80;
  const scores = { logic: evidenceReady ? 75 : 35, evidence: evidenceReady ? 70 : 25, action: reflection.trim().length >= 40 ? 70 : 35, communication: assumptions.trim().length >= 20 ? 70 : 35 };
  const total = Math.round((scores.logic * 30 + scores.evidence * 30 + scores.action * 25 + scores.communication * 15) / 100);
  return { decision: total >= 70 && evidenceReady ? "passed" : "needs-revision", scores, strengths: evidenceReady ? "Đã có evidence đủ dài để bắt đầu kiểm chứng." : "Đã bắt đầu ghi evidence nhưng còn quá ngắn để đánh giá.", gaps: [!evidenceReady && "Bổ sung bảng số liệu, ảnh output hoặc link sản phẩm.", assumptions.trim().length < 20 && "Viết rõ assumption và grain.", reflection.trim().length < 40 && "Giải thích điều bạn học được và quyết định tiếp theo."].filter(Boolean).join(" "), feedback: `Rubric tuần ${week?.week}: ${total}/100. Hãy sửa theo các gap rồi gửi lại version mới.`, sources: week ? getSourceLabels(week) : [] };
};

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);
    const body = await readJsonObject(request, 20_000);
    if (typeof body.week !== "number" || !Number.isInteger(body.week)) throw new ApiRequestError("INVALID_WEEK", 400, "week is required.");
    await ensureDatabase();
    const db = getDb();
    const [submission] = await db.select().from(submissions).where(and(eq(submissions.userEmail, user.email), eq(submissions.week, body.week))).limit(1);
    if (!submission || submission.status !== "submitted") throw new ApiRequestError("SUBMISSION_REQUIRED", 409, "Hãy lưu và Submit evidence trước khi yêu cầu mentor review.");
    const week = getWeek(body.week);
    const rubric = getRubric();
    let review = fallbackReview(week, submission.evidence, submission.assumptions, submission.reflection);
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      const ai = await requestTutorAnswer({ endpoint, apiKey, model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini", requestId, instructions: "Bạn là AI Mentor Supply Chain. Trả về JSON hợp lệ với decision (passed|needs-revision), scores object, strengths, gaps, feedback, sources array. Không được pass nếu evidence không đủ. Chấm theo rubric và chỉ dùng tiếng Việt.", input: JSON.stringify({ week: week?.week, title: week?.title, rubric, evidence: submission.evidence, assumptions: submission.assumptions, reflection: submission.reflection, sources: getSourceLabels(week!) }), timeoutMs: 12000 });
      if (ai.ok) { try { const parsed = JSON.parse(ai.answer) as typeof review; if (["passed", "needs-revision"].includes(parsed.decision) && parsed.scores && typeof parsed.feedback === "string") review = parsed; } catch { /* deterministic review remains safe */ } }
    }
    const [savedReview] = await db.insert(mentorReviews).values({ submissionId: submission.id, version: submission.latestVersion, userEmail: user.email, decision: review.decision, scores: review.scores, strengths: review.strengths, gaps: review.gaps, feedback: review.feedback, sources: review.sources }).returning();
    await db.update(submissions).set({ status: review.decision === "passed" ? "passed" : "needs-revision", updatedAt: new Date().toISOString() }).where(eq(submissions.id, submission.id));
    return jsonResponse({ review: savedReview, requestId }, { requestId });
  } catch (error) { return handleApiError(error, requestId); }
}
