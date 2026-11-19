
import { Redirect } from 'expo-router';

export default function RetiredWorkspaceScreen() {
  return <Redirect href={{ pathname: '/profile/projects' }} />;
}
