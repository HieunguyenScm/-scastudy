import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { mentorReviews, submissions } from "../../../db/schema";
import { getWeek } from "../../../lib/content";
import { getRubric, getSourceLabels } from "../../../lib/learning";
import { requestTutorAnswer } from "../../../lib/ai/openai";
import { recomputeLearningState } from "../../../db/learning-state";
import { ApiRequestError, createRequestId, errorResponse, handleApiError, jsonResponse, readJsonObject } from "../../../lib/http";
import { getChatGPTUser } from "../../chatgpt-auth";

const endpoint = "https://api.openai.com/v1/responses";
const fallbackReview = (week: ReturnType<typeof getWeek>, evidence: string, assumptions: string, reflection: string) => {
  const evidenceReady = evidence.trim().length >= 80;
  const scores = { logic: evidenceReady ? 75 : 35, evidence: evidenceReady ? 70 : 25, action: reflection.trim().length >= 40 ? 70 : 35, communication: assumptions.trim().length >= 20 ? 70 : 35 };
  const total = Math.round((scores.logic * 30 + scores.evidence * 30 + scores.action * 25 + scores.communication * 15) / 100);
  return { decision: "needs-revision", scores, strengths: evidenceReady ? "Cấu trúc evidence đã đủ để kiểm tra hình thức." : "Đã bắt đầu ghi evidence nhưng còn quá ngắn để đánh giá.", gaps: [!evidenceReady && "Bổ sung bảng số liệu, ảnh output hoặc link sản phẩm.", assumptions.trim().length < 20 && "Viết rõ assumption và grain.", reflection.trim().length < 40 && "Giải thích điều bạn học được và quyết định tiếp theo."].filter(Boolean).join(" "), feedback: `Structural check ${total}/100. AI Mentor chuyên môn đang không khả dụng nên hệ thống không cấp Passed; hãy sửa các gap và review lại khi mentor hoạt động.`, sources: week ? getSourceLabels(week) : [] };
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
      if (ai.ok) { try {
        const parsed = JSON.parse(ai.answer) as typeof review;
        const values = Object.values(parsed.scores ?? {}).filter((value): value is number => typeof value === "number");
        const weighted = values.length >= 4 ? Math.round((values[0] * 30 + values[1] * 30 + values[2] * 25 + values[3] * 15) / 100) : 0;
        const criticalFloor = values.length >= 4 && values.every((value) => value >= 60);
        if (["passed", "needs-revision"].includes(parsed.decision) && typeof parsed.feedback === "string") {
          review = { ...parsed, decision: parsed.decision === "passed" && weighted >= 75 && criticalFloor && submission.evidence.length >= 120 && submission.assumptions.length >= 20 ? "passed" : "needs-revision" };
        }
      } catch { /* deterministic review remains safe and cannot issue a pass */ } }
    }
    const [savedReview] = await db.insert(mentorReviews).values({ submissionId: submission.id, version: submission.latestVersion, userEmail: user.email, decision: review.decision, scores: review.scores, strengths: review.strengths, gaps: review.gaps, feedback: review.feedback, sources: review.sources }).returning();
    await db.update(submissions).set({ status: review.decision === "passed" ? "passed" : "needs-revision", updatedAt: new Date().toISOString() }).where(eq(submissions.id, submission.id));
    await recomputeLearningState(db, user.email, body.week);
    return jsonResponse({ review: savedReview, requestId }, { requestId });
  } catch (error) { return handleApiError(error, requestId); }
}
