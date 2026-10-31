import { Button } from "@/components/ui/Button";
import { useVerificationDossier } from "@/hooks/useVerificationDossier";
import { ApiError } from "@/services/api";
import { projectVerificationService as service } from "@/services/project-verification.service";
import { verificationPaymentService as payments } from "@/services/verification-payment.service";
import { useAuthStore } from "@/store/auth.store";
import type { VerificationTransactions } from "@/types/project-verification";
import { level2Label } from "@/utils/project-verification";
import { canChooseMeeting, holdSeconds } from "@/utils/verification-booking";
import {
  canCancelVerification,
  dossierSteps,
} from "@/utils/verification-dossier";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  verificationDate as date,
  DossierCard,
  DossierLayout,
  ds,
} from "./VerificationDossierUI";

export function VerificationDossierScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { account } = useAuthStore();
  const { detail, loading, error, refresh } = useVerificationDossier(id ?? "");
  const [history, setHistory] = useState<VerificationTransactions | null>(null);
  const [page, setPage] = useState(1);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyRevision, setHistoryRevision] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const lock = useRef(false);
  const generation = useRef(0);
  useFocusEffect(
    useCallback(() => {
      const current = ++generation.current;
      setConfirming(false);
      setReason("");
      setNotice(null);
      setBusy(false);
      return () => {
        generation.current = current + 1;
      };
    }, [id, account?.id]),
  );
  // Payment history is independent: a failed page never removes the dossier.
  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      setHistory(null);
      setHistoryLoading(true);
      setHistoryError(null);
      payments
        .history(id, controller.signal, page)
        .then((value) => {
          if (!controller.signal.aborted) setHistory(value);
        })
        .catch((cause) => {
          if (!controller.signal.aborted)
            setHistoryError(
              cause instanceof Error
                ? cause.message
                : "Không thể tải lịch sử thanh toán.",
            );
        })
        .finally(() => {
          if (!controller.signal.aborted) setHistoryLoading(false);
        });
      return () => controller.abort();
    }, [id, account?.id, page, historyRevision]),
  );
  function reload() {
    refresh();
    setHistoryRevision((v) => v + 1);
  }
  async function cancel() {
    if (
      lock.current ||
      !detail ||
      loading ||
      error ||
      !reason.trim() ||
      reason.trim().length > 2000
    )
      return;
    lock.current = true;
    setBusy(true);
    setNotice(null);
    const current = generation.current;
    try {
      const latest = await service.detail(id);
      if (current !== generation.current) return;
      if (!canCancelVerification(latest))
        throw new Error("Hồ sơ đã thay đổi và không còn cho phép hủy.");
      const cancelled = await service.cancel(id, reason);
      if (current === generation.current) {
        setConfirming(false);
        setReason("");
        setNotice(
          cancelled?.verification.status === 3
            ? "Hệ thống đã xác nhận hủy hồ sơ. Việc hủy không tự đồng nghĩa hoàn tiền."
            : "Đang kiểm tra lại trạng thái hủy từ hệ thống.",
        );
      }
    } catch (cause) {
      if (current === generation.current)
        setNotice(
          cause instanceof ApiError && cause.status === 409
            ? "Hồ sơ vừa thay đổi. Đang tải trạng thái mới; thao tác hủy chưa được xác nhận."
            : `${cause instanceof Error ? cause.message : "Chưa xác nhận được kết quả hủy."} Vui lòng kiểm tra lại hồ sơ trước khi thử tiếp.`,
        );
    } finally {
      lock.current = false;
      if (current === generation.current) {
        setBusy(false);
        reload();
      }
    }
  }
  const v = detail?.verification;
  const projectId = detail?.project?.id ?? v?.projectId;
  const activeAssignment = detail?.assignments
    .filter((a) => a.status === 0 || a.status === 2)
    .sort(
      (a, b) => Date.parse(b.assignedAt ?? "") - Date.parse(a.assignedAt ?? ""),
    )[0];
  const canAct = !loading && !error && !busy;
  const remaining = detail ? holdSeconds(detail, Date.now()) : 0;
  const final = v?.status === 1 || v?.status === 2;
  return (
    <DossierLayout title="Hồ sơ xác minh cấp 2">
      <View style={ds.hero}>
        <Text style={ds.kicker}>XÁC MINH CHUYÊN VIÊN · CẤP 2</Text>
        <Text style={ds.title}>
          {detail?.project?.title ||
            v?.projectTitle ||
            "Theo dõi hồ sơ xác minh"}
        </Text>
        <Text style={ds.heroText}>
          {detail ? level2Label(detail, true) : "Đang tải hồ sơ từ hệ thống"}
        </Text>
      </View>
      {loading && (
        <Text accessibilityRole="progressbar" style={ds.small}>
          Đang làm mới hồ sơ…
        </Text>
      )}
      {error && (
        <Text accessibilityRole="alert" style={ds.error}>
          {error} Dữ liệu cũ có thể chưa được cập nhật.
        </Text>
      )}
      {notice && (
        <Text accessibilityRole="alert" style={ds.notice}>
          {notice}
        </Text>
      )}
      {detail && v && (
        <>
          <DossierCard title="Tiến trình hồ sơ">
            {dossierSteps(detail).map((step, index) => (
              <View key={step.title} style={ds.step}>
                <Text style={ds.number}>
                  {step.done ? "✓" : String(index + 1).padStart(2, "0")}
                </Text>
                <Text style={ds.stepText}>
                  {step.title} ·{" "}
                  {step.statusText ??
                    (step.done ? "Đã ghi nhận" : "Chưa hoàn tất")}
                </Text>
              </View>
            ))}
            {v.status === 3 && (
              <Text style={ds.notice}>Hồ sơ đã hủy. Tiến trình đã dừng.</Text>
            )}
            <Text style={ds.small}>
              Ngày nộp: {date(v.submittedAt)}
              {"\n"}Cập nhật: {date(v.updatedAt)}
            </Text>
          </DossierCard>
          <DossierCard title="Lịch hẹn và chuyên viên">
            <Text style={ds.body}>
              {v.scheduledStartAt
                ? `${date(v.scheduledStartAt)} — ${date(v.scheduledEndAt)}`
                : "Chưa chọn lịch xác minh."}
            </Text>
            <Text style={ds.small}>Giờ Việt Nam (UTC+7)</Text>
            {v.bookingStatus === 1 && (
              <Text style={ds.notice}>
                {remaining > 0
                  ? `Giữ lịch đến ${date(v.reservedUntil)}. Thanh toán trước thời hạn để được xác nhận.`
                  : "Đã hết thời gian giữ lịch. Kiểm tra giao dịch cũ trước khi chọn lại lịch."}
              </Text>
            )}
            <Text style={ds.body}>
              {detail.meetingEndAt
                ? `Buổi xác minh kết thúc: ${date(detail.meetingEndAt)}`
                : detail.meetingStartAt
                  ? `Buổi xác minh bắt đầu: ${date(detail.meetingStartAt)}`
                  : activeAssignment
                    ? "Đã phân công chuyên viên. Vui lòng theo dõi lịch hẹn."
                    : "Chưa có phân công đang hoạt động."}
            </Text>
            {activeAssignment && (
              <Text style={ds.small}>
                Phân công lúc: {date(activeAssignment.assignedAt)}. Hệ thống
                chưa cung cấp tên chuyên viên trong hồ sơ.
              </Text>
            )}
            {activeAssignment && !detail.meetingEndAt && (
              <Text style={ds.notice}>
                Thông tin vào phòng sẽ được cung cấp ở màn hình tham gia
                meeting. Sinh viên không điều khiển bắt đầu hoặc kết thúc buổi
                xác minh.
              </Text>
            )}
            {detail.meetingEndAt && !final && (
              <Text style={ds.notice}>
                Đang chờ chuyên viên hoàn tất kết luận. Kết quả sẽ được cập nhật
                tại đây.
              </Text>
            )}
            {projectId &&
              detail.verification.status === 0 &&
              canChooseMeeting(detail) &&
              remaining <= 0 && (
                <Button
                  title="Chọn lịch xác minh"
                  disabled={!canAct}
                  onPress={() =>
                    router.push({
                      pathname: "/group/verification/[id]",
                      params: { id: projectId },
                    } as never)
                  }
                />
              )}
            {v.status === 0 &&
              (remaining > 0 || detail.payments.length > 0) && (
                <Button
                  title="Xem trạng thái thanh toán"
                  disabled={!canAct}
                  onPress={() =>
                    router.push({
                      pathname: "/group/checkout/[id]",
                      params: { id, projectId },
                    } as never)
                  }
                />
              )}
            <Button
              title={final ? "Xem kết quả cấp 2" : "Xem báo cáo cấp 2"}
              variant="outline"
              disabled={!canAct}
              onPress={() =>
                router.push({
                  pathname: "/group/verification-result/[id]",
                  params: { id },
                } as never)
              }
            />
          </DossierCard>
          {v.status === 3 && (
            <DossierCard title="Thông tin hủy">
              <Text style={ds.body}>
                {detail.cancellationReason || "Chưa có lý do hiển thị."}
              </Text>
              <Text style={ds.small}>Hủy lúc: {date(detail.cancelledAt)}</Text>
              <Text style={ds.notice}>
                Hủy hồ sơ không tự đồng nghĩa hoàn tiền.
              </Text>
            </DossierCard>
          )}
        </>
      )}
      {detail && (
        <DossierCard title="Lịch sử thanh toán">
          {historyLoading && <Text style={ds.small}>Đang tải giao dịch…</Text>}
          {historyError && (
            <>
              <Text accessibilityRole="alert" style={ds.error}>
                {historyError}
              </Text>
              <Button
                title="Thử tải lại giao dịch"
                variant="outline"
                onPress={() => setHistoryRevision((v) => v + 1)}
              />
            </>
          )}
          {history && (
            <>
              {!history.transactions.length && (
                <Text style={ds.body}>Chưa có giao dịch trên trang này.</Text>
              )}
              {history.transactions.map((transaction) => (
                <View key={transaction.id} style={ds.divider}>
                  <Text style={ds.heading}>
                    {transaction.amountVnd.toLocaleString("vi-VN")} ₫ ·{" "}
                    {["Đang chờ", "Thành công", "Thất bại"][
                      transaction.status
                    ] ?? "Chưa xác định"}
                  </Text>
                  <Text style={ds.small}>
                    Tạo lúc: {date(transaction.createdAt)}
                    {"\n"}Thanh toán lúc: {date(transaction.paidAt)}
                  </Text>

                  {(transaction.requiresReview ||
                    transaction.reconciliationRequired) && (
                    <Text style={ds.notice}>
                      Giao dịch cần đối soát. Vui lòng liên hệ hỗ trợ trước khi
                      thanh toán tiếp.
                    </Text>
                  )}
                </View>
              ))}
              <View style={ds.row}>
                <Button
                  title="Trang trước"
                  variant="outline"
                  disabled={page <= 1 || historyLoading}
                  onPress={() => setPage((v) => v - 1)}
                />
                <Text style={ds.small}>
                  Trang {page} / {Math.max(1, history.totalPages)}
                </Text>
                <Button
                  title="Trang sau"
                  variant="outline"
                  disabled={page >= history.totalPages || historyLoading}
                  onPress={() => setPage((v) => v + 1)}
                />
              </View>
            </>
          )}
          <Text style={ds.small}>
            Thanh toán thành công không đồng nghĩa đạt xác minh cấp 2.
          </Text>
        </DossierCard>
      )}
      <Button
        title="Làm mới hồ sơ"
        variant="outline"
        disabled={loading || busy}
        onPress={reload}
      />
      {detail && canCancelVerification(detail) && (
        <Button
          title="Hủy hồ sơ"
          variant="outline"
          disabled={!canAct}
          onPress={() => setConfirming(true)}
        />
      )}
      <Modal
        visible={confirming}
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setConfirming(false);
        }}
      >
        <SafeAreaView style={ds.safe}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={ds.content}
            >
              <DossierCard title="Xác nhận hủy hồ sơ">
                <Text style={ds.body}>
                  Nhập lý do hủy. Hệ thống sẽ kiểm tra lại điều kiện trước khi
                  xác nhận. Hủy hồ sơ không tự đồng nghĩa hoàn tiền.
                </Text>
                <TextInput
                  accessibilityLabel="Lý do hủy hồ sơ"
                  placeholder="Nhập lý do hủy"
                  multiline
                  maxLength={2000}
                  value={reason}
                  onChangeText={setReason}
                  editable={!busy}
                  style={ds.input}
                />
                <Text style={ds.small}>{reason.length}/2000 ký tự</Text>
                {notice && (
                  <Text accessibilityRole="alert" style={ds.notice}>
                    {notice}
                  </Text>
                )}
                <Button
                  title="Xác nhận hủy hồ sơ"
                  loading={busy}
                  disabled={!reason.trim() || !canAct}
                  onPress={cancel}
                />
                <Button
                  title="Giữ hồ sơ"
                  variant="outline"
                  disabled={busy}
                  onPress={() => setConfirming(false)}
                />
              </DossierCard>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </DossierLayout>
  );
}
