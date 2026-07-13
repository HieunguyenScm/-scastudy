const rubricLabels = {
  logic: "Logic & framing",
  evidence: "Evidence",
  action: "Actionability",
  communication: "Communication",
};

const DAY_MS = 86_400_000;

export function buildLearningInsights({
  settings,
  progress = [],
  labs = [],
  submissions = [],
  reviews = [],
  now = new Date().toISOString(),
}) {
  const applied = progress.filter((row) => row.completed).length;
  const expectedApplied = expectedAppliedWeeks(settings?.startDate, now);
  const paceGap = applied - expectedApplied;
  const pace = describePace(paceGap, expectedApplied, settings?.startDate, now);
  const latestReviews = latestReviewBySubmission(reviews);
  const weakestRubric = findWeakestRubric(latestReviews);
  const needsRevision = submissions
    .filter((row) => row.status === "needs-revision")
    .sort((a, b) => a.week - b.week);
  const failedLabs = labs
    .filter((row) => row.attemptCount > 0 && !row.passed)
    .sort((a, b) => a.week - b.week);
  const lowAssessments = progress
    .filter((row) => row.week % 4 === 0 && Number.isFinite(row.quizScore) && row.quizScore < 80)
    .map((row) => ({ module: row.week / 4, score: row.quizScore }))
    .sort((a, b) => a.module - b.module);
  const priorityActions = [
    needsRevision[0] ? {
      kind: "revision",
      eyebrow: `WEEK ${needsRevision[0].week} · EVIDENCE`,
      title: "Sửa bài theo mentor review",
      detail: "Ưu tiên gap đã được chỉ ra trước khi mở thêm bài mới.",
      href: `/week/${needsRevision[0].week}#submission-workspace`,
    } : null,
    failedLabs[0] ? {
      kind: "lab",
      eyebrow: `WEEK ${failedLabs[0].week} · LAB`,
      title: `Nâng best score từ ${failedLabs[0].score}% lên ≥70%`,
      detail: "Xem feedback từng câu, tính lại rồi nộp một attempt mới.",
      href: `/week/${failedLabs[0].week}#interactive-lab`,
    } : null,
    lowAssessments[0] ? {
      kind: "assessment",
      eyebrow: `MODULE ${lowAssessments[0].module} · ASSESSMENT`,
      title: `Ôn lại assessment đang ở ${lowAssessments[0].score}%`,
      detail: "Assessment module cần đạt tối thiểu 80% để qua completion gate.",
      href: `/week/${lowAssessments[0].module * 4}#buoc-4`,
    } : null,
  ].filter(Boolean);

  const remainingWeeks = Math.max(0, 24 - applied);
  const weeklyHours = Number.isFinite(settings?.weeklyHours) ? Math.max(1, settings.weeklyHours) : 6;

  return {
    applied,
    expectedApplied,
    pace: { ...pace, gap: paceGap },
    weakestRubric,
    attention: {
      needsRevision: needsRevision.length,
      failedLabs: failedLabs.length,
      lowAssessments: lowAssessments.length,
      total: needsRevision.length + failedLabs.length + lowAssessments.length,
    },
    priorityActions,
    workload: {
      remainingWeeks,
      weeklyHours,
      estimatedHours: remainingWeeks * weeklyHours,
    },
  };
}

function expectedAppliedWeeks(startDate, now) {
  if (typeof startDate !== "string") return 0;
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const current = new Date(now).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(current) || current < start) return 0;
  const elapsedDays = Math.floor((current - start) / DAY_MS);
  return Math.min(24, Math.max(0, Math.floor((elapsedDays + 1) / 7)));
}

function describePace(gap, expected, startDate, now) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const current = new Date(now).getTime();
  if (Number.isFinite(start) && Number.isFinite(current) && current < start) {
    return { status: "scheduled", label: "Chưa tới ngày bắt đầu", detail: "Kế hoạch đã sẵn sàng; tiến độ chỉ được tính từ ngày bắt đầu." };
  }
  if (gap > 0) return { status: "ahead", label: `Sớm hơn kế hoạch ${gap} tuần`, detail: `Kế hoạch hiện kỳ vọng ${expected}/24 tuần Applied.` };
  if (gap === 0) return { status: "on-track", label: "Đúng tiến độ", detail: `Kế hoạch hiện kỳ vọng ${expected}/24 tuần Applied.` };
  if (gap === -1) return { status: "watch", label: "Chậm 1 tuần", detail: `Kế hoạch hiện kỳ vọng ${expected}/24 tuần Applied; hoàn tất bước ưu tiên để bắt kịp.` };
  return { status: "behind", label: `Chậm ${Math.abs(gap)} tuần`, detail: `Kế hoạch hiện kỳ vọng ${expected}/24 tuần Applied; tập trung recovery queue trước.` };
}

function latestReviewBySubmission(reviews) {
  const map = new Map();
  for (const review of reviews) {
    const id = Number(review.submissionId);
    if (!Number.isFinite(id)) continue;
    const current = map.get(id);
    const version = Number(review.version) || 0;
    const currentVersion = Number(current?.version) || 0;
    const createdAt = new Date(review.createdAt).getTime();
    const currentCreatedAt = new Date(current?.createdAt).getTime();
    if (!current || version > currentVersion || (version === currentVersion && createdAt > currentCreatedAt)) map.set(id, review);
  }
  return [...map.values()];
}

function findWeakestRubric(reviews) {
  const dimensions = new Map();
  for (const review of reviews) {
    if (!review.scores || typeof review.scores !== "object") continue;
    for (const [key, rawScore] of Object.entries(review.scores)) {
      const score = Number(rawScore);
      if (!Number.isFinite(score) || score < 0 || score > 100) continue;
      const current = dimensions.get(key) ?? { total: 0, count: 0 };
      dimensions.set(key, { total: current.total + score, count: current.count + 1 });
    }
  }
  const ranked = [...dimensions.entries()]
    .map(([key, value]) => ({ key, label: rubricLabels[key] ?? humanize(key), score: Math.round(value.total / value.count), samples: value.count }))
    .sort((a, b) => a.score - b.score || a.label.localeCompare(b.label));
  return ranked[0] ?? null;
}

function humanize(value) {
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}
