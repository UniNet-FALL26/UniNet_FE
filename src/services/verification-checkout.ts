import { projectVerificationService } from '@/services/project-verification.service';
import { verificationPaymentService } from '@/services/verification-payment.service';

export async function loadVerificationCheckout(verificationId: string, signal?: AbortSignal) {
  const [detail, history] = await Promise.all([
    projectVerificationService.detail(verificationId, signal),
    verificationPaymentService.history(verificationId, signal),
  ]);
  // Detail contains all payment summaries: do not miss an older Pending/Success behind page one.
  const important = detail.payments.find(p => p.requiresManualReview) ?? detail.payments.find(p => p.status === 1) ?? detail.payments.find(p => p.status === 0);
  const transactionId = important?.transactionId ?? history.transactions[0]?.id;
  const transaction = transactionId ? await verificationPaymentService.get(verificationId, transactionId, signal) : null;
  const packageData = (!transaction || transaction.status === 2) && detail.packageId
    ? await verificationPaymentService.package(detail.packageId, signal) : null;
  return { detail, transaction, packageData };
}
