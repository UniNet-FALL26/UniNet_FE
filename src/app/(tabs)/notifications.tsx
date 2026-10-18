import { ModulePage } from '@/components/ui/ModulePage';
import { StudentVerificationNotifications } from '@/components/settings/StudentVerificationNotifications';
import { useAuthStore } from '@/store/auth.store';
import { ACCOUNT_ROLE } from '@/constants/roles';

export default function NotificationsScreen() {
  const { account, isAuthenticated } = useAuthStore();
  if (isAuthenticated && account?.role === ACCOUNT_ROLE.STUDENT) return <StudentVerificationNotifications key={account.id} accountId={account.id} />;
  return <ModulePage title="Thông báo" description="Theo dõi những cập nhật liên quan đến bạn." sections={['Tất cả', 'Chưa đọc']} />;
}
