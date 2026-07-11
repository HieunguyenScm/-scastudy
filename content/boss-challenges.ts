export type BossChallenge = {
  module: number;
  title: string;
  context: string;
  decision: string;
  evidence: string[];
  defense: string[];
  passRule: string;
};

export const bossChallenges: BossChallenge[] = [
  { module: 1, title: "Chẩn đoán service failure FMCG", context: "OTIF giảm từ 94% xuống 81% trong 8 tuần dù tổng inventory tăng 18%. Ba DC đổ lỗi cho forecast, transport và allocation.", decision: "Xác định root cause ưu tiên và đề xuất kế hoạch phục hồi 30 ngày.", evidence: ["Flow map end-to-end", "KPI tree và reason-code analysis", "Root-cause argument có dữ liệu", "Action owner và leading indicator"], defense: ["Vì sao tăng inventory tổng không giải quyết vấn đề?", "Dữ liệu nào có thể bác bỏ hypothesis của bạn?", "Bạn sẽ biết action có hiệu quả sau bao lâu?"], passRule: "≥75 tổng và không tiêu chí nào dưới 60." },
  { module: 2, title: "Cứu một management report sai", context: "Dashboard doanh thu và OTIF lệch số liệu giữa Finance, Sales và Supply Chain. JOIN order-shipment đã nhân dòng và report không có data-quality controls.", decision: "Thiết kế lại pipeline và bảo vệ một phiên bản KPI đáng tin cậy.", evidence: ["Grain audit", "SQL/Python pipeline tái chạy được", "Validation totals", "Dashboard story đã sửa"], defense: ["Bạn phát hiện double-counting bằng cách nào?", "Control nào ngăn lỗi tái diễn?", "Metric nào không nên aggregate?"], passRule: "Pipeline phải tái chạy và mọi KPI truy ngược được." },
  { module: 3, title: "Chọn forecast và override", context: "120 SKU có seasonality, promotion và intermittent demand. Sales muốn override hàng loạt trước mùa cao điểm.", decision: "Chọn champion model theo segment và quyết định override nào được chấp nhận.", evidence: ["Rolling backtest", "Accuracy và bias", "Exception segmentation", "Override reason và FVA"], defense: ["Model thắng baseline ở đâu?", "SKU nào không nên dùng MAPE?", "Nếu promotion thất bại thì guardrail là gì?"], passRule: "Recommendation phải thắng baseline và giải thích bias." },
  { module: 4, title: "Đặt inventory policy dưới constraint", context: "Công ty muốn đạt service 97% nhưng MOQ, pack size và lead-time variability làm inventory tăng mạnh.", decision: "Đặt policy theo ABC/XYZ và bảo vệ trade-off service-cost-cash.", evidence: ["ABC/XYZ matrix", "Safety-stock logic", "Policy backtest", "Sensitivity theo service target"], defense: ["Segment nào cần planner attention?", "Assumption nào làm safety stock dễ sai nhất?", "Khi MOQ tăng, policy đổi ra sao?"], passRule: "Backtest phải cho thấy service và inventory cùng được báo cáo." },
  { module: 5, title: "Bảo vệ recommendation tối ưu", context: "Model đề xuất mạng lưới rẻ nhất nhưng demand uncertainty và capacity disruption chưa được kiểm tra.", decision: "Chọn phương án khả thi và nêu trigger để chuyển scenario.", evidence: ["Formulation", "Feasibility checks", "Sensitivity/scenario", "Executive recommendation"], defense: ["Objective có bỏ sót business cost nào?", "Constraint nào binding?", "Phương án còn đúng khi demand tăng 20% không?"], passRule: "Không được pass nếu solution infeasible hoặc thiếu sensitivity." },
  { module: 6, title: "Phê duyệt một AI planning workflow", context: "Một exception agent được đề xuất tự động override forecast và phát hành replenishment order.", decision: "Approve, pilot có điều kiện hoặc reject; thiết kế human controls và eval plan.", evidence: ["Decision workflow", "Prototype evidence", "Eval set", "Risk, permission và fallback"], defense: ["AI được phép làm gì và không được làm gì?", "Failure nào gây impact lớn nhất?", "Metric nào kích hoạt rollback?"], passRule: "Phải có eval evidence, audit log và human approval cho high-impact case." },
];

export const getBossChallenge = (module: number) => bossChallenges.find((item) => item.module === module);
