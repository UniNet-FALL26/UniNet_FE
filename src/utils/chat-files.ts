const documentFormats: Record<string, { label: string; color: string }> = {
  pdf: { label: 'PDF', color: '#EF5350' },
  doc: { label: 'DOC', color: '#2789E8' }, docx: { label: 'DOCX', color: '#2789E8' },
  xls: { label: 'XLS', color: '#24A36C' }, xlsx: { label: 'XLSX', color: '#24A36C' }, csv: { label: 'CSV', color: '#24A36C' },
  ppt: { label: 'PPT', color: '#F08040' }, pptx: { label: 'PPTX', color: '#F08040' },
  txt: { label: 'TXT', color: '#6C7D96' }, md: { label: 'MD', color: '#6C7D96' },
  zip: { label: 'ZIP', color: '#A477D6' }, rar: { label: 'RAR', color: '#A477D6' }, '7z': { label: '7Z', color: '#A477D6' },
  json: { label: 'JSON', color: '#D49A2D' }, xml: { label: 'XML', color: '#D49A2D' },
};
const mimeFormats: Record<string, string> = {
  'application/pdf': 'pdf', 'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt', 'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt', 'text/csv': 'csv', 'text/markdown': 'md',
  'application/zip': 'zip', 'application/x-rar-compressed': 'rar', 'application/x-7z-compressed': '7z',
  'application/json': 'json', 'application/xml': 'xml', 'text/xml': 'xml',
};
export function documentPresentation(name: string, mimeType?: string) {
  const extension = /\.([^.]+)$/.exec(name)?.[1].toLowerCase();
  const mime = mimeType?.split(';')[0].trim().toLowerCase() || '';
  const mimeKey = Object.hasOwn(mimeFormats, mime) ? mimeFormats[mime] : '';
  const format = extension && Object.hasOwn(documentFormats, extension) ? documentFormats[extension] : documentFormats[mimeKey];
  return format ? { ...format, known: true } : { label: 'FILE', color: '#94A3B8', known: false };
}
export function formatChatFileSize(bytes: number | undefined) {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return bytes >= 1024 ? `${Math.round(bytes / 1024)} KB` : `${bytes} B`;
}
