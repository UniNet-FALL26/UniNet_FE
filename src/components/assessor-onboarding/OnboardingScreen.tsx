/* eslint-disable react-hooks/set-state-in-effect -- URL, AppState and expiry events must immediately clear sensitive screen state. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { PdfViewer } from './PdfViewer';
import { assessorOnboardingService as api, OnboardingError } from '@/services/assessor-onboarding.service';
import { consumeOnboardingLink, onboardingLink, validOtp, validPassword, validateProfile } from '@/utils/assessor-onboarding';
import type { ActivationInspect, ContractInspect, OnboardingStep, ProfileInput } from '@/types/assessor-onboarding';

const blank: ProfileInput = { fullName: '', citizenId: '', taxCode: '', bankName: '', bankAccountNumber: '', bankAccountHolder: '' };
const labels: Record<keyof ProfileInput, string> = { fullName: 'Họ và tên', citizenId: 'CCCD', taxCode: 'Mã số thuế', bankName: 'Tên ngân hàng', bankAccountNumber: 'Số tài khoản', bankAccountHolder: 'Chủ tài khoản' };
export function OnboardingScreen({ step }: { step: OnboardingStep }) {
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<ProfileInput>({ ...blank });
  const [activation, setActivation] = useState<ActivationInspect | null>(null);
  const [contract, setContract] = useState<ContractInspect | null>(null);
  const [session, setSession] = useState('');
  const [stage, setStage] = useState<'link' | 'otp' | 'read' | 'sign'>('link');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [notice, setNotice] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [pdf, setPdf] = useState('');
  const [pdfReady, setPdfReady] = useState(false);
  const lock = useRef(false);
  const alive = useRef(true);
  const generation = useRef(0);
  const actionGeneration = useRef(0);
  const pdfRef = useRef('');
  const clearPdf = useCallback(() => { if (pdfRef.current && Platform.OS === 'web') URL.revokeObjectURL(pdfRef.current); pdfRef.current = ''; setPdf(''); setPdfReady(false); }, []);
  const clearSecrets = useCallback(() => { setToken(''); setSession(''); setProfile({ ...blank }); setPassword(''); setConfirm(''); setCode(''); setName(''); setAccepted(false); setContract(null); clearPdf(); }, [clearPdf]);
  useEffect(() => {
    alive.current = true;
    const receive = (url: string) => {
      const link = onboardingLink(url);
      if (link?.step !== step) return;
      generation.current++; clearSecrets(); setDone(false); setReady(false); setEmail(''); setActivation(null); setBlocked(false); setError(''); setStage('link'); setToken(link.token);
    };
    if (Platform.OS === 'web') {
      if (window.location.hash) receive(window.location.href);
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
      const meta = document.createElement('meta'); meta.name = 'referrer'; meta.content = 'no-referrer'; document.head.appendChild(meta);
      return () => { alive.current = false; generation.current++; meta.remove(); if (pdfRef.current) URL.revokeObjectURL(pdfRef.current); };
    }
    const captured = consumeOnboardingLink(step);
    if (captured) setToken(captured); else void Linking.getInitialURL().then(url => { if (url && alive.current) receive(url); });
    const subscription = Linking.addEventListener('url', ({ url }) => receive(url));
    // This ref is an invalidation counter, not a DOM node; increment the current value on cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { alive.current = false; generation.current++; subscription.remove(); };
    // The route owns all sensitive state; never persist it.
  }, [step, clearSecrets]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const app = AppState.addEventListener('change', state => {
      if (state !== 'active') { generation.current++; clearPdf(); setSession(''); setContract(null); setCode(''); setStage('link'); }
    });
    const hide = () => { if (document.hidden) { generation.current++; clearPdf(); setSession(''); setContract(null); setCode(''); setStage('link'); } };
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', hide);
    return () => { clearInterval(timer); app.remove(); if (Platform.OS === 'web') document.removeEventListener('visibilitychange', hide); };
  }, [clearPdf]);
  useEffect(() => {
    if (contract?.readSessionExpiresAt && now >= Date.parse(contract.readSessionExpiresAt)) {
      generation.current++; clearPdf(); setSession(''); setContract(null); setCode(''); setStage('link'); setError('Phiên đọc đã hết hạn. Mở email mới nhất và xác thực lại.');
    }
  }, [now, contract, clearPdf]);
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; actionGeneration.current = generation.current; setBusy(true); setError(''); setFields({});
    try { await action(); } catch (cause) {
      if (alive.current && actionGeneration.current === generation.current) {
        const failure = cause instanceof OnboardingError ? cause : new OnboardingError('Không thể hoàn tất thao tác. Vui lòng thử lại theo thao tác chủ động.');
        setError(failure.message); setFields(failure.fields);
        if (failure.status === 429) setCooldown(Date.now() + failure.retryAfter * 1000);
        if (failure.status === 409 || failure.status === 410) { setBlocked(true); setReady(false); setSession(''); setContract(null); clearPdf(); }
        if (failure.code === 'CONTRACT_NOT_VIEWED') clearPdf();
        if (failure.code === 'SIGNATURE_INVALID') { setContract(null); clearPdf(); setStage('read'); }
      }
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  async function inspect() {
    const epoch = generation.current;
    if (step === 'profile') { const result = await api.inspectProfile(token); if (epoch === generation.current && alive.current) { setEmail(result.email); setReady(true); } }
    if (step === 'activate') { const result = await api.inspectActivation(token); if (epoch === generation.current && alive.current) { setActivation(result); setEmail(result.emailNormalized); setReady(true); } }
  }
  useEffect(() => {
    if (!token || step === 'contract') return;
    let cancelled = false;
    setBusy(true); setError('');
    const request = step === 'profile' ? api.inspectProfile(token) : api.inspectActivation(token);
    void request.then(result => {
      if (cancelled) return;
      if ('email' in result) setEmail(result.email);
      else { setActivation(result); setEmail(result.emailNormalized); }
      setReady(true);
    }).catch(cause => {
      if (cancelled) return;
      setError(cause instanceof Error ? cause.message : 'Không kiểm tra được liên kết.');
      if (cause instanceof OnboardingError && (cause.status === 409 || cause.status === 410)) setBlocked(true);
    }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [token, step]);
  const wait = Math.max(0, Math.ceil((cooldown - now) / 1000));
  const loadContract = async (readToken: string) => { clearPdf(); setContract(null); setAccepted(false); setCode(''); const epoch = generation.current; const result = await api.inspectContract(readToken); if (epoch !== generation.current || !alive.current) return; setContract(result); setName(result.fullName || ''); setStage('read'); };
  const complete = (message: string) => { if (!alive.current || actionGeneration.current !== generation.current) return; clearSecrets(); setEmail(''); setActivation(null); setDone(true); setNotice(message); };
  return <SafeAreaView style={styles.safe}><ScrollView contentContainerStyle={styles.outer} keyboardShouldPersistTaps="handled"><View style={styles.card}>
    <Text style={styles.brand}>UniNet · Thẩm định viên</Text><Text style={styles.title}>{step === 'profile' ? 'Hoàn thiện hồ sơ' : step === 'contract' ? 'Xác nhận hợp đồng' : 'Kích hoạt tài khoản'}</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {Object.entries(fields).map(([key, values]) => <Text style={styles.error} key={key}>{labels[key as keyof ProfileInput] || key}: {values.join(' ')}</Text>)}
    {!!notice && <Text style={styles.text}>{notice}</Text>}
    {done ? <>{step === 'activate' && <Button title="Đến đăng nhập" onPress={() => router.replace('/(auth)/login')} />}</> : <>
      {!token ? <Text style={styles.text}>Vui lòng mở lại liên kết trong lời mời hoặc email mới nhất. Nếu cần hỗ trợ, liên hệ Admin.</Text> : <>
        {step !== 'contract' && !ready && !blocked && <OnboardingAction title="Kiểm tra lại liên kết" work={inspect} disabled={false} busy={busy} onRun={run} />}
        {!!email && <Text style={styles.text}>Email: {email}</Text>}
        {step === 'profile' && ready && <>
          <Text style={styles.text}>Lời mời có hiệu lực 7 ngày và chỉ nộp một lần. Kiểm tra kỹ thông tin trước khi gửi.</Text>
          {(Object.keys(labels) as (keyof ProfileInput)[]).map(key => <View key={key}><OnboardingField label={labels[key]} value={profile[key]} onChange={value => setProfile(current => ({ ...current, [key]: value }))} secure={false} maxLength={key === 'fullName' || key === 'bankAccountHolder' ? 255 : key === 'bankName' ? 150 : key === 'citizenId' ? 12 : key === 'taxCode' ? 14 : 34} busy={busy} /></View>)}
          <OnboardingAction title={'Nộp hồ sơ'} work={async () => {
            const errors = validateProfile(profile); if (Object.keys(errors).length) { setFields(Object.fromEntries(Object.entries(errors).map(([key, value]) => [key, [value!]]))); return; }
            await api.submitProfile(token, { ...profile, fullName: profile.fullName.trim(), bankName: profile.bankName.trim(), bankAccountHolder: profile.bankAccountHolder.trim() });
            complete('Đã nhận hồ sơ. Vui lòng kiểm tra email để tiếp tục ký hợp đồng.');
          }} disabled={false} busy={busy} onRun={run} />
          <OnboardingAction title={'Kiểm tra lại tình trạng liên kết'} work={inspect} disabled={false} busy={busy} onRun={run} />
        </>}
        {step === 'activate' && <>
          {ready && <><Text style={styles.text}>{activation?.fullName}{activation?.expiresAt ? ` · Hạn liên kết: ${new Date(activation.expiresAt).toLocaleString('vi-VN')}` : ''}</Text>
            <OnboardingField label={'Mật khẩu (8–1024 ký tự, có chữ và số)'} value={password} onChange={setPassword} secure={true} maxLength={1024} busy={busy} />
            <OnboardingField label={'Xác nhận mật khẩu'} value={confirm} onChange={setConfirm} secure={true} maxLength={1024} busy={busy} />
            <OnboardingAction title={'Đặt mật khẩu và kích hoạt'} work={async () => {
              if (!validPassword(password) || password !== confirm) { setError('Mật khẩu cần 8–1024 ký tự, có chữ và số; xác nhận phải trùng khớp.'); return; }
              await api.setPassword(token, password, confirm); complete('Tài khoản đã được kích hoạt. Bạn có thể đăng nhập.');
            }} disabled={false} busy={busy} onRun={run} />
          </>}
          <OnboardingAction title={wait ? `Gửi lại sau ${wait}s` : 'Yêu cầu liên kết kích hoạt mới'} work={async () => { await api.resendActivation(token); setCooldown(Date.now() + 60000); setNotice('Nếu liên kết còn đủ điều kiện, hướng dẫn mới sẽ được gửi qua email. Vui lòng mở email mới nhất.'); }} disabled={wait > 0} busy={busy} onRun={run} />
          <Button title="Thử đăng nhập nếu đã đặt mật khẩu" variant="outline" onPress={() => router.push('/(auth)/login')} />
        </>}
        {step === 'contract' && Platform.OS !== 'web' && <>
          <Text style={styles.text}>Tiếp tục trên trình duyệt để đọc PDF và ký hợp đồng. Bạn cần bắt đầu xác thực lại bằng mã OTP. Không gửi liên kết cho người khác.</Text>
          <OnboardingAction title={'Mở hợp đồng trên web'} work={async () => {
            const origin = process.env.EXPO_PUBLIC_ASSESSOR_ONBOARDING_WEB_ORIGIN;
            if (!origin || !/^https:\/\/[^/?#]+\/?$/.test(origin)) throw new OnboardingError('Chưa cấu hình địa chỉ web hợp đồng. Mở liên kết email trong trình duyệt hoặc liên hệ Admin.');
            await WebBrowser.openBrowserAsync(`${origin.replace(/\/$/, '')}/assessor-onboarding/contract.html#token=${encodeURIComponent(token)}`);
          }} disabled={false} busy={busy} onRun={run} />
        </>}
        {step === 'contract' && Platform.OS === 'web' && !blocked && <>
          <Text style={styles.text}>Liên kết hợp đồng có hiệu lực 3 ngày. OTP có hiệu lực 10 phút, tối đa 5 lần sai. Cả mã đọc và mã ký dùng chung giới hạn 3 mã/giờ; mỗi lần gửi cách nhau ít nhất 60 giây.</Text>
          {(stage === 'link' || stage === 'otp') && <>
            <OnboardingAction title={wait ? `Xin mã đọc sau ${wait}s` : 'Gửi mã OTP để đọc hợp đồng'} work={async () => { await api.requestReadOtp(token); setCooldown(Date.now() + 60000); setStage('otp'); setNotice('Đã nhận yêu cầu gửi mã OTP đọc hợp đồng.'); }} disabled={wait > 0} busy={busy} onRun={run} />
            {stage === 'otp' && <><OnboardingField label={'OTP đọc (6 chữ số)'} value={code} onChange={setCode} secure={false} maxLength={6} busy={busy} /><OnboardingAction title={'Xác thực mã đọc'} work={async () => { const epoch = generation.current; const result = await api.verifyReadOtp(token, code); if (epoch !== generation.current || !alive.current) return; setSession(result.token); setCode(''); setStage('read'); await loadContract(result.token); }} disabled={!validOtp(code)} busy={busy} onRun={run} /></>}
          </>}
          {!!session && <>
            <OnboardingAction title={'Tải lại thông tin hợp đồng'} work={() => loadContract(session)} disabled={false} busy={busy} onRun={run} />
            {!!contract && <><Text style={styles.text}>{contract.fullName} · Phiên bản {contract.templateVersion || '—'}</Text><Text style={styles.text}>{contract.readSessionExpiresAt ? `Phiên đọc đến ${new Date(contract.readSessionExpiresAt).toLocaleString('vi-VN')}` : 'Phiên đọc tối đa 30 phút và phụ thuộc hạn liên kết.'}</Text>
              <OnboardingAction title={'Mở / tải lại PDF hợp đồng'} work={async () => {
                clearPdf();
                const epoch = generation.current;
                const blob = await api.getContractPdf(session);
                if (epoch !== generation.current || !alive.current) return;
                const url = URL.createObjectURL(blob); pdfRef.current = url; setPdf(url);
              }} disabled={false} busy={busy} onRun={run} />
              {!!pdf && <PdfViewer key={pdf} url={pdf} onReady={() => setPdfReady(true)} onError={() => { clearPdf(); setError('Không mở được PDF. Vui lòng tải và mở lại trước khi ký.'); }} />}
              <OnboardingAction title={wait ? `Xin mã ký sau ${wait}s` : 'Gửi OTP ký hợp đồng'} work={async () => { await api.requestSignOtp(session); setCooldown(Date.now() + 60000); setStage('sign'); setCode(''); setNotice('Đã nhận yêu cầu gửi mã OTP ký hợp đồng.'); }} disabled={!pdfReady || wait > 0 || !contract.signatureStatement || !/^[a-fA-F0-9]{64}$/.test(contract.contractSha256 || '')} busy={busy} onRun={run} />
              {(!contract.signatureStatement || !/^[a-fA-F0-9]{64}$/.test(contract.contractSha256 || '')) && <Text style={styles.error}>Thiếu dữ liệu xác nhận hợp đồng. Vui lòng tải lại thông tin.</Text>}
              {stage === 'sign' && <>
                <OnboardingField label={'Tên người ký'} value={name} onChange={setName} secure={false} maxLength={255} busy={busy} /><OnboardingField label={'OTP ký (6 chữ số)'} value={code} onChange={setCode} secure={false} maxLength={6} busy={busy} />
                <Text style={styles.text}>{contract.signatureStatement}</Text><Button title={accepted ? '☑ Tôi đồng ý với nội dung xác nhận trên' : '☐ Tôi đồng ý với nội dung xác nhận trên'} variant="outline" disabled={busy} onPress={() => setAccepted(value => !value)} />
                <OnboardingAction title={'Xác nhận ký hợp đồng'} work={async () => { await api.signContract(session, code, name.trim(), contract.contractSha256!, accepted); complete('Đã ký, hồ sơ đang chờ xét duyệt. Kết quả và hướng dẫn tiếp theo sẽ được gửi qua email.'); }} disabled={!pdfReady || !accepted || !validOtp(code) || !name.trim() || name.trim().length > 255 || !contract.signatureStatement || !/^[a-fA-F0-9]{64}$/.test(contract.contractSha256 || '')} busy={busy} onRun={run} />
              </>}
            </>}
          </>}
        </>}
      </>}
    </>}
  </View></ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#F1F5F9' }, outer: { padding: 20, alignItems: 'center' }, card: { width: '100%', maxWidth: 760, backgroundColor: '#FFF', padding: 24, borderRadius: 16, gap: 18 }, brand: { color: '#2563EB', fontWeight: '700' }, title: { fontSize: 28, fontWeight: '700', color: '#0F172A' }, text: { fontSize: 15, lineHeight: 24, color: '#334155' }, error: { color: '#B91C1C', lineHeight: 23 }, field: { gap: 8 }, label: { fontWeight: '600', color: '#334155' }, input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, fontSize: 16, color: '#0F172A' } });


function OnboardingAction({ title, work, disabled, busy, onRun }: { title: string; work: () => Promise<void>; disabled: boolean; busy: boolean; onRun: (work: () => Promise<void>) => Promise<void> }) {
  return <Button title={title} disabled={disabled} loading={busy} onPress={() => { void onRun(work); }} />;
}

function OnboardingField({ label, value, onChange, secure, maxLength, busy }: { label: string; value: string; onChange: (value: string) => void; secure: boolean; maxLength?: number; busy: boolean }) {
 return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} secureTextEntry={secure} autoCapitalize="none" autoCorrect={false} maxLength={maxLength} editable={!busy} style={styles.input} /></View>;
}

