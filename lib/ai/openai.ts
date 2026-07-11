type OpenAIResponseBody = {
  output_text?: unknown;
  output?: unknown;
  error?: {
    code?: unknown;
    type?: unknown;
    message?: unknown;
  };
  usage?: {
    input_tokens?: unknown;
    output_tokens?: unknown;
  };
};

export type TutorProviderFailure =
  | "auth"
  | "permission"
  | "quota"
  | "rate-limit"
  | "timeout"
  | "upstream";

export type TutorProviderResult =
  | {
      ok: true;
      answer: string;
      attemptCount: number;
      providerStatus: number;
      inputTokens: number | null;
      outputTokens: number | null;
    }
  | {
      ok: false;
      reason: TutorProviderFailure;
      attemptCount: number;
      providerStatus: number | null;
    };

type TutorProviderRequest = {
  endpoint: string;
  apiKey: string;
  model: string;
  instructions: string;
  input: string;
  requestId: string;
  timeoutMs?: number;
};

export async function requestTutorAnswer(
  request: TutorProviderRequest,
): Promise<TutorProviderResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request.timeoutMs ?? 12_000);
  let attemptCount = 0;
  let providerStatus: number | null = null;

  try {
    while (attemptCount < 2) {
      attemptCount += 1;
      let response: Response;
      try {
        response = await fetch(request.endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${request.apiKey}`,
            "Content-Type": "application/json",
            "X-Client-Request-Id": request.requestId,
          },
          body: JSON.stringify({
            model: request.model,
            instructions: request.instructions,
            input: request.input,
            max_output_tokens: 900,
          }),
          signal: controller.signal,
        });
      } catch {
        return {
          ok: false,
          reason: controller.signal.aborted ? "timeout" : "upstream",
          attemptCount,
          providerStatus,
        };
      }

      providerStatus = response.status;
      const data = await readProviderJson(response);
      if (controller.signal.aborted) {
        return {
          ok: false,
          reason: "timeout",
          attemptCount,
          providerStatus,
        };
      }
      if (response.ok) {
        const answer = extractResponseText(data);
        if (!answer) {
          return {
            ok: false,
            reason: "upstream",
            attemptCount,
            providerStatus,
          };
        }
        return {
          ok: true,
          answer,
          attemptCount,
          providerStatus,
          inputTokens: readNonNegativeInteger(data?.usage?.input_tokens),
          outputTokens: readNonNegativeInteger(data?.usage?.output_tokens),
        };
      }

      const nonRetryable = classifyNonRetryableFailure(response.status, data);
      if (nonRetryable) {
        return {
          ok: false,
          reason: nonRetryable,
          attemptCount,
          providerStatus,
        };
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attemptCount >= 2) {
        return {
          ok: false,
          reason: response.status === 429 ? "rate-limit" : "upstream",
          attemptCount,
          providerStatus,
        };
      }

      const waited = await waitForRetry(retryDelayMs(response), controller.signal);
      if (!waited) {
        return {
          ok: false,
          reason: "timeout",
          attemptCount,
          providerStatus,
        };
      }
    }
  } finally {
    clearTimeout(timeout);
  }

  return { ok: false, reason: "upstream", attemptCount, providerStatus };
}

async function readProviderJson(response: Response): Promise<OpenAIResponseBody | null> {
  try {
    const value = (await response.json()) as unknown;
    return typeof value === "object" && value !== null
      ? (value as OpenAIResponseBody)
      : null;
  } catch {
    return null;
  }
}

function extractResponseText(data: OpenAIResponseBody | null): string {
  if (typeof data?.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }
  if (!Array.isArray(data?.output)) return "";

  const text: string[] = [];
  for (const item of data.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (
        isRecord(content) &&
        content.type === "output_text" &&
        typeof content.text === "string" &&
        content.text.trim()
      ) {
        text.push(content.text.trim());
      }
    }
  }
  return text.join("\n");
}

function classifyNonRetryableFailure(
  status: number,
  data: OpenAIResponseBody | null,
): "auth" | "permission" | "quota" | null {
  if (status === 401) return "auth";
  if (status === 403) return "permission";
  if (status === 402) return "quota";

  const error = data?.error;
  const classificationText = [error?.code, error?.type, error?.message]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
  if (
    classificationText.includes("insufficient_quota") ||
    classificationText.includes("billing") ||
    classificationText.includes("credit") ||
    classificationText.includes("usage limit") ||
    classificationText.includes("hard limit")
  ) {
    return "quota";
  }
  if (
    classificationText.includes("permission") ||
    classificationText.includes("not authorized")
  ) {
    return "permission";
  }
  return null;
}

function retryDelayMs(response: Response): number {
  const retryAfterSeconds = Number(response.headers.get("retry-after"));
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return Math.min(Math.round(retryAfterSeconds * 1000), 500);
  }
  return 250;
}

function waitForRetry(milliseconds: number, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve(true);
    }, milliseconds);
    const onAbort = () => {
      clearTimeout(timer);
      resolve(false);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function readNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
