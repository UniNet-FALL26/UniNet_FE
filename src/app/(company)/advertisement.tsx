import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";
import {
    AdCampaign,
    AdPackage,
    advertisementService,
} from "@/services/advertisement.service";
import * as Linking from "expo-linking";
import { useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CompanyAdvertisementScreen() {
  const [activeTab, setActiveTab] = useState<"packages" | "campaigns">(
    "packages",
  );

  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State Modal Đăng ký gói
  const [selectedPackage, setSelectedPackage] = useState<AdPackage | null>(
    null,
  );
  const [form, setForm] = useState({
    title: "",
    content: "",
    mediaUrl: "",
    destinationUrl: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Tải dữ liệu tùy theo tab hiện tại
  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        if (activeTab === "packages") {
          const res = await advertisementService.getPackages();
          setPackages(Array.isArray(res) ? res : ((res as any)?.data ?? []));
        } else {
          const res = await advertisementService.getMyCampaigns();
          setCampaigns(Array.isArray(res) ? res : ((res as any)?.data ?? []));
        }
      } catch (cause) {
        console.error("Lỗi tải dữ liệu quảng cáo:", cause);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab],
  );

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  // Xử lý tạo chiến dịch và chuyển hướng thanh toán PayOS
  const handleSubscribe = async () => {
    if (!selectedPackage || !form.title.trim() || !form.content.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ tiêu đề và nội dung quảng cáo.");
      return;
    }

    setSubmitting(true);
    try {
      // Thiết lập URL callback cho PayOS tự động redirect sau khi thanh toán xong/hủy
      const returnUrl = Linking.createURL("company/ads/payment-success");
      const cancelUrl = Linking.createURL("company/ads/payment-cancel");

      const response = await advertisementService.createCampaign({
        packageId: selectedPackage.id,
        title: form.title.trim(),
        content: form.content.trim(),
        mediaUrl: form.mediaUrl.trim() || undefined,
        destinationUrl: form.destinationUrl.trim() || undefined,
        returnUrl,
        cancelUrl,
      });

      const checkoutUrl =
        (response as any)?.checkoutUrl || (response as any)?.data?.checkoutUrl;

      if (checkoutUrl) {
        setSelectedPackage(null);
        setForm({ title: "", content: "", mediaUrl: "", destinationUrl: "" });
        // Mở cổng thanh toán PayOS
        await Linking.openURL(checkoutUrl);
      } else {
        Alert.alert("Lỗi", "Không nhận được đường dẫn thanh toán từ hệ thống.");
      }
    } catch (cause) {
      console.error("Lỗi đăng ký gói:", cause);
      Alert.alert("Lỗi", "Không thể khởi tạo thanh toán. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderPackageCard = ({ item }: { item: AdPackage }) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{item.name}</Text>
      <Text style={styles.price}>
        {item.price.toLocaleString("vi-VN")} VNĐ{" "}
        <Text style={styles.duration}>/ {item.durationDays} ngày</Text>
      </Text>
      <Text style={styles.description}>{item.description}</Text>
      <Button title="Đăng ký gói" onPress={() => setSelectedPackage(item)} />
    </View>
  );

  const renderCampaignCard = ({ item }: { item: AdCampaign }) => (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <View
          style={[
            styles.statusBadge,
            item.status === "Active" ? styles.bgSuccess : styles.bgPending,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              item.status === "Active"
                ? styles.textSuccess
                : styles.textPending,
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <Text style={styles.date}>
        Hiệu lực: {new Date(item.startDate).toLocaleDateString("vi-VN")} -{" "}
        {new Date(item.endDate).toLocaleDateString("vi-VN")}
      </Text>

      {/* Khung Tracking Thông số */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <SymbolView
            name={{ ios: "eye", android: "visibility", web: "visibility" }}
            size={18}
            tintColor={colors.primary}
          />
          <Text style={styles.statValue}>{item.impressions ?? 0}</Text>
          <Text style={styles.statLabel}>Lượt hiển thị</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <SymbolView
            name={{ ios: "hand.tap", android: "touch_app", web: "touch_app" }}
            size={18}
            tintColor={colors.primary}
          />
          <Text style={styles.statValue}>{item.clicks ?? 0}</Text>
          <Text style={styles.statLabel}>Lượt click</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Bộ chuyển đổi Tab */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tab, activeTab === "packages" && styles.activeTab]}
          onPress={() => setActiveTab("packages")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "packages" && styles.activeTabText,
            ]}
          >
            Gói quảng cáo
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "campaigns" && styles.activeTab]}
          onPress={() => setActiveTab("campaigns")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "campaigns" && styles.activeTabText,
            ]}
          >
            Chiến dịch & Tracking
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={
            activeTab === "packages"
              ? (packages as any[])
              : (campaigns as any[])
          }
          keyExtractor={(item) => item.id}
          renderItem={({ item }) =>
            activeTab === "packages"
              ? renderPackageCard({ item: item as AdPackage })
              : renderCampaignCard({ item: item as AdCampaign })
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>Chưa có dữ liệu hiển thị.</Text>
            </View>
          }
        />
      )}

      {/* Modal Nhập thông tin chiến dịch để thanh toán */}
      <Modal
        visible={!!selectedPackage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPackage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Thiết lập nội dung quảng cáo</Text>
            <Text style={styles.modalSubtitle}>
              Gói: {selectedPackage?.name} (
              {selectedPackage?.price.toLocaleString("vi-VN")} VNĐ)
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Tiêu đề quảng cáo (*)"
              placeholderTextColor={colors.textSecondary}
              value={form.title}
              onChangeText={(txt) => setForm({ ...form, title: txt })}
            />
            <TextInput
              style={[styles.input, { height: 90, textAlignVertical: "top" }]}
              placeholder="Nội dung mô tả chi tiết (*)"
              placeholderTextColor={colors.textSecondary}
              multiline
              value={form.content}
              onChangeText={(txt) => setForm({ ...form, content: txt })}
            />
            <TextInput
              style={styles.input}
              placeholder="Đường dẫn hình ảnh / Banner (Tùy chọn)"
              placeholderTextColor={colors.textSecondary}
              value={form.mediaUrl}
              onChangeText={(txt) => setForm({ ...form, mediaUrl: txt })}
            />
            <TextInput
              style={styles.input}
              placeholder="Đường dẫn website đích khi click (Tùy chọn)"
              placeholderTextColor={colors.textSecondary}
              value={form.destinationUrl}
              onChangeText={(txt) => setForm({ ...form, destinationUrl: txt })}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setSelectedPackage(null)}
                style={styles.cancelBtn}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </Pressable>
              <Button
                title={submitting ? "Đang tạo lệnh..." : "Thanh toán qua PayOS"}
                onPress={handleSubscribe}
                disabled={
                  submitting || !form.title.trim() || !form.content.trim()
                }
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  tabsContainer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: colors.surface || "#FFF",
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  activeTab: { backgroundColor: colors.primaryLight || "#EEF2FF" },
  tabText: { fontWeight: "600", color: colors.textSecondary, fontSize: 14 },
  activeTabText: { color: colors.primary },
  listContent: { padding: 16, gap: 16 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface || "#FFF",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
  },
  price: { fontSize: 16, color: colors.primary, fontWeight: "700" },
  duration: { fontSize: 13, color: colors.textSecondary, fontWeight: "400" },
  description: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { textAlign: "center" },
  bgSuccess: { backgroundColor: "#D1FAE5" },
  bgPending: { backgroundColor: "#FEF3C7" },
  textSuccess: { color: "#065F46", fontSize: 11, fontWeight: "700" },
  textPending: { color: "#92400E", fontSize: 11, fontWeight: "700" },
  date: { fontSize: 12, color: colors.textSecondary },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
  },
  statBox: { alignItems: "center", gap: 2, flex: 1 },
  statDivider: { width: 1, height: 24, backgroundColor: "#E5E7EB" },
  statValue: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  statLabel: { fontSize: 11, color: colors.textSecondary },
  emptyText: { color: colors.textSecondary, fontSize: 14 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface || "#FFF",
    borderRadius: 16,
    padding: 20,
    gap: 12,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  modalSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border || "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
    fontSize: 14,
    color: colors.textPrimary,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: { paddingHorizontal: 12, paddingVertical: 10 },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
});
