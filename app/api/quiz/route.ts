import { sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensureDatabase } from "../../../db/ensure";
import { recomputeLearningState } from "../../../db/learning-state";
import {
  progress,
  quizAttempts,
} from "../../../db/schema";
import {
  ApiRequestError,
  createRequestId,
  errorResponse,
  handleApiError,
  jsonResponse,
  readJsonObject,
} from "../../../lib/http";
import { getQuizForModule } from "../../../lib/content";
import { getChatGPTUser } from "../../chatgpt-auth";

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) {
      return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);
    }

    const body = await readJsonObject(request, 16_384);
    if (typeof body.module !== "number" || !Number.isInteger(body.module)) {
      throw new ApiRequestError(
        "INVALID_MODULE",
        400,
        "module must be an integer from 1 to 6.",
      );
    }
    const moduleNumber = body.module;
    const quiz = getQuizForModule(moduleNumber);
    if (!quiz || moduleNumber < 1 || moduleNumber > 6) {
      throw new ApiRequestError(
        "INVALID_MODULE",
        400,
        "module must be an integer from 1 to 6.",
      );
    }
    const answers = body.answers;
    if (!isAnswerObject(answers)) {
      throw new ApiRequestError(
        "INVALID_ANSWERS",
        400,
        "answers must contain one valid option for every quiz question.",
      );
    }

    const submittedIds = Object.keys(answers);
    const expectedIds = new Set(quiz.questions.map((question) => question.id));
    if (
      submittedIds.length !== quiz.questions.length ||
      submittedIds.some((id) => !expectedIds.has(id))
    ) {
      throw new ApiRequestError(
        "INVALID_QUESTION_IDS",
        400,
        "answers must contain exactly the question IDs for this module.",
      );
    }

    for (const question of quiz.questions) {
      const selected = answers[question.id];
      if (
        typeof selected !== "number" ||
        !Number.isInteger(selected) ||
        selected < 0 ||
        selected >= question.options.length
      ) {
        throw new ApiRequestError(
          "INVALID_OPTION_INDEX",
          400,
          "Every answer must be a valid option index for its question.",
        );
      }
    }

    const results = quiz.questions.map((question) => ({
      id: question.id,
      correct: answers[question.id] === question.answerIndex,
      correctIndex: question.answerIndex,
      explanation: question.explanation,
    }));
    const correct = results.filter((result) => result.correct).length;
    const total = results.length;
    const score = Math.round((correct / total) * 100);
    const moduleEndWeek = moduleNumber * 4;

    await ensureDatabase();
    const db = getDb();
    const attemptInsert = db.insert(quizAttempts).values({
      userEmail: user.email,
      module: moduleNumber,
      answers,
      score,
      correct,
      total,
    });
    const progressUpsert = db
      .insert(progress)
      .values({
        userEmail: user.email,
        week: moduleEndWeek,
        quizScore: score,
      })
      .onConflictDoUpdate({
        target: [progress.userEmail, progress.week],
        set: {
          quizScore: sql<number>`MAX(COALESCE(${progress.quizScore}, -1), ${score})`,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      });
    await db.batch([attemptInsert, progressUpsert] as const);
    const learningProgress = await recomputeLearningState(db, user.email, moduleEndWeek);
    const bestScore = learningProgress?.quizScore ?? score;

    return jsonResponse(
      {
        attempt: { score, correct, total },
        score,
        bestScore,
        correct,
        total,
        results,
        progress: learningProgress,
        requestId,
      },
      { requestId },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

function isAnswerObject(value: unknown): value is Record<string, number> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
