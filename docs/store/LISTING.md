# Hồ sơ Chrome Web Store — Prompt CNC 0.8.5

Trang bản nháp: https://chrome.google.com/webstore/devconsole/0b77e885-c27a-4eca-bf79-8ebdd5dbcc22/dclagakeabibfodgbcbfgjlbmfkfnkmp/edit

Các nội dung dưới đây được chuẩn bị từ code; chưa được điền vào Dashboard do công cụ trình duyệt bị chặn trên Web Store.

## Store listing

- Tên: **Prompt CNC** (lấy từ manifest).
- Ngôn ngữ: **Tiếng Việt**.
- Danh mục: chọn **Productivity / Năng suất** hoặc mục tương đương đang có trên Dashboard.
- Homepage: https://github.com/nguyencuong21899-source/prompt-project
- Support: https://github.com/nguyencuong21899-source/prompt-project/issues
- Nội dung người lớn: không.

### Mô tả chi tiết — sao chép phần dưới

Prompt CNC là thư viện prompt và công cụ làm việc cho nhân viên, mở ngay bên cạnh các trang AI trong Chrome.

Tìm prompt theo tên, nội dung hoặc ID; lọc danh mục và xem trước toàn bộ nội dung trước khi sử dụng. Sao chép một lần hoặc chèn prompt vào ô chat trên các nền tảng được hỗ trợ như Gemini, ChatGPT, Claude, Copilot, Perplexity, DeepSeek và Grok. Việc chèn không tự gửi tin nhắn.

Các chức năng chính:
• Thư viện Công ty dùng chung, không yêu cầu nhân viên đăng nhập Prompt CNC.
• Thư viện Của tôi để lưu và sửa prompt cá nhân trên máy.
• Yêu thích, sắp xếp theo gần đây, dùng nhiều hoặc tên.
• Xem trước, sao chép và chèn prompt vào ô chat.
• Mở thư viện trong tab riêng khi cần không gian lớn hơn.
• Tối ưu prompt bằng Google Gemini khi người dùng chủ động gửi yêu cầu.
• Liên kết đến phần mềm công ty và phần mềm AI, có nút lưu trực tiếp lên thanh dấu trang sau khi cấp quyền.
• Quản lý prompt, danh mục và liên kết bằng mật khẩu quản lý.

Prompt cá nhân và lịch sử sử dụng lưu trong hồ sơ trình duyệt, chưa đồng bộ giữa các máy. Thư viện Công ty hiện là dữ liệu công khai; không lưu thông tin mật trong thư viện này. Khi sử dụng tối ưu AI, nội dung được gửi qua máy chủ tới Google Gemini. Chức năng AI phụ thuộc cấu hình và hạn mức dịch vụ. Khả năng chèn có thể thay đổi khi giao diện các trang AI được cập nhật.

Prompt CNC hướng tới nhân viên sử dụng thư viện và các công cụ do người quản trị dự án cấu hình. Dịch vụ AI và phần mềm liên kết có thể yêu cầu tài khoản riêng.

## Privacy

### Single purpose — mục đích duy nhất

Cung cấp bộ công cụ làm việc cho nhân viên để tìm, quản lý và sử dụng prompt AI cùng các đường dẫn công cụ công ty; thao tác tại bảng bên hoặc tab Prompt CNC trong Chrome.

### Giải thích từng quyền

| Quyền | Nội dung để điền |
|---|---|
| storage | Lưu prompt cá nhân, yêu thích, bản nháp AI, tùy chọn, lịch sử dùng và bản thư viện để tiếp tục dùng khi mạng không kết nối. |
| clipboardWrite | Ghi nội dung prompt vào clipboard khi người dùng bấm Sao chép. Không đọc clipboard. |
| sidePanel | Hiển thị thư viện bên cạnh trang AI để tìm và dùng prompt trong lúc làm việc. |
| tabs | Liệt kê tên/URL các tab AI trong cửa sổ để chọn nơi chèn prompt trong chế độ tab riêng. Không gửi danh sách tab lên máy chủ. |
| activeTab | Truy cập trang hiện hành sau thao tác của người dùng để chèn prompt vào ô nhập chat. |
| scripting | Chạy hàm chèn trong trang AI khi cơ chế content script không đủ để cập nhật ô nhập. Chỉ chèn theo thao tác chủ động, không tự gửi tin nhắn. |
| bookmarks (optional) | Sau khi cấp quyền, đọc dấu trang để tránh trùng rồi tạo/chuyển dấu trang lên thanh dấu trang theo yêu cầu. Không gửi cây dấu trang lên máy chủ. |
| Host permissions | Tải JSON thư viện chung từ raw.githubusercontent.com; content scripts trên các trang AI đã khai báo tìm ô nhập để chèn prompt. Quyền HTTPS tùy chọn được dùng để kết nối API Render và thao tác chèn tại tab AI được chọn. HTTP localhost là đường dẫn API phát triển được code hỗ trợ; bản phát hành dùng Render HTTPS. |

### Remote code

Chọn **No / Không**. JavaScript/CSS thực thi được đóng gói trong extension. JSON thư viện và phản hồi Gemini là dữ liệu/văn bản; không tải JavaScript để thực thi, không dùng eval cho nội dung tải về.

### Dữ liệu và chứng nhận

Đọc tên/định nghĩa ngay trên Dashboard trước khi đánh dấu. Không chọn “không thu thập dữ liệu” cho toàn bộ sản phẩm.

- **Website content:** có xử lý nội dung người dùng nhập/gửi (prompt tối ưu, prompt công ty, liên kết). Nội dung trong ô chat được đọc cục bộ để giữ bản nháp khi chèn, không gửi về API.
- **Authentication information:** mật khẩu quản lý được truyền qua HTTPS để mở chức năng quản lý; không xin tài khoản AI của người dùng.
- **Personally identifiable information:** nội dung người dùng nhập có thể chứa tên hoặc thông tin nhận dạng; công cụ không yêu cầu hồ sơ cá nhân. Nên khai phạm vi này nếu Dashboard tính dữ liệu nhận dạng được nhập vào prompt.
- **User activity:** số lần và thời điểm sao chép/chèn/mở liên kết được lưu cục bộ; không có phân tích hành vi gửi về máy chủ. Khai theo định nghĩa Dashboard nếu bao gồm xử lý cục bộ.
- **Web history:** chỉ xử lý tên/URL các tab AI phục vụ chọn tab, không thu thập lịch sử duyệt web. Khai theo định nghĩa Dashboard nếu bao gồm URL tab đang mở.
- Không có chức năng thu thập thông tin thanh toán, vị trí, dữ liệu sức khỏe hay tài chính làm mục đích riêng. Prompt tự nhập vẫn có thể chứa thông tin đó; không tuyên bố hệ thống có bộ lọc loại bỏ dữ liệu nhạy cảm.

Các chứng nhận không bán dữ liệu, không dùng dữ liệu ngoài mục đích chính và không dùng cho đánh giá tín dụng phù hợp với code hiện tại. Chủ tài khoản cần kiểm tra chính sách vận hành thực tế trước khi xác nhận.

### Privacy policy URL

https://github.com/nguyencuong21899-source/prompt-project/blob/main/docs/PRIVACY.md

## Distribution

Đề xuất: **Unlisted**, cài miễn phí. Ai có link đều có thể xem/cài; không phải cơ chế giới hạn nhân viên. Mật khẩu quản lý vẫn cần để sửa thư viện. Chỉ chọn các khu vực muốn phân phối theo nhu cầu của chủ tài khoản.

## Test instructions — sao chép phần dưới

Regular employee features do not require a Prompt CNC account. After installation, click the toolbar action to open the side panel. The shared catalog is public and loaded from GitHub.

1. Search “báo cáo” or “406”, filter a category, open “Xem trước”, and use Copy. Paste into any editor to verify the copied text.
2. Open Gemini or another supported AI chat in a normal tab. Sign in to that AI service using your own test account if required. Open Prompt CNC and click the lightning button. It appends the prompt to the chat input and does not submit it.
3. Open “Của tôi”, add a test personal prompt, preview/edit/delete it. No management password is required; data is local.
4. Open “Liên kết”, choose the AI category and open a link. Use “Lưu dấu trang”, grant the optional bookmark permission and verify the link appears in the bookmarks bar. Saving again avoids duplicates.
5. Use “Tối ưu prompt” with “Viết một email ngắn mời đồng nghiệp họp lúc 9 giờ sáng thứ Hai.” Grant the API host permission if requested. The draft is sent to Gemini through the project's HTTPS API. The free hosting instance can need time to wake up; retry if it times out. AI output is editable and can be copied.
6. The top-right expand button opens the library in an extension tab. Select an AI tab when inserting from that view.

Management functions are password-protected and modify the live public company library. No live management password is included in this document. If review requires management access, the publisher must provide a separate safe test environment and test credential in this private review field. Do not publish credentials in the listing or repository.

## Ảnh tải lên

Sau workflow Store assets chạy thành công, tải bộ ảnh từ artifact `chrome-store-assets` hoặc dùng thư mục `dist/store-assets` trên máy:

- `icon-128.png`: biểu tượng.
- `promo-440x280.png`: ảnh quảng bá nhỏ.
- `01-library.png`, `02-preview.png`, `03-links.png`, `04-optimizer.png`: ảnh giao diện thực tế 1280×800.

Ảnh dùng dữ liệu thư viện công khai; không chứa API key, mật khẩu hay hội thoại thật. Màn hình AI hiển thị ô nhập, không giả lập một kết quả Gemini chưa được chạy thật.

Nguồn yêu cầu: [Hồ sơ Store](https://developer.chrome.com/docs/webstore/cws-dashboard-listing), [Ảnh Store](https://developer.chrome.com/docs/webstore/images).
