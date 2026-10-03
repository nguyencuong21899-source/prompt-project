# Changelog

## 0.8.7 — 2026-10-03

- Thu gọn Liên kết: đưa chọn loại phần mềm lên trước, sắp xếp cùng hàng với yêu thích/làm mới; ẩn bộ lọc nhóm trùng khi chỉ có hai nhóm mặc định.
- Giảm khoảng cách và chiều cao thẻ liên kết, giữ mô tả và các nút thao tác.
- Gom lịch sử nhánh main thành một commit; bản sao lịch sử cũ được giữ trong file bundle trên máy.

## 0.8.6 — 2026-10-03

- Chuyển thông báo thao tác vào chân bảng, không che danh sách prompt.
- Thêm Xuất file / Nhập file trong Của tôi: sao lưu JSON trên máy, giữ nguyên dữ liệu hiện có và bỏ qua bản trùng. File được kiểm tra đầy đủ trước một lần lưu; tối đa 5 MB và 500 prompt mỗi file.

## 0.8.5 — 2026-10-02

- Bỏ khung thông báo chờ đồng bộ trong thư viện để dành chỗ cho prompt; trạng thái vẫn hiển thị ở chân bảng.

## 0.8.4 — 2026-10-02

- Tách Prompt / Liên kết thành hai mục chính. Công ty / Của tôi nằm trong Prompt, giữ lựa chọn khi chuyển giữa hai mục.
- Nút Tối ưu prompt có biểu tượng và chữ, đặt bên trái Yêu thích và Làm mới; thanh công cụ xuống hàng ở bảng hẹp để không tràn ngang.

## 0.8.3 — 2026-10-02

- Thêm hai nút Phần mềm công ty / Phần mềm AI để đổi danh sách trực tiếp; mặc định chọn Phần mềm công ty mỗi lần mở tab Liên kết hoặc mở lại extension.

## 0.8.2 — 2026-10-02

- Lưu trực tiếp lên đầu thanh dấu trang Chrome. Khi lưu lại một liên kết đã có trong thư mục, chuyển bookmark đó lên thanh mà không tạo bản trùng.
- Liên kết hiển thị theo từng danh mục Phần mềm AI, Phần mềm công ty và các danh mục khác; giữ tìm kiếm, bộ lọc và thứ tự trong từng danh mục.

## 0.8.1 — 2026-10-02

- Kiểm tra quyền dấu trang trong manifest Chrome đang chạy; hướng dẫn tải lại khi Chrome chưa nhận quyền mới, thay thông báo lỗi chung.
- Lưu dấu trang qua background sau khi được cấp quyền, xếp hàng giữa các cửa sổ để tránh lưu trùng khi bấm đồng thời.
- Bắt cả lỗi xin quyền trước khi lưu; thông báo rõ khi từ chối quyền hoặc trình duyệt hạn chế sửa dấu trang.

## 0.8.0 — 2026-10-02

- Thêm tab Liên kết với tìm kiếm, nhóm, yêu thích và mở công cụ trong tab mới. Có sẵn sáu đường dẫn AI; quản lý liên kết chung trong Cài đặt bằng mật khẩu.
- Lưu một hoặc tất cả liên kết đang lọc vào dấu trang Chrome, xin quyền khi bấm lưu và bỏ qua đường dẫn đã có.
- Bỏ hàng đếm prompt khi không lọc; đưa Tối ưu AI lên thanh công cụ để dành thêm diện tích cho danh sách.

## 0.7.2 — 2026-10-02

- Đồng bộ tự động khi mở bảng hoặc quay lại cửa sổ chỉ cập nhật trạng thái chân bảng, không hiện thông báo nổi che danh sách.

## 0.7.1 — 2026-10-02

- Thay logo/tên ở đầu bảng bằng ô tìm kiếm, đặt cùng hàng với nút mở tab và Cài đặt để tăng diện tích danh sách prompt.

## 0.7.0 — 2026-10-02

- Thêm nút Mở trong tab, thư viện rộng với ô chọn tab AI nhận prompt. Chèn nội dung rồi chuyển sang tab AI, không tự gửi.
- Thêm thư viện Của tôi để tạo, sửa, xóa prompt trên thiết bị mà không cần mật khẩu hay gọi máy chủ; cập nhật giữa bảng bên và tab riêng.
- Sắp xếp mặc định, Gần đây, Dùng nhiều và Tên A–Z. Lịch sử dùng lưu trên máy, chỉ đếm sao chép/chèn thành công.
- Xếp hàng thao tác ghi cá nhân và kiểm tra phiên bản khi sửa để tránh mất thay đổi giữa các cửa sổ.

## 0.6.1 — 2026-10-01

- Thu gọn đầu bảng, bộ lọc và nút tối ưu AI để dành phần lớn chiều cao cho thư viện. Tăng cỡ chữ tiêu đề và mô tả prompt, giảm lề bên.
- Thêm nút Xem trước trên từng thẻ để đọc toàn bộ nội dung, sao chép hoặc chèn vào chat. Hộp xem trước hỗ trợ bàn phím và giữ danh sách khi đóng.

## 0.6.0 — 2026-10-01

- Đổi tên và biểu tượng extension thành Prompt CNC; thêm biểu tượng PNG cho Chrome và logo trong bảng bên.
- Ẩn Phòng ban trong thư viện và phần quản lý, chỉ giữ Danh mục. Các prompt cũ vẫn giữ thông tin phân loại nội bộ để tránh mất dữ liệu.
- Dùng chữ “máy chủ” trong giao diện và thông báo lỗi thay cho tên dịch vụ lưu trữ; dữ liệu và lịch sử commit vẫn nằm trên GitHub.

## 0.5.0 — 2026-10-01

- Thiết kế lại thư viện, Cài đặt và tối ưu AI với bố cục thích ứng 300–600 px, biểu tượng SVG, trạng thái tải/lỗi và vòng focus cho bàn phím.
- Lưu yêu thích, bộ lọc và bản nháp tối ưu trên máy; tìm kiếm cả nội dung, phòng ban và danh mục.
- Giữ thay đổi vừa lưu cho đến khi catalog GitHub xác nhận, kể cả khi đóng/mở lại bảng; hiển thị rõ đang chờ xuất bản hoặc đang dùng dữ liệu đã lưu.
- Giữ vị trí cuộn khi thư viện không thay đổi, tạo chỉ mục tìm kiếm một lần mỗi bản cập nhật và giảm lượt tải sau thao tác quản lý.
- Ngăn gửi lại khi đang mở quản lý/tối ưu, xác nhận bỏ bản sửa chưa lưu, giới hạn sáu lượt đọc prompt GitHub đồng thời và thời gian chờ mỗi yêu cầu.


## 0.2.0 — 2026-09-30

- Bỏ dấu cộng và màn hình đề xuất ở thư viện. Mở Cài đặt bằng biểu tượng bánh răng.
- Dùng mật khẩu quản trị để mở danh sách prompt, thêm, sửa và xóa. Mật khẩu chỉ nằm trong bộ nhớ khi bảng còn mở; quay lại thư viện sẽ khóa quản lý.
- API ghi từng thay đổi vào `data/prompts/` bằng commit GitHub, kiểm tra phiên bản trước khi sửa/xóa để tránh ghi đè thay đổi mới. Workflow tiếp tục xuất bản catalog cho nhân viên.
- Giữ nguyên nút sao chép và chèn prompt cho mọi nhân viên, không cần đăng nhập.
- Rút gọn cấu hình Render thử nghiệm còn hai bí mật: token GitHub giới hạn repository và mật khẩu quản lý; thêm liên kết triển khai từ README.

## 0.1.6 — 2026-09-30

- Chuyển cửa sổ tự đóng sang bảng bên cạnh trang web; bấm biểu tượng extension để mở và giữ thư viện hiện khi dùng trang AI.
- Chèn prompt xong vẫn giữ bảng mở; hiển thị thông báo thành công.
- Bỏ màn hình nhập địa chỉ máy chủ cho nhân viên. Khi API chưa được triển khai, màn hình đề xuất giải thích rõ trạng thái thay vì hiện biểu mẫu không thể gửi.

## 0.1.5 — 2026-09-30

- Sửa đọc JSON tiếng Việt, báo đúng lỗi JSON và giới hạn kích thước yêu cầu trên API.
- Chỉ giới hạn số lần nhập sai mật khẩu quản trị, không khóa các lượt duyệt hợp lệ.
- Kiểm thử trọn luồng gửi, duyệt, từ chối và xác thực GitHub App bằng GitHub mô phỏng.
- Chuẩn bị `render.yaml` để chạy thử API với HTTPS và tên miền riêng; popup chờ khởi động máy chủ tối đa hai phút.
- Cập nhật mô tả, danh mục, từ khóa và dữ liệu mẫu của prompt #401 theo nội dung “Tạo Slide TRA”; kiểm tra biến không còn được dùng.

## 0.1.4 — 2026-09-29

- Bỏ màn hình chi tiết khi bấm vào tên prompt. Danh sách chỉ hiển thị thẻ và hai nút sao chép, chèn.

## 0.1.3 — 2026-09-29

- Kiểm tra nội dung thực sự được chèn; tránh chèn hai lần khi trình soạn thảo trả kết quả không chính xác.
- Thêm cách sao chép dự phòng khi Clipboard API không hoạt động.
- Giữ bộ lọc và phòng ban đề xuất khi đồng bộ; bỏ qua cache hoặc catalog bị hỏng.
- Sửa lỗi báo thất bại sau khi API đã nhận đề xuất thành công.
- Giới hạn thời gian chờ mạng; ngăn bấm chèn hoặc đồng bộ nhiều lần cùng lúc.
- Thêm kiểm thử trình duyệt với extension thật, clipboard thật và trang AI mô phỏng.

## 0.1.2 — 2026-09-29

- Nạp bộ chèn trực tiếp trên Gemini và các trang chat AI phổ biến để nút tia sét tìm được ô nhập.
- Giữ cách chèn vào tab hiện tại cho trang chưa có bộ chèn trực tiếp.
- Hiển thị lý do cụ thể khi Chrome chặn chèn prompt.
- Kiểm tra luồng nhận lệnh và ô soạn thảo kiểu Gemini.

## 0.1.1 — 2026-09-29

- Nút sao chép hoạt động ngay khi bấm.
- Nút tia sét thử chèn prompt vào ô chat của tab đang mở.

## 0.1.0 — 2026-09-29

- Giao diện thư viện, tìm kiếm, lọc, sao chép, gửi đề xuất và API duyệt qua GitHub.
