import { Redirect, useLocalSearchParams } from 'expo-router';

export default function RetiredProjectWorkspaceRoute() {
  const { projectId } = useLocalSearchParams<{ projectId?: string | string[] }>();
  const id = Array.isArray(projectId) ? projectId[0] : projectId;
  return <Redirect href={id
    ? { pathname: '/group/[id]', params: { id } }
    : { pathname: '/profile/projects' }} />;
}
