import { Redirect } from 'expo-router';

export default function RetiredProjectImportScreen() {
  return <Redirect href={{ pathname: '/profile/projects', params: { new: '1' } }} />;
}
