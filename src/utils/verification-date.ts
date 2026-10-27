/** Consistent Vietnam time for project verification, independent of the device. */
export const VERIFICATION_TIME_ZONE = 'Asia/Ho_Chi_Minh';
export const VERIFICATION_TIME_LABEL = 'Giờ Việt Nam (UTC+7)';
export function verificationDate(value?: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Chưa có';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: VERIFICATION_TIME_ZONE, day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(value));
}
