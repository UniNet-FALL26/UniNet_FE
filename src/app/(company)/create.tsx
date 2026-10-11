import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ActionButton, Card, CompanyIcon, CompanyPage, companyColors as c, PageScroll, Tag } from '@/components/company/company-ui';
import { companyService, type CompanyJobBenefit, type SkillCatalogItem } from '@/services/company.service';

function formatDateInput(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

function parseDateInput(value: string): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
  if (date.getUTCDate() !== day || date.getUTCMonth() + 1 !== month || date.getUTCFullYear() !== year) return null;
  return date.toISOString();
}

const PillSelect = ({ values, value, onChange }: { values: string[]; value: string; onChange: (value: string) => void }) => <View style={s.pills}>{values.map((item) => <Pressable key={item} onPress={() => onChange(item)} style={[s.pill, value === item && s.pillActive]}><Text style={[s.pillText, value === item && s.pillTextActive]}>{item}</Text></Pressable>)}</View>;

function Field({ label, value, onChangeText, placeholder, multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.muted} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[s.input, multiline && s.textarea]} /></View>;
}

export default function CompanyCreateJob() {
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const editing = typeof jobId === 'string' && !!jobId;
  const [title, setTitle] = useState('Thực tập sinh Backend Node.js');
  const [startAt, setStartAt] = useState('');
  const [deadline, setDeadline] = useState('30/10/2026');
  const [workMode, setWorkMode] = useState('Kết hợp');
  const [location, setLocation] = useState('TP. Hồ Chí Minh');
  const [salary, setSalary] = useState('4.000.000');
  const [salaryMax, setSalaryMax] = useState('6.000.000');
  const [description, setDescription] = useState('Cùng xây dựng hệ thống cho sản phẩm số. Bạn sẽ tham gia vào quá trình phát triển, thiết kế API và phối hợp cùng nhóm Frontend.');
  const [skills, setSkills] = useState(['Node.js', 'PostgreSQL', 'Git']);
  const [preferredSkills, setPreferredSkills] = useState(['TypeScript']);
  const [benefits, setBenefits] = useState<CompanyJobBenefit[]>([
    { title: 'Mentor đồng hành', description: 'Review code và hướng dẫn kỹ thuật hằng tuần.' },
    { title: 'Hỗ trợ thực tập', description: '4–6 triệu đồng/tháng, linh hoạt theo lịch học.' },
  ]);
  const [responsibilities, setResponsibilities] = useState(['Xây dựng REST API với Node.js và Express.', 'Thiết kế truy vấn PostgreSQL, viết kiểm thử và tài liệu API.', 'Tham gia review code và phối hợp với nhóm Frontend.']);
  const [qualifications, setQualifications] = useState(['JavaScript và Node.js với nền tảng lập trình vững chắc.', 'Thiết kế REST API và hiểu biết giao thức HTTP cơ bản.', 'Cơ sở dữ liệu quan hệ (PostgreSQL hoặc tương đương).']);
  const [preferredQualifications, setPreferredQualifications] = useState(['Kiến thức TypeScript cơ bản.', 'Có kinh nghiệm viết kiểm thử hoặc tài liệu API.']);
  const [projectAreas, setProjectAreas] = useState(['Ứng dụng web', 'Sản phẩm doanh nghiệp']);
  const [skillCatalog, setSkillCatalog] = useState<SkillCatalogItem[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [extraSkill, setExtraSkill] = useState('');

  const addSkill = () => {
    const next = extraSkill.trim();
    if (!next) return;
    const match = skillCatalog.find(skill => skill.name.toLocaleLowerCase() === next.toLocaleLowerCase());
    if (!match) { Alert.alert('Không tìm thấy kỹ năng', 'Chọn tên kỹ năng có trong danh mục UniNet.'); return; }
    if (skills.some(skill => skill.toLocaleLowerCase() === match.name.toLocaleLowerCase())) return;
    setSkills((current) => [...current, match.name]);
    setExtraSkill('');
  };
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const [catalog, profile, job] = await Promise.all([
          companyService.getSkills(controller.signal),
          companyService.getProfile(controller.signal),
          editing ? companyService.getJob(jobId!, controller.signal) : Promise.resolve(null),
        ]);
        setSkillCatalog(catalog);
        setCompanyName(profile.companyName);
        setCompanyAddress(profile.address ?? '');
        if (job) {
          setTitle(job.title);
          setWorkMode(['Tại văn phòng', 'Kết hợp', 'Từ xa'][job.workType] ?? 'Tại văn phòng');
          setLocation(job.location ?? '');
          setStartAt(formatDateInput(job.startAt));
          setDeadline(formatDateInput(job.deadline));
          setSalary(job.minSalaryVnd == null ? '' : String(job.minSalaryVnd));
          setSalaryMax(job.maxSalaryVnd == null ? '' : String(job.maxSalaryVnd));
          setDescription(job.description ?? '');
          setResponsibilities(job.responsibilities);
          setQualifications(job.requiredQualifications);
          setPreferredQualifications(job.preferredQualifications);
          setProjectAreas(job.projectAreas);
          setPreferredSkills(job.skills.filter(skill => skill.requirementType === 1).map(skill => skill.name));
          setSkills(job.skills.filter(skill => skill.requirementType === 0).map(skill => skill.name));
          setBenefits(job.benefits);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : 'Không tải được dữ liệu bài tuyển dụng.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [editing, jobId]);

  const saveJob = async (status: 0 | 1) => {
    if (!title.trim() || !location.trim() || !description.trim()) { Alert.alert('Thiếu thông tin', 'Nhập tiêu đề, địa điểm và mô tả công việc trước khi lưu.'); return; }
    const parsedDeadline = parseDateInput(deadline);
    if (!parsedDeadline) { Alert.alert('Ngày chưa hợp lệ', 'Nhập hạn ứng tuyển theo dạng dd/mm/yyyy.'); return; }
    const parsedStartAt = startAt.trim() ? parseDateInput(startAt) : null;
    if (startAt.trim() && !parsedStartAt) { Alert.alert('Ngày chưa hợp lệ', 'Nhập ngày bắt đầu nhận hồ sơ theo dạng dd/mm/yyyy.'); return; }
    if (parsedStartAt && new Date(parsedStartAt) > new Date(parsedDeadline)) { Alert.alert('Khoảng ngày chưa hợp lệ', 'Ngày bắt đầu nhận hồ sơ phải trước hạn ứng tuyển.'); return; }
    const parseSalary = (value: string) => {
      if (!value.trim()) return null;
      const digits = value.trim().replace(/[.,\s]/g, '');
      return /^\d+$/.test(digits) ? Number(digits) : Number.NaN;
    };
    const minimum = parseSalary(salary);
    const maximum = parseSalary(salaryMax);
    if (Number.isNaN(minimum) || Number.isNaN(maximum)) { Alert.alert('Lương chưa hợp lệ', 'Nhập mức lương bằng số VND nguyên dương.'); return; }
    if (minimum != null && maximum != null && minimum > maximum) { Alert.alert('Khoảng lương chưa hợp lệ', 'Lương tối thiểu không được lớn hơn lương tối đa.'); return; }

    const selectedSkills = [...skills.map(name => ({ name, requirementType: 0 as const })), ...preferredSkills.map(name => ({ name, requirementType: 1 as const }))];
    const missingSkills = selectedSkills.filter(item => !skillCatalog.some(skill => skill.name.toLocaleLowerCase() === item.name.toLocaleLowerCase()));
    if (missingSkills.length) { Alert.alert('Thiếu kỹ năng trong danh mục', `Không tìm thấy: ${missingSkills.map(item => item.name).join(', ')}. Hãy tải lại danh mục kỹ năng.`); return; }
    const input = {
      title: title.trim(),
      workType: (['Tại văn phòng', 'Kết hợp', 'Từ xa'].indexOf(workMode) || 0) as 0 | 1 | 2,
      minSalaryVnd: minimum,
      maxSalaryVnd: maximum,
      location: location.trim(),
      description: description.trim(),
      startAt: parsedStartAt,
      deadline: parsedDeadline,
      status,
      responsibilities,
      requiredQualifications: qualifications,
      preferredQualifications,
      projectAreas,
      skills: selectedSkills.map(item => ({
        skillId: skillCatalog.find(skill => skill.name.toLocaleLowerCase() === item.name.toLocaleLowerCase())!.id,
        requirementType: item.requirementType,
      })),
      benefits,
    };
    setSaving(true);
    try {
      if (editing) await companyService.updateJob(jobId!, input);
      else await companyService.createJob(input);
      router.replace('/(company)/jobs');
    } catch (cause) {
      Alert.alert('Không lưu được bài tuyển dụng', cause instanceof Error ? cause.message : 'Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return <CompanyPage><PageScroll>
    <View style={s.nav}><Pressable onPress={() => router.back()} style={s.back}><CompanyIcon name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} color={c.ink} /></Pressable><View style={{ flex: 1 }}><Text style={s.navTitle}>{editing ? 'Chỉnh sửa bài tuyển dụng' : 'Tạo bài đăng tuyển dụng'}</Text><Text style={s.navSub}>{companyName || 'Công ty của bạn'}</Text></View><View style={s.avatar}><Text style={s.avatarText}>{companyName.trim().charAt(0).toUpperCase() || 'C'}</Text></View></View>
    {!!loadError && <Card><Text style={s.error}>{loadError}</Text><ActionButton title="Quay lại" onPress={() => router.back()} variant="outline" /></Card>}
    {loading ? <Card><ActivityIndicator color={c.purple} /><Text style={s.helper}>Đang tải dữ liệu bài tuyển dụng…</Text></Card> : null}
    <Card style={s.jobPreview}><View style={s.previewTop}><View style={s.logo}><Text style={s.logoText}>{companyName.trim().charAt(0).toUpperCase() || 'C'}</Text></View><View style={{ flex: 1 }}><Text style={s.company}>{companyName || 'Công ty của bạn'}</Text><Text style={s.helper}>{companyAddress || location}</Text></View></View><Text style={s.previewTitle}>{title || 'Tiêu đề vị trí'}</Text><View style={s.pills}><Tag tone="purple">{workMode}</Tag><Tag tone="purple">Ứng dụng web</Tag></View><View style={s.separator} /><View style={s.previewDetail}><CompanyIcon name={{ ios: 'banknote', android: 'payments', web: 'payments' }} size={14} /><Text style={s.helper}>{salary || salaryMax ? `${salary || 'Thỏa thuận'}–${salaryMax || 'Thỏa thuận'} đ/tháng` : 'Thỏa thuận'}</Text></View><View style={s.previewDetail}><CompanyIcon name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }} size={14} /><Text style={s.helper}>Ứng tuyển đến {deadline}</Text></View><View style={s.pills}>{skills.map(skill => <Tag key={skill} tone="gray">{skill}</Tag>)}</View><Text style={s.helper}>Mentor đồng hành · Hỗ trợ thực tập</Text></Card>
    <Card><Text style={s.sectionTitle}>Thông tin công việc</Text><Text style={s.sectionSub}>Dấu * là thông tin bắt buộc</Text><Field label="Tiêu đề bài đăng *" value={title} onChangeText={setTitle} placeholder="Ví dụ: Thực tập sinh Backend" /><Field label="Hạn ứng tuyển *" value={deadline} onChangeText={setDeadline} placeholder="dd/mm/yyyy" /><Field label="Bắt đầu nhận hồ sơ · tùy chọn" value={startAt} onChangeText={setStartAt} placeholder="dd/mm/yyyy" /><Text style={s.label}>Hình thức làm việc *</Text><PillSelect values={['Tại văn phòng', 'Kết hợp', 'Từ xa']} value={workMode} onChange={setWorkMode} /><Field label="Địa điểm *" value={location} onChangeText={setLocation} placeholder="TP. Hồ Chí Minh" /><Text style={s.helper}>{companyAddress || `Địa điểm làm việc tại ${companyName || 'công ty'}.`}</Text><View style={s.salaryRow}><View style={{ flex: 1 }}><Field label="Lương tối thiểu · VND/tháng" value={salary} onChangeText={setSalary} placeholder="4.000.000" /></View><View style={{ flex: 1 }}><Field label="Lương tối đa · VND/tháng" value={salaryMax} onChangeText={setSalaryMax} placeholder="6.000.000" /></View></View><Text style={s.helper}>Lương thỏa thuận · Có thể để trống cả hai mức lương.</Text></Card>
    <Card><Text style={s.sectionTitle}>Mô tả công việc</Text><Text style={s.label}>Nội dung *</Text><Field label="" value={description} onChangeText={setDescription} multiline placeholder="Mô tả trách nhiệm, môi trường làm việc và quyền lợi..." /><Text style={s.helper}>Mô tả rõ vai trò, hướng dẫn và sản phẩm giúp ứng viên hiểu cơ hội.</Text></Card>
    <Card><Text style={s.sectionTitle}>Yêu cầu</Text><Text style={s.label}>Kỹ năng bắt buộc</Text>{qualifications.map((item) => <Text style={s.bullet} key={item}>•  {item}</Text>)}<View style={s.addSkillRow}><TextInput style={[s.input, { flex: 1 }]} value={extraSkill} onChangeText={setExtraSkill} placeholder="Thêm kỹ năng bắt buộc" placeholderTextColor={c.muted} /><Pressable onPress={addSkill}><Text style={s.purpleText}>+ Thêm</Text></Pressable></View><Text style={[s.label, { marginTop: 14 }]}>Yêu cầu cộng thêm</Text>{preferredQualifications.map((item) => <Text style={s.bullet} key={item}>•  {item}</Text>)}</Card>
    <Card><Text style={s.sectionTitle}>Kỹ năng cần có</Text><Text style={s.label}>Bắt buộc</Text><Text style={s.helper}>Nền tảng cần thiết để bắt đầu công việc</Text><View style={s.pills}>{skills.map((skill) => <Pressable key={skill} onPress={() => setSkills((current) => current.filter((item) => item !== skill))}><Tag tone="purple">{skill} ×</Tag></Pressable>)}</View><TextInput style={s.input} value={extraSkill} onChangeText={setExtraSkill} placeholder="⌕  Tìm trong danh mục kỹ năng..." placeholderTextColor={c.muted} onSubmitEditing={addSkill} /><Text style={[s.label, { marginTop: 14 }]}>Ưu tiên</Text><Text style={s.helper}>Có thêm sẽ giúp bạn làm việc thuận lợi hơn</Text><View style={s.pills}>{preferredSkills.map(skill => <Pressable key={skill} onPress={() => setPreferredSkills(current => current.filter(item => item !== skill))}><Tag tone="purple">{skill} ×</Tag></Pressable>)}</View></Card>
    <Card><Text style={s.sectionTitle}>Quyền lợi</Text>{benefits.map((item) => <View key={item.title} style={s.benefit}><View style={s.benefitIcon}><CompanyIcon name={{ ios: 'graduationcap', android: 'school', web: 'school' }} size={15} /></View><View style={{ flex: 1 }}><Text style={s.label}>{item.title}</Text><Text style={s.helper}>{item.description}</Text></View><CompanyIcon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={14} color={c.muted} /></View>)}<ActionButton title="Thêm quyền lợi" onPress={() => Alert.alert('Thêm quyền lợi', 'Trường nhập quyền lợi sẽ được bổ sung sau.')} variant="soft" icon={{ ios: 'plus', android: 'add', web: 'add' }} /></Card>
    <Card><Text style={s.sectionTitle}>Lĩnh vực dự án phù hợp</Text><View style={s.pills}>{projectAreas.map(area => <Tag key={area} tone="purple">{area} ×</Tag>)}</View><ActionButton title="Thêm lĩnh vực" onPress={() => Alert.alert('Lĩnh vực', 'Danh mục lĩnh vực sẽ được bổ sung sau.')} variant="outline" icon={{ ios: 'plus', android: 'add', web: 'add' }} /><Text style={s.helper}>Đề xuất mở rộng · Thể lĩnh vực có thể cấu hình, bổ sung cho từng ngành nghề.</Text></Card>
    <View style={s.submitRow}><ActionButton title={saving ? 'Đang lưu…' : 'Lưu bản nháp'} onPress={() => { if (!saving && !loading) void saveJob(0); }} variant="outline" icon={{ ios: 'tray.and.arrow.down', android: 'save', web: 'save' }} /><ActionButton title={saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Đăng bài tuyển dụng'} onPress={() => { if (!saving && !loading) void saveJob(1); }} icon={{ ios: 'paperplane.fill', android: 'send', web: 'send' }} /></View>
  </PageScroll></CompanyPage>;
}

const s = StyleSheet.create({ nav: { flexDirection: 'row', alignItems: 'center', gap: 8 }, back: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' }, navTitle: { color: c.ink, fontSize: 13, fontWeight: '900' }, navSub: { color: c.muted, fontSize: 9, marginTop: 2 }, avatar: { width: 28, height: 28, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: c.purpleSoft }, avatarText: { color: c.purple, fontWeight: '900', fontSize: 10 }, jobPreview: { gap: 8 }, previewTop: { flexDirection: 'row', alignItems: 'center', gap: 8 }, logo: { width: 30, height: 30, borderRadius: 9, backgroundColor: c.purple, alignItems: 'center', justifyContent: 'center' }, logoText: { color: '#FFF', fontWeight: '900' }, company: { color: c.ink, fontWeight: '800', fontSize: 10 }, helper: { color: c.muted, fontSize: 9, lineHeight: 14 }, previewTitle: { color: c.ink, fontSize: 16, fontWeight: '900' }, pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }, separator: { height: 1, backgroundColor: c.line }, previewDetail: { flexDirection: 'row', gap: 7, alignItems: 'center' }, sectionTitle: { color: c.ink, fontSize: 14, fontWeight: '900', marginBottom: 4 }, sectionSub: { color: c.muted, fontSize: 9, marginBottom: 5 }, field: { marginTop: 8, gap: 5 }, label: { color: c.ink, fontSize: 10, fontWeight: '700' }, input: { minHeight: 40, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: '#FFF', paddingHorizontal: 10, color: c.ink, fontSize: 10 }, textarea: { minHeight: 110, paddingTop: 10, lineHeight: 16 }, salaryRow: { flexDirection: 'row', gap: 8 }, bullet: { color: c.ink, fontSize: 10, lineHeight: 16, marginTop: 7 }, addSkillRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }, purpleText: { color: c.purple, fontSize: 10, fontWeight: '800' }, benefit: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderColor: c.line }, benefitIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: c.purpleSoft }, submitRow: { flexDirection: 'row', gap: 8 }, error: { color: c.rose, fontSize: 11 }, pill: { borderWidth: 1, borderColor: c.line, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#FFF' }, pillActive: { backgroundColor: c.purple, borderColor: c.purple }, pillText: { color: c.muted, fontSize: 9, fontWeight: '700' }, pillTextActive: { color: '#FFF' } });
