export type PublishedContribution = { projectId: string; publishedRunId: string | null; version: number | null; publishedAt: string | null; members: { userProfileId: string; contributionPercent: number }[] };
export function validatePublished(value: PublishedContribution, projectId: string) {
  if (value.projectId !== projectId || !Array.isArray(value.members) || new Set(value.members.map(x => x.userProfileId)).size !== value.members.length) throw new Error('Published scope mismatch');
  if (value.publishedRunId === null) {
    if (value.version !== null || value.publishedAt !== null || value.members.length) throw new Error('Invalid empty publication');
  } else if (!Number.isInteger(value.version) || value.version! < 1 || !value.publishedAt || value.members.some(x => !x.userProfileId || !Number.isFinite(x.contributionPercent) || x.contributionPercent < 0 || x.contributionPercent > 100)) throw new Error('Invalid published result');
  return value;
}
export function publishedPercent(value: PublishedContribution | null, projectId: string, profileId: string) {
  if (!value || value.projectId !== projectId || !value.publishedRunId) return 'Chưa có dữ liệu';
  const member = value.members.find(x => x.userProfileId === profileId);
  return member ? `${member.contributionPercent.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%` : 'Chưa có dữ liệu';
}
