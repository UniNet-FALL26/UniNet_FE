# Ngữ cảnh các trang hồ sơ UniNet cho ChatGPT

Mô tả hiện trạng code ngày 11/10/2026. Phạm vi: luồng hồ sơ sinh viên; trang hồ sơ doanh nghiệp là luồng khác. Ứng dụng dùng Expo Router và React Native, chạy trên web và thiết bị di động.

## 1. Trang hồ sơ cá nhân — `/(tabs)/profile`

Đây là tab “Cá nhân”, hiển thị thông tin thật của tài khoản đang đăng nhập. Thanh đầu trang có nút “Mẫu hồ sơ” bên trái. Bên phải là icon bút chỉnh sửa, nằm ngay bên trái icon cài đặt; icon bút chỉ xuất hiện khi đã có nội dung hồ sơ.

- Khi chưa có nội dung portfolio: hiển thị hồ sơ khởi đầu với ảnh bìa, ảnh đại diện, họ tên, biệt danh và lời mời chọn mẫu. Có icon camera đổi ảnh và nút “Chọn mẫu hồ sơ”. Camera chân dung mở editor và chọn ảnh để tự tách nền; cần xác nhận rồi bấm Lưu hồ sơ. Ảnh bìa vẫn tải lên và lưu trực tiếp.
- Khi đã có nội dung và bật hiển thị: hiển thị portfolio thật bằng mẫu và màu trong `portfolio.appearance.profile`. Tắt hiển thị trong cài đặt sẽ trở về hồ sơ khởi đầu, vẫn giữ nội dung và icon chỉnh sửa. Cả ba mẫu ẩn các mục chưa có dữ liệu và các ô thống kê chưa có số liệu; các mục được cấu hình ẩn vẫn được tôn trọng. Không bổ sung dữ liệu demo. Trong editor, các mục trống và nút thêm vẫn hiện để nhập nội dung.
- Nút “Mẫu hồ sơ” mở danh sách mẫu; icon bút mở trình chỉnh sửa với mẫu/màu đang hiển thị; icon bánh răng mở `/settings`.
- Mỗi lần quay lại tab, trang tải lại hồ sơ từ server để phản ánh nội dung đã lưu. Có trạng thái tải, lỗi và nút thử lại.

“Hiển thị ra ngoài” trong tài liệu này là hiển thị ở tab cá nhân sau khi rời trình chỉnh sửa. Luồng này không đồng nghĩa với công khai hồ sơ cho người khác; cấu hình quyền riêng tư được giữ nguyên.

## 2. Danh sách mẫu hồ sơ — `/profile/templates`

Trang “Mẫu hồ sơ” giúp người dùng chọn bố cục trình bày. Hiện có ba mẫu theo thứ tự:

1. **Developer Modern:** mẫu đầu tiên, có phần giới thiệu, số liệu, kỹ năng, hành trình phát triển, dự án, chứng chỉ, hoạt động và bài viết tùy nội dung. Trong trình chỉnh sửa, hai nút thêm học vấn và kinh nghiệm nằm dưới tiêu đề “Hành trình phát triển”. Có màu Xanh công nghệ và Vàng cam.
2. **Developer Showcase:** mẫu thứ hai, nhấn mạnh phần giới thiệu, ảnh đại diện, kỹ năng và các nội dung thành tích/dự án. Có màu Mint và Orange. Phần giới thiệu đã bỏ nút “Liên hệ ngay” và ô thêm email, ở cả chế độ xem và chỉnh sửa.
3. **Developer Landscape:** mẫu thứ ba, có phần giới thiệu phong cảnh, số liệu, kỹ năng, hành trình, chứng chỉ, bài viết, dự án và footer. Có màu Blue, Pink và Mint.

Mỗi thẻ có hình xem trước, tên mẫu và các nút màu. Nhấn thẻ hoặc tên mở chi tiết với màu mặc định; nhấn một màu mở chi tiết đúng màu đó. Danh sách dùng dữ liệu demo chung, không tải hay thay đổi portfolio thật. Bố cục có hai cột trên màn hình nhỏ và ba cột trên màn hình lớn. Nút quay lại ưu tiên lịch sử điều hướng, nếu không có thì về tab cá nhân.

## 3. Xem chi tiết mẫu — `/profile/preview?template=...&theme=...`

Đây là trang xem trước một mẫu, không phải trang xem hồ sơ thật của tài khoản. Trang hiển thị tên mẫu, nút quay lại, bảng chọn màu, thông báo đang dùng dữ liệu mẫu và toàn bộ thiết kế để cuộn xem.

- Đổi màu chỉ thay đổi giao diện xem trước.
- Không có icon sửa trường, camera đổi ảnh hay nút thêm mục.
- Nút “Chọn mẫu này” mở `/profile/editor` và truyền mã mẫu, mã màu đã chọn.
- Các phần của hồ sơ sử dụng cùng bộ dựng giao diện với trang cá nhân và trình chỉnh sửa, tránh thiết kế xem trước khác thiết kế thực tế.

## 4. Tạo/chỉnh sửa “Hồ sơ của tôi” — `/profile/editor?template=...&theme=...`

Trang tạo và chỉnh sửa dùng chung màn hình. Người dùng cần đăng nhập; trang tải dữ liệu của chủ tài khoản, không lấy nội dung demo để bổ sung cho các trường còn thiếu. Dữ liệu thật được trình bày trong bố cục mẫu/màu nhận qua tham số điều hướng.

Thanh đầu trang có nút quay lại, tiêu đề “Hồ sơ của tôi”, tên mẫu/màu, icon lưới “Chọn mẫu khác” và icon “Lưu hồ sơ”. Icon lưu bị vô hiệu hóa khi chưa có thay đổi, hiển thị trạng thái đang lưu khi gửi dữ liệu.

- Icon bút bên cạnh trường thông tin mở biểu mẫu chỉnh sửa, ví dụ họ tên, biệt danh, chức danh, giới thiệu, số năm kinh nghiệm hoặc GPA.
- Icon camera mở chọn ảnh trên thiết bị và biểu mẫu xử lý/xác nhận ảnh. Chân dung sinh viên tự tách nền bằng BiRefNet, xem ảnh gốc và PNG trong suốt trên nền ô vuông; chỉ upload Cloudinary khi xác nhận. Đổi ảnh bỏ qua kết quả xử lý cũ, lỗi có thể thử lại. Ba mẫu dùng chung URL ảnh chân dung và hiển thị contain.
- Nút dấu cộng mở biểu mẫu thêm nội dung ở đúng mục của mẫu, ví dụ kỹ năng, học vấn, kinh nghiệm, dự án, chứng chỉ, bài viết hoặc liên kết cá nhân.
- “Xác nhận” trong biểu mẫu cập nhật bản nháp trên màn hình. Với chân dung, xác nhận tải ảnh lên Cloudinary nhưng chưa gắn vào hồ sơ; icon lưu mới ghi URL và nội dung xuống server. Lưu thất bại giữ bản nháp/URL. BE kiểm tra tài sản thuộc tài khoản. Cấu hình API, worker và metadata: [portrait-background.md](portrait-background.md).
- Các số liệu suy ra từ nội dung như số dự án và công nghệ tự cập nhật, không nhập trực tiếp.
- Cả ba mẫu đã bỏ email và ô thêm/chỉnh sửa email ở footer. Liên kết cá nhân và nội dung footer vẫn còn.
- Khi quay lại hoặc chọn mẫu khác mà còn thay đổi chưa lưu, hiện hộp xác nhận. Có thể tiếp tục chỉnh sửa hoặc bỏ thay đổi và đi đến đích đã chọn. Chọn mẫu khác mở danh sách mẫu. Trong lúc lưu, các thao tác điều hướng này bị khóa.
- Lưu thành công hiện “Đã lưu hồ sơ.”; lưu lỗi giữ bản nháp và cho phép thử lại. Không tự rời trình chỉnh sửa sau khi lưu.

## 5. Lưu và hiển thị lại ở trang cá nhân

Luồng sử dụng: **Cá nhân → Mẫu hồ sơ → Xem chi tiết → Chọn mẫu này → Chỉnh sửa → Lưu → Quay lại Cá nhân**.

Nội dung và thông tin nhận diện đã lưu được tải lại và hiển thị tại tab cá nhân. Chế độ xem thông thường không hiển thị các nút thêm mục và sửa từng trường của trình chỉnh sửa; icon bút ở thanh đầu trang vẫn dùng để mở chỉnh sửa.

Mẫu/màu được chọn qua URL được gán vào bản nháp thật tại `portfolio.appearance.profile`. Bảng màu trong trình chỉnh sửa dùng đúng danh mục của từng mẫu. Chỉ đổi mẫu hoặc màu cũng bật nút lưu; đổi lại toàn bộ nội dung như bản đã lưu sẽ tắt nút lưu. Bấm lưu ghi đồng thời thông tin nhận diện, nội dung và mẫu/màu vào server. Tab cá nhân tải lại và dùng đúng cấu hình này. Chọn mẫu hoặc màu không tự lưu.

## 6. Cài đặt hiển thị — `/settings`

Sinh viên có công tắc “Hiển thị hồ sơ portfolio”. Công tắc đọc và ghi server; chỉ xác nhận thành công sau khi server trả kết quả. Lỗi giữ trạng thái đã lưu và có nút thử lại. Tắt không xóa portfolio và không thay quyền riêng tư `isPublic`; bật lại dùng mẫu/màu/nội dung đã lưu. Hồ sơ cũ chưa có lựa chọn hiển thị mặc định dựa trên việc có nội dung. Trang có lối vào chỉnh sửa ngay cả khi portfolio đang tắt. Luồng tài khoản doanh nghiệp giữ nguyên.

## 7. Xem hồ sơ sinh viên khác — `/profile/view/[id]`

Route nhận ID hồ sơ, tải `GET /profile/portfolio/{id}` và dùng cùng bộ dựng ba mẫu ở chế độ chỉ xem. Không có bút, camera, nút thêm, lưu hoặc chọn mẫu. Khi tắt portfolio, endpoint chỉ trả thông tin nhận diện tối thiểu; khi có mục ẩn, server lọc dữ liệu mục đó trước khi trả cho người khác. Hồ sơ riêng tư vẫn bị từ chối theo quyền hiện có. Trang không dùng dữ liệu demo hay endpoint hồ sơ của người đang đăng nhập. Đây là route trực tiếp; các danh sách chưa có liên kết hồ sơ thật không được gắn ID giả.

## Điểm vào code

- Trang: `src/app/(tabs)/profile.tsx`, `src/app/profile/templates.tsx`, `src/app/profile/preview.tsx`, `src/app/profile/editor.tsx`, `src/app/settings.tsx`, `src/app/profile/view/[id].tsx`.
- Danh mục mẫu/màu: `src/data/profile-templates.ts`.
- Bộ dựng dùng chung: `src/components/profile/ProfileTemplateRenderer.tsx`.
- Lớp chỉnh sửa: `ProfileEditableTemplate.tsx`, `ProfileEditContext.tsx`, các biểu mẫu `ProfileFieldForm`, `ProfileEntryForm`, `ProfilePhotoForm` trong `src/components/profile`.
- Đọc hồ sơ: `GET /profile/portfolio/me`. Lưu nội dung, thông tin nhận diện và mẫu/màu: `PUT /profile/portfolio/editor/me`. Bật/tắt: `PUT /profile/portfolio/display/me` với `{ "showPortfolio": true }`. Các request qua `src/services/portfolio.service.ts`.

Chi tiết triển khai, kiểm thử và giới hạn: [portfolio-display.md](portfolio-display.md).
