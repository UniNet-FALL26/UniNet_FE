import { ModulePage } from '@/components/ui/ModulePage';

export default function EventsScreen() {
  return <ModulePage title="Sự kiện" description="Khám phá và theo dõi các sự kiện sắp tới." sections={['Sắp diễn ra', 'Đã đăng ký', 'Đã tham gia']} />;
}
