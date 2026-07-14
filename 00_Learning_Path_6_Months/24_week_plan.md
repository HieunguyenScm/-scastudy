# Kế Hoạch 24 Tuần - Supply Chain Analytics

Nguyên tắc: mỗi tuần chỉ cần nắm vững một cụm kỹ năng. Đọc có chọn lọc, làm bài đều, và luôn biến kiến thức thành output.

## Tháng 1 - Nền Tảng Supply Chain

### Tuần 1 - Supply Chain Là Gì?

- Mục tiêu: hiểu supply chain là mạng lưới biến nhu cầu thành đơn hàng được giao thành công.
- Học: 3 dòng chính trong chuỗi cung ứng: dòng hàng hóa, dòng tiền, dòng thông tin.
- Đọc ưu tiên: `1. SCM General/Supply Chain Management For Dummies.pdf`, `1. SCM General/ASCM Supply Chain Dictionary.pdf`.
- Thực hành: chọn một ngành gần với bạn, vẽ sơ đồ supplier -> manufacturer -> distributor -> retailer -> customer.
- Output: sơ đồ end-to-end và 1 trang giải thích từng node.
- Câu hỏi kiểm tra: nếu demand tăng bất ngờ, node nào bị ảnh hưởng trước và vì sao?

### Tuần 2 - Demand, Supply, Lead Time, Service Level

- Mục tiêu: nói được vì sao cung-cầu lệch nhau và vì sao lead time làm planning khó hơn.
- Học: demand, supply, lead time, service level, stockout, bullwhip effect.
- Đọc ưu tiên: `1. SCM General/Introduction to Materials Management.pdf`, `1. SCM General/Supply Chain Management - Strategy, Planning, and Operation.pdf`.
- Thực hành: mô tả bullwhip effect bằng ví dụ siêu thị, bia Tết, hoặc thương mại điện tử.
- Output: 1 trang giải thích bullwhip effect bằng ngôn ngữ đời thường.
- Câu hỏi kiểm tra: forecast sai khác với demand volatility như thế nào?

### Tuần 3 - Inventory Basics

- Mục tiêu: hiểu tồn kho là trade-off giữa service và cost.
- Học: cycle stock, safety stock, reorder point, EOQ, holding cost, ordering cost.
- Đọc ưu tiên: `1. SCM General/Introduction to Materials Management.pdf`, `5. Optimization & Simulation/Inventory Optimization - Models and Simulations.pdf`.
- Thực hành: lập bảng tính reorder point cho 5 SKU với demand/ngày và lead time.
- Output: bảng tính reorder point và giải thích SKU nào cần safety stock cao.
- Câu hỏi kiểm tra: tại sao không nên tối ưu tồn kho bằng cách cắt tồn kho đồng loạt?

### Tuần 4 - KPI Supply Chain

- Mục tiêu: hiểu KPI dùng để điều hành, không phải để trang trí báo cáo.
- Học: OTIF, fill rate, forecast accuracy, forecast bias, inventory turns, cash-to-cash.
- Đọc ưu tiên: `2. SC Analytics/Supply Chain Analytics - Concepts, Techniques and Applications.pdf`.
- Thực hành: tạo mini dashboard KPI bằng Excel hoặc PowerBI từ dữ liệu giả lập.
- Output: dashboard 1 trang và 5 insight ngắn.
- Câu hỏi kiểm tra: KPI nào thể hiện dịch vụ khách hàng, KPI nào thể hiện vốn bị giam trong tồn kho?

## Tháng 2 - Công Cụ Và Dữ Liệu

### Tuần 5 - Dashboard Và Data Cleaning

- Mục tiêu: biết biến bảng dữ liệu thùng lũng thành báo cáo đọc được.
- Học: tidy data, data dictionary, missing values, duplicate rows, chart choice.
- Đọc ưu tiên: `7. Mindset-Thinking/Storytelling With Data - A Data Visualization Guide for Business Professionals.pdf`.
- Thực hành: tạo dashboard supply chain với slicer theo ngày, SKU, region.
- Output: dashboard có KPI cards, trend, ranking, và nhận xét.
- Câu hỏi kiểm tra: khi nào nên dùng line chart, bar chart, table?

### Tuần 6 - SQL Cho Supply Chain Analyst

- Mục tiêu: truy vấn dữ liệu order, inventory, shipment ở mức cơ bản.
- Học: SELECT, WHERE, JOIN, GROUP BY, CASE WHEN, window function.
- Đọc ưu tiên: `9. Tools/SQL for Data Analysis.pdf`, `9. Tools/SQL Queries for Mere Mortals.pdf`.
- Thực hành: viết 20 câu query: sales by SKU, fill rate, lead time average, top customers.
- Output: file ghi 20 query và kết quả mong đợi.
- Câu hỏi kiểm tra: JOIN sai có thể làm KPI bị phóng đại như thế nào?

### Tuần 7 - Python Và Pandas

- Mục tiêu: đọc, làm sạch, tổng hợp dữ liệu bằng Python.
- Học: dataframe, filter, groupby, merge, pivot, date handling.
- Đọc ưu tiên: `9. Tools/Python Data Science Handbook.pdf`.
- Thực hành: phân tích order history giả lập theo SKU, ngày, channel.
- Output: notebook có 5 bảng tổng hợp và 3 chart.
- Câu hỏi kiểm tra: groupby trong pandas giống GROUP BY trong SQL ở điểm nào?

### Tuần 8 - Storytelling With Data

- Mục tiêu: biến dashboard thành insight và recommendation.
- Học: situation, complication, question, answer; chart title có thông điệp; actionability.
- Đọc ưu tiên: `7. Mindset-Thinking/Storytelling With Data - Let’s Practice.pdf`, `7. Mindset-Thinking/Bulletproof Problem Solving - The One Skill That Change Everything.pdf`.
- Thực hành: viết memo 1 trang từ dashboard tuần 5.
- Output: business memo gồm issue, evidence, recommendation, risk.
- Câu hỏi kiểm tra: insight khác với observation như thế nào?

## Tháng 3 - Forecasting

### Tuần 9 - Forecasting Mindset

- Mục tiêu: hiểu forecast là quyết định có sai số, không phải lời tiên tri.
- Học: baseline, naive forecast, moving average, seasonality, trend, noise.
- Đọc ưu tiên: `4. Forecasting/Business Forecasting - A Practical Approach.pdf`, `4. Forecasting/Demand Forecasting Best Practices.pdf`.
- Thực hành: so sánh naive forecast và moving average trên 1 SKU.
- Output: bảng sai số MAE/MAPE và kết luận model nào tốt hơn.
- Câu hỏi kiểm tra: forecast accuracy cao có luôn đồng nghĩa với planning tốt không?

### Tuần 10 - Time Series Basics

- Mục tiêu: đọc được pattern của chuỗi thời gian.
- Học: decomposition, smoothing, holdout, MAPE, MAE, RMSE, bias.
- Đọc ưu tiên: `4. Forecasting/Practical Time Series Analysis.pdf`.
- Thực hành: forecast 12 tuần cho 1 SKU bằng Excel hoặc Python.
- Output: forecast chart, error metrics, và nhận xét pattern.
- Câu hỏi kiểm tra: MAPE có vấn đề gì khi actual gần bằng 0?

### Tuần 11 - Forecasting Bằng Python

- Mục tiêu: tạo pipeline forecast nhiều SKU.
- Học: train/test split theo thời gian, rolling forecast, model evaluation by SKU.
- Đọc ưu tiên: `4. Forecasting/Data Science for Supply Chain Forecasting.pdf`, `4. Forecasting/Machine Learning for Time Series Forecasting with Python.pdf`.
- Thực hành: forecast 10 SKU và xếp hạng SKU theo error.
- Output: notebook forecast multi-SKU.
- Câu hỏi kiểm tra: SKU nào nên xử lý bằng exception thay vì model tự động?

### Tuần 12 - Demand Planning Process

- Mục tiêu: hiểu forecast đi vào quy trình planning như thế nào.
- Học: demand review, consensus forecast, forecast override, bias control, exception management.
- Đọc ưu tiên: `3. SC Planning/Supply Chain Management and Advanced Planning.pdf`.
- Thực hành: lập monthly forecast review cho 5 SKU có sai số cao.
- Output: forecast project và khuyến nghị planning.
- Câu hỏi kiểm tra: khi sales override forecast, cần lưu lại thông tin gì?

## Tháng 4 - Planning Và Inventory

### Tuần 13 - Planning Hierarchy

- Mục tiêu: phân biệt S&OP, MPS, MRP, production scheduling.
- Học: aggregate plan, master production schedule, bill of materials, capacity.
- Đọc ưu tiên: `3. SC Planning/Manufacturing Planning and Control for Supply Chain Management.pdf`.
- Thực hành: vẽ planning hierarchy cho một công ty sản xuất đơn giản.
- Output: sơ đồ planning hierarchy và vai trò của từng tầng.
- Câu hỏi kiểm tra: S&OP khác MRP ở mức độ quyết định nào?

### Tuần 14 - ABC/XYZ Và Safety Stock

- Mục tiêu: phân loại SKU để quản trị tồn kho thông minh hơn.
- Học: ABC by value, XYZ by demand variability, service level by segment.
- Đọc ưu tiên: `5. Optimization & Simulation/Inventory Optimization - Models and Simulations.pdf`.
- Thực hành: phân loại 20 SKU thành ABC/XYZ.
- Output: matrix ABC/XYZ và policy đề xuất.
- Câu hỏi kiểm tra: vì sao A-X và C-Z không nên có cùng service level?

### Tuần 15 - Replenishment Policy

- Mục tiêu: đề xuất khi nào đặt hàng và đặt bao nhiêu.
- Học: reorder point, review period, min-max, MOQ, stockout, overstock.
- Đọc ưu tiên: `1. SCM General/Introduction to Materials Management.pdf`.
- Thực hành: đề xuất policy tồn kho cho 10 SKU.
- Output: bảng policy gồm reorder point, safety stock, review cadence.
- Câu hỏi kiểm tra: MOQ làm inventory policy bị méo như thế nào?

### Tuần 16 - Case Demand/Inventory

- Mục tiêu: giải case như analyst, không chỉ làm phép tính.
- Học: problem framing, data needed, assumptions, recommendation.
- Đọc ưu tiên: `8. Cases/Abbott Demand Planning.pdf` hoặc case gần nhất với mục tiêu của bạn.
- Thực hành: viết case memo 2 trang.
- Output: memo có issue, analysis, recommendation, trade-off.
- Câu hỏi kiểm tra: recommendation của bạn sẽ thất bại nếu assumption nào sai?

## Tháng 5 - Optimization Và Simulation

### Tuần 17 - Linear Programming

- Mục tiêu: biến bài toán kinh doanh thành objective và constraints.
- Học: decision variables, objective function, constraints, feasible solution.
- Đọc ưu tiên: `5. Optimization & Simulation/Operations Research - An Introduction.pdf`, `5. Optimization & Simulation/Introduction to Management Science - A Modelling and Case Studies approach with Spreadsheets.pdf`.
- Thực hành: bài toán vận tải từ warehouse đến customer.
- Output: spreadsheet optimization hoặc Python model có kết quả.
- Câu hỏi kiểm tra: constraint nào là business rule, constraint nào là physical limit?

### Tuần 18 - Network Design

- Mục tiêu: hiểu cách chọn vị trí kho/luồng hàng dựa trên chi phí và service.
- Học: facility location, capacity, transportation cost, fixed cost, service distance.
- Đọc ưu tiên: `5. Optimization & Simulation/A Deep Dive into Strategic Network Design Programming.pdf`, `8. Cases/Viettel Post Network Design.pdf`.
- Thực hành: so sánh 2-3 kịch bản network.
- Output: model chọn điểm kho có giải thích trade-off.
- Câu hỏi kiểm tra: mở thêm kho giảm chi phí nào và làm tăng chi phí nào?

### Tuần 19 - Simulation

- Mục tiêu: dùng simulation để hiểu variability và bottleneck.
- Học: scenario, random variability, queue, throughput, utilization.
- Đọc ưu tiên: `5. Optimization & Simulation/Modeling and Simulation of Logistics Flow - Theory and Fundamentals.pdf`.
- Thực hành: mô phỏng 3 kịch bản lead time/demand variability.
- Output: bảng so sánh service level, stockout, average inventory.
- Câu hỏi kiểm tra: simulation trả lời câu hỏi nào mà optimization khó trả lời?

### Tuần 20 - Optimization Project

- Mục tiêu: hoàn thành project tối ưu chi phí/dịch vụ.
- Học: model framing, assumptions, sensitivity analysis.
- Đọc ưu tiên: ôn lại tài liệu tuần 17-19.
- Thực hành: xây project optimization với dữ liệu giả lập hoặc case.
- Output: model + memo 1-2 trang + chart so sánh scenario.
- Câu hỏi kiểm tra: kết quả có còn đúng nếu demand tăng 20% không?

## Tháng 6 - Business Depth Và Capstone

### Tuần 21 - Supply Chain Finance

- Mục tiêu: nói được tác động tài chính của quyết định supply chain.
- Học: working capital, inventory carrying cost, cost-to-serve, should-cost.
- Đọc ưu tiên: `13. SC Finance & Accounting/Financing the End-to-End Supply Chain.pdf`, `13. SC Finance & Accounting/Should-Cost Modeling Handbook.pdf`.
- Thực hành: phân tích cost-to-serve cho 3 customer/channel.
- Output: bảng cost-to-serve và recommendation.
- Câu hỏi kiểm tra: service level cao có thể làm lợi nhuận giảm ở đâu?

### Tuần 22 - CPIM/ASCM Concepts

- Mục tiêu: nắm ngôn ngữ chuyên môn chuẩn của planning và supply chain.
- Học: strategy, master planning, detailed scheduling, execution, continuous improvement.
- Đọc ưu tiên: `11. CPIM Part 2 v7/CPIM_2022_Part_2_Module_1.pdf` đến `Module_8.pdf` theo mục lục liên quan.
- Thực hành: tạo glossary 50 thuật ngữ.
- Output: glossary có định nghĩa bằng tiếng Việt và ví dụ.
- Câu hỏi kiểm tra: thuật ngữ nào bạn có thể dùng trong phỏng vấn ngay?

### Tuần 23 - Case Tổng Hợp

- Mục tiêu: kết hợp forecast, inventory, planning, finance.
- Học: end-to-end problem solving và executive communication.
- Đọc ưu tiên: `8. Cases/L_Oreal ACD Supply Chain Puzzle.pdf`, `12. Reports/Vietnam_Beer_Market_Tet_2026_Consumer_Trends_2026 Jan.pdf`.
- Thực hành: làm recommendation deck 5-7 slide.
- Output: deck gồm problem, data, options, recommendation, risk.
- Câu hỏi kiểm tra: nếu CFO và Head of Sales bất đồng, bạn dùng KPI nào để nói chuyện?

### Tuần 24 - Capstone Và Mock Interview

- Mục tiêu: có một portfolio project hoàn chỉnh.
- Học: project packaging, storytelling, interview defense.
- Đọc ưu tiên: ôn lại notes, dashboard, notebook, memo đã làm.
- Thực hành: chọn một vấn đề supply chain và giải end-to-end.
- Output: portfolio project gồm data/model/dashboard/memo/deck.
- Câu hỏi kiểm tra: bạn có thể giải thích project trong 3 phút, 10 phút, và 30 phút không?

