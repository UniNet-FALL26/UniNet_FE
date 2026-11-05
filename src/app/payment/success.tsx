import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PaymentSuccessScreen() {
  const params = useLocalSearchParams<{
    orderCode?: string;
    campaignId?: string;
  }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon / Tag thành công */}
        <View style={[styles.badge, styles.badgeSuccess]}>
          <Text style={styles.badgeText}>✓</Text>
        </View>

        <Text style={styles.title}>Thanh toán thành công!</Text>
        <Text style={styles.subtitle}>
          Giao dịch đã được hệ thống xác nhận.
        </Text>

        {params.orderCode && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Mã đơn hàng: {params.orderCode}</Text>
          </View>
        )}

        {/* Nút điều hướng */}
        <TouchableOpacity
          style={[styles.button, styles.btnSuccess]}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.btnText}>Về trang chủ</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  badge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  badgeSuccess: { backgroundColor: "#D1FAE5" },
  badgeText: { fontSize: 36, color: "#059669", fontWeight: "bold" },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  infoBox: {
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    width: "100%",
    alignItems: "center",
  },
  infoText: { fontSize: 14, color: "#374151", fontWeight: "600" },
  button: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSuccess: { backgroundColor: "#10B981" },
  btnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});
