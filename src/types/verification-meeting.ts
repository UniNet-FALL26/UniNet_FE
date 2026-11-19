export type MeetingResponse = {
  assignmentId: string; projectVerificationId: string;
  roomName: string | null; joinUrl: string | null;
  scheduledStartAt: string | null; scheduledEndAt: string | null;
  meetingStartAt: string | null; meetingEndAt: string | null;
};
export type MeetingJoinResponse = {
  assignmentId: string; projectVerificationId: string; joinUrl: string;
};
export const isMeetingId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function safeMeetingUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Đường dẫn phòng họp không hợp lệ.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Đường dẫn phòng họp không an toàn.');
  return url.href;
}
export function validateMeeting<T extends MeetingResponse | MeetingJoinResponse>(value: T, assignmentId: string, verificationId: string, join = false): T {
  const invalid = () => { throw new Error('Phản hồi phòng họp không hợp lệ. Vui lòng làm mới hồ sơ.'); };
  if (!value || !isMeetingId(value.assignmentId) || !isMeetingId(value.projectVerificationId) ||
    value.assignmentId.toLowerCase() !== assignmentId.toLowerCase() || value.projectVerificationId.toLowerCase() !== verificationId.toLowerCase()) invalid();
  if (join) safeMeetingUrl(value.joinUrl);
  else {
    const metadata = value as MeetingResponse;
    for (const key of ['scheduledStartAt', 'scheduledEndAt', 'meetingStartAt', 'meetingEndAt'] as const) {
      const date = metadata[key];
      if (date !== null && (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(date) || !Number.isFinite(Date.parse(date)))) invalid();
    }
    if (metadata.roomName !== null && (typeof metadata.roomName !== 'string' || !metadata.roomName.trim())) invalid();
    if (metadata.joinUrl !== null) safeMeetingUrl(metadata.joinUrl);
  }
  return value;
}
