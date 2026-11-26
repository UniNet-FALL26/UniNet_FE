import type { ComponentProps } from 'react';
import type { SymbolView } from 'expo-symbols';

export type LegalDocumentKind = 'terms' | 'privacy';

export type LegalSymbol = ComponentProps<typeof SymbolView>['name'];

export type LegalHighlight = {
  title: string;
  description: string;
  icon: LegalSymbol;
};

export type LegalCallout = {
  tone: 'info' | 'warning';
  title: string;
  body: string;
};

export type LegalSection = {
  id: string;
  title: string;
  icon: LegalSymbol;
  paragraphs: string[];
  bullets?: string[];
  callout?: LegalCallout;
};

export type LegalDocument = {
  kind: LegalDocumentKind;
  kicker: string;
  title: string;
  subtitle: string;
  version: string;
  effectiveDate: string;
  audience: string;
  highlights: LegalHighlight[];
  sections: LegalSection[];
  companionKind: LegalDocumentKind;
  companionTitle: string;
  companionDescription: string;
};

export const LEGAL_DOCUMENTS: Record<LegalDocumentKind, LegalDocument> = {
  terms: {
    kind: 'terms',
    kicker: 'VĂN BẢN PHÁP LÝ · UNINET',
    title: 'Điều khoản dịch vụ',
    subtitle:
      'Quy định về quyền, nghĩa vụ và nguyên tắc sử dụng khi bạn tham gia cộng đồng học tập, làm dự án, tuyển dụng và thẩm định trên nền tảng UniNet.',
    version: 'Phiên bản 1.0',
    effectiveDate: '01/2026',
    audience: 'Sinh viên, Đối tác & Thẩm định viên',
    highlights: [
      {
        title: 'Minh bạch theo vai trò',
        description: 'Quyền hạn và trách nhiệm được tách bạch rõ giữa Sinh viên, Đối tác và Thẩm định viên.',
        icon: { ios: 'person.2', android: 'groups', web: 'groups' },
      },
      {
        title: 'Sở hữu trí tuệ dự án',
        description: 'Bạn giữ quyền sở hữu đối với hồ sơ, CV, mã nguồn và sản phẩm dự án mình đăng tải.',
        icon: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' },
      },
      {
        title: 'Thẩm định & thanh toán rõ ràng',
        description: 'Phí thẩm định và gói dịch vụ được niêm yết công khai cùng quy trình đối soát minh bạch.',
        icon: { ios: 'creditcard', android: 'payments', web: 'payments' },
      },
    ],
    sections: [
      {
        id: 'scope',
        title: 'Phạm vi áp dụng và chấp thuận',
        icon: { ios: 'doc.text', android: 'description', web: 'description' },
        paragraphs: [
          'Điều khoản dịch vụ này điều chỉnh toàn bộ việc truy cập và sử dụng ứng dụng di động, phiên bản web và các dịch vụ liên quan do UniNet vận hành.',
          'Khi tạo tài khoản, đánh dấu đồng ý điều khoản đăng ký hoặc tiếp tục sử dụng nền tảng, bạn xác nhận đã đọc, hiểu và đồng ý tuân thủ các quy định tại văn bản này cũng như Chính sách bảo mật của UniNet.',
        ],
        bullets: [
          'Áp dụng cho tài khoản Sinh viên, Đối tác (doanh nghiệp, tổ chức, câu lạc bộ) và Thẩm định viên.',
          'UniNet có thể cập nhật điều khoản theo thay đổi của tính năng hoặc quy định pháp luật và sẽ thông báo rõ thời điểm hiệu lực.',
        ],
      },
      {
        id: 'accounts',
        title: 'Tài khoản, vai trò và xác minh danh tính',
        icon: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
        paragraphs: [
          'Mỗi người dùng chịu trách nhiệm cung cấp thông tin trung thực khi đăng ký, bảo mật mật khẩu và mọi hoạt động phát sinh từ tài khoản của mình.',
        ],
        bullets: [
          'Sinh viên có thể thực hiện xác minh tình trạng đang theo học bằng giấy tờ hợp lệ để mở khóa huy hiệu tin cậy và các quyền lợi dành riêng cho sinh viên.',
          'Đối tác cần cung cấp thông tin tổ chức chính xác và hoàn tất xác minh đối tác trước khi sử dụng đầy đủ tính năng tuyển dụng hoặc quảng bá.',
          'Thẩm định viên phải hoàn tất quy trình kích hoạt tài khoản, xác nhận thông tin thanh toán và ký hợp đồng cộng tác điện tử trước khi tiếp nhận hồ sơ thẩm định.',
          'Nghiêm cấm mạo danh cá nhân, trường học, doanh nghiệp hoặc chia sẻ tài khoản cho bên thứ ba sử dụng trái phép.',
        ],
      },
      {
        id: 'community-conduct',
        title: 'Quy tắc cộng đồng, nội dung và giao tiếp',
        icon: { ios: 'bubble.left', android: 'chat_bubble_outline', web: 'chat_bubble_outline' },
        paragraphs: [
          'UniNet xây dựng môi trường học thuật và nghề nghiệp lành mạnh. Mọi bài viết cộng đồng, bình luận, hồ sơ dự án, tin tuyển dụng và tin nhắn trao đổi phải tuân thủ chuẩn mực văn minh.',
        ],
        bullets: [
          'Không đăng tải nội dung vi phạm pháp luật, lừa đảo, quấy rối, thù ghét, phản cảm hoặc thông tin sai sự thật.',
          'Không phát tán mã độc, spam tin nhắn, thu thập dữ liệu trái phép hoặc can thiệp vào hạ tầng kỹ thuật của UniNet.',
          'Tin tuyển dụng và chiến dịch quảng cáo của Đối tác phải mô tả đúng vị trí, quyền lợi và tuân thủ quy định kiểm duyệt của hệ thống.',
        ],
        callout: {
          tone: 'warning',
          title: 'Xử lý vi phạm',
          body: 'UniNet có quyền ẩn nội dung vi phạm, từ chối duyệt chiến dịch, hạn chế tính năng hoặc tạm khóa tài khoản nếu phát hiện hành vi gian lận hay gây ảnh hưởng đến an toàn cộng đồng.',
        },
      },
      {
        id: 'projects-ip',
        title: 'Dự án, hồ sơ năng lực và quyền sở hữu trí tuệ',
        icon: { ios: 'folder', android: 'folder_open', web: 'folder_open' },
        paragraphs: [
          'Sinh viên và thành viên nhóm giữ toàn quyền sở hữu trí tuệ đối với ý tưởng, mã nguồn, tài liệu, hình ảnh và sản phẩm dự án đăng tải trong hồ sơ cá nhân hoặc không gian làm việc.',
          'Khi đặt dự án hoặc bài viết ở chế độ công khai, bạn cấp cho UniNet quyền hiển thị, định dạng và phân phối nội dung đó trong phạm vi vận hành nền tảng (bao gồm trang cộng đồng, danh mục khám phá và hồ sơ chia sẻ với đối tác).',
        ],
        bullets: [
          'Bạn cam kết nội dung đăng tải không xâm phạm bản quyền, thương hiệu hay bí mật kinh doanh của bên thứ ba.',
          'Nhóm dự án tự chịu trách nhiệm phân quyền thành viên, lời mời tham gia và quản lý tệp tài nguyên trong không gian làm việc chung.',
        ],
      },
      {
        id: 'verification-payments',
        title: 'Dịch vụ thẩm định dự án, quảng cáo và thanh toán',
        icon: { ios: 'creditcard', android: 'payments', web: 'payments' },
        paragraphs: [
          'Một số dịch vụ trên UniNet có thu phí, bao gồm thẩm định dự án với chuyên gia và các gói quảng cáo dành cho đối tác. Mức phí và thông tin giữ lịch được hiển thị rõ trước khi bạn xác nhận thanh toán.',
        ],
        bullets: [
          'Thanh toán phí thẩm định thành công là chi phí cho quy trình đặt lịch và đánh giá chuyên môn, không đồng nghĩa bảo đảm dự án sẽ đạt thẩm định.',
          'Việc hủy hồ sơ thẩm định chỉ được thực hiện trong trạng thái hệ thống cho phép và việc hủy không tự động đồng nghĩa với hoàn tiền.',
          'Trong trường hợp giao dịch cần đối soát hoặc có sự cố kỹ thuật, người dùng cần liên hệ bộ phận hỗ trợ trước khi thực hiện thanh toán lại.',
          'Thu nhập của Thẩm định viên được ghi nhận vào ví thu nhập theo kết quả hoàn tất hợp đồng và tuân thủ quy trình đối soát, chi trả hiện hành.',
        ],
        callout: {
          tone: 'info',
          title: 'Minh bạch kết quả thẩm định',
          body: 'Thẩm định viên đưa ra đánh giá độc lập dựa trên hồ sơ, sản phẩm thực tế và buổi làm việc trực tuyến theo bộ tiêu chí của UniNet.',
        },
      },
      {
        id: 'liability',
        title: 'Giới hạn trách nhiệm và chấm dứt sử dụng',
        icon: { ios: 'checkmark.shield.fill', android: 'shield', web: 'shield' },
        paragraphs: [
          'UniNet đóng vai trò nền tảng kết nối giữa sinh viên, đối tác và chuyên gia thẩm định. Chúng tôi nỗ lực duy trì hệ thống ổn định, nhưng không bảo đảm kết quả tuyển dụng, hợp tác dự án hay các cam kết phát sinh trực tiếp ngoài phạm vi kiểm soát của UniNet.',
          'Bạn có thể ngừng sử dụng dịch vụ bất kỳ lúc nào. Các điều khoản liên quan đến quyền sở hữu trí tuệ, nghĩa vụ thanh toán đã phát sinh và giải quyết tranh chấp vẫn tiếp tục có hiệu lực sau khi chấm dứt tài khoản.',
        ],
      },
      {
        id: 'contact',
        title: 'Luật áp dụng và liên hệ hỗ trợ',
        icon: { ios: 'envelope', android: 'mail', web: 'mail' },
        paragraphs: [
          'Điều khoản dịch vụ này được giải thích và áp dụng theo quy định pháp luật Việt Nam. Mọi thắc mắc hoặc khiếu nại liên quan đến dịch vụ, giao dịch thanh toán hay vi phạm nội dung vui lòng gửi về kênh hỗ trợ chính thức của UniNet.',
        ],
        bullets: [
          'Email hỗ trợ: support@uninet.vn',
          'Thời gian tiếp nhận phản hồi: Thứ 2 – Thứ 6 (08:30 – 17:30, UTC+7).',
        ],
      },
    ],
    companionKind: 'privacy',
    companionTitle: 'Chính sách bảo mật',
    companionDescription: 'Tìm hiểu cách UniNet thu thập, sử dụng, lưu trữ và bảo vệ dữ liệu cá nhân của bạn.',
  },
  privacy: {
    kind: 'privacy',
    kicker: 'QUYỀN RIÊNG TƯ & DỮ LIỆU · UNINET',
    title: 'Chính sách bảo mật',
    subtitle:
      'Cam kết của UniNet trong việc thu thập tối thiểu, sử dụng đúng mục đích và bảo vệ an toàn thông tin cá nhân, hồ sơ học tập và tài liệu xác minh của bạn.',
    version: 'Phiên bản 1.0',
    effectiveDate: '01/2026',
    audience: 'Tất cả người dùng UniNet',
    highlights: [
      {
        title: 'Thu thập đúng mục đích',
        description: 'Chỉ thu thập dữ liệu cần thiết cho hồ sơ, kết nối nghề nghiệp, xác minh và thanh toán.',
        icon: { ios: 'hand.raised', android: 'privacy_tip', web: 'privacy_tip' },
      },
      {
        title: 'Bảo vệ tài liệu nhạy cảm',
        description: 'Giấy tờ xác minh sinh viên, đối tác và thông tin ngân hàng thẩm định viên được kiểm soát chặt.',
        icon: { ios: 'lock', android: 'lock', web: 'lock' },
      },
      {
        title: 'Bạn làm chủ dữ liệu',
        description: 'Chủ động chỉnh sửa hồ sơ, kiểm soát hiển thị dự án và yêu cầu hỗ trợ về dữ liệu cá nhân.',
        icon: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' },
      },
    ],
    sections: [
      {
        id: 'collected-data',
        title: 'Dữ liệu cá nhân UniNet thu thập',
        icon: { ios: 'doc.text', android: 'description', web: 'description' },
        paragraphs: [
          'Tùy theo vai trò và tính năng bạn sử dụng, UniNet có thể thu thập các nhóm thông tin sau:',
        ],
        bullets: [
          'Thông tin tài khoản: họ và tên, tên hiển thị, email đăng nhập, mật khẩu đã mã hóa hoặc thông tin xác thực khi đăng nhập bằng Google.',
          'Thông tin hồ sơ & học vấn: ảnh đại diện, ảnh bìa, trường đại học, ngành học, kỹ năng, kinh nghiệm, CV, liên kết mạng xã hội và danh sách dự án.',
          'Dữ liệu xác minh & hợp tác: hình ảnh thẻ sinh viên hoặc giấy xác nhận (đối với Sinh viên); thông tin pháp lý tổ chức, địa chỉ, lĩnh vực (đối với Đối tác); thông tin CCCD, mã số thuế và tài khoản ngân hàng (đối với Thẩm định viên để ký hợp đồng và chi trả thù lao).',
          'Dữ liệu tương tác & giao dịch: bài viết, bình luận, tin nhắn, tệp đính kèm, lịch hẹn thẩm định và lịch sử giao dịch thanh toán.',
          'Dữ liệu kỹ thuật: mã thông báo thiết bị phục vụ thông báo đẩy, thông tin phiên đăng nhập và nhật ký lỗi giúp bảo mật hệ thống.',
        ],
      },
      {
        id: 'usage-purpose',
        title: 'Mục đích sử dụng dữ liệu',
        icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
        paragraphs: [
          'UniNet chỉ xử lý dữ liệu của bạn cho các mục đích hợp pháp và minh bạch gắn liền với trải nghiệm trên nền tảng:',
        ],
        bullets: [
          'Khởi tạo, duy trì và bảo mật phiên đăng nhập tài khoản.',
          'Hiển thị hồ sơ năng lực, CV và dự án để kết nối đồng đội hoặc cơ hội nghề nghiệp với đối tác.',
          'Xét duyệt yêu cầu xác minh sinh viên, xác minh tổ chức đối tác và phân công chuyên viên thẩm định dự án.',
          'Xử lý thanh toán gói quảng cáo, phí thẩm định dự án, đối soát giao dịch và rút tiền thù lao.',
          'Gửi thông báo về tin nhắn mới, lời mời dự án, lịch hẹn thẩm định và cập nhật bảo mật quan trọng.',
        ],
      },
      {
        id: 'verification-security',
        title: 'Bảo mật tài liệu xác minh và thông tin tài chính',
        icon: { ios: 'lock', android: 'lock', web: 'lock' },
        paragraphs: [
          'Các dữ liệu nhạy cảm như minh chứng sinh viên, hồ sơ xác minh tổ chức, CCCD, mã số thuế và tài khoản ngân hàng không bao giờ được hiển thị công khai trên hồ sơ cá nhân.',
        ],
        callout: {
          tone: 'info',
          title: 'Giới hạn truy cập nghiêm ngặt',
          body: 'Tài liệu xác minh và hợp đồng điện tử chỉ được truy cập bởi nhân sự có thẩm quyền hoặc quy trình tự động phục vụ xét duyệt, ký kết và thanh toán.',
        },
        bullets: [
          'Thông tin thanh toán trực tuyến được xử lý qua cổng thanh toán đối tác đạt chuẩn; UniNet không lưu trữ trực tiếp số thẻ ngân hàng của bạn.',
          'Đường dẫn kích hoạt và hợp đồng thẩm định viên sử dụng phiên làm việc có thời hạn và tự động vô hiệu hóa khi hết phiên hoặc rời trạng thái an toàn.',
        ],
      },
      {
        id: 'sharing',
        title: 'Phạm vi chia sẻ và công khai thông tin',
        icon: { ios: 'person.2', android: 'groups', web: 'groups' },
        paragraphs: [
          'UniNet không bán hoặc cho thuê dữ liệu cá nhân của người dùng cho bên thứ ba. Thông tin chỉ được chia sẻ trong các trường hợp cần thiết sau:',
        ],
        bullets: [
          'Thông tin bạn chủ động công khai trên hồ sơ, CV, bài viết cộng đồng, tin tuyển dụng hoặc trang dự án.',
          'Với chuyên viên thẩm định được phân công nhằm đánh giá hồ sơ dự án và tổ chức buổi thẩm định theo lịch hẹn của bạn.',
          'Với nhà cung cấp hạ tầng kỹ thuật, dịch vụ lưu trữ, gửi email xác thực, thông báo đẩy và cổng thanh toán theo thỏa thuận bảo mật dữ liệu.',
          'Khi có yêu cầu hợp pháp từ cơ quan nhà nước có thẩm quyền theo quy định pháp luật Việt Nam.',
        ],
      },
      {
        id: 'storage-retention',
        title: 'Lưu trữ, bảo vệ và thời hạn giữ dữ liệu',
        icon: { ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' },
        paragraphs: [
          'UniNet áp dụng các biện pháp kỹ thuật và tổ chức phù hợp (mã hóa kết nối HTTPS, phân quyền truy cập, lưu trữ token bảo mật trên thiết bị) để ngăn chặn truy cập, rò rỉ hoặc chỉnh sửa trái phép.',
          'Dữ liệu được lưu trữ trong thời gian tài khoản còn hoạt động hoặc trong khoảng thời gian cần thiết để thực hiện nghĩa vụ đối soát giao dịch, hợp đồng và quy định pháp luật hiện hành.',
        ],
      },
      {
        id: 'user-rights',
        title: 'Quyền của người dùng đối với dữ liệu cá nhân',
        icon: { ios: 'hand.raised', android: 'privacy_tip', web: 'privacy_tip' },
        paragraphs: [
          'Bạn luôn có quyền kiểm soát thông tin của mình trên UniNet:',
        ],
        bullets: [
          'Xem, cập nhật và chỉnh sửa thông tin hồ sơ cá nhân, CV, dự án và liên kết mạng xã hội bất kỳ lúc nào.',
          'Kiểm soát thông báo thiết bị và chấm dứt phiên đăng nhập trên từng thiết bị thông qua tính năng Đăng xuất.',
          'Yêu cầu giải đáp, chỉnh sửa sai sót dữ liệu hoặc đề nghị hỗ trợ xóa tài khoản và dữ liệu liên quan theo quy định.',
        ],
        callout: {
          tone: 'warning',
          title: 'Lưu ý về dữ liệu cộng tác & đối soát',
          body: 'Một số bản ghi giao dịch thanh toán, hợp đồng thẩm định hoặc nội dung đã chia sẻ trong nhóm chung có thể cần được lưu giữ theo yêu cầu kế toán và toàn vẹn hệ thống.',
        },
      },
      {
        id: 'privacy-contact',
        title: 'Cập nhật chính sách và liên hệ',
        icon: { ios: 'envelope', android: 'mail', web: 'mail' },
        paragraphs: [
          'Chính sách bảo mật có thể được điều chỉnh khi UniNet bổ sung tính năng mới hoặc theo yêu cầu pháp lý. Phiên bản cập nhật sẽ được công bố trực tiếp tại trang này kèm ngày hiệu lực mới.',
          'Nếu có câu hỏi về quyền riêng tư hoặc muốn gửi yêu cầu liên quan đến dữ liệu cá nhân, vui lòng liên hệ đội ngũ UniNet qua email support@uninet.vn.',
        ],
      },
    ],
    companionKind: 'terms',
    companionTitle: 'Điều khoản dịch vụ',
    companionDescription: 'Xem đầy đủ quyền, nghĩa vụ, quy tắc cộng đồng và điều khoản thanh toán trên UniNet.',
  },
};

