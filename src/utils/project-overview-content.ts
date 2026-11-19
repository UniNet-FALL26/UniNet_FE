import type { HubDetails } from '@/types/project-hub';

export const overviewGuides = {
  introduction: {
    title: 'Giới thiệu dự án',
    purpose: 'Giúp người đọc hiểu nhanh dự án làm gì, phục vụ ai và vì sao đáng quan tâm.',
    prompts: ['Mở đầu bằng sản phẩm hoặc ý tưởng chính trong 1–2 câu.', 'Nêu người dùng mục tiêu và tình huống họ sẽ sử dụng sản phẩm.', 'Giải thích cách hoạt động, điểm khác biệt và phạm vi phiên bản hiện tại.', 'Viết thành các đoạn ngắn; để danh sách tính năng và công nghệ ở đúng mục riêng.'],
    example: 'StudyTogether là ứng dụng giúp nhóm sinh viên lập kế hoạch học tập và theo dõi tiến độ chung. Thành viên tạo kế hoạch, nhận nhắc nhở và xem tiến độ trên một bảng tổng hợp. Phiên bản đầu tập trung vào nhóm học nhỏ, giúp mọi người biết cần làm gì trước buổi học tiếp theo.',
    empty: 'Hãy giới thiệu sản phẩm, người dùng mục tiêu và giá trị chính để người xem hiểu dự án của bạn ngay từ những dòng đầu.',
  },
  problemSolution: {
    title: 'Vấn đề & Giải pháp',
    purpose: 'Cho thấy nhu cầu thực tế và cách dự án giải quyết nhu cầu đó một cách thuyết phục.',
    prompts: ['Vấn đề: ai đang gặp khó khăn, trong hoàn cảnh nào, và điều đó ảnh hưởng đến họ ra sao?', 'Nêu hạn chế của cách xử lý hiện tại; chỉ dùng số liệu hoặc phản hồi bạn thực sự có.', 'Giải pháp: mô tả cách sản phẩm xử lý từng khó khăn bằng cơ chế cụ thể.', 'Làm rõ lợi ích và lý do cách tiếp cận này phù hợp với người dùng mục tiêu.'],
    example: 'Vấn đề: nhóm học phân công qua nhiều đoạn chat nên dễ bỏ sót việc và khó biết ai cần hỗ trợ. Giải pháp: tập trung kế hoạch, nhiệm vụ và tiến độ vào một nơi, kèm nhắc hạn để cả nhóm chủ động phối hợp.',
    empty: 'Hãy nêu khó khăn người dùng đang gặp và cách dự án của bạn giải quyết khó khăn đó.',
  },
  objectives: {
    title: 'Mục tiêu dự án',
    purpose: 'Giúp người đọc biết dự án hướng đến điều gì và thế nào là thành công.',
    prompts: ['Liệt kê 3–5 mục tiêu quan trọng, mỗi mục tiêu một dòng.', 'Bắt đầu bằng hành động cụ thể như xây dựng, hỗ trợ, thử nghiệm hoặc cải thiện.', 'Nếu có thể, kèm tiêu chí kiểm chứng, phạm vi hoặc mốc hoàn thành.', 'Phân biệt mục tiêu muốn đạt với danh sách chức năng sẽ xây dựng.'],
    example: 'Hoàn thiện bản demo cho phép nhóm tạo và chia sẻ kế hoạch học tập.\nThử nghiệm với một nhóm sinh viên để ghi nhận phản hồi về cách theo dõi tiến độ.\nCải thiện luồng phân công dựa trên những khó khăn quan sát được khi thử nghiệm.',
    empty: 'Hãy thêm các mục tiêu cụ thể để người xem biết dự án muốn đạt được điều gì và đánh giá kết quả bằng cách nào.',
  },
  features: {
    title: 'Chức năng chính',
    purpose: 'Cho thấy người dùng thực sự có thể làm gì với sản phẩm.',
    prompts: ['Ưu tiên các chức năng tạo giá trị trực tiếp cho người dùng.', 'Mỗi dòng mô tả một khả năng, bắt đầu bằng động từ hoặc một tên chức năng rõ ràng.', 'Có thể bổ sung ngắn gọn lợi ích hoặc đối tượng sử dụng của chức năng.', 'Không dùng tên công nghệ thay cho chức năng; tránh liệt kê các chi tiết quá nhỏ.'],
    example: 'Tạo nhóm học và mời thành viên.\nLập kế hoạch, phân công nhiệm vụ và đặt hạn hoàn thành.\nTheo dõi tiến độ chung và gửi nhắc nhở trước buổi học.',
    empty: 'Hãy liệt kê những việc người dùng có thể thực hiện để mọi người hình dung rõ sản phẩm hoạt động như thế nào.',
  },
  results: {
    title: 'Kết quả mong đợi',
    purpose: 'Mô tả đầu ra dự kiến, lợi ích mang lại và hướng đi tiếp theo của dự án.',
    prompts: ['Sản phẩm: sẽ bàn giao bản demo, ứng dụng, tài liệu hay một kết quả cụ thể nào?', 'Giá trị: người dùng được hỗ trợ hoặc cải thiện điều gì? Nêu cách kiểm chứng nếu đã có kế hoạch.', 'Phát triển: bước tiếp theo sau phiên bản đầu là gì, dựa trên phản hồi hoặc nhu cầu nào?', 'Viết đúng mức kỳ vọng hiện tại; phân biệt rõ dự kiến với kết quả đã kiểm chứng.'],
    example: 'Sản phẩm: bản demo có tạo nhóm, lập kế hoạch và theo dõi tiến độ.\nGiá trị: giúp nhóm biết công việc sắp đến hạn và thành viên cần hỗ trợ.\nPhát triển: thu thập phản hồi sau thử nghiệm để cải thiện nhắc nhở và trải nghiệm trên điện thoại.',
    empty: 'Hãy mô tả sản phẩm dự kiến, giá trị cho người dùng và hướng phát triển để người xem thấy được đích đến của dự án.',
  },
  achievements: {
    title: 'Kết quả đạt được',
    purpose: 'Trình bày những gì dự án thực sự đã hoàn thành và bằng chứng cho kết quả đó.',
    prompts: ['Mỗi dòng nêu một sản phẩm hoặc kết quả đã hoàn thành.', 'Nêu rõ phạm vi: chức năng nào hoạt động, phiên bản nào đã bàn giao hoặc thử nghiệm.', 'Bổ sung phản hồi, kết quả đánh giá hoặc số liệu có thể kiểm chứng nếu có.', 'Để khó khăn và bài học riêng của bạn trong card Tổng kết cá nhân bên dưới.'],
    example: 'Hoàn thành bản demo có tạo nhóm, lập kế hoạch và theo dõi tiến độ.\nTổ chức thử nghiệm với nhóm sinh viên và tổng hợp phản hồi.\nBàn giao mã nguồn cùng hướng dẫn cài đặt và sử dụng.',
    empty: 'Hãy bổ sung những kết quả đã hoàn thành và bằng chứng cụ thể để người xem hiểu giá trị thực tế của dự án.',
  },
} as const;
export type OverviewGuideId = keyof typeof overviewGuides;
export type ProjectOverviewDraft = { introduction: string; problem: string; solution: string; objectives: string; features: string; expectedProduct: string; expectedValue: string; expectedGrowth: string; achievements: string };

export function overviewDraft(details: HubDetails): ProjectOverviewDraft {
  const results = details.results;
  return { introduction: details.description ?? '', problem: results.problem ?? '', solution: results.solution ?? '', objectives: (results.objectives ?? []).join('\n'), features: details.features.join('\n'), expectedProduct: results.expectedProduct ?? '', expectedValue: results.expectedValue ?? '', expectedGrowth: results.expectedGrowth ?? '', achievements: (results.achievements ?? []).join('\n') };
}
function text(value: string, max: number, label: string) {
  const normalized = value.trim();
  if (normalized.length > max) throw new Error(`${label} tối đa ${max.toLocaleString('vi-VN')} ký tự.`);
  return normalized;
}
function list(value: string, max: number, label: string) {
  const items = value.split(/\r?\n/).map(item => item.trim()).filter(Boolean);
  if (items.length > max) throw new Error(`${label} có tối đa ${max} mục, mỗi mục trên một dòng.`);
  if (items.some(item => item.length > 1000)) throw new Error(`Mỗi mục trong ${label.toLowerCase()} tối đa 1.000 ký tự.`);
  return items;
}
export function buildProjectOverviewDetails(details: HubDetails, draft: ProjectOverviewDraft, completed: boolean): HubDetails {
  return { ...details, description: text(draft.introduction, 20000, 'Giới thiệu dự án') || null, features: list(draft.features, 100, 'Chức năng chính'), results: {
    ...details.results, problem: text(draft.problem, 4000, 'Vấn đề'), solution: text(draft.solution, 4000, 'Giải pháp'), objectives: list(draft.objectives, 40, 'Mục tiêu dự án'),
    ...(completed ? { achievements: list(draft.achievements, 40, 'Kết quả đạt được') } : { expectedProduct: text(draft.expectedProduct, 4000, 'Sản phẩm'), expectedValue: text(draft.expectedValue, 4000, 'Giá trị'), expectedGrowth: text(draft.expectedGrowth, 4000, 'Phát triển') }),
  } };
}
