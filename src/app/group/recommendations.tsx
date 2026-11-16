import { Redirect } from 'expo-router';

export default function RetiredProjectRecommendationsScreen() {
  return <Redirect href={{ pathname: '/profile/projects' }} />;
}
