# Assessor onboarding — triển khai và vận hành

Các màn public: `/assessor-onboarding/profile`, `/assessor-onboarding/contract`, `/assessor-onboarding/activate`, kèm alias `.html`. Client POST riêng không dùng JWT, cookie hay refresh auth. Token chỉ giữ trong bộ nhớ; reload hợp đồng yêu cầu mở lại email và xác thực lại.

## Cấu hình cần cung cấp

- `EXPO_PUBLIC_API_URL`: origin backend, có hoặc không có hậu tố `/api`.
- `EXPO_PUBLIC_APP_ORIGIN`: HTTPS origin của FE để build App Links/Universal Links. Android intent filter hỗ trợ `/assessor-onboarding/`; iOS associated domain dùng origin này.
- `EXPO_PUBLIC_ASSESSOR_ONBOARDING_WEB_ORIGIN`: HTTPS origin first-party để native mở luồng hợp đồng web, xác thực lại. Dùng origin không tự mở lại app qua verified links (ví dụ web fallback host riêng).
- Backend `AssessorContracts:PublicBaseUrl` và Dashboard origin cho profileLink phải trỏ đến host phục vụ web onboarding. Không thay backend tự động.
- Hosting phải phục vụ ba URL `.html` đúng trang Expo. Sau export kiểm tra file output; nếu exporter sinh `.html.html` cho alias, cấu hình rewrite nội bộ URL `.html` tới trang tương ứng, không redirect làm mất fragment. Trang chuẩn `/profile` có thể được exporter xuất thành `profile.html` sẵn.
- Cung cấp `/.well-known/assetlinks.json` với package/certificate thực tế và Apple association file với team/bundle ID thực tế; cấu hình domain association cho các path onboarding. Những thông tin này không có trong repo, cần phía vận hành.
- CORS backend cho phép origin web, POST, Content-Type và expose Retry-After nếu có. Áp dụng Referrer-Policy: no-referrer, Cache-Control: no-store trên onboarding; không gắn analytics/session replay, không cache API/PDF trong service worker.

## Kiểm thử tích hợp cần có môi trường thật

Chạy lời mời → hồ sơ → email hợp đồng → OTP đọc → mở PDF → OTP ký → duyệt → email mật khẩu → kích hoạt → login Assessor. Thử lỗi hết hạn, OTP sai, 409/410, 429 body rỗng và mất mạng sau mutation. Kiểm tra cold start/warm link trên Android/iOS thật, cả khi đang có phiên Student/Partner; fallback khi chưa cài app. Xác nhận SMTP, worker, template, key ring và backend đã bật contracts.

Native chủ động chuyển bước hợp đồng sang web; không lưu file PDF tạm hoặc chuyển token cho viewer bên thứ ba. Trên web PDF blob có vòng đời theo màn/phiên, bị thu hồi khi background, hết phiên hoặc hoàn tất. Người dùng xác nhận PDF hiển thị được trước khi xin OTP ký. Thời gian đếm ngược là hỗ trợ UX, server quyết định giới hạn thực tế.

## Kết quả kiểm tra trong lần triển khai

- 5 kiểm thử onboarding và điều hướng Assessor đạt.
- Lint riêng phần onboarding đạt; đã bổ sung ESLint/config Expo vào devDependencies để lệnh lint có cấu hình và có thể tái lập.
- Expo export web đạt, tạo `profile.html`, `contract.html`, `activate.html` từ route chuẩn. Alias Expo `.html` cũng xuất thành các file `.html.html`; trên static hosting bình thường, các URL email `.html` đã có file đích tương ứng. Hosting dùng router riêng vẫn phải kiểm tra mapping thực tế.
- TypeScript toàn dự án đang lỗi ở `src/app/(tabs)/opportunities.tsx` và `src/components/assessor/AssessorProfilePosts.tsx`; không có lỗi TypeScript ở phần onboarding trong lần kiểm tra.
- Lint toàn dự án còn lỗi ở mã có sẵn. Chưa kiểm thử email/OTP/backend thật hoặc thiết bị Android/iOS.
