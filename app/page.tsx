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
        <div className="metric-card"><span className="metric-icon">↗</span><div className="metric-label">Tiến độ tổng</div><div className="metric-value">{String(Math.max(1, completed.length)).padStart(2, "0")} <small>/ 24 tuần</small></div></div>
        <div className="metric-card"><span className="metric-icon">◷</span><div className="metric-label">Giờ học tuần này</div><div className="metric-value">03:20 <small>giờ</small></div></div>
        <div className="metric-card"><span className="metric-icon">✦</span><div className="metric-label">Output đã tạo</div><div className="metric-value">06 <small>sản phẩm</small></div></div>
        <div className="metric-card"><span className="metric-icon">♧</span><div className="metric-label">Chuỗi ngày học</div><div className="metric-value">12 <small>ngày liên tục</small></div></div>
      </section>

      <section className="roadmap section-wrap" id="roadmap">
        <div className="section-heading">
          <div><div className="eyebrow clay-text">BẢN ĐỒ HÀNH TRÌNH</div><h2>24 tuần, đi từ gốc đến sâu</h2></div>
          <div className="progress-note"><span>Đang ở tháng 01</span><span>· Foundations</span><div className="progress-bar"><span style={{ width: `${Math.max(4, (completed.length / 24) * 100)}%` }} /></div></div>
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
            <p>Hiểu một chuỗi cung ứng như một hệ thống: ai cung cấp, ai biến đổi, ai phân phối, ai trả tiền và thông tin đi ngược lại như thế nào.</p>
            <div className="lesson-tags"><span>flow mapping</span><span>SCOR model</span><span>bullwhip effect</span></div>
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
