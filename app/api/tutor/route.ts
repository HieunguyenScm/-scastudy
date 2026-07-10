import { curriculum, getWeek } from "../../../lib/content";
import { getChatGPTUser } from "../../chatgpt-auth";

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  error?: { message?: string };
};

function extractText(response: OpenAIResponse) {
  if (response.output_text) return response.output_text;
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" && item.text)
    .map((item) => item.text)
    .join("\n");
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { message?: string; week?: number };
  const message = body.message?.trim() ?? "";
  if (!message || message.length > 3000) {
    return Response.json({ error: "Câu hỏi phải có từ 1 đến 3000 ký tự." }, { status: 400 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json({ error: "AI Tutor chưa được cấu hình trên môi trường này." }, { status: 503 });
  }
  const selectedWeek = body.week ? getWeek(Number(body.week)) : undefined;
  const context = selectedWeek
    ? `Tuần ${selectedWeek.week}: ${selectedWeek.title}\nMục tiêu: ${selectedWeek.objectives.join("; ")}\nTóm tắt: ${selectedWeek.summary}\nKhái niệm: ${selectedWeek.concepts.join(", ")}\nBài thực hành: ${selectedWeek.practice.join("; ")}`
    : `Lộ trình gồm 6 module: ${Array.from(new Set(curriculum.map((item) => item.moduleName))).join(", ")}.`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
      instructions: [
        "Bạn là CTN ASCM Tutor, mentor Supply Chain cho người Việt trình độ intern và tiếng Anh A2.",
        "Luôn trả lời bằng tiếng Việt; chỉ giữ tiếng Anh cho thuật ngữ chuyên ngành và giải nghĩa ngay lần đầu.",
        "Ưu tiên ví dụ FMCG, tư duy end-to-end, demand planning và Supply Chain AI.",
        "Không bịa trích dẫn hoặc số trang. Nếu câu hỏi vượt nội dung được cung cấp, nói rõ đó là kiến thức bổ sung.",
        "Cấu trúc trả lời ngắn: Ý chính, Ví dụ, Bước thực hành tiếp theo.",
      ].join(" "),
      input: `Bối cảnh học tập:\n${context}\n\nCâu hỏi của học viên:\n${message}`,
      max_output_tokens: 900,
    }),
  });

  const data = (await response.json()) as OpenAIResponse;
  if (!response.ok) {
    return Response.json(
      { error: data.error?.message ?? "OpenAI API request failed" },
      { status: response.status },
    );
  }
  const answer = extractText(data);
  if (!answer) return Response.json({ error: "AI Tutor chưa tạo được câu trả lời." }, { status: 502 });
  return Response.json({ answer, model: process.env.OPENAI_MODEL ?? "gpt-5.4-mini" });
}
