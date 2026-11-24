import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { HubAction } from '../hub/ProjectHubUI';

// User-readable explanations only. Technical diagnostics stay in authorized development tools.
export function UserDetails({ title = 'Xem thêm', children }: { title?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <View style={{ gap: 10 }}><HubAction title={open ? `Thu gọn: ${title}` : title} variant="quiet" onPress={() => setOpen(x => !x)} />{open && children}</View>;
}
