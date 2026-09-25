import { ModulePage } from '@/components/ui/ModulePage';

export default function MessagesScreen() {
  return <ModulePage title="Nhắn tin" description="Các cuộc trò chuyện của bạn sẽ xuất hiện tại đây." sections={['Hộp thư', 'Lời mời trò chuyện']} />;
}
