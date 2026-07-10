"use client";

import { useMemo, useState } from "react";

type Week = {
  id: number;
  title: string;
  track: string;
  output: string;
  time: string;
  book: string;
};

type LessonDetail = {
  summary: string;
  concepts: string[];
  practice: string;
};

const weeks: Week[] = [
  { id: 1, title: "Supply chain là gì?", track: "Nền tảng", output: "Bản đồ end-to-end", time: "2h 30m", book: "Supply Chain Management For Dummies" },
  { id: 2, title: "Demand, supply & lead time", track: "Nền tảng", output: "Giải thích bullwhip effect", time: "2h 30m", book: "Introduction to Materials Management" },
  { id: 3, title: "Inventory basics", track: "Nền tảng", output: "Bảng reorder point", time: "3h", book: "Introduction to Materials Management" },
  { id: 4, title: "KPI supply chain", track: "Nền tảng", output: "Dashboard 1 trang", time: "3h", book: "Supply Chain Analytics" },
  { id: 5, title: "Dashboard & data cleaning", track: "Dữ liệu", output: "Dashboard có insight", time: "3h", book: "Storytelling With Data" },
  { id: 6, title: "SQL cho analyst", track: "Dữ liệu", output: "20 câu query", time: "4h", book: "Quantitative Analysis for Management" },
  { id: 7, title: "Python & pandas", track: "Dữ liệu", output: "Notebook phân tích", time: "4h", book: "Supply Chain Analytics Using Data" },
  { id: 8, title: "Storytelling with data", track: "Dữ liệu", output: "Business memo 1 trang", time: "3h", book: "Storytelling With Data - Let’s Practice" },
  { id: 9, title: "Forecasting mindset", track: "Forecasting", output: "Baseline forecast", time: "3h", book: "Demand Forecasting Best Practices" },
  { id: 10, title: "Time series basics", track: "Forecasting", output: "Bảng MAE / MAPE", time: "4h", book: "Practical Time Series Analysis" },
  { id: 11, title: "Forecasting bằng Python", track: "Forecasting", output: "Forecast multi-SKU", time: "5h", book: "Data Science for Supply Chain Forecasting" },
  { id: 12, title: "Demand planning process", track: "Forecasting", output: "Monthly forecast review", time: "3h", book: "Supply Chain Management and Advanced Planning" },
  { id: 13, title: "Planning hierarchy", track: "Planning", output: "Sơ đồ S&OP → MRP", time: "3h", book: "Manufacturing Planning and Control" },
  { id: 14, title: "ABC/XYZ & safety stock", track: "Planning", output: "Matrix ABC/XYZ", time: "4h", book: "Introduction to Materials Management" },
  { id: 15, title: "Replenishment policy", track: "Planning", output: "Policy cho 10 SKU", time: "4h", book: "Introduction to Materials Management" },
  { id: 16, title: "Case demand / inventory", track: "Planning", output: "Case memo 2 trang", time: "5h", book: "Supply Chain Strategy, Planning, and Operation" },
  { id: 17, title: "Linear programming", track: "Tối ưu", output: "Model vận tải", time: "5h", book: "Quantitative Analysis for Management" },
  { id: 18, title: "Network design", track: "Tối ưu", output: "Scenario network", time: "5h", book: "Supply Chain Management and Advanced Planning" },
  { id: 19, title: "Simulation", track: "Tối ưu", output: "3 scenario lead time", time: "4h", book: "Quantitative Analysis for Management" },
  { id: 20, title: "Optimization project", track: "Tối ưu", output: "Model + recommendation", time: "6h", book: "Supply Chain Analytics - Concepts" },
  { id: 21, title: "Supply chain finance", track: "Chiều sâu", output: "Cost-to-serve", time: "3h", book: "Introduction to Materials Management" },
  { id: 22, title: "CPIM / ASCM concepts", track: "Chiều sâu", output: "Glossary 50 thuật ngữ", time: "4h", book: "ASCM Supply Chain Dictionary" },
  { id: 23, title: "Case tổng hợp", track: "Chiều sâu", output: "Deck 5–7 slides", time: "6h", book: "Thinking in Systems" },
  { id: 24, title: "Capstone & mock interview", track: "Capstone", output: "Portfolio project", time: "8h", book: "Bulletproof Problem Solving" },
];

const lessonDetails: Record<number, LessonDetail> = {
  1: { summary: "Supply chain là mạng lưới biến nhu cầu thành sản phẩm hoặc dịch vụ được giao thành công. Hãy nhìn toàn chuỗi thay vì chỉ nhìn một phòng ban.", concepts: ["Dòng hàng hóa, dòng tiền, dòng thông tin", "Supplier → manufacturer → distributor → customer", "Trade-off giữa chi phí, tốc độ và mức phục vụ"], practice: "Chọn một sản phẩm quen thuộc, vẽ 5 node trong chuỗi và ghi lại 3 dòng chảy giữa các node." },
  2: { summary: "Demand là nhu cầu thật; forecast chỉ là ước lượng. Lead time và mức phục vụ khiến một biến động nhỏ ở cửa hàng có thể phóng đại ngược lên nhà máy.", concepts: ["Demand, supply, lead time, service level", "Stockout và overstock", "Bullwhip effect: tín hiệu nhu cầu bị khuếch đại"], practice: "Viết lại bullwhip effect bằng ví dụ siêu thị hoặc nhu cầu bia Tết, không dùng thuật ngữ chuyên môn." },
  3: { summary: "Inventory là một khoản bảo hiểm có chi phí. Mục tiêu không phải cắt tồn kho đồng loạt mà là giữ đúng lượng tồn kho cho mức dịch vụ cần thiết.", concepts: ["Cycle stock và safety stock", "Reorder point = demand trong lead time + safety stock", "Holding cost, ordering cost, stockout cost"], practice: "Lập bảng reorder point cho 5 SKU với demand/ngày, lead time và độ biến động khác nhau." },
  4: { summary: "KPI tốt giúp cả chuỗi cùng nhìn về một vấn đề. Đừng chỉ báo cáo số; hãy nối KPI với quyết định cần làm tiếp theo.", concepts: ["OTIF và fill rate", "Forecast accuracy và forecast bias", "Inventory turns và cash-to-cash cycle"], practice: "Tạo dashboard một trang và viết 5 insight, mỗi insight phải có bằng chứng và hành động đề xuất." },
  5: { summary: "Một dashboard đáng tin bắt đầu từ dữ liệu sạch và câu hỏi kinh doanh rõ. Tidy data giúp lọc, nhóm và so sánh dễ hơn.", concepts: ["Data dictionary và grain của bảng", "Missing values, duplicate rows, outliers", "Chọn chart theo câu hỏi: trend, ranking, composition"], practice: "Làm sạch order history và tạo một line chart, một bar chart cùng một bảng ranking." },
  6: { summary: "SQL là cách hỏi dữ liệu có cấu trúc. Nắm JOIN và grain của bảng quan trọng hơn việc nhớ thật nhiều cú pháp.", concepts: ["SELECT, WHERE, GROUP BY, CASE WHEN", "JOIN orders, shipments, inventory", "Window function cho ranking và rolling metric"], practice: "Viết 20 query cho sales by SKU, fill rate, lead time trung bình và top customer." },
  7: { summary: "Python và pandas giúp lặp lại phân tích thay vì làm thủ công từng file. Hãy bắt đầu bằng một pipeline nhỏ, rõ đầu vào và đầu ra.", concepts: ["DataFrame, filter, groupby, merge", "Pivot và xử lý ngày tháng", "Tách bước load → clean → analyze → visualize"], practice: "Tạo notebook có 5 bảng tổng hợp, 3 chart và một đoạn kết luận cho người không biết code." },
  8: { summary: "Storytelling không phải làm biểu đồ đẹp hơn; đó là chọn một thông điệp đúng và dẫn người đọc đến quyết định.", concepts: ["Observation khác insight", "Situation → complication → question → answer", "Tiêu đề biểu đồ phải nói được điều quan trọng"], practice: "Biến một dashboard thành memo 1 trang gồm issue, evidence, recommendation và risk." },
  9: { summary: "Forecast là một quyết định có sai số, không phải lời tiên tri. Luôn bắt đầu với baseline để biết mô hình phức tạp có thực sự tốt hơn không.", concepts: ["Naive forecast và moving average", "Trend, seasonality, noise", "Baseline và forecast horizon"], practice: "So sánh naive forecast với moving average cho một SKU và giải thích vì sao chọn model." },
  10: { summary: "Đánh giá forecast phải tôn trọng thứ tự thời gian. Một model có sai số trung bình thấp vẫn có thể lệch có hệ thống.", concepts: ["Decomposition và holdout theo thời gian", "MAE, MAPE, RMSE", "Bias và vấn đề MAPE khi actual gần bằng 0"], practice: "Forecast 12 tuần, tính 3 metrics và ghi rõ metric nào phù hợp với bối cảnh của bạn." },
  11: { summary: "Forecast multi-SKU cần một pipeline có thể đánh giá theo từng SKU. Không phải SKU nào cũng nên được tự động hóa cùng một cách.", concepts: ["Train/test split theo thời gian", "Rolling forecast và model evaluation", "Exception management cho SKU khó dự báo"], practice: "Forecast 10 SKU, xếp hạng theo error và chọn 2 SKU cần xử lý bằng exception." },
  12: { summary: "Demand planning là quy trình phối hợp chứ không chỉ là file forecast. Mọi override từ sales cần có lý do và dấu vết để học lại sau này.", concepts: ["Demand review và consensus forecast", "Override, bias control, exception review", "Kết nối forecast với supply và capacity"], practice: "Lập monthly forecast review cho 5 SKU có sai số cao, ghi nguyên nhân và hành động." },
  13: { summary: "Planning hierarchy đi từ quyết định tổng hợp dài hạn đến lịch thực thi chi tiết. Mỗi tầng có horizon, dữ liệu và người ra quyết định khác nhau.", concepts: ["S&OP và aggregate plan", "MPS, BOM và MRP", "Capacity planning và production scheduling"], practice: "Vẽ sơ đồ planning hierarchy cho một công ty sản xuất đơn giản và ghi vai trò từng tầng." },
  14: { summary: "ABC/XYZ giúp phân bổ công sức quản trị theo giá trị và độ biến động. Service level nên khác nhau theo segment, không áp một mức cho mọi SKU.", concepts: ["ABC theo annual consumption value", "XYZ theo variability hoặc predictability", "Service policy cho A-X, A-Z, C-X, C-Z"], practice: "Phân loại 20 SKU thành ABC/XYZ và đề xuất policy cho từng ô ma trận." },
  15: { summary: "Replenishment policy biến dữ liệu thành quy tắc đặt hàng. MOQ và review period có thể làm policy lý thuyết lệch khỏi thực tế.", concepts: ["Reorder point, min-max, periodic review", "MOQ, order frequency và supplier constraint", "Stockout so với overstock"], practice: "Đề xuất policy cho 10 SKU gồm reorder point, safety stock và nhịp review." },
  16: { summary: "Giải case tốt bắt đầu bằng framing: vấn đề kinh doanh là gì, metric nào đang xấu, assumption nào cần kiểm tra và recommendation sẽ đánh đổi điều gì.", concepts: ["Issue tree và problem statement", "Assumptions, evidence, recommendation", "Trade-off và rủi ro triển khai"], practice: "Viết case memo 2 trang với issue, analysis, recommendation, trade-off và next step." },
  17: { summary: "Linear programming biến bài toán kinh doanh thành decision variables, objective và constraints. Mô hình tốt phải nói rõ cái gì đang được tối ưu.", concepts: ["Decision variables", "Objective function và constraints", "Feasible solution và sensitivity"], practice: "Xây bài toán vận tải từ warehouse đến customer với capacity, demand và transportation cost." },
  18: { summary: "Network design là quyết định chiến lược về vị trí, công suất và luồng hàng. Mở thêm kho có thể giảm transport nhưng tăng fixed cost và inventory.", concepts: ["Facility location và capacity", "Fixed cost, variable cost, service distance", "Scenario comparison"], practice: "So sánh 2–3 kịch bản network và trình bày trade-off chi phí với service." },
  19: { summary: "Simulation giúp nhìn variability, queue và bottleneck - những thứ một nghiệm tối ưu tĩnh thường che khuất.", concepts: ["Scenario và random variability", "Queue, throughput, utilization", "Service level và stockout trong nhiều lần chạy"], practice: "Mô phỏng 3 kịch bản lead time/demand variability và so sánh service level." },
  20: { summary: "Một project optimization cần có model, assumption, sensitivity và recommendation. Kết quả chỉ đáng tin khi bạn biết nó đổi thế nào khi input đổi.", concepts: ["Model framing", "Scenario và sensitivity analysis", "Business memo đi kèm model"], practice: "Xây model tối ưu chi phí/dịch vụ, chạy demand +20% và giải thích kết quả thay đổi ra sao." },
  21: { summary: "Supply chain decisions chạm vào working capital và lợi nhuận. Service cao hơn không tự động có nghĩa là kinh doanh tốt hơn.", concepts: ["Inventory carrying cost", "Working capital và cash-to-cash", "Cost-to-serve theo customer hoặc channel"], practice: "Tính cost-to-serve cho 3 customer/channel và tìm nơi service đang không có lãi." },
  22: { summary: "ASCM Dictionary giúp thống nhất ngôn ngữ giữa planning, operations và analytics. Hãy biến định nghĩa thành ví dụ có thể dùng trong phỏng vấn.", concepts: ["Strategy, planning, scheduling, execution", "Continuous improvement", "Glossary theo ngữ cảnh doanh nghiệp"], practice: "Tạo glossary 50 thuật ngữ, mỗi thuật ngữ có định nghĩa tiếng Việt và một ví dụ." },
  23: { summary: "Case tổng hợp yêu cầu nhìn hệ thống: feedback loop, delay, leverage point và cách một quyết định ở node này tạo tác động ở node khác.", concepts: ["Systems map và feedback loop", "Problem solving cycle", "Executive communication"], practice: "Làm recommendation deck 5–7 slide với problem, data, options, recommendation và risk." },
  24: { summary: "Capstone là bằng chứng bạn có thể đi từ câu hỏi kinh doanh đến data, model, insight và recommendation. Hãy luyện cách kể project trong 3, 10 và 30 phút.", concepts: ["Portfolio packaging", "Model, dashboard, memo, deck", "Mock interview và defense"], practice: "Hoàn thành một portfolio project end-to-end và chuẩn bị ba phiên bản trình bày theo thời lượng." },
};

const months = [
  { label: "Tháng 01", title: "Nền tảng supply chain", note: "Nhìn thấy dòng hàng hóa, tiền và thông tin.", color: "mint", weeks: "01—04" },
  { label: "Tháng 02", title: "Công cụ & dữ liệu", note: "Biến bảng dữ liệu thành insight có thể dùng.", color: "sage", weeks: "05—08" },
  { label: "Tháng 03", title: "Forecasting", note: "Đọc pattern, đo sai số, ra quyết định với bất định.", color: "gold", weeks: "09—12" },
  { label: "Tháng 04", title: "Planning & inventory", note: "Chọn policy tồn kho dựa trên trade-off.", color: "clay", weeks: "13—16" },
  { label: "Tháng 05", title: "Optimization & simulation", note: "So sánh kịch bản chi phí và dịch vụ.", color: "olive", weeks: "17—20" },
  { label: "Tháng 06", title: "Business depth & capstone", note: "Đóng gói năng lực thành portfolio.", color: "forest", weeks: "21—24" },
];

const library = [
  { category: "Nền tảng", count: "04 tài liệu", title: "Supply chain từ điển đến chiến lược", books: ["ASCM Supply Chain Dictionary", "Introduction to Materials Management", "Supply Chain Management: Strategy, Planning, and Operation", "Supply Chain Management For Dummies"] },
  { category: "Analytics", count: "03 tài liệu", title: "Đọc dữ liệu, chọn mô hình, kể câu chuyện", books: ["Quantitative Analysis for Management", "Supply Chain Analytics - Concepts, Techniques and Applications", "Supply Chain Analytics Using Data to Optimise Supply Chain Processes"] },
  { category: "Planning", count: "02 tài liệu", title: "Từ S&OP đến execution", books: ["Manufacturing Planning and Control for Supply Chain Management", "Supply Chain Management and Advanced Planning"] },
  { category: "Mindset", count: "04 tài liệu", title: "Tư duy hệ thống và giải quyết vấn đề", books: ["Thinking in Systems", "Bulletproof Problem Solving", "Storytelling With Data", "Storytelling With Data - Let’s Practice"] },
];

export default function Home() {
  const [activeWeek, setActiveWeek] = useState(1);
  const [completed, setCompleted] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState("Tổng quan");
  const selectedWeek = useMemo(() => weeks.find((week) => week.id === activeWeek) ?? weeks[0], [activeWeek]);
  const selectedDetail = lessonDetails[selectedWeek.id];

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleCompleted = (id: number) => {
    setCompleted((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  return (
    <main>
      <nav className="topbar" aria-label="Điều hướng chính">
        <button className="brand" onClick={() => jumpTo("overview")} aria-label="Về đầu trang">
          <span className="brand-mark">SC</span>
          <span>chuỗi học</span>
        </button>
        <div className="nav-links">
          {["Tổng quan", "Lộ trình", "Thư viện", "Tracker"].map((tab) => (
            <button key={tab} className={activeTab === tab ? "nav-link active" : "nav-link"} onClick={() => { setActiveTab(tab); jumpTo(tab === "Tổng quan" ? "overview" : tab === "Lộ trình" ? "roadmap" : tab === "Thư viện" ? "library" : "tracker"); }}>
              {tab}
            </button>
          ))}
        </div>
        <div className="nav-meta"><span className="dot" /> 24 tuần · 10–12h / tuần</div>
      </nav>

      <section className="hero section-wrap" id="overview">
        <div className="hero-copy">
          <div className="eyebrow">LỘ TRÌNH TỰ HỌC · 06 THÁNG</div>
          <h1>Học supply chain<br /><em>theo lộ trình.</em></h1>
          <p>Một nhịp học đủ chậm để hiểu bản chất, đủ đều để tạo output. Đi từ nền tảng chuỗi cung ứng đến forecasting, planning và một portfolio project hoàn chỉnh.</p>
          <div className="hero-actions">
            <button className="button primary" onClick={() => { setActiveWeek(1); jumpTo("lesson"); }}>Bắt đầu tuần 01 <span>↗</span></button>
            <button className="text-button" onClick={() => jumpTo("library")}>Xem kho tài liệu <span>→</span></button>
          </div>
        </div>
        <div className="hero-note">
          <div className="quote-mark">“</div>
          <p>Mỗi tuần chỉ cần nắm vững một cụm kỹ năng.</p>
          <div className="pill-row"><span>Nền tảng</span><span>Dữ liệu</span><span>Ra quyết định</span></div>
        </div>
      </section>

      <section className="metrics section-wrap" aria-label="Tiến độ học tập">
        <div className="metric-card"><span className="metric-icon">↗</span><div className="metric-label">Tiến độ tổng</div><div className="metric-value">{String(completed.length).padStart(2, "0")} <small>/ 24 tuần</small></div></div>
        <div className="metric-card"><span className="metric-icon">◷</span><div className="metric-label">Giờ học tuần này</div><div className="metric-value">03:20 <small>giờ</small></div></div>
        <div className="metric-card"><span className="metric-icon">✦</span><div className="metric-label">Output đã tạo</div><div className="metric-value">06 <small>sản phẩm</small></div></div>
        <div className="metric-card"><span className="metric-icon">♧</span><div className="metric-label">Chuỗi ngày học</div><div className="metric-value">12 <small>ngày liên tục</small></div></div>
      </section>

      <section className="roadmap section-wrap" id="roadmap">
        <div className="section-heading">
          <div><div className="eyebrow clay-text">BẢN ĐỒ HÀNH TRÌNH</div><h2>24 tuần, đi từ gốc đến sâu</h2></div>
          <div className="progress-note"><span>Đang ở tháng 01</span><span>· Foundations</span><div className="progress-bar"><span style={{ width: `${(completed.length / 24) * 100}%` }} /></div></div>
        </div>
        <div className="month-grid">
          {months.map((month) => (
            <article className={`month-card ${month.color}`} key={month.label}>
              <div className="month-top"><span>{month.label}</span><span>{month.weeks}</span></div>
              <h3>{month.title}</h3>
              <p>{month.note}</p>
              <div className="week-dots" aria-label={`Các tuần ${month.weeks}`}>{[0, 1, 2, 3].map((dot) => <span key={dot} className={completed.includes((parseInt(month.weeks.slice(0, 2), 10) + dot)) ? "done" : dot === 0 && month.label === "Tháng 01" ? "current" : ""} />)}</div>
              <button className="card-arrow" onClick={() => { const first = parseInt(month.weeks.slice(0, 2), 10); setActiveWeek(first); jumpTo("lesson"); }} aria-label={`Mở ${month.title}`}>→</button>
            </article>
          ))}
        </div>
      </section>

      <section className="learning-grid section-wrap" id="lesson">
        <article className="lesson-card">
          <div className="lesson-accent"><span className="eyebrow">TUẦN {String(selectedWeek.id).padStart(2, "0")} · {selectedWeek.track.toUpperCase()}</span><div className="lesson-stamp">{String(selectedWeek.id).padStart(2, "0")}</div></div>
          <div className="lesson-body">
            <div className="lesson-meta"><span>{selectedWeek.time}</span><span>·</span><span>Đọc + làm bài</span></div>
            <h2>{selectedWeek.title}</h2>
            <p>{selectedDetail.summary}</p>
            <div className="lesson-content-grid">
              <div><span className="lesson-subtitle">CẦN NẮM</span><ul>{selectedDetail.concepts.map((concept) => <li key={concept}>{concept}</li>)}</ul></div>
              <div><span className="lesson-subtitle">BÀI THỰC HÀNH</span><p className="practice-copy">{selectedDetail.practice}</p></div>
            </div>
            <div className="lesson-tags">{selectedDetail.concepts.slice(0, 3).map((concept) => <span key={concept}>{concept}</span>)}</div>
            <div className="lesson-footer"><button className="button dark" onClick={() => toggleCompleted(selectedWeek.id)}>{completed.includes(selectedWeek.id) ? "Đã hoàn thành ✓" : "Đánh dấu đã học"}</button><span className="lesson-source">Đọc chính · {selectedWeek.book}</span></div>
          </div>
        </article>
        <aside className="session-card">
          <div className="eyebrow">NHỊP HỌC ĐỀ XUẤT</div>
          <h3>10–12 giờ<br />mỗi tuần</h3>
          <div className="session-list"><div><b>02h</b><span>Khái niệm<br />và thuật ngữ</span></div><div><b>03h</b><span>Đọc tài liệu<br />có chọn lọc</span></div><div><b>04h</b><span>Làm bài<br />và tạo output</span></div></div>
          <p>Confidence 1–2: học lại. Confidence 3: làm thêm một bài phụ. Confidence 4–5: giải thích lại cho người khác.</p>
        </aside>
      </section>

      <section className="week-selector section-wrap" aria-label="Chọn tuần học">
        <div className="section-heading compact"><div><div className="eyebrow clay-text">CHỌN MỘT TUẦN</div><h2>Học theo nhịp của bạn</h2></div><span className="selected-label">Tuần {String(activeWeek).padStart(2, "0")} · {selectedWeek.track}</span></div>
        <div className="week-grid">{weeks.map((week) => <button key={week.id} className={`week-button ${activeWeek === week.id ? "selected" : ""} ${completed.includes(week.id) ? "completed" : ""}`} onClick={() => { setActiveWeek(week.id); jumpTo("lesson"); }}><span>{String(week.id).padStart(2, "0")}</span><strong>{week.title}</strong><small>{week.output}</small></button>)}</div>
      </section>

      <section className="library section-wrap" id="library">
        <div className="section-heading"><div><div className="eyebrow clay-text">KHO TÀI LIỆU</div><h2>Đọc có chọn lọc</h2></div><span className="library-count">13 tài liệu chính · 4 nhóm năng lực</span></div>
        <div className="library-grid">{library.map((item) => <article className="library-card" key={item.category}><div className="library-card-top"><span className="category">{item.category}</span><span>{item.count}</span></div><h3>{item.title}</h3><ul>{item.books.map((book) => <li key={book}>{book}</li>)}</ul><button className="text-button" onClick={() => jumpTo("tracker")}>Gắn vào lộ trình <span>→</span></button></article>)}</div>
      </section>

      <section className="tracker section-wrap" id="tracker">
        <div className="section-heading"><div><div className="eyebrow clay-text">TRACKER</div><h2>Biến việc học thành output</h2></div><span className="library-count">{completed.length} / 24 tuần đã đánh dấu</span></div>
        <div className="tracker-shell"><div className="tracker-copy"><div className="tracker-number">{String(completed.length).padStart(2, "0")}</div><p>tuần đã hoàn thành</p><div className="progress-bar large"><span style={{ width: `${(completed.length / 24) * 100}%` }} /></div><button className="button primary" onClick={() => { setActiveWeek(Math.min(24, completed.length + 1)); jumpTo("lesson"); }}>Tiếp tục tuần kế <span>↗</span></button></div><div className="tracker-list">{weeks.slice(0, 6).map((week) => <label className="tracker-row" key={week.id}><input type="checkbox" checked={completed.includes(week.id)} onChange={() => toggleCompleted(week.id)} /><span className="checkmark" /><span className="tracker-week">W{String(week.id).padStart(2, "0")}</span><span>{week.title}</span><small>{week.output}</small></label>)}</div></div>
      </section>

      <footer className="footer section-wrap"><div className="brand"><span className="brand-mark">SC</span><span>chuỗi học</span></div><p>Đọc có chọn lọc · Làm bài đều · Luôn biến kiến thức thành output.</p><span className="footer-note">Made for deliberate learning · 2026</span></footer>
    </main>
  );
}
