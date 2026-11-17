export function formatProjectUpdatedAt(value: string | null | undefined): string {
  if (!value) return 'Chưa cập nhật';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Chưa cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    hour12: false, timeZone: 'Asia/Ho_Chi_Minh',
  }).format(date);
}
