import { ApiError } from '@/services/api';
import type { Specialization } from '@/services/specialization.service';

export function activeSpecializations(items: Specialization[]): Specialization[] {
  return items.filter(item => item && item.isActive !== false && !!item.id && !!item.name);
}

export function initialSpecializationId(
  current: Specialization | null,
  options: Specialization[],
): string {
  if (!current) return '';
  return options.some(item => item.id === current.id) ? current.id : '';
}

export function canSaveSpecialization({
  selectedId,
  current,
  loading,
  hasLoadError,
  busy,
}: {
  selectedId: string;
  current: Specialization | null | undefined;
  loading: boolean;
  hasLoadError: boolean;
  busy: boolean;
}): boolean {
  if (busy || loading || hasLoadError || current === undefined) return false;
  if (!selectedId) return false;
  return selectedId !== (current?.id ?? '');
}

export function specializationSaveError(cause: unknown): {
  message: string;
  reloadCurrent: boolean;
} {
  if (cause instanceof ApiError) {
    const code = cause.code;
    if (
      cause.status === 400 &&
      (code === 'SPECIALIZATION_REQUIRED' || code === 'INVALID_SPECIALIZATION')
    ) {
      return {
        message: 'Vui lòng chọn một chuyên ngành đang hoạt động.',
        reloadCurrent: false,
      };
    }
    if (cause.status === 403 || code === 'FORBIDDEN') {
      return {
        message: 'Bạn không có quyền cập nhật chuyên ngành cho dự án này.',
        reloadCurrent: false,
      };
    }
    if (cause.status === 404 || code === 'PROJECT_NOT_FOUND') {
      return {
        message: 'Không tìm thấy dự án.',
        reloadCurrent: false,
      };
    }
    if (code === 'SPECIALIZATION_LOCKED') {
      return {
        message:
          'Dự án đã có yêu cầu thẩm định nên không thể đổi chuyên ngành đã gán. Dự án chưa có chuyên ngành vẫn có thể gán lần đầu.',
        reloadCurrent: false,
      };
    }
    if (code === 'SPECIALIZATION_CONFLICT') {
      return {
        message:
          'Dữ liệu chuyên ngành vừa thay đổi. Đã tải lại chuyên ngành hiện tại để bạn kiểm tra và thử lại.',
        reloadCurrent: true,
      };
    }
    if (cause.status === 409) {
      return {
        message:
          'Dữ liệu chuyên ngành vừa thay đổi. Đã tải lại chuyên ngành hiện tại để bạn kiểm tra và thử lại.',
        reloadCurrent: true,
      };
    }
    if (cause.message) {
      return { message: cause.message, reloadCurrent: false };
    }
  }
  return {
    message:
      cause instanceof Error && cause.message
        ? cause.message
        : 'Không thể cập nhật chuyên ngành. Vui lòng thử lại.',
    reloadCurrent: false,
  };
}

