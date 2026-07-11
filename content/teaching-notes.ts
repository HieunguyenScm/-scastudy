export type TeachingNote = {
  explain: string;
  example: string;
  mistake: string;
  decision: string;
};

export const teachingNotes: Record<number, TeachingNote> = {
  1: {
    explain: "Chuỗi cung ứng (Supply Chain) là một hệ thống quyết định nối nhà cung cấp, nhà máy, kho, kênh bán và khách hàng. Ba dòng chảy phải được nhìn cùng lúc: hàng hóa đi xuôi, tiền thường đi ngược, còn thông tin chạy hai chiều. Một quyết định tốt ở một bộ phận nhưng làm toàn chuỗi tệ hơn là tối ưu cục bộ (local optimization).",
    example: "Với một chai nước cam, demand xuất hiện ở cửa hàng nhưng quyết định mua nguyên liệu xảy ra từ nhiều tuần trước. Nếu cửa hàng không chia sẻ dữ liệu bán thật, nhà máy chỉ nhìn đơn đặt hàng và dễ sản xuất quá nhiều hoặc quá ít.",
    mistake: "Sai lầm phổ biến là đồng nhất Supply Chain với vận tải hoặc kho. Logistics chỉ là một phần; planning, sourcing, production, inventory, finance và customer service cũng thuộc hệ thống.",
    decision: "Vẽ bản đồ end-to-end và chỉ ra node nào ra quyết định, dùng dữ liệu gì, bị đo bằng KPI nào và lỗi ở node đó lan sang đâu.",
  },
  2: {
    explain: "Demand là nhu cầu tiêu dùng thật; order là tín hiệu đặt hàng; forecast là ước lượng tương lai. Ba con số này không giống nhau. Khi lead time dài, đặt hàng theo lô, khuyến mãi và thiếu chia sẻ dữ liệu, dao động nhỏ ở retail có thể bị khuếch đại lên upstream - đó là bullwhip effect.",
    example: "Cửa hàng bán tăng 10% vì khuyến mãi nhưng đặt thêm 30% để phòng thiếu. Nhà phân phối nhìn order và đặt thêm 50%; nhà máy tưởng thị trường tăng dài hạn nên tăng production. Khi promotion kết thúc, tồn kho dồn ở mọi tầng.",
    mistake: "Đừng dùng order làm demand mà không kiểm tra stockout, forward buying và promotion. Order phản ánh cả hành vi và constraint, không chỉ nhu cầu khách hàng.",
    decision: "Tách actual sales, order và forecast theo tuần; đo độ biến động ở từng tầng rồi xác định nguyên nhân nào làm tín hiệu bị bóp méo.",
  },
  3: {
    explain: "Inventory là bộ đệm giữa demand và supply nhưng đồng thời khóa vốn. Cycle stock phục vụ nhu cầu bình thường giữa hai lần bổ sung; safety stock bảo vệ trước bất định. Reorder point cho biết khi nào đặt, EOQ gợi ý đặt bao nhiêu trong các giả định đơn giản.",
    example: "Một SKU bán trung bình 100 hộp/ngày, lead time 5 ngày. Nếu không có bất định, reorder point là 500. Khi demand và lead time biến động, cần thêm safety stock; tăng service level sẽ giảm stockout nhưng tăng vốn tồn kho.",
    mistake: "Không áp một safety stock hoặc service target cho mọi SKU. Giá trị, variability, margin, criticality và khả năng thay thế khác nhau.",
    decision: "Chọn policy theo segment SKU, tính baseline, kiểm tra sensitivity và trình bày rõ trade-off service-cost-cash.",
  },
  4: {
    explain: "KPI chỉ có ý nghĩa khi nối được mục tiêu với hành động. OTIF đo giao đúng thời gian và đủ số lượng; fill rate đo tỷ lệ demand được đáp ứng ngay; inventory turns phản ánh tốc độ quay vốn; forecast bias chỉ ra xu hướng dự báo cao hoặc thấp có hệ thống.",
    example: "OTIF giảm có thể do sản xuất thiếu, kho pick sai hoặc vận tải trễ. Một dashboard chỉ tô đỏ OTIF chưa đủ; cần drill-down theo SKU, customer, DC và reason code để tìm hành động đúng.",
    mistake: "Đừng trộn grain hoặc mẫu số. Fill rate theo line khác fill rate theo unit; forecast accuracy ở aggregate có thể che sai số SKU.",
    decision: "Viết metric dictionary gồm mục đích, công thức, grain, owner, nguồn dữ liệu, frequency và action threshold trước khi dựng dashboard.",
  },
  5: {
    explain: "Dữ liệu tốt bắt đầu từ grain - một dòng đại diện cho cái gì. Primary key xác định duy nhất mỗi bản ghi; dimension mô tả product, customer, date; fact lưu transaction hoặc snapshot. Star schema giúp Power BI tính KPI nhất quán.",
    example: "Order table ở grain order-line nhưng shipment table có nhiều lần giao cho một line. JOIN trực tiếp rồi SUM order quantity sẽ nhân bản doanh số. Cần aggregate shipment về order-line hoặc mô hình quan hệ phù hợp.",
    mistake: "Làm sạch không có nghĩa là xóa mọi outlier. Promotion spike có thể là tín hiệu kinh doanh thật; phải phân biệt lỗi dữ liệu và sự kiện thật.",
    decision: "Tạo data dictionary và 10 data-quality checks trước khi tính bất kỳ KPI nào.",
  },
  6: {
    explain: "SQL biến câu hỏi business thành truy vấn kiểm chứng được. SELECT chọn dữ liệu, WHERE lọc, GROUP BY tổng hợp, JOIN nối bảng, window function so sánh theo thời gian mà không làm mất chi tiết. Grain phải được kiểm tra sau mỗi JOIN.",
    example: "Để tính OTIF, nối order line với shipment aggregate, so shipped quantity với ordered quantity và actual delivery date với promised date. Sau đó group theo customer hoặc week, không group trước khi logic line-level hoàn tất.",
    mistake: "Lỗi nguy hiểm nhất là many-to-many JOIN âm thầm nhân bản dòng. Luôn so row count, distinct key và tổng control trước-sau JOIN.",
    decision: "Mỗi query phải ghi business question, grain output, assumptions và validation totals.",
  },
  7: {
    explain: "Python và pandas phù hợp khi pipeline cần lặp lại, kiểm tra và mở rộng. Một notebook tốt tách input, cleaning, validation, transformation, analysis và export; chạy lại từ đầu phải cho cùng kết quả khi input không đổi.",
    example: "Pipeline order-to-delivery đọc CSV, chuẩn hóa date/SKU, kiểm tra duplicate, merge master data, tính lead time và OTIF, rồi xuất clean fact cho Power BI. Mỗi bước in số dòng và số lỗi.",
    mistake: "Notebook chạy được một lần chưa phải pipeline. Tránh hard-code path, sửa dữ liệu bằng tay giữa các cell và chạy cell sai thứ tự.",
    decision: "Đóng gói logic thành function nhỏ, giữ assumption trong config và tạo validation report tự động.",
  },
  8: {
    explain: "Dashboard là giao diện ra quyết định, không phải bộ sưu tập biểu đồ. Bắt đầu từ audience, decision và big idea; chọn visual giúp so sánh; dùng màu để hướng chú ý; action title phải nói kết luận thay vì chỉ nêu tên metric.",
    example: "Thay tiêu đề 'OTIF by region' bằng 'Miền Nam kéo OTIF toàn quốc xuống do ba customer lớn'. Biểu đồ và annotation sau đó phải chứng minh câu đó.",
    mistake: "Quá nhiều màu, border, pie chart và KPI khiến người xem tự tìm story. Clutter làm giảm tốc độ hiểu và tăng nguy cơ đọc sai.",
    decision: "Mỗi trang dashboard chỉ giữ thông tin cần cho một nhóm quyết định, kèm evidence-impact-action.",
  },
  9: {
    explain: "Forecast là ước lượng có sai số. Baseline như naive hoặc moving average tạo chuẩn tối thiểu; model phức tạp chỉ có giá trị nếu thắng baseline trên dữ liệu chưa từng thấy. Horizon và aggregation phải phù hợp với quyết định.",
    example: "Forecast tuần tới cho replenishment khác forecast 12 tháng cho capacity. Aggregate category có thể rất chính xác nhưng không giúp đặt hàng từng SKU.",
    mistake: "Đánh giá trên dữ liệu đã dùng để fit model sẽ quá lạc quan. Không chọn model chỉ vì chart nhìn mượt.",
    decision: "Chốt horizon, frequency, level, metric và backtest design trước khi chọn thuật toán.",
  },
  10: {
    explain: "Time series có level, trend, seasonality, event và noise. MAE dễ hiểu theo đơn vị; RMSE phạt sai số lớn; WAPE phù hợp tổng volume; bias đo lệch có hệ thống. Không có metric tốt nhất cho mọi quyết định.",
    example: "Hai model có cùng WAPE nhưng một model luôn forecast thấp ở mùa cao điểm. Bias và service impact sẽ cho thấy rủi ro mà WAPE trung bình che mất.",
    mistake: "MAPE méo khi actual bằng hoặc gần 0. Không so accuracy giữa SKU có scale khác nhau mà bỏ qua weighting.",
    decision: "Dùng rolling-origin backtest và báo cả accuracy, bias, stability và business cost.",
  },
  11: {
    explain: "Forecast multi-SKU cần pipeline phân segment, tạo feature, backtest và exception. Không phải SKU nào cũng cần cùng model; mục tiêu là portfolio model có thể vận hành, không phải thắng từng chuỗi bằng mọi giá.",
    example: "SKU ổn định dùng moving average; SKU seasonal dùng seasonal naive; SKU intermittent cần phương pháp riêng. Exception list ưu tiên SKU có impact cao và forecast risk lớn.",
    mistake: "Tuning hàng trăm model mà không có holdout, baseline và runtime budget dễ tạo overfitting và hệ thống không bảo trì được.",
    decision: "Chọn champion theo segment, lưu metric/model version và route exception cho planner.",
  },
  12: {
    explain: "Demand Planning là quy trình đồng thuận, không chỉ là model. Statistical baseline được bổ sung bằng promotion, sales intelligence và constraint; mọi override cần reason code và phải đo forecast value added (FVA).",
    example: "Sales tăng forecast 40% vì promotion. Planner kiểm tra uplift lịch sử, distribution, cannibalization và supply constraint trước khi chấp nhận một phần override.",
    mistake: "Consensus không đồng nghĩa trung bình ý kiến. Override không có evidence thường làm forecast xấu hơn nhưng không ai học được nếu không lưu reason và outcome.",
    decision: "Tổ chức demand review theo exception, decision owner, deadline và log thay đổi.",
  },
  13: {
    explain: "Planning hierarchy nối strategy, S&OP, master planning, MRP và execution. Mỗi tầng có horizon, time bucket, level of detail và decision rights khác nhau; kế hoạch phải reconcile để tổng không mâu thuẫn với chi tiết.",
    example: "S&OP duyệt 100.000 case/tháng theo family, nhưng MPS phân bổ theo SKU/week và MRP tính component. Nếu mix thay đổi, tổng volume đúng vẫn có thể thiếu nguyên liệu cụ thể.",
    mistake: "Trộn kế hoạch aggregate với lịch execution hoặc thay đổi frozen horizon liên tục gây nervousness cho nhà máy và supplier.",
    decision: "Vẽ planning calendar, owner, input/output và escalation rule cho từng tầng.",
  },
  14: {
    explain: "ABC phân loại theo giá trị kinh tế; XYZ phân loại theo mức dự đoán được. Kết hợp hai chiều giúp quyết định effort planning, service target, review frequency và replenishment policy theo segment.",
    example: "AX có giá trị cao và ổn định: kiểm soát chặt, forecast tốt, tồn kho tối ưu. AZ giá trị cao nhưng biến động: cần collaboration, scenario và service trade-off. CZ có thể dùng policy đơn giản hơn.",
    mistake: "ABC chỉ dựa doanh thu có thể bỏ qua margin, criticality hoặc substitution. XYZ dùng CV không phù hợp khi có nhiều zero demand.",
    decision: "Định nghĩa rule segment, kiểm tra stability theo thời gian và gắn mỗi segment với policy cụ thể.",
  },
  15: {
    explain: "Replenishment policy quyết định khi nào và bao nhiêu hàng được bổ sung. Min-max, continuous review và periodic review phản ứng khác nhau với demand, lead time, MOQ, pack size và capacity.",
    example: "Một SKU có reorder point 500 nhưng MOQ 1.000 có thể tạo tồn kho chu kỳ lớn. Policy phải mô phỏng cả constraint, không chỉ công thức lý tưởng.",
    mistake: "Dùng average lead time mà bỏ qua variability hoặc giả định supply vô hạn làm policy nhìn tốt trên Excel nhưng thất bại thực tế.",
    decision: "Backtest policy trên lịch sử và so service, average inventory, stockout và order frequency.",
  },
  16: {
    explain: "Một case demand-inventory tốt nối forecast error với policy và business impact. Cần phân biệt symptom, root cause và constraint; recommendation phải lượng hóa trade-off và nêu cách pilot.",
    example: "Stockout tăng dù inventory tổng cao. Phân tích chỉ ra tồn kho nằm sai SKU/DC do bias và allocation rule; tăng tổng stock không giải quyết root cause.",
    mistake: "Nhảy vào giải pháp trước khi frame vấn đề hoặc chọn một chart đẹp thay cho causal argument.",
    decision: "Viết case memo theo problem-evidence-hypothesis-test-recommendation-risk-next step.",
  },
  17: {
    explain: "Linear Programming (LP) tối ưu objective dưới constraints. Decision variables là thứ có thể chọn; objective đo điều muốn tối ưu; constraints mô tả capacity, demand, balance và policy; shadow price cho biết giá trị của thêm một đơn vị nguồn lực.",
    example: "Phân bổ hàng từ hai DC tới ba vùng để giảm cost trong khi đáp ứng demand và capacity. Solver chỉ đáng tin khi balance, units và feasibility được kiểm tra.",
    mistake: "Tối ưu sai objective sẽ cho đáp án toán học đúng nhưng business sai. Không ép equality khi demand có thể unmet mà thiếu penalty biến quyết định.",
    decision: "Viết formulation bằng lời trước, kiểm tra units và thử extreme cases trước khi chạy Solver.",
  },
  18: {
    explain: "Network design chọn vị trí, vai trò và flow giữa facility. Quyết định dài hạn phải cân bằng fixed cost, transport, inventory, service, risk và growth; scenario quan trọng hơn một forecast điểm.",
    example: "Thêm DC giảm lead time miền Trung nhưng tăng fixed cost và safety stock. Phân tích phải so total landed cost và service dưới nhiều demand scenario.",
    mistake: "Chỉ tối ưu transport cost hoặc dùng centroid mà bỏ qua capacity, lane feasibility, service zone và disruption risk.",
    decision: "So sánh status quo và candidate network bằng scenario, sensitivity và trigger để chuyển phương án.",
  },
  19: {
    explain: "Simulation mô phỏng hệ thống theo thời gian khi variability, queue và interaction làm công thức tĩnh không đủ. AnyLogic thinking bắt đầu từ entity, resource, event, state, distribution và KPI, không bắt đầu từ animation.",
    example: "Mô phỏng xe vào kho, cửa dock và thời gian service cho thấy utilization 95% tạo queue tăng phi tuyến. Thêm một dock chỉ cần ở giờ cao điểm có thể tốt hơn mở rộng toàn thời gian.",
    mistake: "Dùng một run ngẫu nhiên để kết luận, hoặc fit distribution tùy ý. Cần warm-up, replication, seed và confidence interval.",
    decision: "Validation với dữ liệu lịch sử, chạy scenario lặp lại và báo phân phối kết quả thay vì một số duy nhất.",
  },
  20: {
    explain: "Prescriptive analytics kết hợp prediction, optimization/simulation và decision rule. Mục tiêu không phải tạo model phức tạp nhất mà là recommendation có thể thực thi, có sensitivity và guardrail.",
    example: "Model đề xuất shipment plan rẻ nhất nhưng quá nhạy với demand. Sensitivity cho thấy thêm buffer nhỏ giảm rủi ro service đáng kể với cost tăng ít.",
    mistake: "Không kiểm tra feasibility, không so baseline và không giải thích assumption khiến stakeholder không thể tin hoặc vận hành model.",
    decision: "Đóng gói model, validation, sensitivity và executive recommendation trong một decision package.",
  },
  21: {
    explain: "Supply Chain tạo giá trị qua service, cost và working capital. Cost-to-serve phân bổ cost theo customer/product/channel; cash-to-cash nối inventory days, receivable và payable; quyết định volume cao chưa chắc profit cao.",
    example: "Một customer doanh thu lớn đặt đơn nhỏ, giao gấp và trả chậm. Margin kế toán nhìn tốt nhưng cost-to-serve và cash profile cho thấy giá trị thực thấp.",
    mistake: "Cắt inventory để giải phóng cash mà không đo lost sales hoặc tăng premium freight có thể chuyển cost sang nơi khác.",
    decision: "Đánh giá quyết định bằng P&L, balance sheet, cash flow và service impact cùng lúc.",
  },
  22: {
    explain: "Supply Chain AI bắt đầu từ decision workflow. Predictive AI dự báo; optimization đề xuất; generative AI giải thích và tương tác. Human-in-the-loop giữ quyền kiểm soát khi impact cao, dữ liệu yếu hoặc model ngoài phạm vi đã đánh giá.",
    example: "Exception agent phát hiện forecast bias, gom evidence và đề xuất ba scenario; planner phê duyệt override. Agent không tự thay đổi kế hoạch khi confidence thấp hoặc promotion mới chưa có precedent.",
    mistake: "Gắn chatbot vào dashboard không tạo autonomous planning. Thiếu eval, audit log, permission và fallback sẽ biến automation thành risk.",
    decision: "Chọn một decision hẹp, định nghĩa input-output, guardrail, eval set, human approval và monitoring trước prototype.",
  },
  23: {
    explain: "Systems thinking nhìn stock, flow, feedback và delay để tránh chữa symptom. Problem solving có cấu trúc tách vấn đề thành issue tree; storytelling biến phân tích thành quyết định bằng một big idea và logic evidence.",
    example: "Tăng safety stock chữa stockout ngắn hạn nhưng che forecast bias và lead-time unreliability. Causal loop giúp thấy action hôm nay có thể làm working capital xấu sau nhiều tuần.",
    mistake: "Issue tree trùng lặp hoặc thiếu nhánh, và presentation đi theo thứ tự phân tích thay vì thứ tự người ra quyết định cần nghe.",
    decision: "Frame problem, tạo MECE issue tree, chọn evidence quyết định và kể story situation-complication-resolution.",
  },
  24: {
    explain: "Capstone chứng minh năng lực đi từ business problem tới data, model, validation, recommendation và governance. Portfolio phải cho thấy cách suy nghĩ, revision và impact, không chỉ screenshot dashboard.",
    example: "Một Demand Planning Copilot tốt nêu user, decision, baseline, prototype, eval results, failure modes, human control và business case. Demo năm phút phải dẫn từ vấn đề tới bằng chứng và quyết định.",
    mistake: "Portfolio chứa nhiều công cụ nhưng thiếu câu hỏi business, metric và limitation sẽ khó thuyết phục interviewer.",
    decision: "Đóng gói product brief, working evidence, model card, risk/eval plan, STAR story và ba bài học sau revision.",
  },
};

export function getTeachingNote(week: number): TeachingNote {
  return teachingNotes[week] ?? teachingNotes[1];
}
