import { getSource, type Week } from "./content";
import { getTeachingNote } from "../content/teaching-notes";

export type LessonBlock = {
  id: string;
  type: "learn" | "example" | "lab" | "check" | "done";
  title: string;
  body: string;
  steps?: string[];
  qa?: Array<{ question: string; answer: string }>;
};
export type LearningAsset = { id: string; label: string; href: string; kind: "dataset" | "template" | "answer-key"; description: string };
export type RetrievalItem = { id: string; type: "recall" | "application" | "transfer"; prompt: string; hint: string; modelAnswer: string; keywords: string[] };

const skillByModule: Record<number, string> = {
  1: "Supply Chain foundation", 2: "Analytics", 3: "Forecasting", 4: "Inventory", 5: "Optimization", 6: "Supply Chain AI",
};

export function getSkillForWeek(week: Week) { return skillByModule[week.module] ?? "Supply Chain foundation"; }

export function getLessonBlocks(week: Week): LessonBlock[] {
  const sectionBlocks: LessonBlock[] = [
    { id: "core-idea", type: "learn", title: "Ý tưởng cốt lõi", body: week.lesson.coreIdea },
    ...week.lesson.sections.map((section, index) => ({
      id: `lesson-${index + 1}`,
      type: "learn" as const,
      title: section.heading,
      body: section.body,
    })),
  ];

  const example = week.lesson.workedExample;
  const exampleBlock: LessonBlock = {
    id: "worked-example",
    type: "example",
    title: example.title,
    body: `${example.narrative} ${example.takeaway}`,
    steps: example.steps,
  };

  const labBlock: LessonBlock = {
    id: "guided-lab",
    type: "lab",
    title: "Guided lab",
    body: `Mở dataset FMCG, dùng template của tuần ${week.week}, rồi hoàn thành các task theo thứ tự. Không bỏ qua bước validation; mọi con số trong output phải truy ngược được về dữ liệu nguồn.`,
    steps: week.practice,
  };

  const challengeBlock: LessonBlock = {
    id: "independent-challenge",
    type: "lab",
    title: "Independent challenge · Không làm theo mẫu",
    body: `Chọn một SKU, customer hoặc DC khác với worked example và tự tạo ${week.deliverable}. Mục tiêu là chứng minh bạn có thể transfer kiến thức sang tình huống mới, không chỉ lặp lại hướng dẫn.`,
    steps: [
      "Chốt business question và grain trước khi mở công cụ.",
      "Ghi ít nhất hai assumption có thể làm kết quả thay đổi.",
      "So sánh baseline với một phương án hoặc scenario khác.",
      "Kết luận bằng evidence → impact → action, kèm một limitation.",
    ],
  };

  const checkBlock: LessonBlock = {
    id: "self-check",
    type: "check",
    title: "Tự kiểm tra hiểu bài",
    body: "Trả lời từng câu bằng lời của bạn trước, sau đó mở đáp án mẫu để đối chiếu cách diễn giải.",
    qa: week.lesson.selfCheck,
  };

  const doneBlock: LessonBlock = {
    id: "done",
    type: "done",
    title: "Definition of done",
    body: `Bạn hoàn thành tuần khi đã có: ${week.deliverable}; output được lưu, assumption rõ, reflection tối thiểu 20 ký tự và có thể giải thích quyết định cho một đồng nghiệp.`,
  };

  return [...sectionBlocks, exampleBlock, labBlock, challengeBlock, checkBlock, doneBlock];
}

export function getLearningAssets(week: Week): LearningAsset[] {
  return [
    { id: "fmcg-learning-pack", label: "Tải FMCG Learning Pack · 15 sheets", href: "/assets/CTNASCM_FMCG_Learning_Pack.xlsx", kind: "dataset", description: "Workbook synthetic xuyên suốt 24 tuần: master data, sales, orders, shipments, inventory, promotions, forecast, dashboard và lab guide." },
    { id: `week-${week.week}-template`, label: `Mở template tuần ${week.week} trong workbook`, href: "/assets/CTNASCM_FMCG_Learning_Pack.xlsx", kind: "template", description: `Dùng sheet Week_Templates, dòng tuần ${week.week}; expected output: ${week.deliverable}.` },
    { id: "data-dictionary", label: "Data dictionary dạng CSV", href: "/assets/fmcg-data-dictionary.csv", kind: "template", description: "Bản tra nhanh field, grain và business meaning; bản đầy đủ nằm trong workbook." },
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

export function getRetrievalItems(week: Week): RetrievalItem[] {
  const concepts = week.concepts.slice(0, 4);
  const teaching = getTeachingNote(week.week);
  const keywords = [...new Set(
    concepts
      .flatMap((item) => item.toLowerCase().split(/[^a-z0-9À-ỹ]+/i))
      .filter((word) => word.length >= 4 && !["with", "from", "theo", "giữa", "hoặc"].includes(word)),
  )].slice(0, 10);
  return [
    {
      id: `w${week.week}-recall`, type: "recall",
      prompt: `Không mở ghi chú: hãy giải thích ${concepts.slice(0, 2).join(" và ")} bằng lời của bạn, rồi nêu vì sao chúng quan trọng với ${week.title}.`,
      hint: "Định nghĩa -> cơ chế -> ảnh hưởng tới service, cost hoặc cash.",
      modelAnswer: `${week.lesson.coreIdea} ${teaching.explain}`,
      keywords,
    },
    {
      id: `w${week.week}-application`, type: "application",
      prompt: `Application case: ${week.lesson.workedExample.narrative} Bạn sẽ kiểm tra dữ liệu nào trước, dùng KPI hoặc phương pháp nào và hành động đầu tiên là gì?`,
      hint: "Nêu grain, assumption, baseline, bằng chứng và action.",
      modelAnswer: `${teaching.decision} ${week.lesson.workedExample.takeaway}`,
      keywords: [...keywords, "dữ liệu", "kpi", "assumption", "hành động"],
    },
    {
      id: `w${week.week}-transfer`, type: "transfer",
      prompt: `Transfer case: đổi worked example sang một SKU hoặc channel khác, đồng thời làm assumption quan trọng nhất xấu đi 30%. Hãy dùng kiến thức tuần ${week.week} để thay đổi quyết định, nêu trade-off và cách kiểm chứng.`,
      hint: `Bắt đầu từ decision: ${teaching.decision}`,
      modelAnswer: `Áp dụng ${concepts.join(", ")} vào scenario mới. ${teaching.decision} Cần so baseline, sensitivity, limitation và action trước khi chốt ${week.deliverable}.`,
      keywords: [...keywords, "demand", "lead time", "trade-off", "kiểm chứng"],
    },
  ];
}

export function scoreRetrievalResponse(item: RetrievalItem, response: string, assisted: boolean) {
  const normalized = response.toLowerCase();
  const matched = item.keywords.filter((keyword) => normalized.includes(keyword)).length;
  const coverage = item.keywords.length ? matched / item.keywords.length : 0;
  const lengthScore = Math.min(response.trim().length / 240, 1);
  const structureSignals = ["vì", "nếu", "do", "để", "nhưng", "trade-off", "kiểm tra"].filter((word) => normalized.includes(word)).length;
  const structureScore = Math.min(structureSignals / 3, 1);
  const decisionSignals = ["dữ liệu", "kpi", "baseline", "assumption", "hành động", "action", "validation", "kiểm chứng"].filter((word) => normalized.includes(word)).length;
  const raw = Math.round(coverage * 35 + lengthScore * 30 + structureScore * 25 + Math.min(decisionSignals / 2, 1) * 10);
  const score = Math.max(0, Math.min(100, assisted ? raw - 15 : raw));
  return { score, passed: score >= 70, matched, totalKeywords: item.keywords.length };
}
