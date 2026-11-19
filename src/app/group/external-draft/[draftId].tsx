import { Redirect } from 'expo-router';

export default function RetiredProjectDraftScreen() {
  return <Redirect href={{ pathname: '/profile/projects' }} />;
}
