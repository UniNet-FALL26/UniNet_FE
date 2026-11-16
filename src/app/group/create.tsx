import { Redirect } from 'expo-router';

export default function RetiredProjectCreateScreen() {
  return <Redirect href={{ pathname: '/profile/projects', params: { new: '1' } }} />;
}
