import { createElement, useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { ActionButton, Card, CompanyIcon, CompanyPage, companyColors as c, PageScroll, Tag } from '@/components/company/company-ui';
import { companyService, type CompanyJobBenefit, type SkillCatalogItem, type PartnerVerificationStatus } from '@/services/company.service';

function datePart(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function timePart(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatDateLabel(value: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function dateValue(value: string, time: string, endOfDay = false): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  const [hour, minute] = endOfDay ? [23, 59] : time.split(':').map(Number);
  if (!endOfDay && (!/^\d{2}:\d{2}$/.test(time) || hour! > 23 || minute! > 59)) return null;
  const result = new Date(Number(y), Number(m) - 1, Number(d), hour!, minute!, 0, 0);
  if (result.getFullYear() !== Number(y) || result.getMonth() !== Number(m) - 1 || result.getDate() !== Number(d)) return null;
  return result.toISOString();
}

function formatVnd(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits ? new Intl.NumberFormat('vi-VN').format(Number(digits)) : '';
}

function toSalaryNumber(value: string): number | null {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : null;
}

function formatMillions(value: number): string {
  const whole = Math.floor(value / 1_000_000);
  const remainder = String(value % 1_000_000).padStart(6, '0').replace(/0+$/, '');
  return `${new Intl.NumberFormat('vi-VN').format(whole)}${remainder ? `,${remainder}` : ''}`;
}

function DateTimeField({ label, value, mode, onChange, placeholder }: { label: string; value: string; mode: 'date' | 'time'; onChange: (value: string) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const initial = mode === 'date' ? new Date(`${value || datePart(new Date().toISOString())}T12:00:00`) : new Date(`2000-01-01T${value || '09:00'}:00`);
  if (Platform.OS === 'web') {
    return <View style={s.field}><Text style={s.label}>{label}</Text>{createElement('input', {
      type: mode, value, onChange: (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value),
      'aria-label': label, style: { boxSizing: 'border-box', width: '100%', height: 40, border: `1px solid ${c.line}`, borderRadius: 10, background: '#FFF', padding: '0 10px', color: c.ink, fontSize: 12, fontFamily: 'inherit' },
    })}<Text style={s.helper}>{value ? mode === 'date' ? formatDateLabel(value) : value : placeholder}</Text></View>;
  }
  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    setOpen(false);
    if (event.type !== 'set' || !selected) return;
    onChange(mode === 'date'
      ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`
      : `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`);
  };
  return <View style={s.field}><Text style={s.label}>{label}</Text><Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={s.dateButton}><Text style={value ? s.dateText : s.datePlaceholder}>{value ? mode === 'date' ? formatDateLabel(value) : value : placeholder}</Text><CompanyIcon name={{ ios: mode === 'date' ? 'calendar' : 'clock', android: mode === 'date' ? 'calendar_month' : 'schedule', web: mode === 'date' ? 'calendar_month' : 'schedule' }} size={16} /></Pressable>{open && <DateTimePicker value={initial} mode={mode} display="default" is24Hour onChange={onPickerChange} />}</View>;
}

const PillSelect = ({ values, value, onChange }: { values: string[]; value: string; onChange: (value: string) => void }) => <View style={s.pills}>{values.map((item) => <Pressable key={item} onPress={() => onChange(item)} style={[s.pill, value === item && s.pillActive]}><Text style={[s.pillText, value === item && s.pillTextActive]}>{item}</Text></Pressable>)}</View>;

function Field({ label, value, onChangeText, placeholder, multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={c.muted} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[s.input, multiline && s.textarea]} /></View>;
}

export default function CompanyCreateJob() {
  const { jobId, publishError, draftSaved } = useLocalSearchParams<{ jobId?: string; publishError?: string; draftSaved?: string }>();
  const editing = typeof jobId === 'string' && !!jobId;
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [deadline, setDeadline] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [location, setLocation] = useState('');
  const [salary, setSalary] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState<{ id: string; name: string; requirementType: 0 | 1 }[]>([]);
  const [benefits, setBenefits] = useState<CompanyJobBenefit[]>([]);
  const [benefitTitle, setBenefitTitle] = useState('');
  const [benefitDescription, setBenefitDescription] = useState('');
  const [responsibilities, setResponsibilities] = useState<string[]>([]);
  const [responsibilityDraft, setResponsibilityDraft] = useState('');
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [preferredQualifications, setPreferredQualifications] = useState<string[]>([]);
  const [requirementDraft, setRequirementDraft] = useState('');
  const [requirementType, setRequirementType] = useState<0 | 1>(0);
  const [skillQuery, setSkillQuery] = useState('');
  const [skillType, setSkillType] = useState<0 | 1>(0);
  const [projectAreas, setProjectAreas] = useState<string[]>([]);
  const [skillCatalog, setSkillCatalog] = useState<SkillCatalogItem[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [verification, setVerification] = useState<PartnerVerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [shownPublishError, setShownPublishError] = useState('');
  const [shownDraftSaved, setShownDraftSaved] = useState('');
  const [jobStatus, setJobStatus] = useState<0 | 1 | 2 | 3 | null>(null);
  const suggestedSkills = useMemo(() => {
    const query = skillQuery.trim().toLocaleLowerCase();
    if (!query) return [];
    return skillCatalog.filter(item => item.name.toLocaleLowerCase().includes(query) && !skills.some(skill => skill.id === item.id)).slice(0, 3);
  }, [skillCatalog, skillQuery, skills]);

  const addCatalogSkill = (item: SkillCatalogItem, type: 0 | 1) => {
    setSkills(current => current.some(skill => skill.id === item.id)
      ? current.map(skill => skill.id === item.id ? { ...skill, requirementType: type } : skill)
      : [...current, { id: item.id, name: item.name, requirementType: type }]);
    setSkillQuery('');
  };

  const addRequirement = () => {
    const value = requirementDraft.trim();
    if (!value) return;
    const setter = requirementType === 0 ? setQualifications : setPreferredQualifications;
    setter(current => [...current, value]);
    skillCatalog.filter(item => value.toLocaleLowerCase().includes(item.name.toLocaleLowerCase()))
      .forEach(item => addCatalogSkill(item, requirementType));
    setRequirementDraft('');
  };

  const addResponsibility = () => {
    if (!responsibilityDraft.trim()) return;
    setResponsibilities(current => [...current, responsibilityDraft.trim()]);
    setResponsibilityDraft('');
  };

  const addBenefit = () => {
    if (!benefitTitle.trim() || !benefitDescription.trim()) {
      Alert.alert('Thiếu thông tin quyền lợi', 'Nhập cả tiêu đề và mô tả quyền lợi.');
      return;
    }
    setBenefits(current => [...current, { title: benefitTitle.trim(), description: benefitDescription.trim() }]);
    setBenefitTitle('');
    setBenefitDescription('');
  };
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const [catalog, profile, job, verificationStatus] = await Promise.all([
          companyService.getSkills(controller.signal),
          companyService.getProfile(controller.signal),
          editing ? companyService.getJob(jobId!, controller.signal) : Promise.resolve(null),
          companyService.getVerificationStatus(controller.signal),
        ]);
        setSkillCatalog(catalog);
        setCompanyName(profile.companyName);
        setCompanyAddress(profile.address ?? '');
        setVerification(verificationStatus);
        if (job) {
          setJobStatus(job.status);
          setTitle(job.title);
          setWorkMode(['Tại văn phòng', 'Kết hợp', 'Từ xa'][job.workType] ?? 'Tại văn phòng');
          setLocation(job.location ?? '');
          setStartDate(datePart(job.startAt));
          setStartTime(timePart(job.startAt));
          setDeadline(datePart(job.deadline));
          setSalary(job.minSalaryVnd == null ? '' : formatVnd(String(job.minSalaryVnd)));
          setSalaryMax(job.maxSalaryVnd == null ? '' : formatVnd(String(job.maxSalaryVnd)));
          setDescription(job.description ?? '');
          setResponsibilities(job.responsibilities);
          setQualifications(job.requiredQualifications);
          setPreferredQualifications(job.preferredQualifications);
          setProjectAreas(job.projectAreas);
          setSkills(job.skills.map(skill => ({ id: skill.skillId, name: skill.name, requirementType: skill.requirementType })));
          setBenefits(job.benefits);
        } else {
          setJobStatus(null);
          setLocation(profile.address ?? '');
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

  useEffect(() => {
    if (typeof publishError === 'string' && publishError && publishError !== shownPublishError) {
      setShownPublishError(publishError);
      Alert.alert('Đăng bài thất bại', `${publishError}\n\nNội dung đã được lưu thành bản nháp để bạn tiếp tục chỉnh sửa.`);
    }
  }, [publishError, shownPublishError]);

  useEffect(() => {
    if (typeof draftSaved === 'string' && draftSaved && draftSaved !== shownDraftSaved) {
      setShownDraftSaved(draftSaved);
      Alert.alert('Đã lưu bản nháp', 'Bài tuyển dụng đã được lưu. Bạn có thể tiếp tục chỉnh sửa tại đây.');
    }
  }, [draftSaved, shownDraftSaved]);

  const saveJob = async (status: 0 | 1) => {
    if (!title.trim() || !location.trim() || !description.trim() || !workMode) { Alert.alert('Thiếu thông tin', 'Nhập tiêu đề, địa điểm, mô tả và hình thức làm việc trước khi lưu.'); return; }
    const parsedDeadline = dateValue(deadline, '', true);
    if (!parsedDeadline) { Alert.alert('Ngày chưa hợp lệ', 'Chọn hạn ứng tuyển theo dạng dd/mm/yyyy.'); return; }
    const parsedStartAt = startDate ? dateValue(startDate, startTime) : null;
    if (startDate && !parsedStartAt) { Alert.alert('Thiếu ngày hoặc giờ', 'Chọn cả ngày và giờ bắt đầu nhận hồ sơ.'); return; }
    if (parsedStartAt && new Date(parsedStartAt) > new Date(parsedDeadline)) { Alert.alert('Khoảng ngày chưa hợp lệ', 'Thời điểm bắt đầu nhận hồ sơ phải trước hạn ứng tuyển.'); return; }
    const parseSalary = (value: string) => {
      if (!value.trim()) return null;
      const digits = value.replace(/\D/g, '');
      return /^\d+$/.test(digits) ? Number(digits) : Number.NaN;
    };
    const minimum = parseSalary(salary);
    const maximum = parseSalary(salaryMax);
    if (Number.isNaN(minimum) || Number.isNaN(maximum)) { Alert.alert('Lương chưa hợp lệ', 'Lương phải là số nguyên VND.'); return; }
    if ((minimum != null && minimum < 1_000_000) || (maximum != null && maximum < 1_000_000)) {
      Alert.alert('Lương thấp hơn mức tối thiểu', 'Mỗi mức lương đã nhập phải từ 1.000.000 VND/tháng trở lên.');
      return;
    }
    if (minimum != null && maximum != null && minimum > maximum) { Alert.alert('Khoảng lương chưa hợp lệ', 'Lương tối thiểu không được lớn hơn lương tối đa.'); return; }

    const input = {
      title: title.trim(),
      workType: ['Tại văn phòng', 'Kết hợp', 'Từ xa'].indexOf(workMode) as 0 | 1 | 2,
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
      skills: skills.map(({ id, requirementType }) => ({ skillId: id, requirementType })),
      benefits,
    };
    const saveAsDraft = () => editing
      ? companyService.updateJob(jobId!, { ...input, status: 0 })
      : companyService.createJob({ ...input, status: 0 });
    const openSavedDraftWithError = (draftId: string, message: string) => {
      setShownPublishError('');
      router.replace({ pathname: '/(company)/create', params: { jobId: draftId, publishError: message } });
    };

    if (status === 1 && verification?.status !== 1) {
      setSaving(true);
      try {
        const draft = await saveAsDraft();
        openSavedDraftWithError(draft.id, 'Tài khoản đối tác chưa được admin xác minh nên chưa thể đăng tuyển công khai.');
      } catch (cause) {
        Alert.alert('Chưa lưu được bản nháp', cause instanceof Error ? cause.message : 'Vui lòng thử lại. Nội dung vẫn còn trên màn hình.');
      } finally { setSaving(false); }
      return;
    }

    setSaving(true);
    try {
      if (status === 0) {
        const draft = editing ? await companyService.updateJob(jobId!, input) : await companyService.createJob(input);
        setShownDraftSaved('');
        router.replace({ pathname: '/(company)/create', params: { jobId: draft.id, draftSaved: String(Date.now()) } });
      } else {
        if (editing) await companyService.updateJob(jobId!, input);
        else await companyService.createJob(input);
        Alert.alert('Đăng bài thành công', 'Bài tuyển dụng đã được đăng công khai.');
        router.replace('/(company)/jobs');
      }
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : 'Vui lòng thử lại.';
      if (status === 1) {
        try {
          const draft = await saveAsDraft();
          openSavedDraftWithError(draft.id, reason);
        } catch (draftCause) {
          Alert.alert('Đăng bài thất bại', `${reason}\n\nKhông lưu được bản nháp tự động: ${draftCause instanceof Error ? draftCause.message : 'Vui lòng thử lại.'} Nội dung vẫn còn trên màn hình.`);
        }
      } else Alert.alert('Không lưu được bản nháp', `${reason}\nNội dung vẫn còn trên màn hình.`);
    } finally {
      setSaving(false);
    }
  };

  return <CompanyPage><PageScroll>
    <View style={s.nav}><Pressable onPress={() => router.back()} style={s.back}><CompanyIcon name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} color={c.ink} /></Pressable><View style={{ flex: 1 }}><Text style={s.navTitle}>{editing ? 'Chỉnh sửa bài tuyển dụng' : 'Tạo bài đăng tuyển dụng'}</Text><Text style={s.navSub}>{companyName || 'Tổ chức của bạn'}</Text></View><View style={s.avatar}><Text style={s.avatarText}>{companyName.trim().charAt(0).toUpperCase() || 'Đ'}</Text></View></View>
    {!!loadError && <Card><Text style={s.error}>{loadError}</Text><ActionButton title="Quay lại" onPress={() => router.back()} variant="outline" /></Card>}
    {loading ? <Card><ActivityIndicator color={c.purple} /><Text style={s.helper}>Đang tải dữ liệu bài tuyển dụng…</Text></Card> : null}
    <Card style={s.jobPreview}>
      <View style={s.previewTop}><View style={s.logo}><Text style={s.logoText}>{companyName.trim().charAt(0).toUpperCase() || 'Đ'}</Text></View><View style={{ flex: 1 }}><Text style={s.company}>{companyName || 'Tổ chức của bạn'}</Text><Text style={s.helper}>{location || 'Địa điểm làm việc'}</Text></View></View>
      <Text style={s.previewTitle}>{title || 'Bản xem trước bài tuyển dụng'}</Text>
      {!!workMode && <Tag tone="purple">{workMode}</Tag>}
      <View style={s.pills}>{(() => {
        const minimum = toSalaryNumber(salary);
        const maximum = toSalaryNumber(salaryMax);
        if (minimum != null && maximum != null) return <Tag tone="green">💰 {formatMillions(minimum)}-{formatMillions(maximum)} triệu VND/tháng</Tag>;
        if (minimum != null) return <Tag tone="green">💰 Từ {formatMillions(minimum)} triệu VND/tháng</Tag>;
        if (maximum != null) return <Tag tone="green">💰 Tới {formatMillions(maximum)} triệu VND/tháng</Tag>;
        return null;
      })()}{!!deadline && <Tag tone="amber">🗓 Hạn nộp: {formatDateLabel(deadline)}</Tag>}</View>
      <View style={s.pills}>{skills.map(skill => <Tag key={skill.id} tone="gray">{skill.name}</Tag>)}</View>
    </Card>
    <Card>
      <Text style={s.sectionTitle}>Thông tin công việc</Text><Text style={s.sectionSub}>Dấu * là thông tin bắt buộc.</Text>
      <Field label="Tiêu đề bài đăng *" value={title} onChangeText={setTitle} placeholder="Ví dụ: Thực tập sinh Backend" />
      <DateTimeField label="Hạn ứng tuyển *" value={deadline} mode="date" onChange={setDeadline} placeholder="Chọn ngày (dd/mm/yyyy)" />
      <View style={s.dateRow}><View style={{ flex: 1 }}><DateTimeField label="Bắt đầu nhận hồ sơ · tùy chọn" value={startDate} mode="date" onChange={setStartDate} placeholder="Chọn ngày" /></View>{!!startDate && <View style={{ flex: 0.7 }}><DateTimeField label="Giờ bắt đầu *" value={startTime} mode="time" onChange={setStartTime} placeholder="Chọn giờ" /></View>}</View>
      <Text style={s.label}>Hình thức làm việc *</Text><PillSelect values={['Tại văn phòng', 'Kết hợp', 'Từ xa']} value={workMode} onChange={setWorkMode} />
      <Field label="Địa điểm *" value={location} onChangeText={setLocation} placeholder="Nhập địa chỉ làm việc" />
      {!!companyAddress && <Text style={s.helper}>Địa chỉ hồ sơ: {companyAddress}. Bạn có thể sửa cho chi nhánh tuyển dụng.</Text>}
      <View style={s.salaryRow}><View style={{ flex: 1 }}><Field label="Lương tối thiểu · VND/tháng" value={salary} onChangeText={value => setSalary(formatVnd(value))} placeholder="Ví dụ: 4.000.000" /></View><View style={{ flex: 1 }}><Field label="Lương tối đa · VND/tháng" value={salaryMax} onChangeText={value => setSalaryMax(formatVnd(value))} placeholder="Ví dụ: 6.000.000" /></View></View>
      <Text style={s.helper}>Chỉ nhập số nguyên dương; dấu phân cách được định dạng tự động. Có thể để trống cả hai mức nếu thỏa thuận.</Text>
    </Card>
    <Card><Text style={s.sectionTitle}>Mô tả công việc</Text><Field label="Nội dung *" value={description} onChangeText={setDescription} multiline placeholder="Mô tả trách nhiệm, môi trường làm việc và quyền lợi..." /><Text style={s.helper}>Mô tả rõ vai trò, hướng dẫn và sản phẩm giúp ứng viên hiểu cơ hội.</Text>
      <Text style={[s.label, { marginTop: 12 }]}>Trách nhiệm công việc</Text>{responsibilities.map((item, index) => <View style={s.editableRow} key={`resp-${index}`}><TextInput style={[s.input, s.rowInput]} value={item} onChangeText={value => setResponsibilities(current => current.map((entry, i) => i === index ? value : entry))} /><Pressable accessibilityLabel="Xóa trách nhiệm" onPress={() => setResponsibilities(current => current.filter((_, i) => i !== index))}><CompanyIcon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={16} color={c.rose} /></Pressable></View>)}
      <View style={s.addRow}><TextInput style={[s.input, s.rowInput]} value={responsibilityDraft} onChangeText={setResponsibilityDraft} placeholder="Thêm trách nhiệm công việc" placeholderTextColor={c.muted} /><Pressable onPress={addResponsibility}><Text style={s.purpleText}>+ Thêm</Text></Pressable></View>
    </Card>
    <Card><Text style={s.sectionTitle}>Yêu cầu</Text><Text style={s.helper}>Thêm mô tả yêu cầu. Nếu nội dung có tên kỹ năng trong danh mục UniNet, kỹ năng sẽ tự được gắn vào đúng nhóm.</Text>
      <PillSelect values={['Bắt buộc', 'Ưu tiên']} value={requirementType === 0 ? 'Bắt buộc' : 'Ưu tiên'} onChange={value => setRequirementType(value === 'Bắt buộc' ? 0 : 1)} />
      {(requirementType === 0 ? qualifications : preferredQualifications).map((item, index) => <View style={s.editableRow} key={`${requirementType}-${index}`}><TextInput style={[s.input, s.rowInput]} value={item} onChangeText={value => (requirementType === 0 ? setQualifications : setPreferredQualifications)(current => current.map((entry, i) => i === index ? value : entry))} /><Pressable accessibilityLabel="Xóa yêu cầu" onPress={() => (requirementType === 0 ? setQualifications : setPreferredQualifications)(current => current.filter((_, i) => i !== index))}><CompanyIcon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={16} color={c.rose} /></Pressable></View>)}
      <View style={s.addRow}><TextInput style={[s.input, s.rowInput, s.textarea]} value={requirementDraft} onChangeText={setRequirementDraft} multiline placeholder="Ví dụ: Có kinh nghiệm JavaScript và Node.js" placeholderTextColor={c.muted} /><Pressable onPress={addRequirement}><Text style={s.purpleText}>+ Thêm</Text></Pressable></View>
    </Card>
    <Card><Text style={s.sectionTitle}>Kỹ năng cần có</Text><Text style={s.helper}>Chỉ kỹ năng trong danh mục UniNet mới được lưu vào tin tuyển dụng.</Text>
      <PillSelect values={['Bắt buộc', 'Ưu tiên']} value={skillType === 0 ? 'Bắt buộc' : 'Ưu tiên'} onChange={value => setSkillType(value === 'Bắt buộc' ? 0 : 1)} />
      <TextInput style={s.input} value={skillQuery} onChangeText={setSkillQuery} placeholder="Tìm kỹ năng trong danh mục..." placeholderTextColor={c.muted} />
      {!!skillQuery.trim() && (suggestedSkills.length ? <View style={s.suggestions}>{suggestedSkills.map(item => <Pressable key={item.id} onPress={() => addCatalogSkill(item, skillType)} style={s.suggestion}><Text style={s.suggestionText}>{item.name}</Text><Text style={s.purpleText}>+ Thêm</Text></Pressable>)}</View> : <Text style={s.helper}>Không tìm thấy kỹ năng phù hợp trong danh mục.</Text>)}
      {!!skills.length && <View style={s.skillList}>{skills.map(skill => <View key={skill.id} style={s.skillRow}><View style={{ flex: 1 }}><Tag tone={skill.requirementType === 0 ? 'purple' : 'green'}>{skill.name}</Tag></View><PillSelect values={['Bắt buộc', 'Ưu tiên']} value={skill.requirementType === 0 ? 'Bắt buộc' : 'Ưu tiên'} onChange={value => setSkills(current => current.map(item => item.id === skill.id ? { ...item, requirementType: value === 'Bắt buộc' ? 0 : 1 } : item))} /><Pressable accessibilityLabel={`Xóa ${skill.name}`} onPress={() => setSkills(current => current.filter(item => item.id !== skill.id))}><CompanyIcon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={16} color={c.rose} /></Pressable></View>)}</View>}
    </Card>
    <Card><Text style={s.sectionTitle}>Quyền lợi</Text>{benefits.map((item, index) => <View key={`benefit-${index}`} style={s.benefitEdit}><View style={s.editableRow}><TextInput style={[s.input, s.rowInput]} value={item.title} onChangeText={value => setBenefits(current => current.map((entry, i) => i === index ? { ...entry, title: value } : entry))} placeholder="Tiêu đề quyền lợi" placeholderTextColor={c.muted} /><Pressable accessibilityLabel="Xóa quyền lợi" onPress={() => setBenefits(current => current.filter((_, i) => i !== index))}><CompanyIcon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={16} color={c.rose} /></Pressable></View><TextInput style={[s.input, s.textarea]} value={item.description} onChangeText={value => setBenefits(current => current.map((entry, i) => i === index ? { ...entry, description: value } : entry))} multiline placeholder="Mô tả quyền lợi" placeholderTextColor={c.muted} /></View>)}
      <Field label="Tiêu đề quyền lợi mới" value={benefitTitle} onChangeText={setBenefitTitle} placeholder="Ví dụ: Mentor đồng hành" /><Field label="Mô tả quyền lợi mới" value={benefitDescription} onChangeText={setBenefitDescription} placeholder="Mô tả quyền lợi" multiline /><ActionButton title="Thêm quyền lợi" onPress={addBenefit} variant="soft" icon={{ ios: 'plus', android: 'add', web: 'add' }} />
    </Card>
    <View style={s.submitRow}><ActionButton title={saving ? 'Đang lưu…' : 'Lưu bản nháp'} onPress={() => { if (!saving && !loading) void saveJob(0); }} variant="outline" icon={{ ios: 'tray.and.arrow.down', android: 'save', web: 'save' }} /><ActionButton title={saving ? 'Đang lưu…' : editing && jobStatus === 1 ? 'Lưu thay đổi' : 'Đăng bài tuyển dụng'} onPress={() => { if (!saving && !loading) void saveJob(1); }} icon={{ ios: 'paperplane.fill', android: 'send', web: 'send' }} /></View>
  </PageScroll></CompanyPage>;
}

const s = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8 }, back: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' }, navTitle: { color: c.ink, fontSize: 13, fontWeight: '900' }, navSub: { color: c.muted, fontSize: 9, marginTop: 2 }, avatar: { width: 28, height: 28, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: c.purpleSoft }, avatarText: { color: c.purple, fontWeight: '900', fontSize: 10 },
  jobPreview: { gap: 8 }, previewTop: { flexDirection: 'row', alignItems: 'center', gap: 8 }, logo: { width: 30, height: 30, borderRadius: 9, backgroundColor: c.purple, alignItems: 'center', justifyContent: 'center' }, logoText: { color: '#FFF', fontWeight: '900' }, company: { color: c.ink, fontWeight: '800', fontSize: 10 }, helper: { color: c.muted, fontSize: 9, lineHeight: 14 }, previewTitle: { color: c.ink, fontSize: 16, fontWeight: '900' }, pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  sectionTitle: { color: c.ink, fontSize: 14, fontWeight: '900', marginBottom: 4 }, sectionSub: { color: c.muted, fontSize: 9, marginBottom: 5 }, field: { marginTop: 8, gap: 5 }, label: { color: c.ink, fontSize: 10, fontWeight: '700' }, input: { minHeight: 40, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: '#FFF', paddingHorizontal: 10, color: c.ink, fontSize: 10 }, textarea: { minHeight: 72, paddingTop: 10, lineHeight: 16 }, salaryRow: { flexDirection: 'row', gap: 8 }, dateRow: { flexDirection: 'row', gap: 8 }, dateButton: { minHeight: 40, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: '#FFF', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, dateText: { color: c.ink, fontSize: 11 }, datePlaceholder: { color: c.muted, fontSize: 11 },
  editableRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }, rowInput: { flex: 1 }, addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }, purpleText: { color: c.purple, fontSize: 10, fontWeight: '800' }, suggestions: { borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: '#FFF', overflow: 'hidden' }, suggestion: { minHeight: 38, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: c.line }, suggestionText: { color: c.ink, fontSize: 11, fontWeight: '600' }, skillList: { gap: 8, marginTop: 12 }, skillRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  benefitEdit: { paddingVertical: 8, borderBottomWidth: 1, borderColor: c.line }, submitRow: { flexDirection: 'row', gap: 8 }, error: { color: c.rose, fontSize: 11 }, pill: { borderWidth: 1, borderColor: c.line, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#FFF' }, pillActive: { backgroundColor: c.purple, borderColor: c.purple }, pillText: { color: c.muted, fontSize: 9, fontWeight: '700' }, pillTextActive: { color: '#FFF' },
});
