import { useCallback, useEffect, useRef, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { ACCOUNT_ROLE } from '@/constants/roles';
import { useAuthStore } from '@/store/auth.store';
import { walletService, type WalletData, type WithdrawalInput } from '@/services/wallet.service';
import { WalletContent } from '@/components/wallet/WalletContent';

const money = (value: string) => BigInt(value).toLocaleString('vi-VN') + ' ₫';
const states = ['Chờ duyệt', 'Đã duyệt', 'Đã lập lệnh chi', 'Đã chuyển tiền', 'Từ chối', 'Đã hủy'];
export default function WalletScreen() {
  const { account, isAuthenticated, isLoading } = useAuthStore();
  const [data, setData] = useState<WalletData | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState(''), [bank, setBank] = useState(''), [number, setNumber] = useState(''), [holder, setHolder] = useState('');
  const pending = useRef<WithdrawalInput | null>(null); const running = useRef(false); const identity = useRef(account?.id); identity.current = account?.id;
  const refresh = useCallback(async (signal?: AbortSignal) => {
    if (!account || !isAuthenticated || account.role !== ACCOUNT_ROLE.ASSESSOR) return;
    const owner = account.id; setLoading(true);
    try { const next = await walletService.get(signal); if (!signal?.aborted && identity.current === owner) { setData(next); setError(''); } }
    catch (e) { if (!signal?.aborted && identity.current === owner) setError(e instanceof Error ? e.message : 'Không tải được ví.'); }
    finally { if (!signal?.aborted && identity.current === owner) setLoading(false); }
  }, [account?.id, isAuthenticated, account?.role]);
  useEffect(() => { setData(null); pending.current = null; const controller = new AbortController(); void refresh(controller.signal); return () => controller.abort(); }, [refresh]);
  const submit = async () => {
    if (running.current || !data || !account) return;
    const owner = account.id; const value = /^\d+$/.test(amount) ? BigInt(amount) : 0n;
    if (!pending.current && (value <= 0n || value > BigInt(data.balance.available) || !bank.trim() || !number.trim() || !holder.trim())) { setError('Nhập số tiền nguyên trong số dư khả dụng và đầy đủ thông tin ngân hàng.'); return; }
    pending.current ??= { requestKey: data.requestKey, amount: value.toString(), bankName: bank.trim(), bankAccountNumber: number.trim(), bankAccountHolder: holder.trim() };
    running.current = true; setBusy(true); setError('');
    try {
      await walletService.request(pending.current);
      if (identity.current !== owner) return;
      pending.current = null; setAmount(''); setNotice('Đã gửi yêu cầu. Số tiền được giữ trong thời gian xử lý.'); await refresh();
    } catch (e) { if (identity.current === owner) setError(e instanceof Error ? e.message : 'Chưa gửi được yêu cầu. Hãy thử lại cùng yêu cầu.'); }
    finally { running.current = false; if (identity.current === owner) setBusy(false); }
  };
  const cancel = async (id: string) => {
    if (running.current || !account) return; const owner = account.id; running.current = true; setBusy(true); setError('');
    try { await walletService.cancel(id); if (identity.current === owner) { setNotice('Đã hủy yêu cầu rút tiền.'); await refresh(); } }
    catch (e) { if (identity.current === owner) setError(e instanceof Error ? e.message : 'Không hủy được yêu cầu.'); }
    finally { running.current = false; if (identity.current === owner) setBusy(false); }
  };
  if (isLoading) return <ActivityIndicator />;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!account || account.role !== ACCOUNT_ROLE.ASSESSOR) return <View style={s.content}><Text>Ví thu nhập chỉ dành cho thẩm định viên.</Text></View>;
  return <SafeAreaView style={s.root}><View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()}><Text style={s.back}>‹</Text></Pressable><Text role="heading" style={s.title}>Ví thu nhập</Text><Pressable accessibilityRole="button" disabled={busy} onPress={() => void refresh()}><Text style={s.link}>Tải lại</Text></Pressable></View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}{!!notice && <Text accessibilityRole="alert" style={s.success}>{notice}</Text>}
      {loading && !data ? <ActivityIndicator color={colors.primary} /> : data && <>
        <WalletContent key={account.id} data={data} busy={busy} locked={!!pending.current} amount={amount} setAmount={setAmount} onBank={value => { setBank(value.bank); setNumber(value.number); setHolder(value.holder); }} onSubmit={() => void submit()} onCancel={id => void cancel(id)} error={error} notice={notice} />
      </>}
    </ScrollView></SafeAreaView>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 56, backgroundColor: colors.surface }, back: { fontSize: 32, color: colors.navy }, title: { fontSize: 20, fontWeight: '700', color: colors.navy }, link: { color: colors.primary, fontWeight: '600' }, content: { padding: 24, gap: 16, width: '100%', maxWidth: 1120, alignSelf: 'center', paddingBottom: 40 }, balance: { padding: 24, gap: 12, borderRadius: 18, backgroundColor: colors.navy }, balanceLabel: { color: '#DCE5F1', fontSize: 13 }, balanceValue: { color: '#FFF', fontSize: 30, fontWeight: '700' }, card: { padding: 20, gap: 12, borderRadius: 16, backgroundColor: colors.surface }, muted: { color: colors.textSecondary, lineHeight: 22, fontSize: 13 }, label: { color: colors.textPrimary, fontWeight: '600', marginTop: 4 }, input: { borderColor: colors.border, borderWidth: 1, borderRadius: 10, padding: 12, color: colors.textPrimary }, error: { color: colors.error, lineHeight: 22 }, success: { color: colors.success }, row: { gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingVertical: 16 }, rowHeading: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }, amount: { fontSize: 16, fontWeight: '700', color: colors.navy }, status: { color: colors.primary, fontSize: 13 } });
