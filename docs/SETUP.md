# Cài đặt và vận hành

## Chạy thử extension

1. Mở `chrome://extensions` hoặc `edge://extensions`.
2. Bật **Developer mode** → **Load unpacked** → chọn `D:\prompt-project` (thư mục gốc). Thư mục `extension` cũng có manifest riêng và nạp được.
3. Bấm biểu tượng Prompt CNC để mở bảng bên cạnh trang web. Bảng không biến mất khi bấm sang ô chat. Có ba prompt mẫu; khi `data/catalog.json` trên nhánh `main` có dữ liệu, extension tự đồng bộ từ GitHub.
4. Biểu tượng ⚙ mở Cài đặt. Khi API chưa được triển khai, phần này giải thích rằng máy chủ quản lý prompt chưa kết nối. Dấu **+** ở thư viện đã được bỏ.

Khi đang mở một trang chat AI, bấm nút tia sét trên thẻ prompt để chèn ngay nội dung vào ô chat. Prompt không được tự gửi. Nút sao chép sao chép ngay nội dung gốc. Có thể sửa các biến `{{...}}` ngay trong ô chat trước khi gửi. Chrome không cho phép chèn vào trang hệ thống như `chrome://extensions`.

Sau khi cập nhật extension, hãy bấm tải lại trang chat AI đang mở để Chrome nạp bộ chèn mới. Bộ chèn trực tiếp hỗ trợ Gemini, ChatGPT, Claude, Perplexity, Copilot, DeepSeek, Grok và Poe; các trang khác dùng quyền truy cập tab tại thời điểm bấm nút.

Không cần tài khoản cho nhân viên. Ai cài extension cũng có thể xem, sao chép và chèn prompt. Ai được cấp mật khẩu quản lý có thể thêm, sửa, xóa khi API hoạt động. Repository hiện công khai theo quyết định của chủ dự án; không đưa mật khẩu, token hoặc dữ liệu cá nhân vào prompt.

## Kiểm thử trước phát hành

- `npm ci` rồi `npm run check`: kiểm tra manifest, dữ liệu và các hàm xử lý.
- `npx playwright install chromium` rồi `npm run test:browser`: chạy extension trong hồ sơ Chromium riêng, kiểm tra clipboard thật, mật khẩu và thao tác thêm/sửa/xóa bằng API mô phỏng, rồi chèn vào trang chat mô phỏng.
- Bộ kiểm thử trình duyệt dùng API Chrome thật nhưng mô phỏng trang AI và GitHub. Cần kiểm tra thêm trên Gemini và các tài khoản AI thực tế trước khi xác nhận hỗ trợ từng nền tảng.
- Sau khi cập nhật code, mở `chrome://extensions`, bấm tải lại Prompt CNC, kiểm tra phiên bản **0.7.0**, rồi tải lại trang AI trước khi thử. Bấm **Xem trước** trên thẻ để đọc toàn bộ prompt; Esc hoặc nút đóng đưa bạn về danh sách.

## Tab riêng và thư viện cá nhân

- Nút **Mở trong tab** cạnh Cài đặt mở thư viện rộng. Chọn tab AI trong ô **Chèn vào**; chèn thành công sẽ chuyển sang tab đó, không tự gửi.
- **Công ty** dùng dữ liệu chung. **Của tôi** có nút **Thêm**, lưu trên máy; mở Xem trước để sửa hoặc xóa, không cần mật khẩu. Danh mục cá nhân có thể tự gõ tên.
- Gần đây và Dùng nhiều dựa trên số lần sao chép/chèn thành công trên thiết bị. Chỉ xem trước không tăng số lần dùng. Tùy chọn sắp xếp được giữ khi mở lại.
- Dữ liệu cá nhân cập nhật giữa bảng bên và tab riêng trong cùng hồ sơ Chrome. Không đồng bộ sang máy khác; gỡ extension hoặc xóa dữ liệu của extension sẽ mất dữ liệu cá nhân. Cập nhật bằng cách tải lại cùng thư mục cài đặt để giữ dữ liệu.
- Quyền `tabs` dùng để đọc danh sách tab AI cho ô chọn nơi chèn. Nếu Chrome yêu cầu chấp thuận quyền mới khi cập nhật, bật lại extension sau khi xem yêu cầu.

## Chạy API

- Node.js 20 trở lên: `npm run check`, sau đó `npm start`.
- Có thể đóng gói API bằng `docker build -t prompt-hub-api .` và chạy sau HTTPS reverse proxy. Container mặc định nghe cổng 8787; truyền các biến môi trường qua secret manager của nơi chạy.
- Sao chép `.env.example` thành `.env`, điền biến rồi nạp các biến môi trường bằng dịch vụ chạy API. Node không tự nạp `.env` trong script này.
- Tạo [fine-grained personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) chỉ cho repository `prompt-project`, cấp **Contents read/write**. Render lưu token ở biến bí mật `GITHUB_TOKEN`. Chọn thời hạn phù hợp và thay token khi hết hạn. Không đưa token vào extension, prompt hoặc commit lên GitHub.
- Nếu cần quản trị dài hạn không phụ thuộc token cá nhân, API cũng hỗ trợ GitHub App với `GITHUB_APP_ID`, `GITHUB_INSTALLATION_ID`, `GITHUB_APP_PRIVATE_KEY`; GitHub App cần Contents read/write.
- Đặt `ADMIN_PASSWORD` dài, ngẫu nhiên; chỉ chia sẻ với người được phép thêm, sửa và xóa prompt. Extension chỉ giữ mật khẩu trong bộ nhớ lúc quản lý đang mở, không lưu vào GitHub hoặc bộ nhớ Chrome.
- Để bật **Tối ưu prompt bằng AI**, tạo Gemini API key trong [Google AI Studio](https://aistudio.google.com/api-keys), rồi đặt biến bí mật `GEMINI_API_KEY` trong Render → `prompt-hub-api` → **Environment**. Không gửi khóa qua chat và không ghi vào repository. Có thể đặt `GEMINI_MODEL`; mặc định là `gemini-3.5-flash-lite`.
- Nhân viên bấm **Tối ưu prompt bằng AI**, dán nội dung và nhận kết quả từ Gemini. Bản nháp và bản tối ưu không được ghi lên GitHub. API giới hạn 120 lần gọi mỗi giờ theo địa chỉ mạng máy chủ thấy được và 300 lần thành công mỗi ngày trên một instance; các bộ đếm trong bộ nhớ sẽ đặt lại khi dịch vụ khởi động lại. Hãy đặt hạn mức chi tiêu trong Google AI Studio nếu dùng khóa có thanh toán.
- Đặt API sau HTTPS và giới hạn truy cập trang quản trị theo mạng/VPN nếu có thể.
- Dịch vụ đang có địa chỉ HTTPS `https://prompt-hub-api-yktt.onrender.com`, đã đặt tại `ADMIN_API_URL` trong `extension/popup.js`; nhân viên không cấu hình.
- `GET /health` trả `configured: true` khi đã nhập mật khẩu quản trị và thông tin GitHub App. Kết quả này kiểm tra cấu hình có mặt, không thay thế bước gửi và duyệt thử.

## Chạy thử trên Render với tên miền có sẵn

Tên miền chỉ là địa chỉ. API Node.js cần một dịch vụ web chạy liên tục hoặc tự khởi động khi có yêu cầu. Repository có `render.yaml` để tạo dịch vụ thử nghiệm trên [Render Free](https://render.com/docs/free); gói này ngủ sau 15 phút không có truy cập và lần đầu thức dậy có thể mất khoảng một phút. Bảng Cài đặt đợi tối đa hai phút. Khi dùng rộng rãi trong công ty, chuyển sang gói luôn chạy nếu muốn nhân viên không phải chờ.

1. Trong tài khoản GitHub của chủ repository, tạo [fine-grained token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) với quyền **Contents read/write** chỉ trên `prompt-project`. Giữ token ngoài GitHub và không gửi qua chat.
2. [Mở liên kết triển khai Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fnguyencuong21899-source%2Fprompt-project), đăng nhập Render bằng GitHub và xác nhận dịch vụ trong `render.yaml`. Khi Render hỏi, nhập `GITHUB_TOKEN` và `ADMIN_PASSWORD` dài, ngẫu nhiên vào phần biến bí mật. Blueprint chọn gói Free để thử; chưa tạo tài khoản, dịch vụ hay phí nào chỉ bằng việc commit file này.
3. Mở `https://prompt-hub-api-yktt.onrender.com/health`. Nếu thấy `configured: true`, kiểm tra và phát hành bản extension mới. Nếu đã tạo Blueprint nhưng thiếu `ADMIN_PASSWORD`, vào dịch vụ `prompt-hub-api` → **Environment** → **Edit** → **Add variable**, đặt key `ADMIN_PASSWORD`, nhập mật khẩu vào value rồi **Save, rebuild, and deploy**.
4. Trong ⚙, nhập mật khẩu quản lý, thêm một prompt thử không nhạy cảm, sửa và xóa nó. Kiểm tra mỗi lần có commit ở `data/prompts/` và workflow **Publish catalog** thành công. Bấm **Làm mới** trong bảng Prompt CNC để kiểm tra thư viện chung.
5. Thêm một subdomain như `api.tenmiencuaban.vn` vào [Custom Domains của Render](https://render.com/docs/custom-domains). Render hiển thị bản ghi DNS cần tạo ở nơi quản lý tên miền và tự cấp HTTPS. Sau khi xác minh, cập nhật `ADMIN_API_URL` rồi phát hành bản extension mới.

Prompt hiện lưu trong repository công khai. Theo quyết định hiện tại, dữ liệu prompt có thể công khai; tránh đưa mật khẩu, token hoặc thông tin cá nhân vào prompt.

## Quy trình

- Người dùng bình thường chỉ xem và dùng prompt, không cần mật khẩu.
- Người có mật khẩu mở ⚙, thêm/sửa/xóa prompt hoặc bấm **Quản lý danh mục** để chỉnh bộ lọc. API kiểm tra mật khẩu và ghi mỗi thay đổi thành một commit trong `data/`.
- Đổi tên Danh mục giữ nguyên ID để prompt vẫn thuộc mục đó. Muốn xóa mục đang được dùng, chuyển các prompt sang mục khác trước. Dữ liệu Phòng ban cũ được giữ nội bộ để tương thích và không xuất hiện trên giao diện.
- API so khớp phiên bản file trước khi sửa hoặc xóa; nếu người khác đã đổi prompt, phải tải lại để tránh ghi đè.
- Workflow `Publish catalog` xây lại `data/catalog.json`. Extension khác nhận catalog mới khi mở hoặc bấm làm mới.
- Workflow cần quyền ghi `main` để commit catalog. Nếu chính sách bảo vệ `main` cấm bot đẩy trực tiếp, chuyển bước tạo catalog vào pull request hoặc cấp quyền phù hợp cho bot xuất bản.
- Luồng đề xuất cũ bằng pull request được tắt mặc định. Chỉ bật `ENABLE_PROPOSALS=true` nếu cần nhận thêm đề xuất từ bản extension cũ; trang `/admin` vẫn xem được PR đang chờ.

## Phát hành và hoàn tác

- Mọi thay đổi code đi qua commit/PR. Đóng gói thư mục `extension` để phân phối qua Chrome Web Store/Edge Add-ons hoặc chính sách trình duyệt của công ty.
- Tăng `version` trong `extension/manifest.json` cho mỗi bản phát hành. Nếu phiên bản có lỗi, khôi phục code từ commit ổn định, **tăng** version và phát hành lại.
- Với prompt lỗi, revert commit chứa file prompt; catalog được tạo lại sau khi commit revert lên `main`.
- Giữ `schemaVersion` tương thích với các bản extension đang được sử dụng.

## Việc cần làm trước dùng thật

- Cân nhắc gắn tên miền đang có với dịch vụ Render; URL `onrender.com` hiện đã dùng được.
- Theo dõi ngày hết hạn token GitHub và thay token trong Render trước khi hết hạn.
- Thử thêm, sửa, xóa một prompt không nhạy cảm; xác nhận GitHub và catalog cập nhật.
- Chọn cách phân phối extension cho nhân viên.
