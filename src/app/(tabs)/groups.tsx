import { Redirect } from 'expo-router';

export default function RetiredRecruitmentScreen() {
  return <Redirect href={{ pathname: '/profile/projects' }} />;
}
