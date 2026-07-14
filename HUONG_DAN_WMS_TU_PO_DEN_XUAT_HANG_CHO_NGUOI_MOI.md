# HƯỚNG DẪN WMS TỪ TẠO PO ĐẾN XUẤT HÀNG

> Tài liệu cầm tay chỉ việc dành cho người mới sử dụng Smartlog WMS/SWM

## 0. Đọc phần này trước để khỏi hiểu sai

### 0.1 PO không phải là đơn xuất

Trong hai tài liệu nguồn, chứng từ được gọi như sau:

| Từ viết tắt | Tên đầy đủ | Hiểu đơn giản |
|---|---|---|
| WMS/SWM | Warehouse Management System | Hệ thống quản lý kho Smartlog |
| PO | Purchase Order | Đơn mua/đơn nhập tổng; cho biết dự kiến nhập mặt hàng nào, bao nhiêu |
| ASN/Receipt | Advanced Shipping Notice/Đơn hàng nhập | Chuyến hoặc đợt hàng thực tế sẽ được nhận vào kho từ PO |
| SO/Shipment Order | Sales Order/Đơn hàng xuất | Chứng từ yêu cầu kho lấy hàng và xuất hàng |
| LPN | License Plate Number | Mã định danh một đơn vị chứa hàng; trong vận hành thường gặp dưới dạng Pallet ID/Carton ID |
| SKU | Stock Keeping Unit | Mã hàng |
| UPC | Mã vạch hàng hóa | Mã được quét để xác nhận đúng SKU |
| Serial/IMEI | Số định danh riêng của từng sản phẩm | Mỗi chiếc có một mã riêng, không được trùng |
| FIFO | First In, First Out | Hàng nhập trước được ưu tiên xuất trước |
| FEFO | First Expired, First Out | Hàng hết hạn trước được ưu tiên xuất trước |

Vì vậy, câu “từ tạo PO đến xuất đơn PO” trong tài liệu này được hiểu đúng nghiệp vụ là:

**Tạo PO → tạo ASN → nhận hàng → cất hàng → tạo SO → chỉ định tồn → soạn → đóng → xuất SO.**

Không có bước “xuất PO” theo nghĩa lấy chính chứng từ PO để xuất kho. PO kết thúc ở luồng nhập; SO là chứng từ chạy luồng xuất.

### 0.2 Một ví dụ sẽ được dùng xuyên suốt

Giả sử kho nhận:

- PO: `PO-DEMO-001`.
- Nhà cung cấp: `NCC-A`.
- SKU: `SP-A`.
- Số lượng đặt: 150 cái.
- Quy cách tối đa: 100 cái/pallet.
- Lần giao đầu: 120 cái.
- Có 2 pallet: pallet thứ nhất 100 cái, pallet thứ hai 20 cái.
- Sau khi nhập và cất, khách đặt 30 cái.
- SO: `SO-DEMO-001`.

Khi đọc từng bước, cứ liên hệ với ví dụ này. Nếu hiểu được ví dụ, bạn đã hiểu logic của hệ thống.

### 0.3 Hai nơi thao tác

- **Web WMS/SWM:** tạo/chỉnh chứng từ, upload Excel, chia dòng, tạo Pallet ID, chỉ định tồn, xem báo cáo và xử lý ngoại lệ.
- **Mobile App/Handheld:** nhận hàng, quét serial, cất hàng, châm hàng, soạn hàng, đóng hàng và xuất hàng tại hiện trường.

Tên nút hoặc biểu tượng có thể khác nhẹ theo phiên bản và phân quyền. Nếu không thấy nút, trước tiên kiểm tra đúng kho, đúng màn hình, đúng trạng thái và quyền tài khoản.

---

## 1. Bản đồ toàn bộ quy trình

| Chặng | Chứng từ/trạng thái đầu vào | Việc phải làm | Kết quả đúng |
|---|---|---|---|
| 1 | Chưa có PO | Tạo PO trên Web hoặc nhận PO tích hợp từ SOM | PO ở trạng thái NEW/THÊM MỚI |
| 2 | PO NEW hoặc nhận một phần | Gen ASN từ PO cho lần giao thực tế | ASN có đúng SKU và số lượng lần giao |
| 3 | ASN NEW | Chia dòng/pallet, tạo Pallet ID, in nhãn; chuẩn bị serial nếu có | Mỗi pallet vật lý có một Pallet ID; dữ liệu đủ |
| 4 | Hàng đến kho | Nhận hàng bằng App hoặc Web | ASN RECEIVED hoặc nhận một phần; tồn tăng ở STAGE/vị trí nhận |
| 5 | Pallet ở STAGE | Cất hàng bằng App | Pallet nằm tại vị trí lưu trữ hợp lệ |
| 6 | Có nhu cầu xuất | Tạo Lệnh xuất rồi gen SO, hoặc tạo SO trực tiếp/tích hợp | SO NEW |
| 7 | SO NEW | Preallocate hoặc Allocate | PREALLOCATED/ALLOCATED hoặc trạng thái một phần |
| 8 | Thiếu hàng ở khu soạn lẻ | Châm hàng nếu cần | Hàng được chuyển tới khu soạn |
| 9 | SO đã giữ/chỉ định tồn | Tạo phiếu soạn tổng nếu cần; soạn hàng | PICKED hoặc PART PICK |
| 10 | Hàng đã soạn | Chia theo đơn nếu dùng master pick; đóng vào Carton ID; scan serial | PACKED hoặc IN PACKING |
| 11 | SO đủ điều kiện | Xuất bằng Web hoặc App | SHIPPED hoặc PART SHIP |
| 12 | SO SHIPPED | Kiểm tra đồng bộ và báo cáo | Kết quả thực xuất gửi về SOM thành công |

### 1.1 Công thức nhớ siêu ngắn

**Muốn nhập:** Có PO → có ASN → có Pallet → Receive → Putaway.

**Muốn xuất:** Có SO → có tồn AVAILABLE/OK → Allocate → Pick → Pack → Ship.

---

## 2. Chuẩn bị trước khi thao tác

Đừng tạo đơn ngay khi chưa kiểm tra các điều kiện dưới đây. Phần lớn lỗi “hệ thống không cho làm” xuất phát từ dữ liệu nền hoặc chọn sai kho.

### 2.1 Checklist tài khoản và thiết bị

- [ ] Đăng nhập được Web WMS.
- [ ] Đăng nhập được App/Handheld.
- [ ] Tài khoản có quyền vào module Nhập, Xuất, Tồn kho và các màn hình liên quan.
- [ ] Đã chọn đúng kho ở góc trên bên phải trên Web.
- [ ] Đã chọn đúng kho trong phần Cá nhân trên App.
- [ ] Máy quét đọc được barcode Pallet ID, Carton ID, vị trí, SKU/UPC và serial.
- [ ] Máy in nhãn hoạt động; khổ nhãn đúng.

### 2.2 Checklist dữ liệu nền

- [ ] Chủ hàng đã tồn tại.
- [ ] SKU đã được khai báo.
- [ ] Đơn vị tính của SKU đúng: cái/thùng/pallet.
- [ ] Quy đổi đơn vị đúng. Ví dụ 1 thùng = 20 cái.
- [ ] SKU được thiết lập đúng là có hoặc không quản lý serial.
- [ ] Nếu theo lô/hạn dùng: lô, ngày sản xuất và hạn dùng được quản lý đúng.
- [ ] Quy cách tối đa trên pallet đã được thiết lập nếu muốn dùng “Chia pallet”.
- [ ] Vị trí STAGE và vị trí lưu trữ đã được thiết lập.
- [ ] Trạng thái hàng được phép xuất là AVAILABLE/OK theo cấu hình của kho.
- [ ] Chiến thuật FIFO/FEFO, chỉ định và châm hàng đã được cấu hình nếu dùng tự động.

### 2.3 Quy tắc vàng trước khi bấm xác nhận

Luôn kiểm tra 6 thứ:

1. Đúng kho.
2. Đúng chứng từ.
3. Đúng SKU.
4. Đúng đơn vị và số lượng.
5. Đúng Pallet ID/vị trí.
6. Đúng serial/lô/hạn dùng nếu có quản lý.

### 2.4 Ai thường làm bước nào?

Tên vai trò thực tế có thể khác giữa các kho, nhưng không nên để một thao tác quan trọng “không có người chịu trách nhiệm”.

| Chặng | Người thường thực hiện | Người kiểm tra/chốt |
|---|---|---|
| Tạo/kiểm tra PO | Điều phối nhập, kế hoạch hoặc nhân viên chứng từ | Key-user/điều phối |
| Tạo ASN | Điều phối nhập/nhân viên chứng từ | Trưởng ca nhập |
| Chia pallet, in nhãn | Nhân viên chứng từ hoặc inbound clerk | Trưởng ca/nhân viên nhận |
| Nhận hàng | Nhân viên receiving dùng handheld | QC/trưởng ca nhập |
| Cất hàng | Nhân viên xe nâng/putaway | Điều phối tồn kho |
| Tạo/kiểm tra SO | Điều phối xuất/nhân viên chứng từ | Key-user/điều phối |
| Allocate/Preallocate | Điều phối xuất hoặc hệ thống tự động | Trưởng ca xuất |
| Châm hàng | Nhân viên replenishment/xe nâng | Điều phối xuất |
| Soạn hàng | Picker | Trưởng nhóm/QC |
| Chia, đóng, scan serial | Sorter/Packer | QC đóng gói |
| Xuất hàng | Nhân viên bàn giao/loading | Trưởng ca xuất/bảo vệ theo SOP |
| Đối soát, sync | Điều phối/chứng từ | Key-user/IT khi có lỗi |

### 2.5 Chọn nhánh nào? Đừng làm tất cả các cách

Mỗi công đoạn có nhiều phương thức, nhưng một chứng từ chỉ cần đi theo **một nhánh phù hợp**:

- PO từ SOM đã xuống đủ → chỉ kiểm tra, không tạo thêm PO thủ công.
- Hàng giao theo PO → gen ASN từ PO; chỉ tạo ASN thủ công khi SOP cho phép.
- Nhận bằng App → quét tại hiện trường; không bấm nhận lại trên Web.
- Nhận bằng Web với hàng serial → import serial trước rồi mới Receive.
- SO từ SOM đã xuống → kiểm tra; không tạo lại SO thủ công.
- Đơn đơn giản → soạn theo SO; nhiều đơn cần tối ưu đường đi → dùng Master Pick.
- Kho dùng Allocate → lấy đúng pallet; kho dùng Preallocate → làm theo điều kiện linh hoạt của chiến thuật.
- Serial đã scan trong Pick & Pack → không scan lặp lại ở bước Scan Serial xuất nếu cấu hình đúng như blueprint.

Nếu hai người dùng hai cách cho cùng một task, nguy cơ thường là nhận/soạn trùng hoặc người thứ hai bị hệ thống chặn.

---

# PHẦN I — NHẬP HÀNG: TỪ PO ĐẾN TỒN SẴN SÀNG XUẤT

## 3. Bước 1 — Tạo PO

### 3.1 PO dùng để làm gì?

PO là “cam kết/dự kiến nhập tổng”. Một PO có thể được giao nhiều lần.

Ví dụ `PO-DEMO-001` đặt 150 cái. Nhà cung cấp giao lần 1 là 120, lần 2 là 30. Ta giữ một PO 150 cái nhưng tạo hai ASN tương ứng hai lần giao.

### 3.2 Cách A — PO tích hợp tự động từ SOM

Theo blueprint PGI, luồng chuẩn có thể là:

1. Người dùng tạo PO trên SOM.
2. SOM gửi PO xuống SWM qua API.
3. SWM tự động tạo PO.
4. Người dùng vào **Nhập → PO** tìm theo mã PO và kiểm tra.

Kiểm tra tối thiểu:

- Mã PO.
- Chủ hàng.
- Loại giao dịch.
- Nhà cung cấp.
- Từng SKU.
- Đơn vị.
- Số lượng đặt.
- Lô/ngày sản xuất/hạn dùng nếu có.

Nếu không thấy PO, đừng tạo trùng ngay. Hãy kiểm tra đúng kho, bộ lọc ngày, mã tìm kiếm, rồi mới kiểm tra trạng thái đồng bộ/API.

### 3.3 Cách B — Tạo PO thủ công trên Web

#### Thao tác

1. Vào **Nhập → PO**.
2. Chọn nút **Tạo mới/Add**.
3. Nhập phần **Header** — thông tin chung của cả PO.
4. Nhấn **Thêm dòng/Add line** ở phần Detail.
5. Nhập từng SKU, đơn vị, số lượng và thuộc tính lô nếu có.
6. Nhấn **Lưu/Save** ở từng dòng.
7. Nhấn **Lưu/Save** cho chứng từ nếu giao diện yêu cầu.
8. Tìm lại PO vừa tạo và mở chi tiết để kiểm tra.

#### Header cần hiểu

| Trường | Điền gì | Kiểm tra |
|---|---|---|
| Chủ hàng | Đơn vị sở hữu hàng | Không chọn nhầm chủ hàng |
| Loại giao dịch | Loại nhập theo nghiệp vụ | Đúng loại PO/mua hàng/chuyển kho |
| Số đơn PO | Mã nghiệp vụ do người dùng đặt | Nên duy nhất, ví dụ `PO-DEMO-001` |
| Số đơn PO 2 | Mã tham chiếu phụ | Không bắt buộc nếu quy trình không dùng |
| Mã/tên nhà cung cấp | Đơn vị giao hàng | Khớp chứng từ mua hàng |

#### Detail cần hiểu

| Trường | Điền gì | Sai phổ biến |
|---|---|---|
| Mã hàng | SKU cần nhập | Nhầm mã gần giống nhau |
| Đơn vị | Cái/thùng/pallet | Điền 10 thùng nhưng tưởng 10 cái |
| Số lượng đặt | Tổng số lượng theo đơn vị đã chọn | Không đối chiếu quy đổi |
| Số lô | Lô của hàng | Bỏ trống trong khi SKU bắt buộc lô |
| Ngày sản xuất | Ngày sản xuất | Nhập sai định dạng |
| Ngày hết hạn | Hạn dùng | Hạn dùng trước ngày sản xuất |

#### Kết quả đúng

- PO có trạng thái **NEW/THÊM MỚI**.
- Tổng số lượng đặt theo từng SKU khớp chứng từ gốc.
- Số lượng đã nhận ban đầu bằng 0.

### 3.4 Cách C — Upload PO bằng Excel

1. Vào **Nhập → PO**.
2. Mở chức năng **Import/Upload Excel**.
3. Tải đúng template trực tiếp từ màn hình hiện tại.
4. Không đổi tên cột, không xóa cột, không tự thêm công thức vào vùng dữ liệu.
5. Điền các cột bắt buộc và lưu file.
6. Tải file lên.
7. Kiểm tra các dòng đỏ/lỗi.
8. Sửa file gốc rồi upload lại.
9. Chỉ bấm **YES/Xác nhận** khi không còn lỗi.
10. Tìm lại PO trên WMS và đối chiếu tổng.

**Quy tắc cực quan trọng:** nếu nhiều dòng thuộc cùng một PO, mọi thông tin Header ở các dòng đó phải giống hệt nhau. Ví dụ cùng mã PO nhưng dòng 1 là nhà cung cấp A, dòng 2 là nhà cung cấp B thì hệ thống có thể báo lỗi hoặc chỉ ghi nhận dòng đầu.

### 3.5 Trạng thái PO

| Trạng thái | Nghĩa | Được làm gì |
|---|---|---|
| NEW/THÊM MỚI | Vừa tạo, chưa nhận | Có thể sửa thông tin theo quyền |
| PART RECEIVED/NHẬN MỘT PHẦN | Đã nhận một phần | Có thể gen ASN phần còn lại |
| RECEIVED/ĐÃ NHẬN | Đã nhận đủ | Không nên gen thêm ngoài số lượng PO |
| CLOSED/CANCEL/ĐÓNG | PO đã đóng/hủy | Không dùng tiếp để nhận |

### 3.6 Chốt kiểm soát PO

- [ ] Mã PO không trùng.
- [ ] Header đúng.
- [ ] Tất cả SKU đúng.
- [ ] Đơn vị và quy đổi đúng.
- [ ] Tổng số lượng đúng.
- [ ] Lô/ngày sản xuất/hạn dùng đúng nếu có.
- [ ] Trạng thái PO là NEW hoặc trạng thái hợp lệ để gen ASN.

---

## 4. Bước 2 — Tạo ASN/Đơn hàng nhập từ PO

### 4.1 Tại sao phải có ASN?

PO nói “tổng cộng sẽ nhập bao nhiêu”. ASN nói “lần giao này thực tế dự kiến nhận bao nhiêu”. Nhân viên kho nhận hàng theo ASN, không nhận trực tiếp trên PO.

Ví dụ:

- PO: 150 cái.
- Lần 1 giao: 120 cái → ASN-1 là 120.
- Lần 2 giao: 30 cái → ASN-2 là 30.

### 4.2 Cách khuyến nghị — Gen ASN từ PO

1. Vào **Nhập → PO**.
2. Tìm `PO-DEMO-001`.
3. Chọn PO.
4. Chọn chức năng **Tạo/Generate ASN/Đơn nhập**.
5. Trong cửa sổ tạo ASN, nhập số lượng của lần giao thực tế.
6. Kiểm tra thông tin được kế thừa: mã PO, SKU, lô, ngày sản xuất, hạn dùng.
7. Xác nhận tạo.
8. Ghi lại mã ASN hệ thống sinh ra.
9. Vào **Nhập → Đơn hàng nhập/ASN/Receipt**, tìm mã ASN vừa tạo.

**Ví dụ:** nhập 120 ở lần 1, không nhập 150 chỉ vì PO có 150. Nếu nhập 150 nhưng xe chỉ giao 120, kho sẽ tạo ra chênh lệch không cần thiết.

### 4.3 Tạo ASN thủ công

Dùng khi quy trình cho phép nhập nhanh không qua PO hoặc xử lý nghiệp vụ đặc biệt.

1. Vào **Nhập → Đơn hàng nhập/ASN/Receipt**.
2. Chọn **Tạo mới**.
3. Điền Header: chủ hàng, loại giao dịch, số đơn nhập, nhà cung cấp, vận tải, số xe, tài xế, mã PO tham chiếu nếu có.
4. Thêm từng dòng Detail: SKU, đơn vị, số lượng dự kiến, lô, ngày sản xuất, hạn dùng.
5. Lưu từng dòng và lưu chứng từ.
6. Kiểm tra lại tổng.

Nếu là chuyển kho, trường kho xuất/kho đến phải đúng theo cấu hình nghiệp vụ.

### 4.4 Upload ASN bằng Excel

Quy trình giống upload PO nhưng phải tải template tại màn hình **Đơn hàng nhập**, không dùng nhầm template PO.

1. Tải template.
2. Điền các cột bắt buộc.
3. Giữ Header giống nhau cho các dòng cùng một ASN.
4. Upload.
5. Sửa hết dòng lỗi.
6. Xác nhận.
7. Tìm lại ASN và đối chiếu.

### 4.5 Nếu tạo sai ASN

Khi ASN còn ở trạng thái cho phép chỉnh sửa:

- Xóa ASN hoặc điều chỉnh số lượng trong chi tiết ASN.
- Phần số lượng chưa dùng sẽ được trả về PO theo logic tài liệu.
- Mở lại PO để kiểm tra số lượng đã gen/đã nhận/phần còn lại.

Không tự ý sửa số lượng sau khi đã nhận hàng nếu chưa đánh giá ảnh hưởng tồn kho và serial.

### 4.6 Chốt kiểm soát ASN

- [ ] Mã PO tham chiếu đúng.
- [ ] ASN chỉ chứa số lượng của lần giao này.
- [ ] SKU/đơn vị/lô/hạn dùng đúng.
- [ ] Số lượng ASN không vượt phần PO còn lại nếu quy trình không cho phép vượt.
- [ ] Trạng thái ASN là NEW/THÊM MỚI trước khi chuẩn bị nhận.

---

## 5. Bước 3 — Chia dòng, tạo Pallet ID và in nhãn

### 5.1 Tại sao phải chia dòng?

Một dòng ASN 120 cái không có nghĩa là hàng nằm trên một pallet. Nếu pallet tối đa 100 cái thì thực tế là:

- Pallet 1: 100 cái.
- Pallet 2: 20 cái.

WMS cần dòng/pallet tương ứng để theo dõi vị trí và số lượng chính xác.

### 5.2 Cách A — Chia theo quy cách pallet đã thiết lập

1. Mở **Chi tiết Đơn nhập**.
2. Tích chọn dòng cần chia.
3. Chọn **Chia pallet/Split pallet**.
4. Hệ thống dùng quy cách tối đa đã khai báo trong master data.
5. Kiểm tra các dòng sau chia.
6. Nhấn **Lưu**.

Ví dụ 150 cái, tối đa 100/pallet → hệ thống tạo một dòng 100 và một dòng 50.

### 5.3 Cách B — Chia theo số lượng tự chọn

1. Mở **Chi tiết Đơn nhập**.
2. Chọn dòng.
3. Chọn **Chia dòng/Split line**.
4. Nhập số lượng mỗi dòng.
5. Xác nhận.
6. Kiểm tra tổng sau chia phải bằng tổng trước chia.

Ví dụ 150, chia mỗi dòng 60 → 60 + 60 + 30.

### 5.4 Tạo Pallet ID

1. Trong chi tiết ASN, chọn các dòng cần tạo pallet.
2. Chọn **Tạo mã Pallet ID**.
3. Lưu.
4. Kiểm tra mỗi dòng/pallet đã có mã.

**Quy tắc:** một Pallet ID đại diện cho một pallet vật lý và tại một thời điểm không được nằm ở hai vị trí khác nhau.

### 5.5 In nhãn Pallet

1. Từ danh sách ASN hoặc chi tiết ASN, chọn đơn/dòng cần in.
2. Chọn **In phiếu/Print**.
3. Chọn **Nhãn Pallet/Pallet Label**.
4. Chọn đúng máy in và khổ giấy.
5. In thử một nhãn nếu lô lớn.
6. Dán nhãn lên pallet sao cho dễ quét, không gấp nếp, không che barcode.
7. Quét thử nhãn sau khi dán.

Hệ thống cũng có thể in Pallet ID rỗng. Theo blueprint, mã có cấu trúc ví dụ `PLT2300000001`: tiền tố tối đa 3 chữ in hoa không dấu + năm + số thứ tự tăng dần.

### 5.6 Chốt kiểm soát pallet

- [ ] Tổng số lượng các dòng sau chia bằng số lượng ASN trước chia.
- [ ] Số pallet trên hệ thống khớp số pallet vật lý.
- [ ] Mỗi pallet có Pallet ID duy nhất.
- [ ] Nhãn quét được.
- [ ] Không dán nhầm nhãn giữa hai pallet.

---

## 6. Bước 4 — Chuẩn bị và kiểm tra Serial/IMEI

### 6.1 Khi nào phải làm?

Chỉ làm khi SKU được thiết lập quản lý serial/IMEI. Với hàng thường, bỏ qua phần quét serial nhưng vẫn phải kiểm đúng SKU và số lượng.

### 6.2 Nhận bằng App

App cho phép quét serial ngay trong quá trình nhận. Hệ thống có thể tách một chuỗi gồm nhiều serial dựa trên khoảng trắng.

Ví dụ chuỗi quét:

`SER001 SER002 SER003`

Hệ thống tách thành 3 serial.

### 6.3 Nhận bằng Web

Trước khi bấm nhận trên Web, phải import serial vào **Nhập → IMEI Tracking**:

1. Mở **IMEI Tracking**.
2. Chọn **Import Excel**.
3. Tải template.
4. Điền các trường bắt buộc, thường gồm:
   - `owner`: chủ hàng.
   - `receiptkey`: mã ASN hệ thống.
   - `receiptlinenumber`: số dòng ASN.
   - `sku`: mã hàng.
   - `qty`: thường là 1 cho mỗi serial.
   - `serial`: mã serial/IMEI.
5. Upload.
6. Mở phần kiểm tra lỗi.
7. Sửa tất cả serial đỏ/trùng/sai SKU/sai dòng.
8. Chỉ tiếp tục nhận khi số serial hợp lệ bằng đúng số lượng hàng serial sẽ nhận.

### 6.4 Điều kiện chặn của hệ thống

Khi nhận bằng Web với hàng serial:

- Số lượng hàng trong ASN theo đơn vị nhỏ nhất phải bằng số serial tương ứng trong IMEI Tracking.
- Nếu nhiều hơn hoặc ít hơn, hệ thống không cho nhận.
- Serial bị tô đỏ phải được xử lý trước.
- Serial trùng không được nhận.

### 6.5 Chốt kiểm soát serial

- [ ] Mỗi sản phẩm có đúng một serial.
- [ ] Không trùng serial trong lô quét.
- [ ] Serial thuộc đúng SKU.
- [ ] Serial gắn đúng ASN và đúng dòng.
- [ ] Số serial = số lượng thực nhận của hàng serial.

---

## 7. Bước 5 — Nhận hàng

Có hai cách. Với người mới, nên dùng App tại hiện trường vì quét giúp giảm nhầm. Web phù hợp với trường hợp đã kiểm soát dữ liệu chặt và hiểu rủi ro.

### 7.1 Cách A — Nhận hàng bằng App

#### Chuẩn bị

- Hàng và chứng từ đã tới khu nhận.
- ASN đã tạo.
- Pallet ID đã in/dán.
- Người dùng đã chọn đúng kho trên App.

#### Thao tác chung

1. Mở App Smartlog SWM.
2. Đăng nhập.
3. Vào **Cá nhân** và chọn đúng kho.
4. Mở danh sách tính năng → **Nhập hàng**.
5. Ở tab **Tất cả**, tìm bằng mã ASN/PO hoặc quét mã.
6. Chọn đúng task và bấm **Chấp nhận**.
7. Task chuyển sang tab **Của tôi**.

#### Trường hợp hàng không có serial

1. Chọn tab **Hàng thường**.
2. Quét hoặc nhập Pallet ID — bắt buộc.
3. Quét SKU/UPC hoặc chọn SKU trên màn hình.
4. Đối chiếu tên hàng.
5. Kiểm tra ngày nhập; hệ thống mặc định ngày hiện tại và không cho sửa trên App.
6. Nhập số lượng xác nhận. Không được lớn hơn số lượng gợi ý.
7. Kiểm tra lại Pallet ID, SKU, đơn vị và số lượng.
8. Bấm **Nhận hàng**.
9. Lặp lại cho các dòng còn lại.

#### Trường hợp hàng có serial

1. Chọn tab **Hàng có serial**.
2. Quét Pallet ID.
3. Quét/chọn SKU.
4. Quét từng serial hoặc quét QR chứa chuỗi serial.
5. Mở danh sách chi tiết serial.
6. Xóa serial sai/trùng; không tiếp tục nếu còn dòng đỏ.
7. Kiểm tra số serial đã quét bằng số lượng hàng thực tế.
8. Bấm **Nhận hàng**.

#### Sau khi nhận

- Dòng đã làm chuyển sang **Đã nhận**.
- Chưa đủ thì ASN/PO ở trạng thái nhận một phần.
- Đủ thì ASN chuyển **RECEIVED/ĐÃ NHẬN**.
- Serial được thêm/cập nhật trong IMEI Tracking với trạng thái đã nhận theo logic hệ thống.
- Tồn thường nằm tại STAGE/vị trí nhận và chưa kết thúc cất hàng.

### 7.2 Cách B — Nhận hàng bằng Web

#### Nhận toàn bộ một hoặc nhiều ASN

1. Vào **Nhập → Đơn hàng nhập/ASN/Receipt**.
2. Lọc các đơn ở trạng thái **NEW** hoặc **Đang nhận/Nhận một phần**.
3. Kiểm tra từng ASN.
4. Chọn ASN.
5. Chọn **Nhận hàng/Receive**.
6. Xác nhận.

Nếu thao tác ở danh sách, hệ thống nhận toàn bộ số lượng chưa nhận của đơn. Vì vậy đừng dùng cách này nếu hàng thực tế chỉ về một phần mà số lượng chưa điều chỉnh.

#### Nhận một phần

1. Mở chi tiết ASN.
2. Tại từng dòng, nhập số lượng thực nhận.
3. Kiểm tra Pallet ID, lô, vị trí và trạng thái hàng.
4. Chọn **Nhận hàng**.

Nếu bỏ trống số lượng, tài liệu cho biết hệ thống có thể hiểu là nhận toàn bộ. Người mới không nên để trống khi nhận một phần.

#### Hàng serial khi nhận bằng Web

Phải hoàn tất import và đối chiếu IMEI Tracking trước. Hệ thống chỉ cho nhận khi số lượng serial khớp số lượng hàng.

### 7.3 Kiểm tra sau nhận

1. Mở lại ASN.
2. Kiểm tra trạng thái.
3. So sánh **Số lượng đặt** và **Số lượng đã nhận**.
4. Vào **Tồn → Danh sách tồn kho/Inventory List**.
5. Tìm theo SKU/Pallet ID.
6. Kiểm tra số lượng, lô, trạng thái và vị trí.
7. Với serial, vào IMEI Tracking kiểm tra trạng thái.
8. Nếu tích hợp SOM, kiểm tra các cột **Sync Status, Sync Date, Sync Message**.

Khi ASN chuyển RECEIVED, SWM tự động gửi kết quả Goods Receipt về SOM theo blueprint.

### 7.4 Lỗi nhận hàng thường gặp

| Hiện tượng | Nguyên nhân có khả năng | Cách kiểm tra/xử lý |
|---|---|---|
| Không tìm thấy task | Sai kho, sai mã, bộ lọc, task đã bị người khác nhận | Chọn lại kho; xem tab Tất cả/Của tôi/Đã hoàn thành |
| Không bấm nhận được | Thiếu trường bắt buộc | Kiểm tra Pallet ID, vị trí, SKU, lô, số lượng |
| Số lượng vượt gợi ý | Nhập lớn hơn phần ASN còn lại | Đối chiếu số lượng đặt/đã nhận/còn lại |
| Serial đỏ | Trùng, sai SKU hoặc dữ liệu không hợp lệ | Mở chi tiết serial, xóa và quét lại |
| Web báo serial không khớp | Số serial khác số lượng dòng | Import thêm hoặc sửa/xóa serial để khớp tuyệt đối |
| Hai người cùng làm một task | Task đã được người đầu hoàn thành | Người còn lại dừng thao tác và tải lại danh sách |
| Đã nhận nhưng SOM chưa tăng | Đồng bộ lỗi/chờ | Kiểm tra Sync Status/Date/Message; báo hỗ trợ kèm mã ASN |

---

## 8. Bước 6 — Cất hàng (Putaway)

### 8.1 Hiểu đúng

**Receive** nghĩa là kho đã nhận hàng. **Putaway** nghĩa là đưa pallet từ STAGE vào vị trí lưu trữ.

Nhận xong mà chưa cất thì hàng có thể đã tăng tồn nhưng vẫn nằm ở STAGE và chưa sẵn sàng tối ưu cho xuất.

### 8.2 Cất toàn bộ pallet bằng App

1. Mở danh sách tính năng → **Cất hàng**.
2. Tìm/chấp nhận task; task chuyển vào **Của tôi**.
3. Quét Pallet ID nguồn đang ở STAGE.
4. Chọn **Tất cả mã hàng**.
5. Xem vị trí gợi ý; có thể chuyển qua gợi ý tiếp theo nếu hệ thống cho phép.
6. Đi tới vị trí thực tế.
7. Quét **Vị trí cất hàng**.
8. Quét/nhập **Pallet ID đến**.
9. Chọn tình trạng serial/hàng; mặc định thường là Normal/Bình thường.
10. Kiểm tra và bấm **Cất hàng**.

### 8.3 Cất một phần — hàng không serial

1. Quét Pallet ID nguồn.
2. Quét/chọn SKU.
3. Kiểm tra vị trí gợi ý.
4. Quét vị trí đích.
5. Quét Pallet ID đích khác Pallet ID nguồn theo hướng dẫn tài liệu.
6. Nhập số lượng cất một phần.
7. Chọn tình trạng.
8. Xác nhận cất.

### 8.4 Cất một phần — hàng có serial

1. Quét Pallet ID nguồn.
2. Chọn SKU.
3. Quét vị trí đích.
4. Quét Pallet ID đích khác pallet nguồn.
5. Quét đúng các serial được chuyển.
6. Mở danh sách serial; xử lý toàn bộ dòng đỏ.
7. Chọn tình trạng.
8. Bấm **Cất hàng**.

### 8.5 Chốt kiểm soát sau cất

- [ ] Pallet không còn ở STAGE nếu đã cất toàn bộ.
- [ ] Vị trí trên WMS đúng vị trí vật lý.
- [ ] Số lượng nguồn giảm và số lượng đích tăng đúng nếu cất một phần.
- [ ] Pallet ID không xuất hiện ở hai vị trí.
- [ ] Serial nằm đúng pallet/vị trí và đúng tình trạng.
- [ ] Tồn có trạng thái AVAILABLE/OK nếu hàng đủ điều kiện xuất.

---

# PHẦN II — XUẤT HÀNG: TỪ TỒN KHO ĐẾN SHIPPED

## 9. Bước 7 — Tạo nhu cầu xuất và SO

### 9.1 Hai tầng chứng từ xuất

Tài liệu key-user mô tả hai tầng:

- **Lệnh xuất hàng/Sale Order:** nhu cầu tổng, có thể giao nhiều lần.
- **Đơn hàng xuất/Shipment Order (SO):** đợt thực tế kho sẽ soạn và xuất.

Bạn có thể:

1. Tạo Lệnh xuất rồi gen SO — phù hợp nhu cầu giao một hoặc nhiều lần.
2. Tạo SO trực tiếp — nhanh hơn khi không cần tầng lệnh tổng.
3. Upload Excel.
4. Nhận SO tích hợp từ SOM — theo blueprint PGI.

### 9.2 Cách A — Tạo Lệnh xuất thủ công

1. Vào **Xuất → Lệnh xuất hàng**.
2. Chọn **Tạo mới**.
3. Điền Header:
   - Chủ hàng.
   - Loại giao dịch.
   - Số đơn xuất nghiệp vụ.
   - Ngày xuất dự kiến.
   - Khách hàng.
   - Nhà vận chuyển.
   - Ghi chú.
   - Kho đến nếu là chuyển kho.
4. Thêm dòng Detail.
5. Điền SKU, đơn vị, số lượng; lô/ngày sản xuất/hạn dùng nếu cần chỉ rõ.
6. Lưu từng dòng.
7. Lưu lệnh và kiểm tra tổng.

### 9.3 Gen SO từ Lệnh xuất

Tại **Xuất → Lệnh xuất hàng**:

- Nếu giao toàn bộ một lần: chọn lệnh và dùng chức năng tạo toàn bộ thành một SO.
- Nếu tạo nhiều SO từ nhiều lệnh: chọn nhiều lệnh và dùng chức năng tạo hàng loạt.
- Nếu giao một phần: dùng **Generate SO**, nhập số lượng cần giao của từng SKU rồi lưu.

Ví dụ lệnh xuất 100 cái nhưng xe hôm nay giao 30 → SO hôm nay chỉ là 30. Phần 70 còn lại giữ ở lệnh để tạo đợt sau.

### 9.4 Cách B — Tạo SO trực tiếp

1. Vào **Xuất → Đơn hàng xuất/Shipment Order**.
2. Chọn **Tạo mới**.
3. Nhập Header bắt buộc: chủ hàng, loại giao dịch, số đơn hàng xuất.
4. Nhập ngày dự kiến, khách hàng, vận chuyển, ghi chú.
5. Nếu **Xuất chuyển kho**, bắt buộc chọn **Kho đến**. Hệ thống có thể tạo Header đơn nhập tại kho đến.
6. Thêm Detail: SKU, đơn vị, số lượng.
7. Lưu dòng và lưu đơn.
8. Tìm lại SO và kiểm tra trạng thái **NEW/THÊM MỚI**.

### 9.5 Cách C — Upload Excel

1. Vào đúng màn hình Lệnh xuất hoặc Đơn hàng xuất.
2. Tải template của chính màn hình đó.
3. Điền cột bắt buộc màu đỏ: chủ hàng, số đơn xuất, SKU, đơn vị, số lượng...
4. Đảm bảo Header giống hệt trên mọi dòng cùng đơn.
5. Upload.
6. Xem tổng số lỗi và dòng đỏ.
7. Di chuột/xem chi tiết để biết lỗi từng dòng.
8. Sửa hết lỗi rồi upload lại.
9. Xác nhận YES.
10. Tìm lại SO và đối chiếu.

### 9.6 Cách D — SO tích hợp từ SOM

1. SOM gửi SO xuống SWM qua API.
2. WMS tự động tạo Shipment Order.
3. Người dùng vào **Xuất → Đơn hàng xuất**.
4. Tìm mã SO.
5. Kiểm tra Header, SKU, số lượng, khách hàng, điểm giao, nhà vận chuyển, ngày xuất.
6. Nếu không thấy, kiểm tra đúng kho và cột trạng thái/thông báo đồng bộ trước khi tạo thủ công để tránh trùng.

### 9.7 Các cột số lượng trong SO

| Cột | Hiểu đơn giản |
|---|---|
| Nguồn gốc/Ordered | Số lượng khách yêu cầu |
| Mở/Open | Số lượng chưa được xử lý |
| Preallocated | Số lượng đã giữ mềm |
| Chỉ định/Allocated | Số lượng đã khóa vào tồn/pallet |
| Đã soạn/Picked | Số lượng đã lấy khỏi vị trí |
| Sort | Số lượng đã chia theo đơn |
| Packed | Số lượng đã đóng |
| Đã xuất/Shipped | Số lượng đã ra khỏi kho trên hệ thống |

### 9.8 Chốt kiểm soát SO

- [ ] Đúng kho và chủ hàng.
- [ ] Mã SO duy nhất.
- [ ] Đúng loại giao dịch.
- [ ] Kho đến được điền nếu chuyển kho.
- [ ] Đúng khách/điểm giao/nhà vận chuyển.
- [ ] SKU, đơn vị, số lượng đúng.
- [ ] SO ở trạng thái NEW.
- [ ] Tồn AVAILABLE/OK đủ hoặc đã biết rõ phần thiếu.

---

## 10. Bước 8 — Tạo Phiếu soạn tổng (tùy chọn)

### 10.1 Khi nào cần?

Dùng Master Pick/Phiếu soạn tổng khi muốn gom nhiều SO để một người đi lấy hàng một vòng, sau đó chia lại theo từng đơn. Nếu chỉ có một SO nhỏ, có thể soạn trực tiếp theo SO.

### 10.2 Tạo tại màn hình Phiếu soạn tổng

1. Vào **Xuất → Phiếu soạn tổng/Master Pick**.
2. Chọn **Tạo mới**.
3. Chọn chủ hàng.
4. Nhập **Mô tả/Desc** — trường bắt buộc.
5. Lưu; kiểm tra thông báo DONE.
6. Mở chi tiết Phiếu soạn.
7. Chọn **View All/Xem tất cả**.
8. Tích các SO cần gán.
9. Chọn chức năng gán vào phiếu.

Chỉ các SO ở trạng thái phù hợp như NEW, PART ALLOCATED hoặc ALLOCATED mới được chọn theo tài liệu.

### 10.3 Tạo từ màn hình Đơn hàng xuất

1. Vào **Xuất → Đơn hàng xuất**.
2. Lọc theo điểm giao/ngày dự kiến xuất/nhà vận chuyển nếu cần.
3. Chọn một hoặc nhiều SO.
4. Chọn:
   - **ASSIGN MP:** nhiều SO vào một phiếu theo chiến thuật gom.
   - **SINGLE MP:** mỗi SO tạo một phiếu riêng.
5. Kiểm tra pop-up tổng số đơn, số lượng, thùng, pallet, khối lượng.
6. Chọn **YES**.

### 10.4 In phiếu

Có thể in Master Pick, Picking List theo SO hoặc AWB tùy quy trình.

#### In Master Pick

1. Vào **Xuất → Phiếu soạn tổng/Master Pick**.
2. Tìm đúng phiếu.
3. Chọn biểu tượng **In/Print**.
4. Chọn mẫu **Master Pick**.
5. Xem trước tổng SKU, vị trí, pallet và số lượng.
6. In và bàn giao đúng người soạn.

#### In Picking List theo SO

1. Vào **Xuất → Đơn hàng xuất/Shipment Order**.
2. Tìm SO.
3. In từng SO bằng biểu tượng in trên dòng, hoặc chọn nhiều SO rồi in hàng loạt.
4. Chọn mẫu **Picking List**.
5. Blueprint nêu tối đa 20 SO cho một lần in.
6. Xem trước rồi in.
7. Nếu thực tế lấy ở vị trí khác Picking List, phải ghi chú và cập nhật dữ liệu chỉ định để hệ thống khớp thực tế.

#### In AWB

1. Vào **Xuất → Đơn hàng xuất/Shipment Order**.
2. Lọc theo sàn/nhà vận chuyển nếu cần; blueprint dùng trường Userdefine 10 cho tên sàn.
3. Chọn một hoặc nhiều SO.
4. Chọn **In → AWB**.
5. Đối chiếu mã SO, khách, nhà vận chuyển và mã AWB trước khi dán.
6. Không dán nhầm AWB giữa hai kiện/đơn.

---

## 11. Bước 9 — Preallocate hay Allocate?

Đây là phần người mới dễ rối nhất.

### 11.1 Khác nhau

| Nội dung | Preallocate | Allocate/Chỉ định |
|---|---|---|
| Bản chất | Giữ mềm theo thuộc tính/vị trí gợi ý | Khóa tồn cụ thể, thường đến Pallet ID |
| Khi soạn | Có thể dùng pallet khác nếu thỏa điều kiện lô/ngày/hạn theo logic | Bắt buộc lấy đúng pallet đã chỉ định |
| Soạn trên Web | Tài liệu key-user nói không áp dụng | Có thể soạn trên Web |
| Linh hoạt | Cao hơn | Kiểm soát chặt hơn |

Nếu chưa rõ kho của mình dùng chiến thuật nào, hỏi key-user trước khi thao tác. Với quy trình PGI blueprint, Allocate được dùng phổ biến và yêu cầu quét đúng vị trí/pallet.

### 11.2 Preallocate tự động

1. Vào **Xuất → Phiếu soạn tổng**.
2. Chọn phiếu có trạng thái preallocate NEW hoặc PART PREALLOCATED.
3. Chọn chức năng **Preallocate tự động**.
4. Tải lại và kiểm tra trạng thái.

Kết quả:

- **PREALLOCATED:** đủ hàng.
- **PART PREALLOCATED:** chỉ đủ một phần.
- **NEW:** không có tồn phù hợp hoặc tồn không ở trạng thái AVAILABLE.

### 11.3 Preallocate thủ công

1. Vào **Đơn hàng xuất**.
2. Mở chi tiết SO.
3. Chọn **Preallocate manual**.
4. Hệ thống hiển thị tồn theo từng dòng.
5. Chọn nguồn tồn.
6. Điều chỉnh số lượng nếu cần.
7. Xác nhận.

### 11.4 Allocate tự động

Có thể thực hiện ở danh sách SO, chi tiết SO hoặc Phiếu soạn tổng:

1. Chọn SO ở trạng thái NEW hoặc PART ALLOCATED.
2. Chọn **Allocate/Chỉ định**.
3. Hệ thống chạy FIFO/FEFO/chiến thuật đã cấu hình.
4. Kiểm tra kết quả từng dòng.

Kết quả:

- **ALLOCATED/CHỈ ĐỊNH:** đủ tồn và đã khóa đủ.
- **PART ALLOCATED/CHỈ ĐỊNH MỘT PHẦN:** chỉ khóa được một phần.
- **NEW:** không có tồn phù hợp hoặc hàng không ở trạng thái OK/AVAILABLE.

### 11.5 Allocate thủ công

1. Mở chi tiết SO ở trạng thái NEW/PART ALLOCATED.
2. Chọn **Allocate Manual/Chỉ định thủ công**.
3. Hệ thống hiển thị tồn AVAILABLE/OK.
4. Chọn đúng dòng tồn: vị trí, Pallet ID, lô, ngày nhập, hạn dùng.
5. Nhập `Qtyconfirm` nếu không lấy hết số lượng có sẵn.
6. Xác nhận.

Một giao diện chỉ cho chỉ định từng dòng; màn hình Allocate Manual có thể cho chọn nhiều dòng.

### 11.6 Hủy giữ/chỉ định

- Hủy Preallocate ở **Preallocate Detail** bằng chức năng Unpreallocate.
- Hủy Allocate ở danh sách SO, chi tiết SO hoặc chi tiết soạn bằng **Unallocate/Hủy chỉ định**.
- Chỉ hủy khi đơn còn ở trạng thái cho phép và chưa tạo ảnh hưởng downstream không thể đảo ngược.

### 11.7 Nếu chỉ định không đủ

Kiểm tra theo thứ tự:

1. Inventory List có đủ tổng tồn không?
2. Tồn có AVAILABLE/OK không?
3. Tồn có bị giữ cho đơn khác không?
4. Lô/hạn dùng có thỏa chiến thuật không?
5. Hàng có nằm ở khu/vị trí được phép lấy không?
6. Đơn vị quy đổi có làm số lượng yêu cầu lớn hơn tưởng tượng không?
7. Có cần châm hàng từ khu chẵn xuống khu lẻ không?

---

## 12. Bước 10 — Châm hàng nếu khu soạn không đủ

### 12.1 Châm hàng là gì?

Chuyển hàng từ tầng cao/khu pallet nguyên/khu chẵn xuống khu soạn lẻ để nhân viên lấy hàng thuận tiện.

### 12.2 Tạo lệnh châm theo SO

1. Sau khi tạo SO, vào **Tồn → Bổ sung/Replenishment**.
2. Chọn chủ hàng.
3. Chọn chiến thuật **Replenishment by SO**.
4. Hệ thống đề xuất số lượng cần châm theo các SO trạng thái NEW.
5. Kiểm tra nguồn và đích.
6. Tạo lệnh.
7. Xác nhận.

Tài liệu lưu ý hệ thống bỏ qua SO không còn NEW và hàng nguồn phải ở trạng thái OK.

### 12.3 Thực hiện bằng App

1. Mở **Châm hàng**.
2. Tìm task và bấm **Chấp nhận**.
3. Xem vị trí nguồn, khu vực và Pallet ID.
4. Quét đúng Pallet ID nguồn.
5. Quét Pallet ID đích và vị trí đích theo gợi ý.
6. Chọn **Dời/Move**.
7. Lặp lại đến khi task hoàn thành.
8. Xem lại ở tab **Đã hoàn thành**.

---

## 13. Bước 11 — Soạn hàng (Pick)

### 13.1 Mục tiêu

Đưa đúng SKU, đúng số lượng, đúng pallet/lô/serial từ vị trí lưu trữ ra khu đóng gói.

### 13.2 Soạn bằng App theo Phiếu soạn tổng/SO

1. Vào tab **Công việc**.
2. Mở danh sách tính năng → **Soạn hàng** hoặc **Soạn hàng Master Pick/SO**.
3. Ở tab Tất cả, chọn task và bấm **Chấp nhận**.
4. Task chuyển sang **Của tôi/Đang thực hiện**.
5. Đi tới khu vực/vị trí được gợi ý.
6. Quét vị trí nếu luồng yêu cầu.
7. Quét UPC/SKU để xác nhận đúng hàng.
8. Quét Pallet ID.
9. Nhập/xác nhận số lượng không vượt số lượng được preallocate/allocate.
10. Với hàng serial, quét từng serial hoặc QR chuỗi serial.
11. Kiểm tra thông tin.
12. Bấm **Soạn hàng**.
13. Lặp lại cho đến hết task.

### 13.3 Quy tắc quét theo cách giữ tồn

- **Preallocate:** có thể lấy pallet khác vị trí gợi ý nếu pallet đáp ứng điều kiện lô/ngày sản xuất/hạn dùng theo logic hệ thống. App vẫn kiểm tra trước khi xác nhận.
- **Allocate:** bắt buộc quét đúng Pallet ID đã chỉ định. Quét pallet khác sẽ bị chặn.
- Theo blueprint PGI, luồng Master Pick yêu cầu quét đúng cả vị trí và pallet đã chỉ định.

### 13.4 Soạn SO kiểu Pick & Pack Serial

1. Chọn tính năng **Soạn hàng SO**.
2. Chọn SO ALLOCATED/PART ALLOCATED hoặc quét AWB.
3. Chấp nhận task.
4. Quét Carton ID dùng chứa hàng.
5. Quét vị trí.
6. Quét Pallet ID.
7. Quét SKU.
8. Hàng thường: nhập số lượng.
9. Hàng serial: quét serial; số serial là số lượng xác nhận.
10. Xác nhận.

Nếu serial đã được quét và đóng trong bước Pick & Pack này, tài liệu blueprint nói không cần scan serial xuất lại.

### 13.5 Soạn bằng Web

Chỉ dùng cho hàng đã **Allocate**, không dùng cho Preallocate theo hướng dẫn key-user.

1. Vào **Xuất → Đơn hàng xuất**.
2. Chọn SO ALLOCATED/PART ALLOCATED.
3. Chọn **Pick/Soạn hàng**.
4. Hoặc mở chi tiết và Pick từng dòng.
5. Kiểm tra trạng thái mới.

Nếu PART ALLOCATED, hệ thống chỉ pick số đã Allocate.

**Rủi ro:** Web chỉ đổi trạng thái, không thay thế việc kiểm chứng vật lý. Người vận hành phải lấy đúng vị trí/pallet trên Picking List. Nếu lấy khác, phải ghi nhận và chỉnh dữ liệu chỉ định đúng thực tế.

### 13.6 Trạng thái sau soạn

- **PICKED/ĐÃ SOẠN:** đã soạn đủ.
- **PART PICK/ĐANG SOẠN hoặc SOẠN MỘT PHẦN:** mới soạn một phần.

### 13.7 Hủy soạn

Có thể dùng **Unpick/Hủy soạn** tại danh sách SO, chi tiết SO hoặc Chi tiết soạn hàng khi trạng thái cho phép. Chỉ hủy sau khi hàng vật lý được xử lý đồng bộ, tránh hệ thống trả tồn nhưng hàng vẫn nằm ở khu đóng gói.

### 13.8 Chốt kiểm soát soạn

- [ ] Đúng SO/Master Pick.
- [ ] Đúng vị trí.
- [ ] Đúng Pallet ID theo quy tắc.
- [ ] Đúng SKU/UPC.
- [ ] Đúng số lượng.
- [ ] Đúng lô/hạn dùng.
- [ ] Serial đúng và không trùng.
- [ ] Hàng vật lý được đưa tới đúng khu đóng/chia.

---

## 14. Bước 12 — Chia hàng theo từng SO nếu đã gom Master Pick

Nếu nhiều SO được gom vào một Master Pick, sau khi soạn tổng có thể phải chia lại:

1. Mở App → **Chia hàng**.
2. Chọn task và bấm **Chấp nhận**.
3. Mở chi tiết.
4. Kiểm tra SO/điểm giao/SKU.
5. Xác nhận số lượng chia cho từng đơn.
6. Bấm **Xác nhận**.
7. Kiểm tra tab Chưa chia/Đã chia.

Nguyên tắc: tổng số lượng chia ra phải bằng số lượng đã soạn tổng; không để hàng thừa không xác định thuộc SO nào.

---

## 15. Bước 13 — Đóng hàng và quản lý Carton ID

### 15.1 Đóng hàng bằng App

1. Mở **Đóng hàng**.
2. Chọn task của SO và bấm **Chấp nhận**.
3. Kiểm tra SKU và số lượng đã soạn.
4. Nhập/xác nhận số lượng đóng.
5. Quét Carton ID/thùng chứa.
6. Với hàng serial, quét serial nếu chưa quét ở Pick & Pack.
7. Xác nhận.
8. Kiểm tra tab Chưa đóng/Đã đóng.

### 15.2 Scan serial xuất/đóng theo blueprint PGI

1. Mở **Scan Serial xuất**.
2. Quét/nhập SO.
3. Quét Carton ID; có thể gán nhiều đơn vào một carton nếu quy trình cho phép.
4. Quét/chọn SKU.
5. Hàng thường: nhập số lượng không vượt gợi ý.
6. Hàng serial: quét từng serial hoặc QR chuỗi serial.
7. Số serial phải bằng số lượng gợi ý theo yêu cầu của luồng này.
8. Xử lý serial đỏ.
9. Xác nhận hoàn tất.

Serial có thể bị lỗi nếu:

- Trạng thái serial không phù hợp với hàng trong chi tiết soạn.
- Serial không thuộc SKU đã chọn.
- Ngày nhận hàng của serial khác dữ liệu dòng hàng được chọn.

### 15.3 Hủy đóng

Dùng **Unpack/Hủy đóng** tại danh sách SO hoặc chi tiết SO khi đơn ở trạng thái PACKED/IN PACKING và quy trình cho phép. Phải tháo/điều chỉnh hàng vật lý và Carton ID tương ứng, không chỉ đổi trạng thái trên hệ thống.

### 15.4 Kết quả đúng

- **PACKED:** toàn bộ lượng cần xử lý đã đóng.
- **IN PACKING:** đang đóng dở.
- Carton ID trên WMS khớp thùng vật lý.
- Serial gắn đúng SO và carton.

---

## 16. Bước 14 — Xuất hàng (Ship)

### 16.1 Trước khi xuất: checklist bắt buộc

- [ ] Xe/đơn vị vận chuyển đúng.
- [ ] SO/AWB đúng.
- [ ] Hàng đã Picked/Packed theo chính sách kho.
- [ ] Carton ID đúng.
- [ ] Số kiện và số lượng đúng.
- [ ] Serial hoàn tất.
- [ ] Không còn lỗi đỏ.
- [ ] Chứng từ giao hàng/phiếu xuất sẵn sàng.

### 16.2 Xuất bằng Web

1. Vào **Xuất → Đơn hàng xuất**.
2. Tìm SO.
3. Chọn SO có trạng thái đủ điều kiện, khác NEW và SHIPPED theo hướng dẫn key-user; trong vận hành PGI B2C, blueprint yêu cầu PACKED.
4. Chọn **Xuất hàng/Ship**.
5. Xác nhận.
6. Hoặc mở chi tiết SO, chọn các dòng hợp lệ và bấm Ship.
7. Tải lại để kiểm tra trạng thái.

Lưu ý: tài liệu key-user mô tả điều kiện rộng, còn blueprint PGI có luồng chặt yêu cầu Packed. Khi vận hành thật, luôn theo cấu hình/chuẩn SOP của kho; không cố bỏ qua Pick/Pack chỉ vì nút Web cho phép.

### 16.3 Xuất bằng App theo hướng dẫn key-user

1. Vào tab **Công việc** → **Xuất hàng**.
2. Danh sách hiển thị các phiếu ở trạng thái phù hợp như Đã soạn/Đã chia/Đã đóng.
3. Tìm bằng mã Phiếu soạn tổng hoặc điểm giao.
4. Chọn phiếu và bấm **Chấp nhận**.
5. Quét UPC/SKU cần xuất.
6. Kiểm tra số lượng.
7. Nhấn **Xuất hàng/Xác nhận**.
8. Xem lại ở chi tiết công việc: Tất cả/Mới/Đã xuất.

### 16.4 Xuất B2C theo blueprint PGI

1. Mở App.
2. Vào tab **Khác → Xuất hàng B2C**.
3. Chọn đơn vị vận chuyển.
4. Quét SO hoặc AWB.
5. Hệ thống kiểm tra đơn ở trạng thái PACKED.
6. Hệ thống kiểm tra AWB thuộc đúng nhà vận chuyển.
7. Xóa mã quét sai nếu cần.
8. Xác nhận xuất.
9. Trên Web, vào Shipment Order để in phiếu xuất kho nếu cần.

Nếu SO chưa PACKED, App có thể báo “Đơn hàng không hợp lệ”. Nếu AWB không thuộc nhà vận chuyển đã chọn, hệ thống báo sai nhà vận chuyển.

### 16.5 Xuất một phần

Nếu chỉ xuất được một phần:

- Trạng thái có thể là **PART SHIP/XUẤT MỘT PHẦN**.
- Không được tự giả định phần còn lại đã xuất.
- Hướng dẫn key-user có chức năng tách phần NEW hoặc phần SHIPPED thành đơn riêng, tên đơn tách dạng `Tên đơn gốc-SP001`.
- Chỉ dùng tách đơn theo quy định kho và sau khi đối chiếu số lượng từng trạng thái.

### 16.6 Chuyển kho

Khi SO loại chuyển kho được xuất thành công:

- Chi tiết có thể tự động bổ sung vào đơn nhập tương ứng ở kho đến.
- Kho đến tiếp tục quy trình nhận ASN và cất hàng.
- Phải kiểm tra kho đến đúng ngay từ Header SO.

### 16.7 Kết quả đúng

- SO chuyển **SHIPPED/ĐÃ XUẤT** nếu xuất đủ.
- Cột Shipped bằng Ordered đối với đơn xuất đủ.
- Tồn kho giảm đúng SKU/lô/pallet/serial.
- Carton/serial có trạng thái xuất phù hợp.
- Kết quả thực xuất được gửi về SOM nếu có tích hợp.

---

## 17. Bước 15 — Đối soát sau xuất

Đây là bước bắt buộc, không phải “làm xong rồi thôi”.

### 17.1 Kiểm tra SO

1. Mở SO.
2. Kiểm tra trạng thái SHIPPED hoặc PART SHIP.
3. So sánh Ordered, Allocated, Picked, Packed, Shipped.
4. Với đơn đủ, các số lượng cuối luồng phải khớp theo nghiệp vụ.

### 17.2 Kiểm tra tồn

1. Vào **Tồn → Inventory List**.
2. Tìm SKU/Pallet ID.
3. Xác nhận số lượng giảm đúng.
4. Kiểm tra không còn tồn bị Allocate vô lý cho SO đã Shipped.

### 17.3 Kiểm tra serial

1. Vào **IMEI Tracking**.
2. Tìm theo SO/serial.
3. Kiểm tra serial đã gắn đúng SO và trạng thái xuất.
4. Đối chiếu danh sách serial vật lý/chứng từ nếu có.

### 17.4 Kiểm tra đồng bộ SOM

Tại Shipment Order, kiểm tra:

- Sync Status.
- Sync Date.
- Sync Message.

Nếu lỗi, ghi lại mã SO, thời điểm, thông báo lỗi và ảnh màn hình để gửi hỗ trợ. Không tạo lại SO chỉ vì đồng bộ chưa thành công; việc đó dễ tạo đơn trùng.

### 17.5 Báo cáo

Dùng Báo cáo xuất hàng/Outbound Report để đối chiếu:

- Mã SO.
- SKU.
- Số lượng dự kiến.
- Số lượng thực xuất.
- Thời gian xuất.
- Khách hàng/điểm giao/nhà vận chuyển.

---

# PHẦN III — TRẠNG THÁI, LỖI VÀ CÁCH TỰ KIỂM TRA

## 18. “Đường đi” trạng thái chuẩn

### 18.1 Nhập hàng

PO:

`NEW → PART RECEIVED → RECEIVED`

ASN:

`NEW → PART RECEIVED/RECEIVING → RECEIVED`

Sau đó pallet:

`STAGE → vị trí lưu trữ`

### 18.2 Xuất hàng

Luồng Allocate:

`NEW → PART ALLOCATED/ALLOCATED → PART PICK/PICKED → IN PACKING/PACKED → PART SHIP/SHIPPED`

Luồng Preallocate:

`NEW → PART PREALLOCATED/PREALLOCATED → PICKED → PACKED → SHIPPED`

Tên trạng thái có thể hiển thị Việt/Anh khác nhau nhưng ý nghĩa không đổi.

## 19. Ma trận “đang ở trạng thái này thì làm gì tiếp?”

| Trạng thái thấy trên màn hình | Nghĩa | Việc tiếp theo |
|---|---|---|
| PO NEW | PO mới | Gen ASN |
| PO PART RECEIVED | PO nhận chưa đủ | Tạo ASN/nhận phần còn lại |
| ASN NEW | Đơn nhập chưa nhận | Chuẩn bị pallet/serial rồi Receive |
| ASN RECEIVED | Đã nhận đủ | Kiểm tra tồn và Putaway |
| Pallet ở STAGE | Đã nhận nhưng chưa cất | Cất hàng |
| SO NEW | Đơn xuất chưa giữ tồn | Preallocate hoặc Allocate |
| PART ALLOCATED | Chỉ có một phần hàng được khóa | Xử lý thiếu tồn/châm hoặc pick phần đã khóa theo quy định |
| ALLOCATED | Đã khóa đủ tồn | Pick |
| PREALLOCATED | Đã giữ mềm đủ | Pick bằng App |
| PART PICK | Soạn một phần | Soạn phần còn lại hoặc xử lý thiếu |
| PICKED | Soạn đủ | Chia/Pack |
| IN PACKING | Đóng dở | Đóng phần còn lại |
| PACKED | Đóng đủ | Ship |
| PART SHIP | Xuất một phần | Xử lý/tách phần còn lại theo quy trình |
| SHIPPED | Xuất đủ | Đối soát và kiểm tra sync |

## 20. 15 lỗi người mới hay mắc nhất

1. **Chọn sai kho.** Dấu hiệu: không thấy đơn/tồn hoặc scan không hợp lệ. Cách sửa: kiểm tra kho trên cả Web và App.
2. **Nhầm PO với ASN.** PO là tổng, ASN là lần nhận. Không nhận hàng trực tiếp theo tư duy “PO là chuyến xe”.
3. **Nhầm PO với SO.** PO dùng nhập; SO dùng xuất.
4. **Sai đơn vị.** 10 thùng có thể là 200 cái, không phải 10 cái.
5. **Header Excel không đồng nhất.** Các dòng cùng đơn phải có cùng thông tin Header.
6. **Dùng nhầm template.** Template PO, ASN, Lệnh xuất và SO không thay cho nhau.
7. **Nhận toàn bộ trên Web khi hàng chỉ về một phần.** Phải mở chi tiết và nhập số thực nhận.
8. **Để trống số lượng khi định nhận một phần.** Hệ thống có thể hiểu là nhận hết.
9. **Dán nhầm Pallet ID.** Quét thử và đối chiếu trước khi nhận.
10. **Nhận xong không cất.** Hàng vẫn ở STAGE.
11. **Tồn đủ nhưng Allocate không được.** Tồn có thể không AVAILABLE/OK hoặc đã bị giữ.
12. **Allocate rồi quét pallet khác.** Hệ thống chặn vì Allocate khóa pallet cụ thể.
13. **Quét serial thiếu/thừa/trùng.** Số serial phải khớp số lượng và đúng SKU.
14. **Đổi trạng thái trên Web nhưng hàng vật lý chưa di chuyển.** Dẫn đến lệch hệ thống–thực tế.
15. **Sync lỗi rồi tạo lại đơn.** Có thể tạo trùng; phải kiểm tra Sync Message trước.

## 21. Cách báo lỗi cho key-user/IT để được xử lý nhanh

Gửi đủ 8 thông tin:

1. Môi trường/kho.
2. Tài khoản thao tác.
3. Mã PO/ASN/SO.
4. SKU/Pallet ID/serial liên quan.
5. Màn hình và bước đang làm.
6. Trạng thái trước khi lỗi.
7. Nội dung thông báo lỗi nguyên văn và ảnh màn hình.
8. Thời điểm xảy ra lỗi.

Mẫu:

> Kho: WH-HCM. Mã ASN: 000123. SKU: SP-A. Pallet: PLT2600000123. Lỗi lúc 10:15 ngày 13/07/2026 tại App → Nhập hàng, sau khi quét serial. Thông báo: “...”. Số lượng ASN 20, serial hợp lệ 19. Đã kiểm tra đúng kho và đúng SKU.

---

# PHẦN IV — BÀI THỰC HÀNH HOÀN CHỈNH

## 22. Bài tập: nhập 120 cái rồi xuất 30 cái

### 22.1 Tạo PO

1. Vào Nhập → PO.
2. Tạo `PO-DEMO-001`.
3. Chọn chủ hàng và loại giao dịch.
4. Thêm SKU `SP-A`, đơn vị Cái, số lượng 150.
5. Lưu.
6. Kiểm tra PO NEW, đã nhận 0.

### 22.2 Gen ASN cho lần giao đầu

1. Chọn `PO-DEMO-001`.
2. Generate ASN.
3. Nhập 120 cái.
4. Lưu và ghi mã ASN.
5. Kiểm tra PO còn 30 chưa giao.

### 22.3 Chia pallet

1. Mở chi tiết ASN.
2. Dùng Chia pallet với quy cách 100.
3. Kiểm tra hai dòng: 100 và 20.
4. Tạo hai Pallet ID.
5. In và dán đúng hai nhãn.

### 22.4 Nhận

1. App → Nhập hàng → tìm ASN.
2. Chấp nhận task.
3. Pallet 1: quét Pallet ID, SKU, nhập 100, xác nhận.
4. Pallet 2: quét Pallet ID, SKU, nhập 20, xác nhận.
5. Kiểm tra ASN RECEIVED.
6. Kiểm tra PO PART RECEIVED với 120/150.

### 22.5 Cất

1. App → Cất hàng.
2. Cất pallet 100 vào vị trí A-01-01.
3. Cất pallet 20 vào vị trí A-01-02.
4. Inventory List phải cho thấy tổng 120 cái ở hai pallet/vị trí.

### 22.6 Tạo SO xuất 30

1. Xuất → Đơn hàng xuất.
2. Tạo `SO-DEMO-001`.
3. Thêm SKU `SP-A`, 30 cái.
4. Lưu, kiểm tra NEW.

### 22.7 Allocate

1. Chọn SO.
2. Bấm Allocate.
3. Hệ thống có thể chọn pallet 100 hoặc 20 + 10 tùy chiến thuật và cấu hình.
4. Mở chi tiết để biết chính xác Pallet ID/vị trí được chỉ định.
5. Kiểm tra tổng Allocated = 30.

### 22.8 Pick

1. App → Soạn hàng.
2. Chấp nhận SO.
3. Đi đúng vị trí.
4. Quét đúng Pallet ID được chỉ định.
5. Quét SKU.
6. Xác nhận 30 theo hướng dẫn trên task.
7. Kiểm tra SO PICKED.

### 22.9 Pack

1. App → Đóng hàng.
2. Chấp nhận task.
3. Quét Carton ID.
4. Xác nhận 30 cái.
5. Kiểm tra SO PACKED.

### 22.10 Ship

1. App/Web → Xuất hàng.
2. Quét/chọn đúng SO/AWB.
3. Kiểm tra vận chuyển và số kiện.
4. Xác nhận xuất.
5. Kiểm tra SO SHIPPED.
6. Inventory List còn tổng 90 cái.
7. Kiểm tra Sync Status nếu có SOM.

Nếu cả chuỗi trên ra đúng, bạn đã thực hành trọn một vòng WMS.

---

# PHẦN V — CHECKLIST IN RA DÙNG TẠI KHO

## 23. Checklist nhập hàng một trang

- [ ] Chọn đúng kho.
- [ ] PO tồn tại và đúng tổng.
- [ ] ASN đúng lần giao.
- [ ] SKU/đơn vị/lô/hạn dùng đúng.
- [ ] Chia pallet, tổng sau chia không đổi.
- [ ] Tạo/in/dán đúng Pallet ID.
- [ ] Serial chuẩn bị đủ nếu nhận bằng Web.
- [ ] Kiểm đếm vật lý.
- [ ] Nhận đúng số thực tế.
- [ ] ASN RECEIVED hoặc PART RECEIVED đúng thực tế.
- [ ] Tồn tăng đúng tại STAGE.
- [ ] Cất đúng vị trí.
- [ ] Inventory List khớp vật lý.
- [ ] Serial đúng trạng thái.
- [ ] Goods Receipt sync SOM thành công.

## 24. Checklist xuất hàng một trang

- [ ] Chọn đúng kho.
- [ ] SO đúng khách/điểm giao/vận chuyển.
- [ ] SKU/đơn vị/số lượng đúng.
- [ ] Tồn AVAILABLE/OK đủ.
- [ ] Preallocate/Allocate đúng chiến thuật.
- [ ] Châm hàng nếu cần.
- [ ] In phiếu/AWB nếu dùng.
- [ ] Pick đúng vị trí/Pallet ID/SKU/số lượng.
- [ ] Serial đúng.
- [ ] Chia đúng SO nếu Master Pick.
- [ ] Pack đúng Carton ID.
- [ ] SO đạt trạng thái đủ điều kiện Ship.
- [ ] Ship đúng SO/AWB/nhà vận chuyển.
- [ ] SO SHIPPED hoặc PART SHIP đúng thực tế.
- [ ] Tồn giảm đúng.
- [ ] Kết quả thực xuất sync SOM thành công.

---

## 25. Quy tắc vận hành cuối cùng

1. **Hệ thống và hàng vật lý phải đi cùng nhau.** Đừng bấm trước rồi làm sau nếu SOP không cho phép.
2. **Không đoán khi gặp cảnh báo.** Đọc thông báo, kiểm tra trạng thái và dữ liệu.
3. **Không tạo chứng từ trùng để chữa lỗi đồng bộ.**
4. **Không dùng chung Pallet ID cho hai pallet.**
5. **Không cho serial thiếu, thừa hoặc trùng đi qua bước xác nhận.**
6. **Không bỏ bước đối soát sau Receive, Putaway và Ship.**
7. **Khi phải hủy/đảo trạng thái, xử lý cả hệ thống lẫn hàng vật lý.**

---

## 26. Nguồn và giới hạn của tài liệu này

Tài liệu được tổng hợp và diễn giải lại từ:

1. `20122023_SWM_TOBE BLUEPRINT _PGI_VERSION 3.0.md`.
2. `[WMS]_[TEMPLATE]_HƯỚNG DẪN SỬ DỤNG KEY-USER.md`.

Blueprint PGI mô tả một số luồng tích hợp SOM và quy tắc đặc thù PGI/B2C/B2B; tài liệu key-user mô tả chức năng tổng quát hơn. Khi hai tài liệu thể hiện điều kiện khác nhau, hướng dẫn này nêu rõ khác biệt và ưu tiên nguyên tắc an toàn: làm đủ Allocate/Pick/Pack trước Ship, đồng thời tuân theo cấu hình và SOP đã duyệt của kho thực tế.

Các biểu tượng nút trong tài liệu nguồn là hình ảnh, vì vậy bản hướng dẫn dùng tên chức năng thay cho hình nút. Người dùng cần đối chiếu tên/tooltip trên phiên bản WMS đang chạy.
