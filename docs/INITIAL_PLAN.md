# Prompt Hub — Kế hoạch extension thư viện prompt nội bộ

Ngày lập: 29/09/2026  
Repository: https://github.com/nguyencuong21899-source/prompt-project  
Trạng thái: Đề xuất thiết kế và kế hoạch; chưa xây dựng hoặc triển khai ứng dụng.

## 1. Mục tiêu và quyết định kiến trúc

Xây dựng extension Chrome/Edge giúp nhân viên các phòng ban tìm, dùng và đề xuất prompt. Giao diện tham chiếu ảnh người dùng cung cấp: popup sáng màu, tìm kiếm phía trên, bộ lọc danh mục, thẻ prompt, nút sao chép/sử dụng và nút cộng.

GitHub là nguồn dữ liệu chính cho code, prompt đã duyệt, cấu hình danh mục và lịch sử thay đổi. Nhân viên thao tác bằng giao diện tiếng Việt, không cần dùng GitHub. Một API nhỏ xử lý đăng nhập, quyền truy cập, gửi đề xuất và duyệt; code API cũng nằm trong repository.

Các giả định để bắt đầu:
- Hỗ trợ Chrome và Edge trên máy tính; tiếng Việt là ngôn ngữ mặc định.
- Có ba vai trò: nhân viên, người duyệt (chủ hệ thống), quản trị kỹ thuật.
- Phòng ban trước mắt là bộ lọc; nếu cần giới hạn quyền đọc theo phòng ban, API phải kiểm tra quyền trước khi trả dữ liệu.
- Đăng nhập bằng tài khoản công ty; chọn Microsoft Entra ID hoặc Google Workspace sau khi biết hệ thống đang dùng.
- Tên Prompt Hub chỉ là tên tạm; logo, màu thương hiệu và email hỗ trợ sẽ thay bằng thông tin công ty.

## 2. Phạm vi giao diện

### Popup chính, dự kiến rộng 380–400 px
- Header: logo công ty, tên sản phẩm, ngôn ngữ, cài đặt và đóng.
- Ô tìm kiếm theo tiêu đề, mô tả, từ khóa và mã prompt; hỗ trợ tìm tiếng Việt không dấu.
- Bộ lọc phòng ban và danh mục; mặc định “Tất cả”.
- Danh sách thẻ nền trắng, bo góc, viền nhấn xanh, trên nền xám nhạt giống bố cục ảnh.
- Mỗi thẻ gồm tên, mô tả ngắn, mã dễ đọc như #401, nhãn phòng ban, nút sao chép và nút sử dụng.
- Nút cộng nổi ở góc dưới mở biểu mẫu đề xuất.
- Footer: kênh hỗ trợ công ty và trạng thái đồng bộ.
- Trạng thái tải, không có kết quả, lỗi mạng, hết phiên đăng nhập và dữ liệu cũ phải có thông báo rõ ràng.
- Điều hướng bàn phím, nhãn cho nút biểu tượng, tương phản dễ đọc; không che thẻ cuối bằng footer/nút cộng.

### Chi tiết và sử dụng prompt
- Xem toàn bộ nội dung, hướng dẫn dùng, ví dụ đầu vào, người đóng góp và ngày cập nhật.
- Prompt có biến như {{san_pham}}, {{doi_tuong}}, {{giong_van}}; mở biểu mẫu điền biến trước khi sao chép.
- Giá trị nhân viên điền chỉ dùng trong phiên thao tác; không ghi ngược vào GitHub.
- Nút sao chép đưa nội dung đã điền vào clipboard.
- Nút tia sét được đề xuất là “Dùng prompt”. Ảnh không xác nhận hành vi này.
- Bản đầu hỗ trợ sao chép và mở công cụ AI đã chọn. Chèn vào ô chat tự động là chức năng bổ sung, chỉ bật cho website hỗ trợ, khi người dùng bấm; không tự gửi tin.
- Có yêu thích cá nhân và danh sách dùng gần đây lưu trên máy.

### Gửi đề xuất
- Trường: tên, mô tả, nội dung, phòng ban, danh mục, từ khóa, hướng dẫn dùng và ví dụ không chứa dữ liệu thật nhạy cảm.
- Xem trước, kiểm tra biến và gợi ý prompt có nội dung tương tự trước khi gửi.
- Người gửi xem trạng thái: chờ duyệt, cần sửa, bị từ chối hoặc đã xuất bản.
- Sửa đề xuất sẽ tạo phiên bản mới; mọi quyết định duyệt cũ phải mất hiệu lực nếu nội dung đổi.
- Prompt đã xuất bản chỉ được sửa/xóa thông qua đề xuất thay đổi.

### Màn hình quản trị
- Trang quản trị riêng để đọc nội dung dài và so sánh trước/sau.
- Danh sách chờ duyệt, lọc theo phòng ban, người gửi, ngày gửi.
- Xem nội dung và lịch sử; yêu cầu sửa hoặc từ chối kèm lý do.
- Nút “Duyệt và xuất bản” gắn với chính xác phiên bản đang xem.
- Quản lý danh mục và phòng ban qua thay đổi được ghi nhận trong Git.
- Hiển thị mã commit của bản đã xuất bản và lỗi xuất bản nếu có.
- Chức năng hoàn tác tạo một thay đổi mới để duyệt, giữ nguyên lịch sử.

## 3. Kiến trúc đề xuất

Extension (React + TypeScript, Manifest V3)
→ API HTTPS (TypeScript)
→ GitHub App giới hạn trong repository này
→ nhánh đề xuất / Pull Request
→ kiểm tra tự động
→ người duyệt xác nhận
→ merge vào main
→ tạo catalog prompt theo commit
→ API trả bản đã xuất bản cho extension.

Trang quản trị dùng chung kiểu dữ liệu và thành phần giao diện với extension. Dự kiến build bằng Vite, kiểm tra bằng Vitest và Playwright; chốt phiên bản dependency và lockfile khi triển khai.

GitHub không phải máy chủ API ứng dụng. Code, prompt và cấu hình không bí mật nằm trên GitHub; dịch vụ API vẫn cần nơi chạy. Có thể dùng hạ tầng công ty hoặc nền tảng serverless phù hợp với SSO đã chọn. Chưa chốt nhà cung cấp, chưa tạo dịch vụ có phí.

Dữ liệu vận hành tạm như phiên đăng nhập, giới hạn tần suất, khóa xử lý trùng và cache có thể dùng kho KV nhỏ. Đây không phải nguồn dữ liệu gốc của prompt; có thể tái tạo catalog từ Git. Khóa bí mật nằm ở secret manager của nơi chạy API, không commit lên repository hoặc nhúng vào extension.

## 4. Quy trình đề xuất → duyệt → xuất bản

1. Nhân viên đăng nhập bằng danh tính công ty đã được xác minh.
2. API xác định người gửi và quyền từ phiên đăng nhập; không tin vai trò do trình duyệt gửi.
3. API kiểm tra schema, độ dài, ID, biến, đường dẫn file và tần suất gửi.
4. GitHub App tạo nhánh cùng một PR chỉ sửa file prompt được phép. Mã gửi duy nhất giúp chống tạo PR trùng khi thử lại.
5. PR chứa nội dung đề xuất và định danh nội bộ tối thiểu của người gửi; chưa xuất hiện trong thư viện dùng chung.
6. CI kiểm tra JSON, ID duy nhất, danh mục hợp lệ, biến hợp lệ và nội dung không chứa mã thực thi.
7. Người duyệt xem bản thay đổi ở trang quản trị hoặc GitHub.
8. Khi duyệt trong trang quản trị, API kiểm tra quyền người duyệt và SHA của đầu nhánh; lưu quyết định gắn với SHA đó. Nếu PR đổi, yêu cầu duyệt lại.
9. Chỉ sau khi CI đạt và merge thành công vào main, trạng thái mới là đã xuất bản. Việc bấm duyệt không tự bảo đảm merge thành công.
10. Bộ xuất bản tạo catalog hợp lệ, gắn SHA nguồn; API phục vụ bản mới và extension nhận trong lần đồng bộ tiếp theo.

Đối với duyệt bằng giao diện quản trị, cần kiểm tra bắt buộc xác nhận quyết định duyệt từ dịch vụ đáng tin. Không dùng cùng một bot để tự review PR do chính nó tạo. Nếu duyệt trực tiếp trên GitHub, tài khoản chủ hệ thống review/merge PR do App tạo.

Bảo vệ main: bắt buộc PR, kiểm tra CI và kiểm tra duyệt phù hợp; chặn force push và hạn chế bypass. CODEOWNERS bao phủ cả prompt, API, workflow và cấu hình quyền. Cần xác minh gói GitHub có hỗ trợ bảo vệ nhánh private trước khi vận hành.

## 5. Dữ liệu và cấu trúc repository dự kiến

- apps/extension/: popup, settings, service worker và manifest.
- apps/admin/: giao diện người duyệt.
- apps/api/: đăng nhập, phân quyền, GitHub adapter, catalog và webhook.
- packages/shared/: schema, kiểu dữ liệu, xử lý biến và tìm kiếm.
- data/prompts/<uuid>.json: một prompt mỗi file để giảm xung đột.
- data/departments.json: danh mục phòng ban.
- data/categories.json: nhóm công việc.
- schemas/: hợp đồng dữ liệu có phiên bản.
- tests/: kiểm thử quy trình quan trọng.
- docs/: cài đặt, vận hành, bảo mật và hoàn tác.
- .github/workflows/: kiểm tra, đóng gói và phát hành.
- .github/CODEOWNERS: trách nhiệm duyệt.
- CHANGELOG.md: ghi chú thay đổi theo phiên bản.

Một prompt dự kiến có:
- id: UUID ổn định.
- displayId: mã ngắn hiển thị; cấp có kiểm soát và CI kiểm tra trùng.
- title, description, content.
- departmentIds, categoryId, tags.
- variables: tên biến, nhãn, bắt buộc hay tùy chọn, giá trị mặc định không nhạy cảm.
- usageGuide, exampleInput, exampleOutput.
- authorId, createdAt, updatedAt, schemaVersion.

SHA revision do hệ thống xuất bản cung cấp, không tự ghi commit hash vào chính file đang tạo commit.
Nội dung main là nội dung đã duyệt; các bản chờ duyệt sống trong nhánh/PR, không trộn vào catalog.
Mã phòng ban là dữ liệu phân loại; không mặc nhiên trở thành quyền đọc.

## 6. Đồng bộ và truy cập nội bộ

- Khi mở popup: hiển thị cache hợp lệ, kiểm tra bản mới trong nền; có nút làm mới.
- Đồng bộ định kỳ dự kiến mỗi 15 phút khi trình duyệt hoạt động; không hứa thời gian chính xác khi trình duyệt ngủ hoặc bị dừng.
- API dùng ETag/revision để tránh tải lại catalog không đổi và giảm gọi GitHub.
- Cache tách theo người dùng/quyền, có hạn sử dụng; đăng xuất xóa cache cá nhân.
- Chỉ trả các prompt người dùng có quyền xem; không tải toàn bộ rồi giấu bằng giao diện.
- Khi mất mạng: cho dùng cache trong thời hạn chính sách; hiển thị thời điểm đồng bộ.
- Bản bị thu hồi có thể vẫn tồn tại trên máy đang offline cho đến khi cache hết hạn. Prompt nhạy cảm cần chính sách cache ngắn hoặc bắt buộc online.
- Webhook được kiểm tra chữ ký, xử lý lặp an toàn và chỉ chấp nhận sự kiện từ repository đã cấu hình.
- Không nhúng PAT, SSH private key hay GitHub App private key vào extension.
- Không tải JavaScript từ GitHub để chạy. Cập nhật từ xa chỉ là dữ liệu prompt theo schema.

## 7. GitHub và hoàn tác

### Thay đổi prompt
Mỗi đề xuất là một PR; merge theo squash để một thay đổi nghiệp vụ tương ứng một commit dễ xem và hoàn tác. Revert commit tạo PR hoàn tác, kiểm tra rồi xuất bản lại catalog. Không reset hoặc force push để xóa lịch sử.

### Thay đổi code
Mỗi nâng cấp là nhánh feat/... hoặc fix/..., có PR mô tả thay đổi và cách kiểm tra. Phát hành có tag dạng v0.1.0, changelog và artifact được tạo từ đúng commit.

### Rollback
- Prompt: revert commit → CI → merge → catalog mới. Phần mềm không cần cài lại nếu schema tương thích.
- API/admin: redeploy artifact ổn định trước đó; ghi lại commit nguồn và commit hoàn tác.
- Extension: đưa code ổn định trở lại, tăng số phiên bản rồi phát hành bản sửa. Revert trên GitHub không tự hạ phiên bản extension đã cài.
- Luôn giữ tương thích catalog với extension đang được dùng; thay đổi schema cần kế hoạch migration và hỗ trợ phiên bản cũ.
- Thử diễn tập rollback trước đợt dùng thử chính thức.

## 8. Các giai đoạn và điều kiện hoàn thành

Ước lượng tham khảo cho một người triển khai, chưa tính chờ quyền truy cập, kiểm duyệt store và phản hồi người dùng.

### Giai đoạn 1 — Nền tảng và giao diện (3–5 ngày làm việc)
- Khởi tạo repository, môi trường build, schema và dữ liệu mẫu giả lập.
- Popup theo ảnh: tìm kiếm, lọc, thẻ, chi tiết, sao chép, điền biến, yêu thích và cài đặt.
- CI build và kiểm tra dữ liệu; đóng gói bản thử nghiệm.
- Hoàn thành khi load được trên Chrome/Edge và các thao tác chính hoạt động với dữ liệu mẫu.

### Giai đoạn 2 — Gửi và duyệt thật (4–7 ngày)
- SSO, API, GitHub App và trang quản trị.
- Gửi đề xuất tạo PR; duyệt theo đúng SHA; merge có kiểm tra.
- Đồng bộ catalog có quyền truy cập và cache.
- Hoàn thành khi nhân viên thử nghiệm gửi prompt, chủ hệ thống duyệt và nhân viên khác nhận đúng nội dung; chưa duyệt thì không thấy.

### Giai đoạn 3 — Thử nghiệm trong công ty (3–5 ngày)
- Pilot khoảng 5–10 người thuộc 2–3 phòng ban.
- Sửa lỗi thao tác, đồng bộ, trùng đề xuất và quyền truy cập.
- Diễn tập rollback prompt/code; viết hướng dẫn sử dụng và vận hành.
- Hoàn thành khi lỗi quan trọng được xử lý và rollback đã được kiểm chứng.

### Giai đoạn 4 — Phát hành và nâng cấp
- Chọn Chrome Web Store/Edge Add-ons hoặc triển khai theo chính sách thiết bị doanh nghiệp.
- Bản load unpacked dùng để thử nghiệm; không coi file ZIP trên GitHub là cơ chế tự cập nhật cho toàn công ty.
- Các nâng cấp sau: chèn prompt vào website hỗ trợ, bộ prompt theo vai trò, đề xuất sửa, thông báo kết quả duyệt, thống kê tổng hợp và tiếng Anh.
- Thống kê chỉ thu thập sự kiện cần thiết, không ghi giá trị biến hoặc nội dung công việc người dùng đã nhập.

Tổng dự kiến cho MVP dùng thử: khoảng 2–4 tuần làm việc, tùy tích hợp SSO và hạ tầng.

## 9. Tiêu chí nghiệm thu chính

- Tìm kiếm theo tên, từ khóa, ID và tiếng Việt không dấu.
- Lọc phòng ban/danh mục; xem chi tiết và sao chép đúng nội dung.
- Biến bắt buộc chưa điền phải được báo rõ; giá trị đã điền không ghi vào Git.
- Nhân viên không thể gọi API để tự duyệt hoặc thay đổi quyền của mình.
- Nội dung chưa duyệt không xuất hiện trong catalog.
- PR đã sửa sau khi duyệt phải được duyệt lại; quyết định chỉ áp dụng đúng SHA.
- Merge thất bại không hiển thị trạng thái “đã xuất bản”.
- Gửi lặp không tạo nhiều đề xuất ngoài ý muốn; lỗi GitHub có thể thử lại an toàn.
- Nội dung prompt chỉ được hiển thị như dữ liệu, không chạy HTML/script hay lệnh shell.
- Kiểm tra tải với dữ liệu giả lập khoảng 1.000 prompt và mục tiêu tìm kiếm dưới 200 ms trên máy thử nghiệm.
- Có thể truy nguyên catalog về commit, và hoàn tác một prompt đã xuất bản.
- Kiểm tra thủ công bản extension trên Chrome và Edge, bên cạnh kiểm thử tự động.

## 10. Thông tin cần xác định trước khi kết nối dữ liệu thật

1. Công ty dùng Microsoft 365, Google Workspace hay hệ thống đăng nhập khác?
2. Danh sách phòng ban và prompt có cần giới hạn quyền đọc theo phòng ban không?
3. Tên hiển thị, logo và địa chỉ hỗ trợ.
4. Số nhân viên dự kiến và máy tính có được quản trị tập trung không?
5. Nơi chạy API và người có quyền quản trị SSO/GitHub App.

Trong lúc các thông tin này chưa có, có thể triển khai giao diện, schema, dữ liệu mẫu, CI và bộ kiểm thử với lớp đăng nhập giả lập dành riêng môi trường phát triển. Không bật đăng nhập giả lập trong bản production.

## 11. Hiện trạng đã kiểm tra

- Thư mục D:/prompt-project ban đầu trống, chưa có Git repository.
- Repository GitHub ban đầu trống, default branch dự kiến main, visibility public.
- SSH đã thử nhưng GitHub trả Permission denied (publickey).
- Connector GitHub đang có quyền quản trị và ghi repository, có thể dùng để lưu kế hoạch.
- Chưa thay đổi visibility, thiết lập bảo vệ nhánh, tạo dịch vụ, hoặc triển khai ứng dụng.
- Kế hoạch này chỉ chứa thiết kế chung; chưa chứa prompt nội bộ hay dữ liệu nhân viên.

Khuyến nghị chuyển repository sang private trước khi đưa dữ liệu nội bộ vào. Nếu cần mở mã nguồn công khai, tách dữ liệu nội bộ sang repository private và API chỉ đọc kho đó.

## 12. Căn cứ kỹ thuật

- Chrome Manifest V3 và mã chạy từ xa: https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements
- Phân phối extension: https://developer.chrome.com/docs/extensions/how-to/distribute
- Phiên bản và cập nhật extension: https://developer.chrome.com/docs/extensions/reference/manifest/version
- GitHub App và bảo vệ khóa bí mật: https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app
- Bảo vệ nhánh và yêu cầu duyệt: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches

Các lựa chọn kiến trúc, phạm vi chức năng và ước lượng trong tài liệu là đề xuất cho dự án này; tính năng thực tế của ảnh chỉ được xác nhận ở mức các thành phần nhìn thấy.

