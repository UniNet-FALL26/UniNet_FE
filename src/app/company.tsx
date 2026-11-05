import { SafeAreaView } from 'react-native-safe-area-context';
import CompanyDashboard from './(company)/index';

export default function CompanyPreviewRoute() {
  return <SafeAreaView edges={['top']} style={{ flex: 1 }}><CompanyDashboard /></SafeAreaView>;
}
