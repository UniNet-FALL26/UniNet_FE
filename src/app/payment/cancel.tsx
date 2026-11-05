import { router, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PaymentCancelScreen() {
  const params = useLocalSearchParams<{ orderCode?: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon / Tag thất bại */}
        <View style={[styles.badge, styles.badgeCancel]}>
          <Text style={styles.badgeText}>✕</Text>
        </View>

        <Text style={styles.title}>Thanh toán đã bị hủy</Text>
        <Text style={styles.subtitle}>
          Bạn chưa hoàn tất thanh toán hoặc giao dịch đã bị hủy bỏ.
        </Text>

        {params.orderCode && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>Mã đơn hàng: {params.orderCode}</Text>
          </View>
        )}

        {/* Nút hành động */}
        <TouchableOpacity
          style={[styles.button, styles.btnPrimary]}
          onPress={() => router.back()}
        >
          <Text style={styles.btnText}>Thử thanh toán lại</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.btnSecondary]}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.btnSecondaryText}>Về trang chủ</Text>
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
  badgeCancel: { backgroundColor: "#FEE2E2" },
  badgeText: { fontSize: 32, color: "#DC2626", fontWeight: "bold" },
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
    marginBottom: 12,
  },
  btnPrimary: { backgroundColor: "#2563EB" },
  btnSecondary: { backgroundColor: "#F3F4F6" },
  btnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  btnSecondaryText: { color: "#374151", fontSize: 16, fontWeight: "700" },
});
