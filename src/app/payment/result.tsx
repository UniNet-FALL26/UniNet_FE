import { useEffect, useState } from 'react';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VerificationCheckoutScreen } from '@/components/projects/VerificationCheckoutScreen';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { useAuthStore } from '@/store/auth.store';
import { recalledPayment, paymentAppUrl } from '@/utils/payment-return';
import { colors } from '@/constants/colors';

export default function PaymentResultScreen() {
  // PayOS's `id` is its payment-link ID, never our verification ID.
  // status/cancel/orderCode query values are not payment evidence.
  const { verificationId } = useLocalSearchParams<{ verificationId?: string }>();
  const explicitId = typeof verificationId === 'string' && verificationId.length <= 128 ? verificationId : undefined;
  const { account, isLoading, isAuthenticated } = useAuthStore();
  const [context, setContext] = useState<{ accountId: string; id?: string; projectId?: string } | null>(null);
  const [openError, setOpenError] = useState(false);
  useEffect(() => {
    let disposed = false;
    if (!account || isLoading) return;
    void recalledPayment(account.id).then(saved => {
      if (!disposed) setContext({ accountId: account.id, id: explicitId || saved?.verificationId, projectId: !explicitId || saved?.verificationId === explicitId ? saved?.projectId : undefined });
    });
    return () => { disposed = true; };
  }, [account?.id, explicitId, isLoading]);
  const resolved = context?.accountId === account?.id ? context : null;
  const id = explicitId || resolved?.id;
  const openApp = async () => {
    setOpenError(false);
    try { await Linking.openURL(id ? paymentAppUrl(id) : 'uninet:///payment/result'); }
    catch { setOpenError(true); }
  };
  if (isLoading) return <Loading />;
  return <SafeAreaView style={styles.safe}>
    {Platform.OS === 'web' && <View style={styles.banner}><Button title="Quay lại ứng dụng" variant="outline" onPress={() => { void openApp(); }} />{openError && <Text style={styles.text}>Không mở được UniNet. Hãy mở ứng dụng đã cài hoặc kiểm tra thanh toán tại trang này.</Text>}</View>}
    {isAuthenticated && id && <View style={styles.banner}><Button title="Về trang thanh toán của hồ sơ" variant="outline" onPress={() => router.replace({ pathname: '/group/checkout/[id]', params: { id, ...(resolved?.projectId ? { projectId: resolved.projectId } : {}) } } as never)} /></View>}
    {!isAuthenticated ? <View style={styles.banner}><Text style={styles.text}>Đăng nhập để hệ thống xác nhận kết quả thanh toán.</Text><Button title="Đăng nhập để xem kết quả" onPress={() => router.push({ pathname: '/(auth)/login', params: { paymentReturn: id || 'resume' } } as never)} /></View>
      : !resolved ? <Loading />
      : id ? <VerificationCheckoutScreen verificationId={id} returnProjectId={resolved.projectId} />
      : <View style={styles.banner}><Text style={styles.text}>Không tìm thấy hồ sơ thanh toán trên thiết bị này. Mở hồ sơ đã thanh toán để kiểm tra; không tạo giao dịch mới.</Text><Button title="Về trang chính" onPress={() => router.replace('/')} /></View>}
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, banner: { padding: 16, gap: 12, width: '100%', maxWidth: 880, alignSelf: 'center' }, text: { color: colors.textPrimary, fontSize: 16, lineHeight: 24 } });
