import { Redirect } from 'expo-router';

export default function RetiredProjectsScreen() {
  return <Redirect href={{ pathname: '/profile/projects' }} />;
}
