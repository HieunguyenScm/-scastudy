import { getSource, type Week } from "./content";

export type LessonBlock = { id: string; type: "learn" | "example" | "lab" | "challenge" | "check"; title: string; body: string; steps?: string[] };
export type LearningAsset = { id: string; label: string; href: string; kind: "dataset" | "template" | "answer-key"; description: string };

const skillByModule: Record<number, string> = {
  1: "Supply Chain foundation", 2: "Analytics", 3: "Forecasting", 4: "Inventory", 5: "Optimization", 6: "Supply Chain AI",
};

export function getSkillForWeek(week: Week) { return skillByModule[week.module] ?? "Supply Chain foundation"; }

export function getLessonBlocks(week: Week): LessonBlock[] {
  const example = week.week <= 4
    ? `Ví dụ FMCG: chọn một SKU nước giải khát bán qua nhà phân phối và siêu thị. Hãy nối quyết định của tuần này với service, cost và cash thay vì tối ưu một chỉ số riêng lẻ.`
    : `Ví dụ FMCG: dùng dữ liệu order-to-delivery của SKU và channel để tìm một vấn đề có thể biến thành quyết định vận hành. Ghi rõ grain, assumption và cách kiểm chứng.`;
  return [
    { id: "why", type: "learn", title: "Vì sao nội dung này quan trọng?", body: `${week.summary} Đây là năng lực ${getSkillForWeek(week)} và là nền để đi tới Demand Planning và Supply Chain AI.` },
    { id: "concepts", type: "learn", title: "Kiến thức cốt lõi", body: `Tập trung vào: ${week.concepts.join(", ")}. Đọc từng khái niệm, tự viết lại bằng tiếng Việt và giữ thuật ngữ English trong ngoặc để tạo glossary cá nhân.` },
    { id: "example", type: "example", title: "Ví dụ FMCG từng bước", body: example, steps: ["Xác định business question và đơn vị phân tích.", "Viết assumption trước khi tính hoặc xây model.", "Tạo một baseline đơn giản.", "Đo kết quả bằng KPI phù hợp.", "Viết recommendation và giới hạn của kết luận."] },
    { id: "guided-lab", type: "lab", title: "Guided lab", body: `Mở dataset FMCG, dùng template của tuần ${week.week}, rồi hoàn thành các task theo thứ tự. Không bỏ qua bước validation; mọi con số trong output phải truy ngược được về dữ liệu nguồn.`, steps: week.practice },
    { id: "challenge", type: "challenge", title: "Independent challenge", body: `Làm lại bài với một SKU hoặc channel khác. So sánh với baseline, giải thích nguyên nhân khác biệt và đưa ra một hành động có thể triển khai trong 30 ngày.` },
    { id: "check", type: "check", title: "Definition of done", body: `Bạn hoàn thành tuần khi đã có: ${week.deliverable}; output được lưu, assumption rõ, reflection tối thiểu 20 ký tự và có thể giải thích quyết định cho một đồng nghiệp.` },
  ];
}

export function getLearningAssets(week: Week): LearningAsset[] {
  return [
    { id: "fmcg-dataset", label: "Tải FMCG learning dataset", href: "/assets/fmcg-learning-dataset.csv", kind: "dataset", description: "Dữ liệu synthetic dùng xuyên suốt 24 tuần." },
    { id: `week-${week.week}-template`, label: `Template lab tuần ${week.week}`, href: "/assets/templates/lab-starter.csv", kind: "template", description: `Starter template cho deliverable: ${week.deliverable}.` },
    { id: "data-dictionary", label: "Data dictionary", href: "/assets/fmcg-data-dictionary.csv", kind: "template", description: "Định nghĩa field, grain và business meaning." },
  ];
}

export function getRubric() {
  return [
    { id: "logic", label: "Logic Supply Chain", weight: 30 },
    { id: "evidence", label: "Evidence và kiểm chứng", weight: 30 },
    { id: "action", label: "Insight và action", weight: 25 },
    { id: "communication", label: "Trình bày và reflection", weight: 15 },
  ];
}

export function getSourceLabels(week: Week) {
  return week.sourceRefs.map((ref, index) => {
    const source = getSource(ref.sourceId);
    return `S${index + 1}: ${source?.title ?? ref.sourceId}, ${ref.chapter}, ${ref.pages}`;
  });
}
