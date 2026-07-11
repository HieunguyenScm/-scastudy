import { curriculum, getSource, type Week } from "../content";

export type TutorSource = {
  label: string;
  sourceId: string;
  title: string;
  author: string;
  chapter: string;
  pages: string;
  note: string;
};

export function buildTutorRequest(message: string, week?: Week): {
  instructions: string;
  input: string;
  sources: TutorSource[];
} {
  const sources = week ? sourcesForWeek(week) : [];
  const learningContext = week
    ? [
        `Tuần ${week.week}: ${week.title} (${week.titleEn})`,
        `Module: ${week.moduleName}`,
        `Mục tiêu: ${week.objectives.join("; ")}`,
        `Tóm tắt: ${week.summary}`,
        `Khái niệm: ${week.concepts.join(", ")}`,
        `Bài thực hành: ${week.practice.join("; ")}`,
        `Deliverable: ${week.deliverable}`,
        `Nguồn học đã tuyển chọn:\n${sources.map(formatSourceForPrompt).join("\n")}`,
      ].join("\n")
    : `Lộ trình gồm 6 module: ${Array.from(
        new Set(curriculum.map((item) => item.moduleName)),
      ).join(", ")}.`;

  return {
    instructions: [
      "Bạn là CTN ASCM Tutor, mentor Supply Chain cho người Việt trình độ intern và tiếng Anh A2.",
      "Luôn trả lời bằng tiếng Việt; chỉ giữ tiếng Anh cho thuật ngữ chuyên ngành và giải nghĩa ngay lần đầu.",
      "Ưu tiên ví dụ FMCG, tư duy end-to-end, demand planning và Supply Chain AI.",
      "Bám sát bối cảnh và nguồn học đã cung cấp. Chỉ nêu tên nguồn, chương hoặc số trang có trong bối cảnh; không bịa trích dẫn.",
      "Nếu câu hỏi vượt nội dung được cung cấp, nói rõ đó là kiến thức bổ sung.",
      "Cấu trúc trả lời ngắn: Ý chính, Ví dụ, Bước thực hành tiếp theo.",
    ].join(" "),
    input: `Bối cảnh học tập:\n${learningContext}\n\nCâu hỏi của học viên:\n<question>${message}</question>`,
    sources,
  };
}

export function buildCurriculumFallback(message: string, week?: Week): string {
  if (!week) {
    const modules = Array.from(
      new Set(curriculum.map((item) => item.moduleName)),
    ).join(" → ");
    return [
      "AI Tutor đang tạm thời chuyển sang chế độ curriculum.",
      `Ý chính: Lộ trình học đi theo chuỗi ${modules}.`,
      `Với câu hỏi “${shorten(message, 180)}”, hãy chọn tuần liên quan rồi đối chiếu mục tiêu, khái niệm và bài thực hành của tuần đó.`,
      "Bước tiếp theo: mở tuần phù hợp và biến câu hỏi thành một output nhỏ có thể kiểm chứng.",
    ].join("\n\n");
  }

  const sources = sourcesForWeek(week);
  const sourceLine = sources.length
    ? sources
        .slice(0, 3)
        .map((source) => `${source.title} — ${source.chapter}, ${source.pages}: ${source.note}`)
        .join("\n- ")
    : "Nguồn chi tiết chưa được gắn cho tuần này.";
  return [
    "AI Tutor đang tạm thời chuyển sang chế độ curriculum, nên dưới đây là hướng dẫn bám sát tài liệu đã tuyển chọn.",
    `Ý chính — Tuần ${week.week}, ${week.title}: ${week.summary}`,
    `Liên hệ câu hỏi “${shorten(message, 180)}”: tập trung vào ${week.concepts.slice(0, 4).join(", ")}.`,
    `Ví dụ/bài tập: ${week.practice[0] ?? week.deliverable}`,
    `Bước thực hành tiếp theo: ${week.practice[1] ?? week.deliverable}`,
    `Nguồn nên mở:\n- ${sourceLine}`,
  ].join("\n\n");
}

function sourcesForWeek(week: Week): TutorSource[] {
  return week.sourceRefs.map((reference, index) => {
    const source = getSource(reference.sourceId);
    return {
      label: `S${index + 1}`,
      sourceId: reference.sourceId,
      title: source?.title ?? reference.sourceId,
      author: source?.author ?? "",
      chapter: reference.chapter,
      pages: reference.pages,
      note: reference.note,
    };
  });
}

function formatSourceForPrompt(source: TutorSource, index: number): string {
  return `[S${index + 1}] ${source.title}${source.author ? ` — ${source.author}` : ""}; ${source.chapter}; ${source.pages}; ghi chú: ${source.note}`;
}

function shorten(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
}
