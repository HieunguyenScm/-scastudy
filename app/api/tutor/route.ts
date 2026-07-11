import { ensureDatabase } from "../../../db/ensure";
import { requestTutorAnswer, type TutorProviderFailure } from "../../../lib/ai/openai";
import {
  consumeDailyAiRequest,
  parseDailyRequestLimit,
  recordAiExecution,
} from "../../../lib/ai/telemetry";
import { buildCurriculumFallback, buildTutorRequest } from "../../../lib/ai/tutor";
import { getWeek } from "../../../lib/content";
import {
  ApiRequestError,
  createRequestId,
  errorResponse,
  handleApiError,
  hasOwn,
  jsonResponse,
  readJsonObject,
} from "../../../lib/http";
import { getChatGPTUser } from "../../chatgpt-auth";

const DEFAULT_MODEL = "gpt-5.4-mini";
const PROVIDER_TIMEOUT_MS = 12_000;
const OPENAI_RESPONSES_ENDPOINT = "https://api.openai.com/v1/responses";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  try {
    const user = await getChatGPTUser();
    if (!user) {
      return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);
    }

    const body = await readJsonObject(request, 16_384);
    if (typeof body.message !== "string") {
      throw new ApiRequestError(
        "INVALID_MESSAGE",
        400,
        "message must contain between 1 and 3000 characters.",
      );
    }
    const message = body.message.trim();
    if (!message || message.length > 3000) {
      throw new ApiRequestError(
        "INVALID_MESSAGE",
        400,
        "message must contain between 1 and 3000 characters.",
      );
    }

    let weekNumber: number | undefined;
    if (hasOwn(body, "week")) {
      if (
        typeof body.week !== "number" ||
        !Number.isInteger(body.week) ||
        body.week < 1 ||
        body.week > 24
      ) {
        throw new ApiRequestError(
          "INVALID_WEEK",
          400,
          "week must be an integer from 1 to 24.",
        );
      }
      weekNumber = body.week;
    }
    const selectedWeek = weekNumber === undefined ? undefined : getWeek(weekNumber);
    if (weekNumber !== undefined && !selectedWeek) {
      throw new ApiRequestError(
        "INVALID_WEEK",
        400,
        "week must be an integer from 1 to 24.",
      );
    }

    const tutorRequest = buildTutorRequest(message, selectedWeek);
    const model = process.env.OPENAI_MODEL ?? DEFAULT_MODEL;
    await ensureDatabase();
    const dailyLimit = parseDailyRequestLimit(process.env.AI_DAILY_REQUEST_LIMIT);
    const dailyUsage = await consumeDailyAiRequest(user.email, dailyLimit);
    if (!dailyUsage.allowed) {
      await recordAiExecution({
        requestId,
        userEmail: user.email,
        week: weekNumber ?? null,
        status: "rejected",
        errorCode: "AI_DAILY_LIMIT_EXCEEDED",
        model,
        providerStatus: null,
        attemptCount: 0,
        latencyMs: Date.now() - startedAt,
        inputChars: message.length,
        outputChars: 0,
      });
      return errorResponse(
        "AI_DAILY_LIMIT_EXCEEDED",
        429,
        "The daily AI Tutor request limit has been reached.",
        requestId,
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return degradedResponse({
        requestId,
        userEmail: user.email,
        weekNumber,
        message,
        model,
        selectedWeek,
        sources: tutorRequest.sources,
        startedAt,
        errorCode: "AI_NOT_CONFIGURED",
        providerStatus: null,
        attemptCount: 0,
      });
    }

    const providerResult = await requestTutorAnswer({
      endpoint: OPENAI_RESPONSES_ENDPOINT,
      apiKey,
      model,
      instructions: tutorRequest.instructions,
      input: tutorRequest.input,
      requestId,
      timeoutMs: PROVIDER_TIMEOUT_MS,
    });
    if (!providerResult.ok) {
      return degradedResponse({
        requestId,
        userEmail: user.email,
        weekNumber,
        message,
        model,
        selectedWeek,
        sources: tutorRequest.sources,
        startedAt,
        errorCode: providerFailureCode(providerResult.reason),
        providerStatus: providerResult.providerStatus,
        attemptCount: providerResult.attemptCount,
      });
    }

    await recordAiExecution({
      requestId,
      userEmail: user.email,
      week: weekNumber ?? null,
      status: "success",
      errorCode: null,
      model,
      providerStatus: providerResult.providerStatus,
      attemptCount: providerResult.attemptCount,
      latencyMs: Date.now() - startedAt,
      inputChars: message.length,
      outputChars: providerResult.answer.length,
      inputTokens: providerResult.inputTokens,
      outputTokens: providerResult.outputTokens,
    });
    return jsonResponse(
      {
        answer: providerResult.answer,
        model,
        degraded: false,
        sources: tutorRequest.sources,
        requestId,
      },
      { requestId },
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

async function degradedResponse(input: {
  requestId: string;
  userEmail: string;
  weekNumber: number | undefined;
  message: string;
  model: string;
  selectedWeek: ReturnType<typeof getWeek>;
  sources: ReturnType<typeof buildTutorRequest>["sources"];
  startedAt: number;
  errorCode: string;
  providerStatus: number | null;
  attemptCount: number;
}): Promise<Response> {
  const answer = buildCurriculumFallback(input.message, input.selectedWeek);
  await recordAiExecution({
    requestId: input.requestId,
    userEmail: input.userEmail,
    week: input.weekNumber ?? null,
    status: "degraded",
    errorCode: input.errorCode,
    model: input.model,
    providerStatus: input.providerStatus,
    attemptCount: input.attemptCount,
    latencyMs: Date.now() - input.startedAt,
    inputChars: input.message.length,
    outputChars: answer.length,
  });
  return jsonResponse(
    {
      answer,
      model: input.model,
      degraded: true,
      code: "AI_TUTOR_DEGRADED",
      sources: input.sources,
      requestId: input.requestId,
    },
    { requestId: input.requestId },
  );
}

function providerFailureCode(reason: TutorProviderFailure): string {
  switch (reason) {
    case "auth":
      return "AI_PROVIDER_AUTH";
    case "permission":
      return "AI_PROVIDER_PERMISSION";
    case "quota":
      return "AI_PROVIDER_QUOTA";
    case "rate-limit":
      return "AI_PROVIDER_RATE_LIMIT";
    case "timeout":
      return "AI_PROVIDER_TIMEOUT";
    case "upstream":
      return "AI_PROVIDER_UNAVAILABLE";
  }
}
