import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useVerificationDossier } from '@/hooks/useVerificationDossier';
import { DossierCard, DossierLayout, ds, verificationDate as date } from './VerificationDossierUI';

export function VerificationResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { detail, result, error, resultError, loading, refresh } = useVerificationDossier(id ?? '', true);
  const status = result?.status ?? detail?.verification.status;
  const title = status === 1 ? '✓ Đạt xác minh cấp 2' : status === 2 ? '× Không đạt xác minh cấp 2' : status === 3 ? 'Hồ sơ đã hủy' : 'Đang chờ kết luận cấp 2';
  return <DossierLayout title="Kết quả xác minh cấp 2">
    <View style={ds.hero}><Text style={ds.kicker}>KẾT LUẬN CHUYÊN VIÊN</Text><Text style={ds.title}>{detail ? title : 'Kết quả cấp 2'}</Text><Text style={ds.heroText}>{detail?.project?.title || detail?.verification.projectTitle || 'Hồ sơ xác minh dự án'}</Text></View>
    <Text style={ds.notice}>Trạng thái “Đã hoàn thành” của dự án và kết quả xác minh cấp 2 là hai trạng thái độc lập.</Text>
    {loading && <Text accessibilityRole="progressbar" style={ds.small}>Đang tải kết luận mới nhất…</Text>}
    {error && <Text accessibilityRole="alert" style={ds.error}>{error} Dữ liệu đang hiển thị có thể chưa được cập nhật.</Text>}
    {detail && <DossierCard title="Kết luận hiện tại">
      <Text style={ds.heading}>{title}</Text>
      {status === 1 || status === 2 ? <Text style={ds.body}>Thời điểm kết luận: {date(result?.finalizedAt ?? detail.finalResult?.finalizedAt)}</Text>
        : <Text style={ds.body}>{status === 3 ? 'Hồ sơ đã dừng xử lý.' : detail.meetingEndAt ? 'Buổi xác minh đã kết thúc. Đang chờ kết luận của chuyên viên.' : 'Chưa có kết luận cuối cùng. Tiếp tục theo dõi hồ sơ và lịch hẹn.'}</Text>}
      {result && status === 0 && <Text style={ds.small}>Các báo cáo bên dưới chưa phải kết luận cuối cùng của hồ sơ.</Text>}
    </DossierCard>}
    {detail && !resultError && !loading && !result?.reports.length && <DossierCard title="Báo cáo chuyên viên"><Text style={ds.body}>Chưa có nội dung báo cáo được hệ thống cung cấp.</Text></DossierCard>}
    {detail && result?.reports.map((report, index) => <DossierCard key={report.id} title={`Báo cáo chuyên viên ${index + 1}`}>
      <Text style={ds.small}>Nộp lúc: {date(report.submittedAt)}</Text>
      <Text style={ds.heading}>Tóm tắt</Text><Text selectable style={ds.body}>{report.summary || 'Chưa có tóm tắt.'}</Text>
      <Text style={ds.heading}>Nhận định và phát hiện</Text><Text selectable style={ds.body}>{report.findings || 'Chưa có nội dung.'}</Text>
      <Text style={ds.heading}>Khuyến nghị</Text><Text selectable style={ds.body}>{report.recommendations || 'Chưa có khuyến nghị.'}</Text>
    </DossierCard>)}
    {status === 2 && <Text style={ds.small}>Việc đăng ký lại và chi phí áp dụng phụ thuộc chính sách của hệ thống. Vui lòng liên hệ hỗ trợ để được hướng dẫn.</Text>}
    <Button title="Làm mới kết quả" variant="outline" disabled={loading} onPress={refresh} />
  </DossierLayout>;
}
