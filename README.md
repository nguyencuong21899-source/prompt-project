# Prompt CNC

Extension Chrome/Edge cho nhân viên tìm, sao chép và chèn prompt. Mọi người xem cùng một thư viện mà không cần đăng nhập. Ai được chia sẻ mật khẩu quản lý có thể thêm, sửa và xóa prompt trong Cài đặt.

## Trạng thái

Bản **0.8.2** có tab **Liên kết**, chia thành các mục **Phần mềm AI / Phần mềm công ty** và danh mục khác, để mở công cụ công ty hoặc trang AI trong tab mới. Vào **Cài đặt → nhập mật khẩu → Quản lý liên kết** để thêm tên, đường dẫn HTTP/HTTPS, nhóm và mô tả. Danh sách lưu tại `data/links.json`; bước xuất bản sẽ đưa vào thư viện chung. Có sẵn sáu liên kết AI, quản trị có thể sửa hoặc xóa.

Nút **Lưu dấu trang** xin quyền `bookmarks` khi người dùng bấm lần đầu. Từ bản **0.8.2**, liên kết được đặt trực tiếp ở đầu **thanh dấu trang Chrome**. Nếu liên kết đã nằm trong thư mục, bấm lưu sẽ chuyển bookmark đó lên thanh; nếu đã ở trên thanh thì bỏ qua để tránh trùng. **Lưu tất cả dấu trang** áp dụng cho các liên kết đang hiển thị sau tìm kiếm/lọc. Extension đọc cây dấu trang để kiểm tra trùng ngay trên máy, không gửi dấu trang lên máy chủ. Bookmark đã lưu là bản riêng: sửa/xóa liên kết chung không tự sửa/xóa bookmark. Liên kết mới chỉ mở trang; việc đăng nhập các phần mềm vẫn theo yêu cầu của phần mềm đó.

Bản **0.7.0** có nút **Mở trong tab**, thư viện **Công ty / Của tôi**, và sắp xếp theo **Gần đây / Dùng nhiều / Tên A–Z**. Prompt cá nhân và lịch sử sử dụng lưu trong `chrome.storage.local`, không tạo commit hoặc gửi lên API. Trong tab riêng, chọn tab AI ở mục **Chèn vào** trước khi sử dụng. Quyền `tabs` dùng để liệt kê tên các tab AI và chọn nơi chèn; nội dung tab không được gửi lên máy chủ.

Bản **0.6.1** thu gọn các công cụ phía trên để dành thêm chỗ cho prompt, tăng cỡ chữ trên thẻ và thêm **Xem trước**. Hộp xem trước hiển thị đầy đủ nội dung, cho phép sao chép/chèn vào chat và đóng bằng Esc.

Bản **0.6.0** dùng tên và biểu tượng mới Prompt CNC. Thư viện và màn hình quản lý chỉ hiển thị Danh mục; bộ lọc Phòng ban đã được ẩn. Dữ liệu cũ vẫn giữ `departmentId` bên trong để tránh sửa hàng loạt prompt hiện có. Các thông báo trong extension dùng từ “máy chủ”. Yêu thích, bộ lọc và bản nháp AI được giữ trên thiết bị. Khi vừa lưu prompt hoặc danh mục, extension hiển thị **Đã lưu · chờ xuất bản thư viện** và giữ nội dung mới cho đến khi catalog được xuất bản. Đổi giao diện/code cần nạp lại extension; đổi dữ liệu chỉ cần đồng bộ.

Thư viện mở trong bảng bên cạnh trang web. Có tìm kiếm tiếng Việt không dấu, lọc danh mục, sao chép và chèn prompt ngay từ thẻ danh sách. Bảng tự kiểm tra dữ liệu mới mỗi phút khi đang mở và khi được mở lại sau một lúc; nút **Làm mới** vẫn cho phép kiểm tra ngay. Nút **Tối ưu prompt bằng AI** cho phép nhân viên nhập prompt riêng, nhận bản viết lại từ Google Gemini rồi sửa tiếp, sao chép hoặc chèn vào chat. Bản nháp này không được lưu trên GitHub. Biểu tượng bánh răng mở Cài đặt; mật khẩu quản lý cho phép thêm, sửa và xóa prompt cùng Danh mục. Mỗi thay đổi vẫn được commit lên GitHub để truy nguyên và hoàn tác.

Dịch vụ API thử nghiệm đang chạy tại `https://prompt-hub-api-yktt.onrender.com` và `/health` đã trả `configured: true`. `GITHUB_TOKEN` và `ADMIN_PASSWORD` được lưu trong Environment của Render. Mật khẩu và quyền ghi GitHub phải nằm ở API, không được đưa vào extension. Xem [hướng dẫn cài đặt](docs/SETUP.md) để vận hành hoặc thay token.

Chức năng tối ưu cần thêm `GEMINI_API_KEY` trong Environment của Render. Gemini chỉ nhận nội dung người dùng chủ động gửi khi bấm tối ưu. Khóa nằm trên API; endpoint có giới hạn lượt gọi và chỉ nhận Origin của extension. Vì nhân viên không đăng nhập, quản trị viên nên đặt hạn mức sử dụng trong Google AI Studio trước khi dùng rộng rãi.

## Chạy thử

1. Dùng Node.js 20+, chạy `npm run check`.
2. Mở `chrome://extensions` hoặc `edge://extensions`, bật Developer mode và Load unpacked thư mục gốc `D:\prompt-project`. Có thể chọn riêng `D:\prompt-project\extension` nếu chỉ muốn nạp các file của extension.
3. Bấm biểu tượng Prompt CNC để mở bảng bên cạnh trang web. Có thể giữ bảng mở trong lúc dùng Gemini, ChatGPT và các trang AI khác.
4. Để quản lý, mở ⚙ và nhập mật khẩu quản lý đã đặt trên Render. Bấm **Quản lý danh mục** để thêm, đổi tên hoặc xóa mục. URL API đã có trong extension; nhân viên không phải cấu hình.
5. Để tối ưu prompt, bấm **✨ Tối ưu prompt bằng AI** trong thư viện, dán hoặc gõ prompt rồi bấm **Tối ưu bằng AI**. Có thể sửa bản kết quả trước khi sao chép hoặc chèn.

## Luồng dữ liệu

`extension` → đọc `data/catalog.json` trên GitHub. Người có mật khẩu: Cài đặt → API → commit thay đổi trong `data/prompts/*.json` hoặc `data/categories.json` → GitHub Actions tạo catalog mới → tất cả extension đồng bộ. File `data/departments.json` được giữ để tương thích dữ liệu cũ nhưng không còn nút quản lý trong extension.

Code và prompt đã duyệt đều có commit để truy nguyên và hoàn tác. Dữ liệu prompt hiện được đọc từ repository công khai; **không đưa thông tin mật hoặc dữ liệu khách hàng vào prompt** khi chưa chọn mô hình truy cập nội bộ phù hợp.

## Các thư mục

- `extension/`: side panel Manifest V3, không cần bước build.
- `server/`: API Node.js kiểm tra mật khẩu và ghi commit lên GitHub.
- `render.yaml`: cấu hình tạo dịch vụ API thử nghiệm trên Render.
- `data/prompts/`: mỗi prompt một file JSON; `data/catalog.json` là bản extension tải.
- `scripts/`: kiểm tra và tạo catalog.
- `.github/workflows/`: kiểm tra PR và cập nhật catalog.
- `docs/`: triển khai và vận hành.

## Ghi chú về phát hành

Thư mục extension có thể load unpacked để thử nghiệm. Để nhân viên được cập nhật tự động, cần phát hành qua Chrome Web Store/Edge Add-ons hoặc chính sách trình duyệt doanh nghiệp và tăng version mỗi lần phát hành.
