// src/app/(company)/advertisement/index.tsx
import { Button } from "@/components/ui/Button";
import { ToastHost } from "@/components/ui/ToastHost";
import { colors } from "@/constants/colors";
import {
  AdCampaign,
  AdPackage,
  advertisementService,
  RefundException,
  UpdateCampaignRequest,
} from "@/services/advertisement.service";
import { reportApiFailure } from "@/services/api";
import { toast } from "@/store/toast.store";
import { pickProfileImage } from "@/utils/profile-image-picker";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
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
  Refunded = 6,
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
    case CampaignStatus.Refunded:
      return { label: "Đã hoàn tiền", color: "#7C3AED", bg: "#EDE9FE" };
    default:
      return {
        label: `Trạng thái: ${status}`,
        color: "#4B5563",
        bg: "#E5E7EB",
      };
  }
};

export default function CompanyAdvertisementScreen() {
  const params = useLocalSearchParams<{
    orderCode?: string;
    status?: string;
    cancel?: string;
  }>();
  const incomingUrl = Linking.useURL();
  const processedOrderRef = useRef<string | null>(null);

  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);

  const [refund, setRefund] = useState<RefundException | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(
    null,
  );

  // modalStep: 0 (Đóng), 1 (Form điền chiến dịch), 2 (Chọn gói)
  const [modalStep, setModalStep] = useState<0 | 1 | 2>(0);

  // State cho Pop-up kết quả thanh toán từ PayOS
  const [paymentPopup, setPaymentPopup] = useState<{
    visible: boolean;
    success: boolean;
    title: string;
    message: string;
  }>({
    visible: false,
    success: false,
    title: "",
    message: "",
  });
  const [syncingPayment, setSyncingPayment] = useState(false);

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
  const [formErrors, setFormErrors] = useState<{
    title?: string;
    content?: string;
    destinationUrl?: string;
  }>({});

  const isValidHttpUrl = (value: string) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const validateCreateForm = () => {
    const errors: {
      title?: string;
      content?: string;
      destinationUrl?: string;
    } = {};

    const title = form.title.trim();
    const content = form.content.trim();
    const destinationUrl = form.destinationUrl.trim();

    if (!title) {
      errors.title = "Tiêu đề chiến dịch không được để trống.";
    } else if (title.length > 255) {
      errors.title = "Tiêu đề không được vượt quá 255 ký tự.";
    }

    if (!content) {
      errors.content = "Nội dung chi tiết không được để trống.";
    }

    if (!destinationUrl) {
      errors.destinationUrl = "URL đích không được để trống.";
    } else if (!isValidHttpUrl(destinationUrl)) {
      errors.destinationUrl =
        "URL đích phải bắt đầu bằng http:// hoặc https://";
    }

    setFormErrors(errors);

    const firstError = errors.title || errors.content || errors.destinationUrl;
    if (firstError) {
      toast.error(firstError);
      return false;
    }

    return true;
  };
  const [submitting, setSubmitting] = useState(false);
  const [payingCampaignId, setPayingCampaignId] = useState<string | null>(null);

  // --- STATE RIÊNG CHO MODAL SỬA VÀ DUYỆT LẠI ---
  const [editModal, setEditModal] = useState<{
    visible: boolean;
    campaign: AdCampaign | null;
  }>({
    visible: false,
    campaign: null,
  });
  const [editForm, setEditForm] = useState({
    title: "",
    content: "",
    destinationUrl: "",
  });
  const [editFile, setEditFile] = useState<any | null>(null);
  const [existingEditImageUrl, setExistingEditImageUrl] = useState<
    string | null
  >(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // --- STATE RIÊNG CHO MODAL YÊU CẦU HOÀN TIỀN ---
  const [refundModal, setRefundModal] = useState<{
    visible: boolean;
    campaign: AdCampaign | null;
  }>({
    visible: false,
    campaign: null,
  });
  const [refundForm, setRefundForm] = useState({
    bankName: "",
    accountNumber: "",
    accountHolderName: "",
    reason: "",
    requestKey: "",
  });
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
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
      const filteredPackages = rawPackages.filter((pkg: any) => pkg.role === 1);
      setPackages(filteredPackages);
    } catch (cause) {
      console.error("Lỗi tải dữ liệu:", cause);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  // Bắt kết quả PayOS trả về qua URL (hỗ trợ cả Web query params & Mobile Deep Link)
  useEffect(() => {
    let orderCode = params.orderCode;
    let status = params.status;
    let cancel = params.cancel;

    if (!orderCode && incomingUrl) {
      const parsed = Linking.parse(incomingUrl);
      orderCode = parsed.queryParams?.orderCode as string | undefined;
      status = parsed.queryParams?.status as string | undefined;
      cancel = parsed.queryParams?.cancel as string | undefined;
    }

    if (!orderCode || processedOrderRef.current === orderCode) return;
    processedOrderRef.current = orderCode;

    const handlePayOSReturn = async () => {
      setSyncingPayment(true);
      try {
        // Gọi API sync để Backend kiểm tra với PayOS và chạy AI Review
        await advertisementService.syncPayment(orderCode!);

        const isCancelled =
          cancel === "true" || status?.toUpperCase() === "CANCELLED";
        const isPaid = status?.toUpperCase() === "PAID" && !isCancelled;

        await fetchData(true);

        if (isPaid) {
          setPaymentPopup({
            visible: true,
            success: true,
            title: "Thanh toán thành công!",
            message:
              "Hệ thống đã ghi nhận thanh toán và đang tiến hành duyệt tự động để khởi chạy chiến dịch của bạn.",
          });
        } else {
          setPaymentPopup({
            visible: true,
            success: false,
            title: "Thanh toán chưa hoàn tất",
            message:
              "Giao dịch đã bị hủy hoặc thất bại. Bạn có thể bấm 'Thanh toán ngay' trên thẻ chiến dịch để thử lại.",
          });
        }
      } catch (cause) {
        console.error("Lỗi đồng bộ thanh toán:", cause);
        setPaymentPopup({
          visible: true,
          success: false,
          title: "Không thể xác minh giao dịch",
          message:
            "Đã xảy ra lỗi khi đồng bộ trạng thái thanh toán. Vui lòng kiểm tra lại danh sách chiến dịch.",
        });
      } finally {
        setSyncingPayment(false);
        // Xóa query params trên Web để tránh bật lại pop-up khi F5
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.history.replaceState({}, "", window.location.pathname);
        } else {
          router.setParams({
            orderCode: undefined,
            status: undefined,
            cancel: undefined,
          });
        }
      }
    };

    void handlePayOSReturn();
  }, [params.orderCode, params.status, params.cancel, incomingUrl, fetchData]);

  const handleCloseModal = () => {
    setModalStep(0);
    setCurrentCampaignId(null);
    setSelectedPackage(null);
    setAgreedTerms(false);
    setForm({ title: "", content: "", destinationUrl: "" });
    setSelectedFiles([]);
  };

  // --- CÁC HÀM XỬ LÝ CHO MODAL SỬA VÀ DUYỆT LẠI ---
  const handleOpenEditModal = (campaign: UpdateCampaignRequest) => {
    setEditForm({
      title: campaign.title || "",
      content: campaign.content || "",
      destinationUrl: campaign.destinationUrl || "",
    });
    const currentImage =
      (campaign as any).mediaUrl ||
      (campaign as any).imageUrl ||
      (campaign as any).mediaFiles?.[0]?.url ||
      (campaign as any).media?.[0]?.url ||
      null;
    setExistingEditImageUrl(currentImage);
    setEditFile(null);
    setEditModal({ visible: true, campaign: campaign as AdCampaign });
  };

  const handleCloseEditModal = () => {
    if (submittingEdit) return;
    setEditModal({ visible: false, campaign: null });
    setEditForm({ title: "", content: "", destinationUrl: "" });
    setEditFile(null);
    setExistingEditImageUrl(null);
  };

  async function attachEditImage() {
    try {
      const asset = await pickProfileImage();
      if (!asset) return;
      setEditFile(asset);
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Chưa tải được tệp. Vui lòng thử lại.",
      );
    }
  }
  const hasEditChanges = Boolean(
    editModal.campaign &&
    (editForm.title.trim() !== (editModal.campaign.title || "").trim() ||
      editForm.content.trim() !== (editModal.campaign.content || "").trim() ||
      editForm.destinationUrl.trim() !==
        (editModal.campaign.destinationUrl || "").trim() ||
      editFile !== null),
  );
  const handleSubmitEditCampaign = async () => {
    if (!editModal.campaign) return;

    if (!hasEditChanges) {
      toast.error("Bạn chưa thay đổi thông tin nào của chiến dịch.");
      return;
    }

    if (
      !editForm.title.trim() ||
      !editForm.content.trim() ||
      !editForm.destinationUrl.trim()
    ) {
      toast.error("Vui lòng nhập đầy đủ tiêu đề, nội dung và URL đích.");
      return;
    }
    setSubmittingEdit(true);
    try {
      const formData = new FormData();
      formData.append("title", editForm.title.trim());
      formData.append("content", editForm.content.trim());

      if (editForm.destinationUrl.trim()) {
        formData.append("destinationUrl", editForm.destinationUrl.trim());
      }

      if (editFile) {
        if (Platform.OS === "web" && editFile.file) {
          formData.append("mediaFile", editFile.file);
        } else {
          formData.append("mediaFile", {
            uri: editFile.uri,
            name:
              editFile.fileName ||
              editFile.uri.split("/").pop() ||
              `upload_${Date.now()}.jpg`,
            type: editFile.mimeType || "image/jpeg",
          } as any);
        }
      }

      // Gọi API riêng để cập nhật và gửi duyệt lại chiến dịch
      await advertisementService.updateCampaign(
        editModal.campaign.id,
        formData,
      );

      toast.success("Đã cập nhật và gửi duyệt lại chiến dịch.");
      handleCloseEditModal();
      await fetchData(true);
    } catch (cause) {
      console.error("Lỗi gửi duyệt lại:", cause);
      reportApiFailure(
        cause,
        "Không thể cập nhật chiến dịch. Vui lòng thử lại.",
      );
    } finally {
      setSubmittingEdit(false);
    }
  };
  // Helper tạo UUID tương thích cả Web và React Native (chống bấm gửi 2 lần)
  const generateRequestKey = () => {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };
  // --- CÁC HÀM XỬ LÝ CHO MODAL YÊU CẦU HOÀN TIỀN ---
  const handleOpenRefundModal = (campaign: AdCampaign) => {
    setRefundForm({
      bankName: "",
      accountNumber: "",
      accountHolderName: "",
      reason: "",
      requestKey: generateRequestKey(),
    });
    setRefundModal({ visible: true, campaign });
  };

  const handleSubmitRefund = async () => {
    if (!refundModal.campaign) return;

    const bankName = refundForm.bankName.trim();
    const accountNumber = refundForm.accountNumber.trim();
    const accountHolderName = refundForm.accountHolderName.trim().toUpperCase();
    const reason = refundForm.reason.trim();

    if (!bankName || !accountNumber || !accountHolderName) {
      toast.error("Vui lòng nhập đầy đủ thông tin tài khoản ngân hàng.");
      return;
    }

    if (!reason) {
      toast.error("Vui lòng nhập lý do yêu cầu hoàn tiền.");
      return;
    }

    const manualPayingAccount = `${bankName} - ${accountNumber} - ${accountHolderName}`;
    if (manualPayingAccount.length > 255) {
      toast.error(
        "Thông tin tài khoản ngân hàng không được vượt quá 255 ký tự.",
      );
      return;
    }

    setSubmittingRefund(true);
    try {
      const refundRequest = await advertisementService.requestRefund(
        refundModal.campaign.id,
        {
          reason,
          manualPayingAccount,
          requestKey: refundForm.requestKey || undefined,
        },
      );
      setRefund(refundRequest as any);
      toast.success("Đã gửi yêu cầu hoàn tiền thành công.");
      setRefundModal({ visible: false, campaign: null });
      await fetchData(true);
    } catch (cause: any) {
      // Lấy object JSON lỗi từ các thuộc tính phổ biến mà apiRequest gắn vào Error
      const rawError =
        cause?.data ??
        cause?.details ??
        cause?.payload ??
        cause?.response?.data;

      const errorResponse = {
        code: rawError?.code ?? cause?.code ?? "UNKNOWN_ERROR",
        message:
          rawError?.message ??
          cause?.message ??
          "Không thể gửi yêu cầu hoàn tiền.",
        statusCode:
          rawError?.statusCode ?? cause?.status ?? cause?.statusCode ?? 500,
      };

      // Log ra đúng cấu trúc { code, message, statusCode }
      console.error("Lỗi yêu cầu hoàn tiền:", errorResponse);

      // Hiển thị thông báo từ Backend lên Toast (bỏ reportApiFailure nếu hàm đó cũng tự gọi toast)
      toast.error(errorResponse.message);
    } finally {
      setSubmittingRefund(false);
    }
  };

  // Chỉ cho phép chọn 1 ảnh
  async function attach() {
    try {
      const asset = await pickProfileImage();
      if (!asset) return;
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

  // Bước 1: Tạo bản nháp (Draft) qua FormData với key mediaFile
  const handleNextToStep2 = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Vui lòng nhập đầy đủ tiêu đề và nội dung.");
      return;
    }
    if (!validateCreateForm()) return;
    setSubmitting(true);
    try {
      if (currentCampaignId) {
        setModalStep(2);
      } else {
        const formData = new FormData();
        formData.append("title", form.title.trim());
        formData.append("content", form.content.trim());

        if (form.destinationUrl.trim()) {
          formData.append("destinationUrl", form.destinationUrl.trim());
        }

        // Chỉ đính kèm 1 file duy nhất với key "mediaFile"
        if (selectedFiles.length > 0) {
          const file = selectedFiles[0];
          if (Platform.OS === "web" && file.file) {
            formData.append("mediaFile", file.file);
          } else {
            formData.append("mediaFile", {
              uri: file.uri,
              name:
                file.fileName ||
                file.uri.split("/").pop() ||
                `upload_${Date.now()}.jpg`,
              type: file.mimeType || "image/jpeg",
            } as any);
          }
        }

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

  // Bước 2: Gán gói -> chuyển thẳng sang PendingPayment -> lấy link PayOS
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

      // Luồng mới: Chọn gói xong sẽ chuyển thẳng sang PendingPayment
      const paymentData = await advertisementService.createPayment(
        assignedCampaign.id || currentCampaignId,
      );

      if (paymentData?.checkoutUrl) {
        handleCloseModal();
        await fetchData(true);
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.location.href = paymentData.checkoutUrl;
        } else {
          await Linking.openURL(paymentData.checkoutUrl);
        }
      } else {
        toast.error(
          "Không tạo được link thanh toán. Vui lòng thanh toán lại trong danh sách chiến dịch.",
        );
        handleCloseModal();
        fetchData(true);
      }
    } catch (cause) {
      console.error("Lỗi:", cause);
      reportApiFailure(cause, "Không thể xử lý yêu cầu. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  // Thanh toán lại cho chiến dịch đang ở trạng thái PendingPayment
  const handlePayExistingCampaign = async (campaignId: string) => {
    setPayingCampaignId(campaignId);
    try {
      const paymentData = await advertisementService.createPayment(campaignId);
      if (paymentData?.checkoutUrl) {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          window.location.href = paymentData.checkoutUrl;
        } else {
          await Linking.openURL(paymentData.checkoutUrl);
        }
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

        {(Number(item.status) === CampaignStatus.Rejected ||
          Number(item.status) === CampaignStatus.PendingModeration) && (
          <View style={styles.rejectedActionsRow}>
            <Pressable
              style={styles.refundBtn}
              onPress={() => handleOpenRefundModal(item)}
            >
              <Text style={styles.refundBtnText}>Yêu cầu hoàn tiền</Text>
            </Pressable>

            <View style={{ flex: 1 }}>
              <Button
                title="Sửa và duyệt lại"
                onPress={() => handleOpenEditModal(item)}
              />
            </View>
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

        {loading || syncingPayment ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            {syncingPayment && (
              <Text style={{ marginTop: 12, color: colors.textSecondary }}>
                Đang đồng bộ kết quả thanh toán...
              </Text>
            )}
          </View>
        ) : (
          <FlatList
            data={filteredCampaigns}
            keyExtractor={(item, index) => item.id || index.toString()}
            renderItem={renderCampaignCard}
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

      {/* --- MODAL TẠO CHIẾN DỊCH & CHỌN GÓI --- */}
      <Modal
        visible={modalStep > 0}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessible={false}
            style={StyleSheet.absoluteFill}
            onPress={handleCancel}
          />
          {modalStep > 0 && <ToastHost modal />}
          <View
            style={[styles.modalContent, modalStep === 2 && { height: "80%" }]}
          >
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
                      Tên chiến dịch <Text style={styles.asterisk}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.inputField,
                        formErrors.title && { borderColor: colors.error },
                      ]}
                      placeholder="Nhập tên chiến dịch..."
                      placeholderTextColor={colors.textSecondary}
                      maxLength={255}
                      value={form.title}
                      onChangeText={(txt) => {
                        setForm({ ...form, title: txt });
                        if (formErrors.title)
                          setFormErrors({ ...formErrors, title: undefined });
                      }}
                    />
                    {formErrors.title && (
                      <Text style={{ fontSize: 12, color: colors.error }}>
                        {formErrors.title}
                      </Text>
                    )}
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>
                      Nội dung chi tiết <Text style={styles.asterisk}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.inputField,
                        { height: 100, textAlignVertical: "top" },
                        formErrors.content && { borderColor: colors.error },
                      ]}
                      placeholder="Mô tả nội dung bạn muốn truyền tải..."
                      placeholderTextColor={colors.textSecondary}
                      multiline
                      value={form.content}
                      onChangeText={(txt) => {
                        setForm({ ...form, content: txt });
                        if (formErrors.content)
                          setFormErrors({ ...formErrors, content: undefined });
                      }}
                    />
                    {formErrors.content && (
                      <Text style={{ fontSize: 12, color: colors.error }}>
                        {formErrors.content}
                      </Text>
                    )}
                  </View>

                  {/* Hiển thị 1 ảnh đã chọn */}
                  {selectedFiles.length > 0 && (
                    <View style={styles.previewContainer}>
                      <View style={styles.previewGrid}>
                        {selectedFiles.map((file, index) => (
                          <View key={index} style={styles.previewItem}>
                            <Image
                              source={{ uri: file.uri }}
                              contentFit="cover"
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

                  {/* Nút Thêm/Đổi 1 ảnh */}
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
                        Thêm ảnh banner
                      </Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[
                        styles.attachMediaBar,
                        {
                          backgroundColor: "#F3F4F6",
                          borderColor: "#F59E0B",
                          borderStyle: "solid",
                          borderWidth: 1.5,
                        },
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
                        Đổi ảnh khác
                      </Text>
                    </Pressable>
                  )}

                  <View style={styles.formGroup}>
                    <Text style={styles.inputLabel}>
                      URL đích khi click <Text style={styles.asterisk}>*</Text>
                    </Text>
                    <TextInput
                      style={[
                        styles.inputField,
                        formErrors.destinationUrl && {
                          borderColor: colors.error,
                        },
                      ]}
                      placeholder="https://yourwebsite.com"
                      placeholderTextColor={colors.textSecondary}
                      autoCapitalize="none"
                      keyboardType="url"
                      value={form.destinationUrl}
                      onChangeText={(txt) => {
                        setForm({ ...form, destinationUrl: txt });
                        if (formErrors.destinationUrl)
                          setFormErrors({
                            ...formErrors,
                            destinationUrl: undefined,
                          });
                      }}
                    />
                    {formErrors.destinationUrl && (
                      <Text style={{ fontSize: 12, color: colors.error }}>
                        {formErrors.destinationUrl}
                      </Text>
                    )}
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

      {/* --- MODAL SỬA VÀ DUYỆT LẠI CHIẾN DỊCH --- */}
      <Modal
        visible={editModal.visible}
        transparent
        animationType="slide"
        onRequestClose={handleCloseEditModal}
      >
        <View style={styles.modalOverlay}>
          {editModal.visible && <ToastHost modal />}
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sửa và duyệt lại</Text>
              <Text style={styles.modalSubtitle}>
                Chỉnh sửa thông tin chiến dịch và gửi hệ thống xét duyệt lại
              </Text>
            </View>

            {editModal.campaign?.rejectionReason && (
              <View style={styles.rejectionAlertBox}>
                <Text style={styles.rejectionAlertTitle}>
                  Lý do bị từ chối:
                </Text>
                <Text style={styles.rejectionAlertText}>
                  {editModal.campaign.rejectionReason}
                </Text>
              </View>
            )}

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ gap: 16 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Tên chiến dịch <Text style={styles.asterisk}>*</Text>
                </Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Nhập tên chiến dịch..."
                  placeholderTextColor={colors.textSecondary}
                  value={editForm.title}
                  onChangeText={(txt) =>
                    setEditForm({ ...editForm, title: txt })
                  }
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
                  value={editForm.content}
                  onChangeText={(txt) =>
                    setEditForm({ ...editForm, content: txt })
                  }
                />
              </View>

              {/* Hiển thị ảnh mới chọn hoặc ảnh hiện tại của chiến dịch */}
              {(editFile || existingEditImageUrl) && (
                <View style={styles.previewContainer}>
                  <View style={styles.previewGrid}>
                    {editFile ? (
                      <View style={styles.previewItem}>
                        <Image
                          source={{ uri: editFile.uri }}
                          contentFit="cover"
                          style={styles.previewImage}
                        />
                        <Pressable
                          style={styles.removeBtn}
                          onPress={() => setEditFile(null)}
                          disabled={submittingEdit}
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
                    ) : (
                      existingEditImageUrl && (
                        <View style={styles.previewItem}>
                          <Image
                            source={{ uri: existingEditImageUrl }}
                            contentFit="cover"
                            style={styles.previewImage}
                          />
                        </View>
                      )
                    )}
                  </View>
                </View>
              )}

              {/* Nút Thêm/Đổi ảnh banner */}
              {!editFile && !existingEditImageUrl ? (
                <Pressable
                  style={styles.attachMediaBar}
                  onPress={() => void attachEditImage()}
                  disabled={submittingEdit}
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
                  <Text style={styles.attachMediaText}>Thêm ảnh banner</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[
                    styles.attachMediaBar,
                    {
                      backgroundColor: "#F3F4F6",
                      borderColor: "#F59E0B",
                      borderStyle: "solid",
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => void attachEditImage()}
                  disabled={submittingEdit}
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
                  <Text style={[styles.attachMediaText, { color: "#4B5563" }]}>
                    Đổi ảnh khác
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
                  value={editForm.destinationUrl}
                  onChangeText={(txt) =>
                    setEditForm({ ...editForm, destinationUrl: txt })
                  }
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                onPress={handleCloseEditModal}
                style={styles.cancelBtn}
                disabled={submittingEdit}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Button
                  title={
                    submittingEdit ? "Đang gửi duyệt..." : "Lưu & Gửi duyệt lại"
                  }
                  onPress={handleSubmitEditCampaign}
                  disabled={
                    submittingEdit ||
                    !editForm.title.trim() ||
                    !editForm.content.trim() ||
                    !editForm.destinationUrl.trim() ||
                    !hasEditChanges
                  }
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- MODAL YÊU CẦU HOÀN TIỀN --- */}
      <Modal
        visible={refundModal.visible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          !submittingRefund &&
          setRefundModal({ visible: false, campaign: null })
        }
      >
        <View style={styles.modalOverlay}>
          {refundModal.visible && <ToastHost modal />}
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yêu cầu hoàn tiền</Text>
              <Text style={styles.modalSubtitle} numberOfLines={1}>
                Chiến dịch: {refundModal.campaign?.title}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#059669",
                  marginTop: 6,
                }}
              >
                Số tiền hoàn dự kiến:{" "}
                {(refundModal.campaign?.budgetCap ?? 0).toLocaleString("vi-VN")}{" "}
                ₫
              </Text>
            </View>

            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={{ gap: 14 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Tên ngân hàng <Text style={styles.asterisk}>*</Text>
                </Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="VD: Vietcombank, MB Bank, Techcombank..."
                  placeholderTextColor={colors.textSecondary}
                  value={refundForm.bankName}
                  onChangeText={(txt) =>
                    setRefundForm({ ...refundForm, bankName: txt })
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Số tài khoản nhận tiền <Text style={styles.asterisk}>*</Text>
                </Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="Nhập chính xác số tài khoản..."
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={refundForm.accountNumber}
                  onChangeText={(txt) =>
                    setRefundForm({ ...refundForm, accountNumber: txt })
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Tên chủ tài khoản <Text style={styles.asterisk}>*</Text>
                </Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="NGUYEN VAN A (Viết hoa không dấu)"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="characters"
                  value={refundForm.accountHolderName}
                  onChangeText={(txt) =>
                    setRefundForm({ ...refundForm, accountHolderName: txt })
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>
                  Lý do hoàn tiền <Text style={styles.asterisk}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.inputField,
                    { height: 84, textAlignVertical: "top" },
                  ]}
                  placeholder="VD: Chiến dịch bị từ chối kiểm duyệt, muốn hủy và nhận lại tiền..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  maxLength={500}
                  value={refundForm.reason}
                  onChangeText={(txt) =>
                    setRefundForm({ ...refundForm, reason: txt })
                  }
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() =>
                  setRefundModal({ visible: false, campaign: null })
                }
                style={styles.cancelBtn}
                disabled={submittingRefund}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <Button
                  title={
                    submittingRefund
                      ? "Đang gửi yêu cầu..."
                      : "Gửi yêu cầu hoàn tiền"
                  }
                  onPress={handleSubmitRefund}
                  disabled={
                    submittingRefund ||
                    !refundForm.bankName.trim() ||
                    !refundForm.accountNumber.trim() ||
                    !refundForm.accountHolderName.trim() ||
                    !refundForm.reason.trim()
                  }
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* --- POP-UP KẾT QUẢ THANH TOÁN PAYOS --- */}
      <Modal
        visible={paymentPopup.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setPaymentPopup((prev) => ({ ...prev, visible: false }))
        }
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessible={false}
            style={StyleSheet.absoluteFill}
            onPress={() =>
              setPaymentPopup((prev) => ({ ...prev, visible: false }))
            }
          />
          <View style={styles.resultPopupCard}>
            <View
              style={[
                styles.resultIconCircle,
                {
                  backgroundColor: paymentPopup.success ? "#D1FAE5" : "#FEE2E2",
                },
              ]}
            >
              <SymbolView
                name={
                  paymentPopup.success
                    ? {
                        ios: "checkmark.circle.fill",
                        android: "check_circle",
                        web: "check_circle",
                      }
                    : {
                        ios: "xmark.circle.fill",
                        android: "cancel",
                        web: "cancel",
                      }
                }
                size={44}
                tintColor={paymentPopup.success ? "#059669" : "#DC2626"}
              />
            </View>

            <Text style={styles.resultTitle}>{paymentPopup.title}</Text>
            <Text style={styles.resultMessage}>{paymentPopup.message}</Text>

            <View style={{ width: "100%", marginTop: 8 }}>
              <Button
                title="Đóng"
                onPress={() =>
                  setPaymentPopup((prev) => ({ ...prev, visible: false }))
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
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  contentWrapper: {
    flex: 1,
    alignSelf: "center",
    width: "100%",
    maxWidth: 800,
  },
  actionAndFilterWrapper: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
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
  resultPopupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 12,
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  resultIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  resultMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  rejectedActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  refundBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    alignItems: "center",
    justifyContent: "center",
  },
  refundBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
  },
  rejectionAlertBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  rejectionAlertTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#991B1B",
  },
  rejectionAlertText: {
    fontSize: 13,
    color: "#DC2626",
    lineHeight: 18,
  },
});
