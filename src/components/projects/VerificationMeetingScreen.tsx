import { Button } from "@/components/ui/Button";
import { useVerificationMeeting } from "@/hooks/useVerificationMeeting";
import { meetingState, meetingWaitLabel } from "@/utils/verification-meeting";
import { router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import {
  verificationDate as date,
  DossierCard,
  DossierLayout,
  ds,
} from "./VerificationDossierUI";

export function VerificationMeetingScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const { detail, meeting, loading, busy, error, notice, refresh, join, now } =
    useVerificationMeeting(id);
  const state = detail ? meetingState(detail, meeting, now) : null;
  const dossier = () =>
    router.replace({
      pathname: "/group/verification-dossier/[id]",
      params: { id },
    } as never);
  return (
    <DossierLayout projectId={detail?.project?.id || detail?.verification.projectId} title="Buổi thẩm định dự án">
      <Button title="Quay lại hồ sơ" variant="outline" onPress={dossier} />
      {loading && (
        <Text accessibilityRole="progressbar" style={ds.small}>
          Đang cập nhật buổi thẩm định…
        </Text>
      )}
      {error && (
        <Text accessibilityRole="alert" style={ds.error}>
          {error}
        </Text>
      )}
      {notice && (
        <Text accessibilityRole="alert" style={ds.notice}>
          {notice}
        </Text>
      )}
      {detail && state && (
        <>
          <DossierCard
            title={
              detail.project?.title ||
              detail.verification.projectTitle ||
              "Thông tin buổi thẩm định"
            }
          >
            <Text style={ds.notice}>{state.message}</Text>
            {state.waitingSeconds > 0 && (
              <Text style={ds.body}>Còn {meetingWaitLabel(state.waitingSeconds)} đến giờ tham gia.</Text>
            )}
            <Text style={ds.body}>
              Dự kiến bắt đầu:{" "}
              {date(
                meeting?.scheduledStartAt ??
                  detail.verification.scheduledStartAt,
              )}
              {"\n"}Dự kiến kết thúc:{" "}
              {date(
                meeting?.scheduledEndAt ?? detail.verification.scheduledEndAt,
              )}
            </Text>
            <Text style={ds.small}>Giờ Việt Nam (UTC+7)</Text>
            {!!(detail.meetingStartAt || meeting?.meetingStartAt) && (
              <Text style={ds.body}>
                Bắt đầu thực tế:{" "}
                {date(detail.meetingStartAt || meeting?.meetingStartAt)}
              </Text>
            )}
            {!!(detail.meetingEndAt || meeting?.meetingEndAt) && (
              <Text style={ds.body}>
                Kết thúc thực tế:{" "}
                {date(detail.meetingEndAt || meeting?.meetingEndAt)}
              </Text>
            )}
          </DossierCard>
          {state.assignment && (
            <DossierCard title="Chuyên gia thẩm định">
              <Text style={ds.body}>
                Chuyên gia thẩm định đã được phân công.
              </Text>
            </DossierCard>
          )}
          {state.canRead && (
            <DossierCard title="Tham gia buổi thẩm định">
              <Text style={ds.body}>
                Kiểm tra kết nối mạng, camera và micro trước khi tham gia. Phòng
                họp sẽ mở bên ngoài UniNet.
              </Text>
              <Button
                title={
                  busy
                    ? "Đang chuẩn bị phòng…"
                    : detail.meetingStartAt || meeting?.meetingStartAt
                      ? "Tham gia lại"
                      : "Chuẩn bị và tham gia"
                }
                disabled={!state.canJoin || loading || busy}
                onPress={() => {
                  void join();
                }}
              />
              <Text style={ds.small}>
                Chuyên gia sẽ bắt đầu và kết thúc phiên thẩm định. Giờ kết thúc
                dự kiến không tự đóng phiên.
                {"\n"}Đóng tab Jitsi hoặc rời phòng không kết thúc phiên thẩm định.
              </Text>
            </DossierCard>
          )}
          {state.result && (
            <Button
              title="Xem báo cáo thẩm định"
              onPress={() =>
                router.push({
                  pathname: "/group/verification-result/[id]",
                  params: { id },
                } as never)
              }
            />
          )}
        </>
      )}
      <Button
        title="Làm mới"
        variant="outline"
        disabled={loading || busy}
        onPress={refresh}
      />
    </DossierLayout>
  );
}
