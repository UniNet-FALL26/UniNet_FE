import { createElement, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ActivityIndicator, findNodeHandle, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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

function addDays(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year!, month! - 1, day!);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function earliestStartBoundary(): { date: string; time: string } {
  const result = new Date(Date.now() + 60 * 60 * 1000);
  let date = datePart(result.toISOString());
  let time = `${String(result.getHours()).padStart(2, '0')}:${String(result.getMinutes()).padStart(2, '0')}`;
  if (result.getHours() === 23 && result.getMinutes() > 45) {
    date = addDays(date, 1);
    time = '00:00';
  }
  return { date, time };
}

function firstQuarterAtOrAfter(minTime: string): string {
  for (let hour = 0; hour < 24; hour += 1) {
    for (const minute of ['00', '15', '30', '45']) {
      const candidate = `${String(hour).padStart(2, '0')}:${minute}`;
      if (candidate >= minTime) return candidate;
    }
  }
  return '23:45';
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

const benefitIcons = [
  { key: 'education', ios: 'graduationcap.fill', android: 'school', web: 'school', label: 'Đào tạo', example: 'Mentor đồng hành' },
  { key: 'salary', ios: 'banknote.fill', android: 'payments', web: 'payments', label: 'Lương thưởng', example: 'Thưởng hiệu suất' },
  { key: 'health', ios: 'heart.fill', android: 'favorite', web: 'favorite', label: 'Sức khỏe', example: 'Bảo hiểm sức khỏe' },
  { key: 'flexible', ios: 'house.fill', android: 'home', web: 'home', label: 'Linh hoạt', example: 'Làm việc linh hoạt' },
  { key: 'equipment', ios: 'laptopcomputer', android: 'laptop', web: 'laptop', label: 'Thiết bị', example: 'Cấp laptop làm việc' },
  { key: 'gift', ios: 'gift.fill', android: 'card_giftcard', web: 'card_giftcard', label: 'Phúc lợi khác', example: 'Hoạt động gắn kết đội ngũ' },
] as const;
type BenefitIconKey = typeof benefitIcons[number]['key'];
const getBenefitIcon = (key?: string) => benefitIcons.find(icon => icon.key === key) ?? benefitIcons[0];

function DateTimeField({ label, value, mode, onChange, placeholder, onBlur, minDate, minTime }: { label: string; value: string; mode: 'date' | 'time'; onChange: (value: string) => void; placeholder: string; onBlur?: () => void; minDate?: string; minTime?: string }) {
  const [open, setOpen] = useState(false);
  const [timeMenuPosition, setTimeMenuPosition] = useState({ top: 0, left: 0 });
  const timeFieldRef = useRef<View>(null);
  const initial = new Date(`${value || datePart(new Date().toISOString())}T12:00:00`);
  if (mode === 'time') {
    const fallbackTime = firstQuarterAtOrAfter(minTime && minTime !== '00:00' ? minTime : '09:00');
    const displayTime = value && Number(value.slice(3)) % 15 === 0 && (!minTime || value >= minTime) ? value : fallbackTime;
    const selectedHour = displayTime.slice(0, 2);
    const selectedMinute = displayTime.slice(3, 5);
    const hours = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));
    const minutes = ['00', '15', '30', '45'];
    const chooseHour = (hour: string) => {
      const availableMinute = minutes.find(minute => !minTime || `${hour}:${minute}` >= minTime);
      if (availableMinute) {
        onChange(`${hour}:${availableMinute}`);
        setTimeout(() => onBlur?.(), 0);
      }
    };
    const chooseMinute = (minute: string) => {
      if (!minTime || `${selectedHour}:${minute}` >= minTime) onChange(`${selectedHour}:${minute}`);
      setTimeout(() => onBlur?.(), 0);
    };
    return <View ref={timeFieldRef} style={[s.field, s.timeField]}><Text style={s.label}>{label}</Text><Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => {
      if (open) { setOpen(false); return; }
      timeFieldRef.current?.measureInWindow((x, y) => {
        setTimeMenuPosition({ top: y + 60, left: Math.max(0, x) });
        setOpen(true);
      });
    }} style={s.dateButton}><Text style={value ? s.dateText : s.datePlaceholder}>{value || placeholder}</Text><CompanyIcon name={{ ios: 'clock', android: 'schedule', web: 'schedule' }} size={16} color={c.muted} /></Pressable>{open && <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={() => setOpen(false)}><View style={s.timeModalRoot}><Pressable style={s.timeModalBackdrop} onPress={() => setOpen(false)} /><View style={[s.timeDropdown, { top: timeMenuPosition.top, left: timeMenuPosition.left }]}><ScrollView style={s.timeWheel} nestedScrollEnabled showsVerticalScrollIndicator>{hours.map(hour => {
      const enabled = minutes.some(minute => !minTime || `${hour}:${minute}` >= minTime);
      return <Pressable key={hour} disabled={!enabled} onPress={() => chooseHour(hour)} style={[s.timeWheelItem, hour === selectedHour && s.timeWheelItemSelected, !enabled && s.timeWheelItemDisabled]}><Text style={[s.timeWheelText, hour === selectedHour && s.timeWheelTextSelected, !enabled && s.timeWheelTextDisabled]}>{hour}</Text></Pressable>;
    })}</ScrollView><ScrollView style={s.timeWheel} nestedScrollEnabled showsVerticalScrollIndicator>{minutes.map(minute => {
      const enabled = !minTime || `${selectedHour}:${minute}` >= minTime;
      return <Pressable key={minute} disabled={!enabled} onPress={() => chooseMinute(minute)} style={[s.timeWheelItem, minute === selectedMinute && s.timeWheelItemSelected, !enabled && s.timeWheelItemDisabled]}><Text style={[s.timeWheelText, minute === selectedMinute && s.timeWheelTextSelected, !enabled && s.timeWheelTextDisabled]}>{minute}</Text></Pressable>;
    })}</ScrollView></View></View></Modal>}</View>;
  }
  if (Platform.OS === 'web') {
    return <View style={s.field}><Text style={s.label}>{label}</Text>{createElement('input', {
      type: 'date', value, ...(minDate ? { min: minDate } : {}), onChange: (event: ChangeEvent<HTMLInputElement>) => {
        const next = event.target.value;
        if (minDate && next < minDate) return;
        onChange(next);
      },
      'aria-label': label, onBlur, style: { boxSizing: 'border-box', width: '100%', height: 40, border: `1px solid ${c.line}`, borderRadius: 10, background: '#FFF', padding: '0 10px', color: c.ink, fontSize: 12, fontFamily: 'inherit' },
    })}<Text style={s.helper}>{value ? mode === 'date' ? formatDateLabel(value) : value : placeholder}</Text></View>;
  }
  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    setOpen(false);
    if (event.type !== 'set' || !selected) return;
    if (mode === 'date' && minDate && datePart(selected.toISOString()) < minDate) return;
    onChange(`${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`);
    setTimeout(() => onBlur?.(), 0);
  };
  return <View style={s.field}><Text style={s.label}>{label}</Text><Pressable accessibilityRole="button" onPress={() => setOpen(true)} style={s.dateButton}><Text style={value ? s.dateText : s.datePlaceholder}>{value ? formatDateLabel(value) : placeholder}</Text><CompanyIcon name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }} size={16} color={c.muted} /></Pressable>{open && <DateTimePicker value={initial} mode="date" display="default" minimumDate={minDate ? new Date(`${minDate}T00:00:00`) : undefined} is24Hour onChange={onPickerChange} />}</View>;
}

const PillSelect = ({ values, value, onChange }: { values: string[]; value: string; onChange: (value: string) => void }) => <View style={s.pills}>{values.map((item) => <Pressable key={item} onPress={() => onChange(item)} style={[s.pill, value === item && s.pillActive]}><Text style={[s.pillText, value === item && s.pillTextActive]}>{item}</Text></Pressable>)}</View>;

const RequirementSwitch = ({ value, onChange }: { value: 0 | 1; onChange: (value: 0 | 1) => void }) => <View style={s.requirementSwitch} accessibilityRole="radiogroup">
  <Pressable accessibilityRole="radio" accessibilityState={{ checked: value === 0 }} onPress={() => onChange(0)} style={[s.requirementOption, value === 0 && s.requirementOptionRequired]}><Text style={[s.requirementOptionText, value === 0 && s.requirementOptionTextActive]}>Bắt buộc</Text></Pressable>
  <Pressable accessibilityRole="radio" accessibilityState={{ checked: value === 1 }} onPress={() => onChange(1)} style={[s.requirementOption, value === 1 && s.requirementOptionPreferred]}><Text style={[s.requirementOptionText, value === 1 && s.requirementOptionTextActive]}>Ưu tiên</Text></Pressable>
</View>;

function Field({ label, value, onChangeText, placeholder, multiline = false, error, onBlur }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean; error?: string; onBlur?: () => void }) {
  return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} onBlur={onBlur} placeholder={placeholder} placeholderTextColor={c.muted} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[s.input, multiline && s.textarea, !!error && s.inputError]} />{!!error && <Text style={s.fieldError}>{error}</Text>}</View>;
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
  const [skills, setSkills] = useState<{ key: string; skillId?: string; name: string; requirementType: 0 | 1 }[]>([]);
  const [benefits, setBenefits] = useState<CompanyJobBenefit[]>([]);
  const [benefitTitle, setBenefitTitle] = useState('');
  const [benefitDescription, setBenefitDescription] = useState('');
  const [benefitError, setBenefitError] = useState('');
  const [benefitIcon, setBenefitIcon] = useState<BenefitIconKey>('education');
  const [activeBenefitIconPicker, setActiveBenefitIconPicker] = useState<string | null>(null);
  const [qualifications, setQualifications] = useState<string[]>([]);
  const [preferredQualifications, setPreferredQualifications] = useState<string[]>([]);
  const [requirementDraft, setRequirementDraft] = useState('');
  const [requirementType, setRequirementType] = useState<0 | 1>(0);
  const [skillQuery, setSkillQuery] = useState('');
  const [skillType, setSkillType] = useState<0 | 1>(0);
  const [hoveredSkillDelete, setHoveredSkillDelete] = useState<string | null>(null);
  const [mobileSkillDelete, setMobileSkillDelete] = useState<string | null>(null);
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
  const [formNotice, setFormNotice] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showLeavePrompt, setShowLeavePrompt] = useState(false);
  const savedSnapshot = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const errorTargets = useRef<Record<string, View | null>>({});
  const [jobStatus, setJobStatus] = useState<0 | 1 | 2 | 3 | null>(null);
  const suggestedSkills = useMemo(() => {
    const query = skillQuery.trim().toLocaleLowerCase();
    if (!query) return [];
    return skillCatalog.filter(item => item.name.toLocaleLowerCase().includes(query) && !skills.some(skill => skill.skillId === item.id)).slice(0, 3);
  }, [skillCatalog, skillQuery, skills]);

  const formSnapshot = () => JSON.stringify({ title, startDate, startTime, deadline, workMode, location, salary, salaryMax, description, skills, benefits, qualifications, preferredQualifications, projectAreas });
  const formIsDirty = savedSnapshot.current !== null && savedSnapshot.current !== formSnapshot();
  useEffect(() => {
    if (!loading && savedSnapshot.current === null) savedSnapshot.current = formSnapshot();
  }, [loading]);

  const validateFields = () => {
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = 'Vui lòng nhập tiêu đề bài đăng.';
    if (!location.trim()) errors.location = 'Vui lòng nhập địa điểm làm việc.';
    if (!description.trim()) errors.description = 'Vui lòng nhập nội dung mô tả.';
    if (!workMode) errors.workMode = 'Vui lòng chọn hình thức làm việc.';
    const parsedDeadline = dateValue(deadline, '', true);
    if (!parsedDeadline) errors.deadline = 'Vui lòng chọn hạn ứng tuyển hợp lệ.';
    const parsedStartAt = startDate ? dateValue(startDate, startTime) : null;
    if (startDate && !parsedStartAt) errors.startAt = 'Chọn đủ ngày và giờ bắt đầu nhận hồ sơ.';
    if (parsedStartAt && (startDate < minimumStartDate || Number(startTime.split(':')[1]) % 15 !== 0 || (startDate === minimumStartDate && startTime < minimumStartTime))) errors.startAt = 'Vui lòng chọn ngày giờ trong tương lai, cách hiện tại ít nhất 1 tiếng.';
    if (startDate && deadline && deadline <= startDate) errors.deadline = 'Hạn ứng tuyển phải sau ngày bắt đầu nhận hồ sơ.';
    if (deadline && deadline < minimumDeadlineDate) errors.deadline = 'Hạn ứng tuyển phải sau ngày bắt đầu nhận hồ sơ.';
    const parseSalary = (value: string) => {
      if (!value.trim()) return null;
      const digits = value.replace(/\D/g, '');
      return /^\d+$/.test(digits) ? Number(digits) : Number.NaN;
    };
    const minimum = parseSalary(salary);
    const maximum = parseSalary(salaryMax);
    if (Number.isNaN(minimum) || (minimum != null && minimum < 1_000_000)) errors.salary = 'Lương tối thiểu phải từ 1.000.000 VND/tháng.';
    if (Number.isNaN(maximum) || (maximum != null && maximum < 1_000_000)) errors.salaryMax = 'Lương tối đa phải từ 1.000.000 VND/tháng.';
    if (minimum != null && maximum != null && minimum > maximum) errors.salary = 'Lương tối thiểu phải nhỏ hơn hoặc bằng lương tối đa.';
    return errors;
  };

  const validateOnBlur = (key: string) => {
    const errors = validateFields();
    setFieldErrors(current => {
      const next = { ...current };
      if (errors[key]) next[key] = errors[key]; else delete next[key];
      if ((key === 'salary' || key === 'salaryMax') && errors.salary) next.salary = errors.salary;
      if ((key === 'salary' || key === 'salaryMax') && errors.salaryMax) next.salaryMax = errors.salaryMax;
      if (key === 'startAt' || key === 'deadline') {
        if (errors.startAt) next.startAt = errors.startAt; else delete next.startAt;
        if (errors.deadline) next.deadline = errors.deadline; else delete next.deadline;
      }
      return next;
    });
  };

  const today = datePart(new Date().toISOString());
  const startBoundary = earliestStartBoundary();
  const minimumStartDate = startBoundary.date;
  const minimumStartTime = startDate === minimumStartDate ? startBoundary.time : '00:00';
  const minimumDeadlineDate = startDate && addDays(startDate, 1) > addDays(today, 1) ? addDays(startDate, 1) : addDays(today, 1);

  const addCatalogSkill = (item: SkillCatalogItem, type: 0 | 1) => {
    const key = item.id;
    setSkills(current => current.some(skill => skill.name.toLocaleLowerCase() === item.name.toLocaleLowerCase())
      ? current.map(skill => skill.name.toLocaleLowerCase() === item.name.toLocaleLowerCase() ? { ...skill, key, skillId: item.id, name: item.name, requirementType: type } : skill)
      : [...current, { key, skillId: item.id, name: item.name, requirementType: type }]);
    setSkillQuery('');
  };

  const addCustomSkill = () => {
    const name = skillQuery.trim().replace(/\s+/g, ' ');
    if (!name || name.length > 100) {
      setFormNotice({ type: 'error', title: 'Tên kỹ năng chưa hợp lệ', message: 'Tên kỹ năng cần có tối đa 100 ký tự.' });
      return;
    }
    const key = `pending:${name.toLocaleLowerCase()}`;
    setSkills(current => current.some(skill => skill.name.toLocaleLowerCase() === name.toLocaleLowerCase())
      ? current.map(skill => skill.name.toLocaleLowerCase() === name.toLocaleLowerCase() ? { ...skill, requirementType: skillType } : skill)
      : [...current, { key, name, requirementType: skillType }]);
    setSkillQuery('');
    setFormNotice(null);
  };

  const scrollToFirstError = (errors: Record<string, string>) => {
    const firstError = ['title', 'startAt', 'deadline', 'workMode', 'location', 'salary', 'salaryMax', 'description'].find(key => errors[key]);
    const target = firstError ? errorTargets.current[firstError] : null;
    if (!target) return;
    if (Platform.OS === 'web') {
      (target as unknown as { scrollIntoView?: (options: ScrollIntoViewOptions) => void })
        .scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }
    const scrollNode = scrollRef.current ? findNodeHandle(scrollRef.current) : null;
    if (!scrollNode) return;
    target.measureLayout(
      scrollNode,
      (_x, y) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true }),
      () => scrollRef.current?.scrollTo({ y: 0, animated: true }),
    );
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

  const addBenefit = () => {
    if (!benefitTitle.trim() || !benefitDescription.trim()) {
      setBenefitError('Vui lòng nhập tiêu đề và mô tả quyền lợi.');
      return;
    }
    setBenefitError('');
    setBenefits(current => [...current, { title: benefitTitle.trim(), description: benefitDescription.trim(), icon: benefitIcon }]);
    setBenefitTitle('');
    setBenefitDescription('');
    setBenefitIcon('education');
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
          setQualifications(job.requiredQualifications);
          setPreferredQualifications(job.preferredQualifications);
          setProjectAreas(job.projectAreas);
          setSkills(job.skills.map(skill => ({ key: skill.skillId ?? `pending:${skill.name.toLocaleLowerCase()}`, ...(skill.skillId ? { skillId: skill.skillId } : {}), name: skill.name, requirementType: skill.requirementType })));
          setBenefits(job.benefits.map((benefit, index) => ({ ...benefit, icon: benefit.icon ?? benefitIcons[index % benefitIcons.length]!.key })));
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
      setFormNotice({ type: 'error', title: 'Đăng bài thất bại', message: `${publishError} Nội dung đã được lưu thành bản nháp để bạn tiếp tục chỉnh sửa.` });
    }
  }, [publishError, shownPublishError]);

  useEffect(() => {
    if (typeof draftSaved === 'string' && draftSaved && draftSaved !== shownDraftSaved) {
      setShownDraftSaved(draftSaved);
      setFormNotice({ type: 'success', title: 'Đã lưu bản nháp', message: 'Bài tuyển dụng đã được lưu. Bạn có thể tiếp tục chỉnh sửa tại đây.' });
    }
  }, [draftSaved, shownDraftSaved]);

  const saveJob = async (status: 0 | 1, returnAfterSave = false) => {
    const errors = validateFields();
    const parsedDeadline = dateValue(deadline, '', true);
    const parsedStartAt = startDate ? dateValue(startDate, startTime) : null;
    const minimum = salary.trim() ? Number(salary.replace(/\D/g, '')) : null;
    const maximum = salaryMax.trim() ? Number(salaryMax.replace(/\D/g, '')) : null;
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setFormNotice({ type: 'error', title: 'Chưa thể lưu bài tuyển dụng', message: `Có ${Object.keys(errors).length} mục cần kiểm tra. Các lỗi được ghi ngay bên dưới trường tương ứng.` });
      scrollToFirstError(errors);
      return;
    }
    setFormNotice(null);

    const input = {
      title: title.trim(),
      workType: ['Tại văn phòng', 'Kết hợp', 'Từ xa'].indexOf(workMode) as 0 | 1 | 2,
      minSalaryVnd: minimum,
      maxSalaryVnd: maximum,
      location: location.trim(),
      description: description.trim(),
      startAt: parsedStartAt,
      deadline: parsedDeadline ?? '',
      status,
      requiredQualifications: qualifications,
      preferredQualifications,
      projectAreas,
      skills: skills.map(({ skillId, name, requirementType }) => skillId ? ({ skillId, requirementType }) : ({ name, requirementType })),
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
        setFormNotice({ type: 'error', title: 'Chưa lưu được bản nháp', message: `${cause instanceof Error ? cause.message : 'Vui lòng thử lại.'} Nội dung vẫn còn trên màn hình.` });
      } finally { setSaving(false); }
      return;
    }

    setSaving(true);
    try {
      if (status === 0) {
        const draft = editing ? await companyService.updateJob(jobId!, input) : await companyService.createJob(input);
        savedSnapshot.current = formSnapshot();
        if (returnAfterSave) { router.back(); return; }
        setShownDraftSaved('');
        router.replace({ pathname: '/(company)/create', params: { jobId: draft.id, draftSaved: String(Date.now()) } });
      } else {
        if (editing) await companyService.updateJob(jobId!, input);
        else await companyService.createJob(input);
        savedSnapshot.current = formSnapshot();
        if (returnAfterSave) { router.back(); return; }
        setJobStatus(1);
        setFormNotice({ type: 'success', title: 'Đăng bài thành công', message: 'Bài tuyển dụng đã được đăng công khai.' });
      }
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : 'Vui lòng thử lại.';
      if (status === 1) {
        try {
          const draft = await saveAsDraft();
          openSavedDraftWithError(draft.id, reason);
        } catch (draftCause) {
          setFormNotice({ type: 'error', title: 'Đăng bài thất bại', message: `${reason} Không lưu được bản nháp tự động: ${draftCause instanceof Error ? draftCause.message : 'Vui lòng thử lại.'} Nội dung vẫn còn trên màn hình.` });
        }
      } else setFormNotice({ type: 'error', title: 'Không lưu được bản nháp', message: `${reason} Nội dung vẫn còn trên màn hình.` });
    } finally {
      setSaving(false);
    }
  };

  return <CompanyPage><PageScroll scrollRef={scrollRef}>
    <View style={s.nav}><Pressable onPress={() => formIsDirty ? setShowLeavePrompt(true) : router.back()} style={s.back}><CompanyIcon name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} color={c.ink} /></Pressable><View style={{ flex: 1 }}><Text style={s.navTitle}>{editing ? 'Chỉnh sửa bài tuyển dụng' : 'Tạo bài đăng tuyển dụng'}</Text><Text style={s.navSub}>{companyName || 'Tổ chức của bạn'}</Text></View><View style={s.avatar}><Text style={s.avatarText}>{companyName.trim().charAt(0).toUpperCase() || 'Đ'}</Text></View></View>
    <Modal transparent visible={showLeavePrompt} animationType="fade" onRequestClose={() => setShowLeavePrompt(false)}><View style={s.leaveOverlay}><View style={s.leaveDialog}><Text style={s.noticeTitle}>Bài này chưa được lưu</Text><Text style={s.noticeMessage}>Bạn có muốn lưu nháp lại không?</Text><View style={s.leaveActions}><ActionButton title="Ở lại" variant="outline" onPress={() => setShowLeavePrompt(false)} /><ActionButton title="Bỏ qua" variant="soft" onPress={() => router.back()} /><ActionButton title="Lưu nháp" onPress={() => { setShowLeavePrompt(false); void saveJob(0, true); }} /></View></View></View></Modal>
    {!!formNotice && <View accessibilityRole="alert" style={[s.notice, formNotice.type === 'success' ? s.noticeSuccess : s.noticeError]}><Text style={s.noticeTitle}>{formNotice.title}</Text><Text style={s.noticeMessage}>{formNotice.message}</Text></View>}
    {!!loadError && <Card><Text style={s.error}>{loadError}</Text><ActionButton title="Quay lại" onPress={() => router.back()} variant="outline" /></Card>}
    {loading ? <Card><ActivityIndicator color={c.purple} /><Text style={s.helper}>Đang tải dữ liệu bài tuyển dụng…</Text></Card> : null}
    <Card style={s.jobPreview}>
      <View style={s.previewTop}><View style={s.logo}><Text style={s.logoText}>{companyName.trim().charAt(0).toUpperCase() || 'Đ'}</Text></View><View style={{ flex: 1 }}><Text style={s.company}>{companyName || 'Tổ chức của bạn'}</Text><Text style={s.helper}>{location || 'Địa điểm làm việc'}</Text></View></View>
      <Text style={s.previewTitle}>{title || 'Bản xem trước bài tuyển dụng'}</Text>
      {!!workMode && <Tag tone="purple">{workMode}</Tag>}
      <View style={s.pills}>{(() => {
        const minimum = toSalaryNumber(salary);
        const maximum = toSalaryNumber(salaryMax);
        const wallet = { ios: 'wallet.pass.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' } as const;
        if (minimum != null && maximum != null) return <Tag tone="green" icon={wallet}>{formatMillions(minimum)}-{formatMillions(maximum)} triệu VND/tháng</Tag>;
        if (minimum != null) return <Tag tone="green" icon={wallet}>Từ {formatMillions(minimum)} triệu VND/tháng</Tag>;
        if (maximum != null) return <Tag tone="green" icon={wallet}>Tới {formatMillions(maximum)} triệu VND/tháng</Tag>;
        return null;
      })()}{!!deadline && <Tag tone="amber">🗓 Hạn nộp: {formatDateLabel(deadline)}</Tag>}</View>
      <View style={s.pills}>{skills.map(skill => <Tag key={skill.key} tone="gray">{skill.name}</Tag>)}</View>
    </Card>
    <Card style={s.dateTimeCard}>
      <Text style={s.sectionTitle}>Thông tin công việc</Text><Text style={s.sectionSub}>Dấu * là thông tin bắt buộc.</Text>
      <View ref={node => { errorTargets.current.title = node; }}><Field label="Tiêu đề bài đăng *" value={title} onChangeText={setTitle} onBlur={() => validateOnBlur('title')} placeholder="Ví dụ: Thực tập sinh Backend" error={fieldErrors.title} /></View>
      <View ref={node => { errorTargets.current.startAt = node; }} style={s.startAtLayer}><View style={s.dateRow}><View style={{ flex: 1 }}><DateTimeField label="Bắt đầu nhận hồ sơ · tùy chọn" value={startDate} mode="date" minDate={minimumStartDate} onChange={value => { setStartDate(value); const minTime = value === minimumStartDate ? startBoundary.time : '00:00'; setStartTime(current => current && Number(current.split(':')[1]) % 15 === 0 && current >= minTime ? current : value === minimumStartDate ? firstQuarterAtOrAfter(minTime) : '09:00'); }} onBlur={() => validateOnBlur('startAt')} placeholder="Chọn ngày" /></View>{!!startDate && <View style={{ flex: 0.7 }}><DateTimeField label="Giờ bắt đầu *" value={startTime} mode="time" minTime={minimumStartTime} onChange={setStartTime} onBlur={() => validateOnBlur('startAt')} placeholder="Chọn giờ" /></View>}</View>{!!fieldErrors.startAt && <Text style={s.fieldError}>{fieldErrors.startAt}</Text>}</View>
      <View ref={node => { errorTargets.current.deadline = node; }}><DateTimeField label="Hạn ứng tuyển *" value={deadline} mode="date" minDate={minimumDeadlineDate} onChange={setDeadline} onBlur={() => validateOnBlur('deadline')} placeholder="Chọn ngày (dd/mm/yyyy)" />{!!fieldErrors.deadline && <Text style={s.fieldError}>{fieldErrors.deadline}</Text>}</View>
      <View ref={node => { errorTargets.current.workMode = node; }}><Text style={s.label}>Hình thức làm việc *</Text><PillSelect values={['Tại văn phòng', 'Kết hợp', 'Từ xa']} value={workMode} onChange={setWorkMode} />{!!fieldErrors.workMode && <Text style={s.fieldError}>{fieldErrors.workMode}</Text>}</View>
      <View ref={node => { errorTargets.current.location = node; }}><Field label="Địa điểm *" value={location} onChangeText={setLocation} onBlur={() => validateOnBlur('location')} placeholder="Nhập địa chỉ làm việc" error={fieldErrors.location} /></View>
      {!!companyAddress && <Text style={s.helper}>Địa chỉ hồ sơ: {companyAddress}. Bạn có thể sửa cho chi nhánh tuyển dụng.</Text>}
      <View style={s.salaryRow}><View ref={node => { errorTargets.current.salary = node; }} style={{ flex: 1 }}><Field label="Lương tối thiểu · VND/tháng" value={salary} onChangeText={value => setSalary(formatVnd(value))} onBlur={() => validateOnBlur('salary')} placeholder="Ví dụ: 4.000.000" error={fieldErrors.salary} /></View><View ref={node => { errorTargets.current.salaryMax = node; }} style={{ flex: 1 }}><Field label="Lương tối đa · VND/tháng" value={salaryMax} onChangeText={value => setSalaryMax(formatVnd(value))} onBlur={() => validateOnBlur('salaryMax')} placeholder="Ví dụ: 6.000.000" error={fieldErrors.salaryMax} /></View></View>
      <Text style={s.helper}>Chỉ nhập số nguyên dương; dấu phân cách được định dạng tự động. Có thể để trống cả hai mức nếu thỏa thuận.</Text>
    </Card>
    <Card><Text style={s.sectionTitle}>Mô tả công việc</Text><View ref={node => { errorTargets.current.description = node; }}><Field label="Nội dung *" value={description} onChangeText={setDescription} onBlur={() => validateOnBlur('description')} multiline placeholder="Mô tả trách nhiệm, môi trường làm việc và quyền lợi..." error={fieldErrors.description} /></View><Text style={s.helper}>Mô tả rõ vai trò, hướng dẫn và sản phẩm giúp ứng viên hiểu cơ hội.</Text>
    </Card>
    <Card><Text style={s.sectionTitle}>Yêu cầu</Text><Text style={s.helper}>Thêm mô tả yêu cầu. Nếu nội dung có tên kỹ năng trong danh mục UniNet, kỹ năng sẽ tự được gắn vào đúng nhóm.</Text>
      <RequirementSwitch value={requirementType} onChange={setRequirementType} />
      {(requirementType === 0 ? qualifications : preferredQualifications).map((item, index) => <View style={s.editableRow} key={`${requirementType}-${index}`}><TextInput style={[s.input, s.rowInput]} value={item} onChangeText={value => (requirementType === 0 ? setQualifications : setPreferredQualifications)(current => current.map((entry, i) => i === index ? value : entry))} /><Pressable accessibilityLabel="Xóa yêu cầu" onPress={() => (requirementType === 0 ? setQualifications : setPreferredQualifications)(current => current.filter((_, i) => i !== index))}><CompanyIcon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={16} color={c.rose} /></Pressable></View>)}
      <View style={s.addRow}><TextInput style={[s.input, s.rowInput, s.textarea]} value={requirementDraft} onChangeText={setRequirementDraft} multiline placeholder="Ví dụ: Có kinh nghiệm JavaScript và Node.js" placeholderTextColor={c.muted} /><Pressable onPress={addRequirement}><Text style={s.purpleText}>+ Thêm</Text></Pressable></View>
    </Card>
    <Card><Text style={s.sectionTitle}>Kỹ năng cần có</Text><Text style={s.helper}>Chọn nhóm trước khi thêm. Kỹ năng mới sẽ được gửi để admin phân loại sau khi bài được đăng công khai.</Text>
      <RequirementSwitch value={skillType} onChange={setSkillType} />
      <TextInput style={s.input} value={skillQuery} onChangeText={setSkillQuery} placeholder="Tìm kỹ năng trong danh mục..." placeholderTextColor={c.muted} />
      {!!skillQuery.trim() && (suggestedSkills.length ? <View style={s.suggestions}>{suggestedSkills.map(item => <Pressable key={item.id} onPress={() => addCatalogSkill(item, skillType)} style={s.suggestion}><Text style={s.suggestionText}>{item.name}</Text><Text style={s.purpleText}>+ Thêm</Text></Pressable>)}</View> : <View style={s.noSkill}><Text style={s.helper}>Chưa có kỹ năng này trong danh mục.</Text><Pressable onPress={addCustomSkill}><Text style={s.purpleText}>+ Thêm “{skillQuery.trim()}” vào bài tuyển dụng</Text></Pressable></View>)}
      {!!skills.length && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.skillList}>{skills.map(skill => {
        const canRemove = hoveredSkillDelete === skill.key || mobileSkillDelete === skill.key;
        return <View key={skill.key} onPointerEnter={Platform.OS === 'web' ? () => setHoveredSkillDelete(skill.key) : undefined} onPointerLeave={Platform.OS === 'web' ? () => setHoveredSkillDelete(current => current === skill.key ? null : current) : undefined} style={[s.skillChip, skill.requirementType === 0 ? s.skillRequired : s.skillPreferred]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${skill.name}, ${skill.requirementType === 0 ? 'bắt buộc' : 'ưu tiên'}${canRemove ? ', nút xóa đang hiện' : ', chạm để hiện nút xóa'}`} onPress={() => setMobileSkillDelete(current => current === skill.key ? null : skill.key)} style={s.skillChipBody}>
            <Text numberOfLines={1} style={[s.skillChipText, skill.requirementType === 0 ? s.skillRequiredText : s.skillPreferredText]}>{skill.name}</Text>
          </Pressable>
          {canRemove && <Pressable accessibilityRole="button" accessibilityLabel={`Xóa ${skill.name}`} onPress={() => { setSkills(current => current.filter(item => item.key !== skill.key)); setHoveredSkillDelete(null); setMobileSkillDelete(null); }} style={s.skillRemove}><Text style={s.skillRemoveText}>×</Text></Pressable>}
        </View>;
      })}</ScrollView>}
    </Card>
    <Card><Text style={s.sectionTitle}>Quyền lợi</Text><Text style={s.helper}>Chọn một icon có sẵn làm biểu tượng cho từng quyền lợi.</Text>{benefits.map((item, index) => {
      const icon = getBenefitIcon(item.icon);
      const pickerKey = `benefit-${index}`;
      return <View key={pickerKey} style={s.benefitEdit}><View style={s.benefitRow}><Pressable accessibilityRole="button" accessibilityLabel={`Chọn icon: ${icon.label}`} onPress={() => setActiveBenefitIconPicker(current => current === pickerKey ? null : pickerKey)} style={s.benefitIconTile}><CompanyIcon name={{ ios: icon.ios, android: icon.android, web: icon.web }} size={23} color={c.blue} /></Pressable><View style={s.benefitFields}><Text style={s.label}>Tiêu đề</Text><TextInput style={s.benefitInput} value={item.title} onChangeText={value => setBenefits(current => current.map((entry, i) => i === index ? { ...entry, title: value } : entry))} placeholder={`Ví dụ: ${icon.example}`} placeholderTextColor={c.muted} /><Text style={s.label}>Mô tả</Text><TextInput style={[s.benefitInput, s.benefitDescription]} value={item.description} onChangeText={value => setBenefits(current => current.map((entry, i) => i === index ? { ...entry, description: value } : entry))} multiline placeholder="Mô tả quyền lợi" placeholderTextColor={c.muted} /></View><Pressable accessibilityLabel="Xóa quyền lợi" onPress={() => setBenefits(current => current.filter((_, i) => i !== index))} style={s.benefitDelete}><CompanyIcon name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={18} color={c.muted} /></Pressable></View>
        {activeBenefitIconPicker === pickerKey && <View style={s.benefitIconOptions}>{benefitIcons.map(option => <Pressable key={option.key} accessibilityRole="button" accessibilityLabel={option.label} onPress={() => { setBenefits(current => current.map((entry, i) => i === index ? { ...entry, icon: option.key } : entry)); setActiveBenefitIconPicker(null); }} style={[s.benefitIconOption, icon.key === option.key && s.benefitIconOptionActive]}><CompanyIcon name={{ ios: option.ios, android: option.android, web: option.web }} size={19} color={icon.key === option.key ? c.blue : c.muted} /></Pressable>)}</View>}
      </View>;
    })}
      <View style={s.newBenefit}><View style={s.newBenefitIconColumn}><Pressable accessibilityRole="button" accessibilityLabel={`Chọn icon: ${getBenefitIcon(benefitIcon).label}`} onPress={() => setActiveBenefitIconPicker(current => current === 'new' ? null : 'new')} style={s.benefitIconTile}><CompanyIcon name={{ ios: getBenefitIcon(benefitIcon).ios, android: getBenefitIcon(benefitIcon).android, web: getBenefitIcon(benefitIcon).web }} size={23} color={c.blue} /></Pressable></View><View style={s.benefitFields}><Text style={s.label}>Tiêu đề</Text><TextInput style={s.benefitInput} value={benefitTitle} onChangeText={setBenefitTitle} placeholder={`Ví dụ: ${getBenefitIcon(benefitIcon).example}`} placeholderTextColor={c.muted} /><Text style={s.label}>Mô tả</Text><TextInput style={[s.benefitInput, s.benefitDescription]} value={benefitDescription} onChangeText={setBenefitDescription} multiline placeholder="Mô tả quyền lợi" placeholderTextColor={c.muted} /></View></View>
      {activeBenefitIconPicker === 'new' && <View style={s.benefitIconOptions}>{benefitIcons.map(option => <Pressable key={option.key} accessibilityRole="button" accessibilityLabel={option.label} onPress={() => { setBenefitIcon(option.key); setActiveBenefitIconPicker(null); }} style={[s.benefitIconOption, benefitIcon === option.key && s.benefitIconOptionActive]}><CompanyIcon name={{ ios: option.ios, android: option.android, web: option.web }} size={19} color={benefitIcon === option.key ? c.blue : c.muted} /></Pressable>)}</View>}
      {!!benefitError && <Text accessibilityRole="alert" style={s.fieldError}>{benefitError}</Text>}
      <ActionButton title="Thêm quyền lợi" onPress={addBenefit} variant="soft" icon={{ ios: 'plus', android: 'add', web: 'add' }} />
    </Card>
    <View style={s.submitRow}><ActionButton title={saving ? 'Đang lưu…' : 'Lưu bản nháp'} onPress={() => { if (!saving && !loading) void saveJob(0); }} variant="outline" icon={{ ios: 'tray.and.arrow.down', android: 'save', web: 'save' }} /><ActionButton title={saving ? 'Đang lưu…' : editing && jobStatus === 1 ? 'Lưu thay đổi' : 'Đăng bài tuyển dụng'} onPress={() => { if (!saving && !loading) void saveJob(1); }} icon={{ ios: 'paperplane.fill', android: 'send', web: 'send' }} /></View>
  </PageScroll></CompanyPage>;
}

const s = StyleSheet.create({
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8 }, back: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' }, navTitle: { color: c.ink, fontSize: 13, fontWeight: '900' }, navSub: { color: c.muted, fontSize: 9, marginTop: 2 }, avatar: { width: 28, height: 28, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: c.purpleSoft }, avatarText: { color: c.purple, fontWeight: '900', fontSize: 10 },
  jobPreview: { gap: 8 }, previewTop: { flexDirection: 'row', alignItems: 'center', gap: 8 }, logo: { width: 30, height: 30, borderRadius: 9, backgroundColor: c.purple, alignItems: 'center', justifyContent: 'center' }, logoText: { color: '#FFF', fontWeight: '900', fontSize: 10 }, company: { color: c.ink, fontWeight: '800', fontSize: 10 }, helper: { color: c.muted, fontSize: 9, lineHeight: 14 }, previewTitle: { color: c.ink, fontSize: 16, fontWeight: '900' }, pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  sectionTitle: { color: c.ink, fontSize: 14, fontWeight: '900', marginBottom: 4 }, sectionSub: { color: c.muted, fontSize: 9, marginBottom: 5 }, field: { marginTop: 8, gap: 5 }, label: { color: c.ink, fontSize: 10, fontWeight: '700' }, input: { minHeight: 40, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: '#FFF', paddingHorizontal: 10, color: c.ink, fontSize: 10 }, textarea: { minHeight: 72, paddingTop: 10, lineHeight: 16 }, salaryRow: { flexDirection: 'row', gap: 8 }, dateRow: { flexDirection: 'row', gap: 8 }, dateButton: { minHeight: 40, borderRadius: 10, borderWidth: 1, borderColor: c.line, backgroundColor: '#FFF', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, dateText: { color: c.ink, fontSize: 11 }, datePlaceholder: { color: c.muted, fontSize: 11 }, dateTimeCard: { position: 'relative', zIndex: 1000, elevation: 100 }, startAtLayer: { position: 'relative', zIndex: 1000, elevation: 100 },
  editableRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }, rowInput: { flex: 1 }, addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }, purpleText: { color: c.purple, fontSize: 10, fontWeight: '800' }, suggestions: { borderWidth: 1, borderColor: c.line, borderRadius: 10, backgroundColor: '#FFF', overflow: 'hidden' }, suggestion: { minHeight: 38, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: c.line }, suggestionText: { color: c.ink, fontSize: 11, fontWeight: '600' }, noSkill: { gap: 6, marginTop: 7 }, skillList: { gap: 8, marginTop: 12, alignItems: 'center' }, skillChip: { minHeight: 32, maxWidth: 260, paddingLeft: 10, paddingRight: 8, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 18, borderWidth: 1 }, skillRequired: { borderColor: '#BFDBFE', backgroundColor: '#EAF3FF' }, skillPreferred: { borderColor: '#BBF7D0', backgroundColor: '#E8F7F0' }, skillChipBody: { minHeight: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, skillChipText: { maxWidth: 220, fontSize: 10, fontWeight: '700' }, skillRequiredText: { color: c.purple }, skillPreferredText: { color: c.green }, skillRemove: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2' }, skillRemoveText: { color: c.rose, fontSize: 15, fontWeight: '700', lineHeight: 17 },
  requirementSwitch: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 3, padding: 3, borderRadius: 20, backgroundColor: '#F1F5F9' }, requirementOption: { minHeight: 30, paddingHorizontal: 12, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, requirementOptionRequired: { backgroundColor: c.purple }, requirementOptionPreferred: { backgroundColor: c.green }, requirementOptionText: { color: c.muted, fontSize: 9, fontWeight: '800' }, requirementOptionTextActive: { color: '#FFF' },
  benefitEdit: { paddingVertical: 12, borderBottomWidth: 1, borderColor: c.line }, benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, benefitIconTile: { width: 44, height: 44, marginTop: 21, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF3FF' }, benefitFields: { flex: 1, gap: 6 }, benefitInput: { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: c.line, backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 9, color: c.ink, fontSize: 12 }, benefitDescription: { minHeight: 72, textAlignVertical: 'top' }, benefitDelete: { marginTop: 20, padding: 4 }, benefitIconOptions: { flexDirection: 'row', gap: 8, marginTop: 10, marginLeft: 54, paddingVertical: 2 }, benefitIconOption: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: c.line, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' }, benefitIconOptionActive: { backgroundColor: '#EAF3FF', borderColor: c.blue }, newBenefit: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 12 }, newBenefitIconColumn: { width: 44 }, submitRow: { flexDirection: 'row', gap: 8 }, error: { color: c.rose, fontSize: 11 }, inputError: { borderColor: c.rose }, fieldError: { color: c.rose, fontSize: 9, lineHeight: 13 }, notice: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 3 }, noticeSuccess: { backgroundColor: '#ECFDF5', borderColor: '#86EFAC' }, noticeError: { backgroundColor: '#FFF1F2', borderColor: '#FDA4AF' }, noticeTitle: { color: c.ink, fontSize: 11, fontWeight: '800' }, noticeMessage: { color: c.ink, fontSize: 10, lineHeight: 15 }, leaveOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 }, leaveDialog: { width: '100%', maxWidth: 420, padding: 18, borderRadius: 16, backgroundColor: '#FFF', gap: 10 }, leaveActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 8, marginTop: 6 }, timeField: { position: 'relative', zIndex: 1000 }, timeModalRoot: { flex: 1 }, timeModalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'transparent' }, timeDropdown: { position: 'absolute', width: 152, height: 216, flexDirection: 'row', backgroundColor: '#FFF', borderWidth: 1, borderColor: c.line, borderRadius: 4, zIndex: 2000, elevation: 100, shadowColor: '#0F172A', shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }, timeWheel: { flex: 1 }, timeWheelItem: { height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' }, timeWheelItemSelected: { backgroundColor: '#0878F9' }, timeWheelItemDisabled: { backgroundColor: '#EEF1F5' }, timeWheelText: { color: c.ink, fontSize: 13, fontWeight: '500' }, timeWheelTextSelected: { color: '#FFF', fontWeight: '800' }, timeWheelTextDisabled: { color: '#C4CBD4' }, pill: { borderWidth: 1, borderColor: c.line, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#FFF' }, pillActive: { backgroundColor: c.purple, borderColor: c.purple }, pillText: { color: c.muted, fontSize: 9, fontWeight: '700' }, pillTextActive: { color: '#FFF' },
});
