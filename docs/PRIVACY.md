# Chính sách quyền riêng tư — Prompt CNC

Cập nhật: 03/10/2026. Áp dụng cho Prompt CNC phiên bản 0.8.6.

Prompt CNC giúp người dùng tìm, lưu, sao chép, chèn và tối ưu prompt, cùng truy cập các công cụ làm việc. Người quản lý dự án là chủ repository `nguyencuong21899-source/prompt-project`. Liên hệ về hỗ trợ hoặc quyền riêng tư qua [trang hỗ trợ](https://github.com/nguyencuong21899-source/prompt-project/issues). Không đăng mật khẩu, API key, dữ liệu cá nhân hoặc nội dung nhạy cảm trong yêu cầu hỗ trợ công khai.

## 1. Dữ liệu lưu trong trình duyệt

Prompt cá nhân, yêu thích, bộ lọc, bản nháp tối ưu, kết quả tối ưu, bản thư viện đã tải và số lần/thời điểm sử dụng được lưu trong `chrome.storage.local` của hồ sơ Chrome. Prompt cá nhân và lịch sử sử dụng không được extension gửi lên máy chủ để đồng bộ. Dữ liệu này không tự chuyển sang máy khác; gỡ extension có thể làm mất dữ liệu.

Extension ghi nội dung vào clipboard khi người dùng bấm sao chép. Bản phát hành không xin quyền đọc clipboard.

Người dùng có thể xuất prompt cá nhân thành file JSON và nhập lại trên một máy hoặc bản cài khác. File chỉ chứa các trường prompt, không chứa mật khẩu quản lý, API key hay lịch sử sử dụng. Việc xuất/nhập không gửi file lên máy chủ. Người dùng kiểm soát nơi lưu và chia sẻ file; file không được mã hóa, nên cần giữ an toàn nếu chứa thông tin riêng.

## 2. Thư viện Công ty và máy chủ

Extension tải thư viện chung từ GitHub. Khi người có mật khẩu quản lý thêm, sửa hoặc xóa prompt, danh mục hay liên kết, extension gửi dữ liệu tương ứng qua HTTPS tới API chạy trên Render. API ghi thay đổi vào repository GitHub công khai của dự án và giữ lịch sử commit. Các nội dung đã lưu có thể được mọi người xem, kể cả trong lịch sử sau khi bị sửa/xóa khỏi thư viện hiện tại. Không lưu thông tin mật, mật khẩu hoặc dữ liệu cá nhân vào thư viện công khai.

Mật khẩu quản lý được gửi trong yêu cầu HTTPS để xác thực. Extension không chủ động lưu mật khẩu quản lý vào `chrome.storage.local`; giá trị được giữ trong bộ nhớ khi phiên quản lý mở. Các khóa API của máy chủ không nằm trong extension.

## 3. Tối ưu prompt bằng AI

Chỉ khi người dùng bấm tối ưu, nội dung trong ô prompt ban đầu được gửi qua API Render đến Google Gemini để tạo bản viết lại. Kết quả được trả về trình duyệt và bản nháp/kết quả được lưu trên máy. API của dự án không ghi prompt tối ưu thành commit GitHub và không có cơ sở dữ liệu lưu các yêu cầu tối ưu.

Nội dung có thể chứa dữ liệu cá nhân nếu người dùng tự nhập. Hãy loại bỏ dữ liệu nhạy cảm trước khi gửi. Việc Google xử lý và lưu dữ liệu phụ thuộc điều khoản Gemini API và loại dịch vụ được chủ API sử dụng; không coi nội dung gửi AI là bí mật chỉ vì extension không lưu nó lên GitHub. Xem [điều khoản Gemini API](https://ai.google.dev/gemini-api/terms).

## 4. Tab AI và nội dung trang

Extension dùng tên/URL của các tab AI trong cửa sổ để cho người dùng chọn nơi chèn prompt. Khi người dùng bấm chèn, extension tìm ô nhập trên trang được hỗ trợ, đọc bản nháp trong ô để giữ lại nội dung đang có rồi bổ sung prompt. Extension không tự gửi tin nhắn AI, không thu thập cuộc hội thoại và không gửi nội dung ô chat hoặc danh sách tab lên API của dự án. Khi người dùng tự gửi tin nhắn trên trang AI, việc xử lý thuộc dịch vụ AI đó.

## 5. Dấu trang và liên kết

Quyền dấu trang được yêu cầu khi người dùng sử dụng chức năng lưu dấu trang. Extension đọc cây dấu trang ngay trên máy để phát hiện trùng, tạo dấu trang hoặc chuyển dấu trang đã có lên thanh dấu trang khi được yêu cầu. Cây dấu trang không được gửi lên máy chủ. Dấu trang đã tạo vẫn còn khi gỡ extension; người dùng có thể xóa trong trình quản lý dấu trang Chrome.

Các đường dẫn công ty/AI mở trang của bên thứ ba. Đăng nhập và chính sách quyền riêng tư của các trang đó được áp dụng riêng.

## 6. Dữ liệu vận hành và bên cung cấp dịch vụ

GitHub, Render và Google có thể xử lý địa chỉ IP, thời gian truy cập và thông tin mạng theo chính sách riêng. API dùng địa chỉ mạng của kết nối để giới hạn yêu cầu trong bộ nhớ. Không có mã quảng cáo hay phân tích hành vi trong extension. Dự án không bán dữ liệu người dùng, không dùng dữ liệu cho quảng cáo và không dùng cho chấm điểm tín dụng.

- [GitHub Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)
- [Render Privacy Policy](https://render.com/privacy)
- [Google Privacy Policy](https://policies.google.com/privacy)

Việc sử dụng và chuyển dữ liệu người dùng của Prompt CNC tuân theo Chrome Web Store User Data Policy, bao gồm yêu cầu Limited Use. Dữ liệu chỉ được xử lý để cung cấp các chức năng nêu trên, hỗ trợ an toàn vận hành hoặc đáp ứng nghĩa vụ pháp lý.

## 7. Kiểm soát và xóa dữ liệu

Người dùng có thể sửa/xóa prompt cá nhân, thu hồi quyền truy cập của extension và gỡ extension để xóa bộ nhớ cục bộ của extension. Người quản lý có thể sửa/xóa nội dung trong thư viện hiện tại; thao tác đó không tự xóa lịch sử GitHub. Muốn xử lý dữ liệu đã xuất bản trong lịch sử, hãy liên hệ chủ dự án. Dữ liệu do bên cung cấp dịch vụ lưu phải được xử lý theo chính sách và cơ chế của bên đó.

Chính sách sẽ được cập nhật khi cách xử lý dữ liệu thay đổi.
