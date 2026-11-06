// src/app/(company)/advertisement/index.tsx
import { Button } from "@/components/ui/Button";
import { ToastHost } from "@/components/ui/ToastHost";
import { colors } from "@/constants/colors";
import {
  AdCampaign,
  AdPackage,
  advertisementService,
} from "@/services/advertisement.service";
import { reportApiFailure } from "@/services/api";
import { toast } from "@/store/toast.store";
import { pickProfileImage } from "@/utils/profile-image-picker";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

enum CampaignStatus {
  Draft = 0,
  PendingModeration = 1,
  PendingPayment = 2,
  Active = 3,
  Completed = 4,
  Rejected = 5,
}

const getStatusConfig = (status: number) => {
  switch (status) {
    case CampaignStatus.Draft:
      return { label: "Chưa hoàn thiện", color: "#6B7280", bg: "#F3F4F6" };
    case CampaignStatus.PendingModeration:
      return { label: "Chờ duyệt", color: "#2563EB", bg: "#DBEAFE" };
    case CampaignStatus.PendingPayment:
      return { label: "Chờ thanh toán", color: "#D97706", bg: "#FEF3C7" };
    case CampaignStatus.Active:
      return { label: "Đang chạy", color: "#059669", bg: "#D1FAE5" };
    case CampaignStatus.Completed:
      return { label: "Hoàn thành/Hết hạn", color: "#4B5563", bg: "#E5E7EB" };
    case CampaignStatus.Rejected:
      return { label: "Bị từ chối", color: "#DC2626", bg: "#FEE2E2" };
    default:
      return {
        label: `Trạng thái: ${status}`,
        color: "#4B5563",
        bg: "#E5E7EB",
      };
  }
};

export default function CompanyAdvertisementScreen() {
  const [activeTab, setActiveTab] = useState<"campaigns" | "payments">(
    "campaigns",
  );

  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(
    null,
  );

  // modalStep: 0 (Đóng), 1 (Form điền chiến dịch), 2 (Chọn gói)
  const [modalStep, setModalStep] = useState<0 | 1 | 2>(0);

  const [selectedPackage, setSelectedPackage] = useState<AdPackage | null>(
    null,
  );
  const [agreedTerms, setAgreedTerms] = useState(false);

  const [form, setForm] = useState({
    title: "",
    content: "",
    destinationUrl: "",
  });
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [payingCampaignId, setPayingCampaignId] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        if (activeTab === "campaigns") {
          const resCampaigns = await advertisementService.getMyCampaigns();
          const campaignList =
            (resCampaigns as any)?.campaigns ||
            (Array.isArray(resCampaigns) ? resCampaigns : []);
          setCampaigns(campaignList);

          const resPackages = await advertisementService.getPackages({
            page: 1,
            pageSize: 20,
          });
          const rawPackages =
            resPackages?.packages ||
            (Array.isArray(resPackages) ? resPackages : []);
          const filteredPackages = rawPackages.filter(
            (pkg: any) => pkg.role === 1,
          );
          setPackages(filteredPackages);
        }
      } catch (cause) {
        console.error("Lỗi tải dữ liệu:", cause);
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

  const handleCloseModal = () => {
    setModalStep(0);
    setCurrentCampaignId(null);
    setSelectedPackage(null);
    setAgreedTerms(false);
    setForm({ title: "", content: "", destinationUrl: "" });
    setSelectedFiles([]);
  };

  // Hàm chọn file ảnh/video theo chuẩn pickProfileImage
  async function attach() {
    try {
      const asset = await pickProfileImage();
      if (!asset) return;
      // Chỉ lưu duy nhất 1 file vào mảng (hoặc thay thế file cũ)
      setSelectedFiles([asset]);
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Chưa tải được tệp. Vui lòng thử lại.",
      );
    }
  }

  function removeFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  // Xử lý nút "Tiếp tục" ở Bước 1: Đóng gói FormData và gọi API tạo bản nháp (Draft)
  const handleNextToStep2 = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Vui lòng nhập đầy đủ tiêu đề và nội dung.");
      return;
    }

    setSubmitting(true);
    try {
      if (currentCampaignId) {
        setModalStep(2);
      } else {
        const formData = new FormData();
        formData.append("Title", form.title.trim());
        formData.append("Content", form.content.trim());

        if (form.destinationUrl.trim()) {
          formData.append("DestinationUrl", form.destinationUrl.trim());
        }

        // Đính kèm các file ảnh/video vào FormData
        selectedFiles.forEach((file) => {
          if (Platform.OS === "web" && file.file) {
            formData.append("MediaFiles", file.file);
          } else {
            formData.append("MediaFiles", {
              uri: file.uri,
              name:
                file.fileName ||
                file.uri.split("/").pop() ||
                `upload_${Date.now()}.jpg`,
              type: file.mimeType || "image/jpeg",
            } as any);
          }
        });

        // Gọi API tạo chiến dịch dạng FormData
        const newCampaign = await advertisementService.createCampaign(formData);

        if (newCampaign?.id) {
          setCurrentCampaignId(newCampaign.id);
          setModalStep(2);
          fetchData(true);
        } else {
          toast.error("Không thể tạo chiến dịch nháp.");
        }
      }
    } catch (cause) {
      console.error("Lỗi tạo chiến dịch nháp:", cause);
      reportApiFailure(cause, "Không thể lưu thông tin chiến dịch.");
    } finally {
      setSubmitting(false);
    }
  };

  // Flow bước 2: Gán gói vào chiến dịch Draft đang có sẵn (currentCampaignId)
  const handleAssignPackageAndPay = async () => {
    if (!selectedPackage || !agreedTerms || !currentCampaignId) {
      toast.error("Vui lòng chọn gói quảng cáo và đồng ý điều khoản.");
      return;
    }

    setSubmitting(true);
    try {
      const assignedCampaign = await advertisementService.assignPackage(
        currentCampaignId,
        {
          packageId: selectedPackage.id,
        },
      );

      if (Number(assignedCampaign.status) === CampaignStatus.PendingPayment) {
        const paymentData = await advertisementService.createPayment(
          assignedCampaign.id,
        );
        if (paymentData?.checkoutUrl) {
          handleCloseModal();
          await Linking.openURL(paymentData.checkoutUrl);
        } else {
          toast.error(
            "Chiến dịch đã được duyệt nhưng không tạo được link thanh toán. Vui lòng thanh toán lại trong danh sách.",
          );
          handleCloseModal();
        }
      } else if (
        Number(assignedCampaign.status) === CampaignStatus.PendingModeration
      ) {
        toast.success(
          assignedCampaign.rejectionReason ||
            "Chiến dịch có chứa từ khóa nhạy cảm và đã được chuyển sang bộ phận kiểm duyệt thủ công.",
        );
        handleCloseModal();
      } else {
        toast.success("Thao tác thành công.");
        handleCloseModal();
      }

      fetchData(true);
    } catch (cause) {
      console.error("Lỗi:", cause);
      reportApiFailure(cause, "Không thể xử lý yêu cầu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayExistingCampaign = async (campaignId: string) => {
    setPayingCampaignId(campaignId);
    try {
      const paymentData = await advertisementService.createPayment(campaignId);
      if (paymentData?.checkoutUrl) {
        await Linking.openURL(paymentData.checkoutUrl);
      } else {
        toast.error("Không nhận được đường dẫn thanh toán.");
      }
    } catch (cause) {
      reportApiFailure(cause, "Khởi tạo thanh toán thất bại.");
    } finally {
      setPayingCampaignId(null);
    }
  };

  const handleCancel = () => {
    handleCloseModal();
  };

  const getRemainingDays = (
    startDateStr?: string | null,
    endDateStr?: string | null,
  ) => {
    if (!startDateStr || !endDateStr) return null;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const now = new Date();

    if (now < start) {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    if (now > end) return 0;
    const diffTime = Math.abs(end.getTime() - now.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const renderCampaignCard = ({ item }: { item: AdCampaign }) => {
    const statusConfig = getStatusConfig(item.status);
    const remainingDays = getRemainingDays(item.startedAt, item.expiredAt);
    const isDraft = Number(item.status) === CampaignStatus.Draft;

    return (
      <Pressable
        style={[
          styles.campaignCard,
          isDraft && { borderColor: "#0284C7", borderWidth: 1.5 },
        ]}
        disabled={!isDraft}
        onPress={() => {
          setCurrentCampaignId(item.id);
          setForm({
            title: item.title || "",
            content: item.content || "",
            destinationUrl: item.destinationUrl || "",
          });
          setModalStep(2);
        }}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.cardTitle, { flex: 1 }]} numberOfLines={1}>
            {item.title} {isDraft ? "(Nhấn để chọn gói)" : ""}
          </Text>
          <View
            style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}
          >
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {item.rejectionReason && (
          <Text style={{ fontSize: 12, color: colors.error, marginTop: -4 }}>
            {item.rejectionReason}
          </Text>
        )}

        <View style={styles.infoContainer}>
          <View style={styles.dateContainer}>
            <SymbolView
              name={{
                ios: "calendar",
                android: "calendar_today",
                web: "calendar_today",
              }}
              size={14}
              tintColor={colors.textSecondary}
            />
            <Text style={styles.date}>
              {item.startedAt
                ? new Date(item.startedAt).toLocaleDateString("vi-VN")
                : "---"}{" "}
              -{" "}
              {item.expiredAt
                ? new Date(item.expiredAt).toLocaleDateString("vi-VN")
                : "---"}
            </Text>
          </View>
          {remainingDays !== null &&
            Number(item.status) === CampaignStatus.Active && (
              <Text style={styles.remainingText}>
                Còn lại: {remainingDays} ngày
              </Text>
            )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{item.impressionCount ?? 0}</Text>
            <Text style={styles.statLabel}>Lượt hiển thị</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{item.clickCount ?? 0}</Text>
            <Text style={styles.statLabel}>Lượt click</Text>
          </View>
        </View>

        {Number(item.status) === CampaignStatus.PendingPayment && (
          <View style={{ marginTop: 12 }}>
            <Button
              title={
                payingCampaignId === item.id
                  ? "Đang xử lý..."
                  : "Thanh toán ngay"
              }
              onPress={() => handlePayExistingCampaign(item.id)}
              disabled={payingCampaignId === item.id}
            />
          </View>
        )}
      </Pressable>
    );
  };

  const filteredCampaigns = campaigns.filter(
    (c) => statusFilter === null || c.status === statusFilter,
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.contentWrapper}>
        <View style={styles.tabsWrapper}>
          <View style={styles.tabsContainer}>
            <Pressable
              style={[
                styles.tab,
                activeTab === "campaigns" && styles.activeTab,
              ]}
              onPress={() => setActiveTab("campaigns")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "campaigns" && styles.activeTabText,
                ]}
              >
                Chiến dịch của tôi
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === "payments" && styles.activeTab]}
              onPress={() => setActiveTab("payments")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "payments" && styles.activeTabText,
                ]}
              >
                Lịch sử thanh toán
              </Text>
            </Pressable>
          </View>
        </View>

        {activeTab === "campaigns" && (
          <View style={styles.actionAndFilterWrapper}>
            <Button
              title="Tạo chiến dịch mới"
              onPress={() => setModalStep(1)}
              style={{ marginBottom: 12 }}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContainer}
            >
              <Pressable
                style={[
                  styles.filterChip,
                  statusFilter === null && styles.activeFilterChip,
                ]}
                onPress={() => setStatusFilter(null)}
              >
                <Text
                  style={[
                    styles.filterText,
                    statusFilter === null && styles.activeFilterText,
                  ]}
                >
                  Tất cả
                </Text>
              </Pressable>
              {[
                { label: "Đang chạy", value: CampaignStatus.Active },
                { label: "Chờ duyệt", value: CampaignStatus.PendingModeration },
                {
                  label: "Chờ thanh toán",
                  value: CampaignStatus.PendingPayment,
                },
                { label: "Hoàn thành", value: CampaignStatus.Completed },
                { label: "Nháp", value: CampaignStatus.Draft },
                { label: "Từ chối", value: CampaignStatus.Rejected },
              ].map((status) => (
                <Pressable
                  key={status.value}
                  style={[
                    styles.filterChip,
                    statusFilter === status.value && styles.activeFilterChip,
                  ]}
                  onPress={() => setStatusFilter(status.value)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      statusFilter === status.value && styles.activeFilterText,
                    ]}
                  >
                    {status.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={activeTab === "campaigns" ? (filteredCampaigns as any[]) : []}
            keyExtractor={(item, index) => item.id || index.toString()}
            renderItem={
              activeTab === "campaigns" ? renderCampaignCard : undefined
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchData(true)}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <SymbolView
                  name={{ ios: "tray", android: "inbox", web: "inbox" }}
                  size={48}
                  tintColor="#D1D5DB"
                />
                <Text style={styles.emptyText}>Chưa có dữ liệu hiển thị.</Text>
              </View>
            }
          />
        )}
      </View>

      <Modal
        visible={modalStep > 0}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          {modalStep > 0 && <ToastHost modal />}
          <View
            style={[styles.modalContent, modalStep === 2 && { height: "80%" }]}
          >
            {/* --- BƯỚC 1: NHẬP THÔNG TIN CHIẾN DỊCH --- */}
            {modalStep === 1 && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Thiết lập chiến dịch</Text>
                  <Text style={styles.modalSubtitle}>
                    Nhập nội dung quảng cáo của bạn
                  </Text>
                </View>

                <ScrollView
                  style={{ flex: 1 }}
                  contentContainerStyle={{ gap: 16 }}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>
                      Tiêu đề <Text style={styles.asterisk}>*</Text>
                    </Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="Nhập tiêu đề hấp dẫn..."
                      placeholderTextColor={colors.textSecondary}
                      value={form.title}
                      onChangeText={(txt) => setForm({ ...form, title: txt })}
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>
                      Nội dung chi tiết <Text style={styles.asterisk}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.inputField,
                        { height: 100, textAlignVertical: "top" },
                      ]}
                      placeholder="Mô tả nội dung bạn muốn truyền tải..."
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      value={form.content}
                      onChangeText={(txt) => setForm({ ...form, content: txt })}
                    />
                  </View>

                  {/* Chỉ hiển thị nút chọn ảnh khi chưa có ảnh nào được chọn */}
                  {/* 1. Phần hiển thị ảnh (Preview) */}
                  {selectedFiles.length > 0 && (
                    <View style={styles.previewContainer}>
                      <View style={styles.previewGrid}>
                        {selectedFiles.map((file, index) => (
                          <View key={index} style={styles.previewItem}>
                            <Image
                              source={{ uri: file.uri }}
                              resizeMode="cover"
                              style={styles.previewImage}
                            />
                            <Pressable
                              style={styles.removeBtn}
                              onPress={() => removeFile(index)}
                              disabled={submitting}
                            >
                              <SymbolView
                                name={{
                                  ios: "xmark",
                                  android: "close",
                                  web: "close",
                                }}
                                size={14}
                                tintColor="#FFFFFF"
                              />
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* 2. Nút Thêm/Đổi ảnh */}
                  {selectedFiles.length === 0 ? (
                    <Pressable
                      style={styles.attachMediaBar}
                      onPress={() => void attach()}
                      disabled={submitting}
                    >
                      <SymbolView
                        name={{
                          ios: "photo.badge.plus",
                          android: "add_photo_alternate",
                          web: "add_photo_alternate",
                        }}
                        size={22}
                        tintColor={colors.primary}
                      />
                      <Text style={styles.attachMediaText}>
                        Thêm ảnh hoặc video
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[
                        styles.attachMediaBar,
                        { backgroundColor: "#F3F4F6", borderColor: "#D1D5DB" },
                      ]}
                      onPress={() => void attach()}
                      disabled={submitting}
                    >
                      <SymbolView
                        name={{
                          ios: "arrow.triangle.2.circlepath",
                          android: "sync",
                          web: "sync",
                        }}
                        size={20}
                        tintColor="#4B5563"
                      />
                      <Text
                        style={[styles.attachMediaText, { color: "#4B5563" }]}
                      >
                        Đổi ảnh hoặc video khác
                      </Text>
                    </Pressable>
                  )}
                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>
                      URL đích khi click (Tùy chọn)
                    </Text>
                    <TextInput
                      style={styles.inputField}
                      placeholder="https://yourwebsite.com"
                      placeholderTextColor={colors.textSecondary}
                      value={form.destinationUrl}
                      onChangeText={(txt) =>
                        setForm({ ...form, destinationUrl: txt })
                      }
                    />
                  </View>
                </ScrollView>

                <View style={styles.modalActions}>
                  <Pressable
                    onPress={handleCancel}
                    style={styles.cancelBtn}
                    disabled={submitting}
                  >
                    <Text style={styles.cancelBtnText}>Hủy</Text>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Button
                      title={submitting ? "Đang tạo nháp..." : "Tiếp tục"}
                      onPress={handleNextToStep2}
                      disabled={
                        submitting || !form.title.trim() || !form.content.trim()
                      }
                    />
                  </View>
                </View>
              </>
            )}

            {/* --- BƯỚC 2: CHỌN GÓI & XÁC NHẬN --- */}
            {modalStep === 2 && (
              <>
                <View style={[styles.modalHeader, { alignItems: "center" }]}>
                  <Text style={styles.modalTitleCenter}>
                    Chọn gói quảng cáo
                  </Text>
                </View>

                <ScrollView
                  style={{ flex: 1, marginTop: 12 }}
                  showsVerticalScrollIndicator={false}
                >
                  {packages.map((item) => {
                    const isSelected = selectedPackage?.id === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        style={[
                          styles.packageOptionCard,
                          isSelected && styles.packageOptionCardSelected,
                        ]}
                        onPress={() => setSelectedPackage(item)}
                      >
                        <View style={styles.radioWrapper}>
                          <SymbolView
                            name={
                              isSelected
                                ? {
                                    ios: "checkmark.circle.fill",
                                    android: "check_circle",
                                    web: "check_circle",
                                  }
                                : {
                                    ios: "circle",
                                    android: "radio_button_unchecked",
                                    web: "radio_button_unchecked",
                                  }
                            }
                            size={24}
                            tintColor={isSelected ? "#0284C7" : "#D1D5DB"}
                          />
                        </View>
                        <View style={styles.packageOptionContent}>
                          <Text
                            style={[
                              styles.packageOptionTitle,
                              isSelected && { color: "#0284C7" },
                            ]}
                          >
                            {item.name}
                          </Text>
                          <Text style={styles.packageOptionSubtitle}>
                            thời lượng {item.durationInDays} ngày
                          </Text>
                        </View>
                        <View style={styles.packageOptionPriceContainer}>
                          {item.durationInDays === 30 && (
                            <View style={styles.recommendBadgeBlue}>
                              <Text style={styles.recommendText}>Đề xuất</Text>
                            </View>
                          )}
                          <Text
                            style={[
                              styles.packageOptionPrice,
                              isSelected && { color: "#0284C7" },
                            ]}
                          >
                            {item.price?.toLocaleString("vi-VN")} ₫
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}

                  <Pressable
                    style={styles.termsRow}
                    onPress={() => setAgreedTerms(!agreedTerms)}
                  >
                    <SymbolView
                      name={
                        agreedTerms
                          ? {
                              ios: "checkmark.circle.fill",
                              android: "check_circle",
                              web: "check_circle",
                            }
                          : {
                              ios: "circle",
                              android: "radio_button_unchecked",
                              web: "radio_button_unchecked",
                            }
                      }
                      size={20}
                      tintColor={agreedTerms ? "#059669" : "#9CA3AF"}
                    />
                    <Text style={styles.termsText}>
                      Tôi đồng ý với các Điều khoản và Chính sách quảng cáo của
                      hệ thống.
                    </Text>
                  </Pressable>
                </ScrollView>

                <View style={styles.modalActions}>
                  <Pressable
                    onPress={handleCancel}
                    style={styles.cancelBtn}
                    disabled={submitting}
                  >
                    <Text style={styles.cancelBtnText}>Hủy</Text>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Button
                      title={
                        submitting ? "Đang xử lý..." : "Xác nhận & Thanh toán"
                      }
                      onPress={handleAssignPackageAndPay}
                      disabled={submitting || !selectedPackage || !agreedTerms}
                    />
                  </View>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  contentWrapper: {
    flex: 1,
    alignSelf: "center",
    width: "100%",
    maxWidth: 800,
  },
  tabsWrapper: { alignItems: "center", marginVertical: 16 },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
    width: "90%",
    maxWidth: 400,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  activeTab: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontWeight: "600", color: "#6B7280", fontSize: 14 },
  activeTabText: { color: colors.textPrimary, fontWeight: "700" },
  actionAndFilterWrapper: { paddingHorizontal: 16, marginBottom: 8 },
  filterContainer: { gap: 8, paddingRight: 16 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activeFilterChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: { fontSize: 13, fontWeight: "500", color: "#4B5563" },
  activeFilterText: { color: "#FFFFFF" },
  listContent: { padding: 16, gap: 12 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyContainer: {
    marginTop: 60,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  emptyText: { color: "#9CA3AF", fontSize: 15, fontWeight: "500" },
  campaignCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16 },
  statusText: { fontSize: 12, fontWeight: "600" },
  infoContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
  date: { fontSize: 13, color: colors.textSecondary },
  remainingText: {
    fontSize: 12,
    color: "#D97706",
    fontWeight: "600",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  statBox: { alignItems: "center", gap: 4, flex: 1 },
  statDivider: { width: 1, height: 24, backgroundColor: "#E5E7EB" },
  statValue: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  statLabel: { fontSize: 12, color: colors.textSecondary },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.6)",
    justifyContent: "center",
    padding: 16,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    gap: 16,
    width: "100%",
    maxWidth: 500,
    alignSelf: "center",
  },
  modalHeader: { marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
  modalSubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  modalTitleCenter: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  formGroup: { gap: 6 },
  inputLabel: { fontSize: 14, fontWeight: "500", color: "#374151" },
  asterisk: { color: "#EF4444" },
  inputField: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    fontSize: 14,
    color: colors.textPrimary,
  },
  previewContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  previewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  previewItem: {
    position: "relative",
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  attachMediaBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#BBF7D0",
    borderStyle: "dashed",
  },
  attachMediaText: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.primary,
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: "#4B5563" },
  packageOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  packageOptionCardSelected: {
    borderColor: "#0284C7",
    backgroundColor: "#F0F9FF",
  },
  radioWrapper: {
    width: 32,
    alignItems: "flex-start",
    justifyContent: "center",
    marginRight: 8,
  },
  packageOptionContent: { flex: 1, justifyContent: "center" },
  packageOptionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 4,
  },
  packageOptionSubtitle: { fontSize: 12, color: "#6B7280" },
  packageOptionPriceContainer: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  packageOptionPrice: { fontSize: 15, fontWeight: "700", color: "#111827" },
  recommendBadgeBlue: {
    backgroundColor: "#0284C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  recommendText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
    gap: 10,
  },
  termsText: { flex: 1, fontSize: 13, color: "#4B5563", lineHeight: 20 },
});
