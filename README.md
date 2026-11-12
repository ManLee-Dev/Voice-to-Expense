# NóiLà Ghi

### Ghi lại chi tiêu bằng một câu nói.

NóiLà Ghi là ứng dụng web thu chi nhỏ gọn, ưu tiên thao tác nhanh trên điện thoại. Bạn có thể đọc hoặc nhập câu tự nhiên như **“Sáng nay ăn phở 45k, uống cà phê 30k”**; ứng dụng tách thành giao dịch để xem lại trước khi lưu.

## Tính năng

- Nhận diện câu tiếng Việt bằng giọng nói trên trình duyệt hỗ trợ Web Speech API; luôn có thể nhập nội dung bằng bàn phím.
- Tách nhiều khoản thu/chi trong cùng một câu, nhận diện số tiền và gợi ý danh mục.
- Xem tổng chi hôm nay, tổng thu/chi trong tháng và biểu đồ theo tuần hoặc tháng.
- Tìm kiếm, lọc giao dịch theo loại, xóa dữ liệu và xuất báo cáo CSV.
- Giao diện sáng/tối, bố cục tương thích với màn hình điện thoại và máy tính.
- Lưu giao dịch trong `localStorage` của trình duyệt; không cần tài khoản hay máy chủ ứng dụng.

## Chạy ứng dụng

Ứng dụng không cần cài thư viện hay bước build. Vì JavaScript được chia thành ES modules, hãy mở bằng máy chủ local thay vì mở trực tiếp tệp HTML:

1. Mở terminal tại thư mục dự án.
2. Chạy `python -m http.server 8000`.
3. Truy cập <http://localhost:8000>.

Hoặc dùng tiện ích **Live Server** trong VS Code và mở [`index.html`](./index.html).

## Sử dụng

1. Chạm vào nút micro và đọc một câu có tên khoản chi cùng số tiền, hoặc nhập câu vào ô văn bản.
2. Kiểm tra các khoản được nhận diện; chỉnh danh mục hoặc bỏ khoản không đúng.
3. Chỉnh danh mục nếu cần, sau đó chọn **Lưu** để ghi giao dịch hoặc **Hủy** để bỏ. Phần xác nhận sẽ chờ bạn và không tự lưu theo thời gian.
4. Tìm kiếm/lọc giao dịch gần đây hoặc dùng **Xuất báo cáo** để tải dữ liệu CSV.

Ví dụ câu nói:

- `Ăn trưa 55 nghìn, đổ xăng 80k`
- `Hôm qua mua áo 1 triệu rưỡi`
- `Nhận lương 15 triệu`

## Quyền riêng tư và tương thích

Giao dịch được lưu trên thiết bị hiện tại trong bộ nhớ của trình duyệt. Xóa dữ liệu trình duyệt có thể xóa các giao dịch này. Tính năng nhận giọng nói phụ thuộc trình duyệt và có thể cần kết nối mạng hoặc quyền micro; cách nhập bằng bàn phím không phụ thuộc tính năng này. Ứng dụng không gửi giao dịch tới backend.

## Cấu trúc dự án

```text
index.html          Khung giao diện và các vùng hiển thị
styles.css          Bảng màu, bố cục và giao diện responsive
src/
  app.js            Sự kiện giao diện, lưu giao dịch và ghi âm
  dashboard.js      Tổng quan, danh sách và biểu đồ
  parser.js         Phân tích câu tiếng Việt và danh mục
  storage.js        Tiện ích ngày tháng và localStorage
README.md           Hướng dẫn dự án
```
