export type JsonObject = Record<string, unknown>;

export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.code = code;
    this.status = status;
  }
}

export function createRequestId(): string {
  return crypto.randomUUID();
}

export async function readJsonObject(
  request: Request,
  maxBytes = 32_768,
): Promise<JsonObject> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new ApiRequestError(
      "PAYLOAD_TOO_LARGE",
      413,
      "Request payload is too large.",
    );
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    throw new ApiRequestError("INVALID_JSON", 400, "Request body must be valid JSON.");
  }

  if (new TextEncoder().encode(text).byteLength > maxBytes) {
    throw new ApiRequestError(
      "PAYLOAD_TOO_LARGE",
      413,
      "Request payload is too large.",
    );
  }

  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new ApiRequestError("INVALID_JSON", 400, "Request body must be valid JSON.");
  }

  if (!isPlainObject(value)) {
    throw new ApiRequestError("INVALID_JSON_OBJECT", 400, "Request body must be a JSON object.");
  }
  return value;
}

export function jsonResponse(
  body: JsonObject,
  options: { status?: number; requestId?: string } = {},
): Response {
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (options.requestId) headers.set("X-Request-Id", options.requestId);
  return Response.json(body, { status: options.status ?? 200, headers });
}

export function errorResponse(
  code: string,
  status: number,
  message: string,
  requestId?: string,
): Response {
  return jsonResponse(
    {
      error: message,
      code,
      ...(requestId ? { requestId } : {}),
    },
    { status, requestId },
  );
}

export function handleApiError(error: unknown, requestId?: string): Response {
  if (error instanceof ApiRequestError) {
    return errorResponse(error.code, error.status, error.message, requestId);
  }
  return errorResponse(
    "INTERNAL_ERROR",
    500,
    "The request could not be completed.",
    requestId,
  );
}

export function hasOwn(object: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isPlainObject(value: unknown): value is JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
