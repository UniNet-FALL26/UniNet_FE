import { useEffect } from 'react';
import { toast, type ToastType } from '@/store/toast.store';
import { readableApiMessage } from '@/utils/api-feedback';

/** Redirect existing action-result state to the shared transient notification. */
export function ActionFeedback({ message, type }: { message: string; type: ToastType }) {
  useEffect(() => {
    if (message) toast[type](readableApiMessage(message) || 'Không thể hoàn tất thao tác. Vui lòng kiểm tra thông tin và thử lại.');
  }, [message, type]);
  return null;
}
