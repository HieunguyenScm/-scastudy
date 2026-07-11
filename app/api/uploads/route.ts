import { env as cloudflareEnv } from "cloudflare:workers";
import { createRequestId, errorResponse, handleApiError, jsonResponse } from "../../../lib/http";
import { getChatGPTUser } from "../../chatgpt-auth";

const env = cloudflareEnv as unknown as { FILES?: R2Bucket };
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const allowedExtensions = new Set(["csv", "xlsx", "xls", "pdf", "png", "jpg", "jpeg"]);

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);
    if (!env.FILES) return errorResponse("FILE_STORAGE_UNAVAILABLE", 503, "Private file storage is not configured.", requestId);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return errorResponse("FILE_REQUIRED", 400, "Choose a file before uploading.", requestId);
    }
    if (file.size > MAX_FILE_SIZE) {
      return errorResponse("FILE_TOO_LARGE", 413, "File size must not exceed 10 MB.", requestId);
    }
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!allowedExtensions.has(extension)) {
      return errorResponse("FILE_TYPE_NOT_ALLOWED", 415, "Allowed formats: CSV, XLSX, XLS, PDF, PNG, JPG.", requestId);
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120) || `evidence.${extension}`;
    const ownerPrefix = `submissions/${encodeURIComponent(user.email)}/`;
    const key = `${ownerPrefix}${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    await env.FILES.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
      customMetadata: { owner: user.email, originalName: file.name.slice(0, 200) },
    });
    return jsonResponse({ fileUrl: `/api/uploads?key=${encodeURIComponent(key)}`, fileName: file.name, size: file.size, requestId }, { requestId });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const user = await getChatGPTUser();
    if (!user) return errorResponse("AUTH_REQUIRED", 401, "Authentication is required.", requestId);
    if (!env.FILES) return errorResponse("FILE_STORAGE_UNAVAILABLE", 503, "Private file storage is not configured.", requestId);
    const key = new URL(request.url).searchParams.get("key") ?? "";
    const ownerPrefix = `submissions/${encodeURIComponent(user.email)}/`;
    if (!key.startsWith(ownerPrefix)) return errorResponse("FILE_NOT_FOUND", 404, "File not found.", requestId);
    const object = await env.FILES.get(key);
    if (!object) return errorResponse("FILE_NOT_FOUND", 404, "File not found.", requestId);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set("Content-Disposition", `attachment; filename="${(object.customMetadata?.originalName ?? "evidence-file").replace(/["\\\r\n]/g, "-")}"`);
    return new Response(object.body, { headers });
  } catch (error) {
    return handleApiError(error, requestId);
  }
}
