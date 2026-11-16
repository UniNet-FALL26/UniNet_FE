export const technologyKey = (name: string) => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
export function normalizeProjectTechnologies(values: readonly string[]): string[] {
  const keys = new Set<string>(), result: string[] = [];
  for (const value of values) {
    const name = value.trim().replace(/\s+/g, ' ');
    if (!name) continue;
    if (name.length > 80) throw new Error('Tên công nghệ tối đa 80 ký tự.');
    const key = technologyKey(name);
    if (!keys.has(key)) { keys.add(key); result.push(name); }
  }
  if (result.length > 20) throw new Error('Mỗi dự án có tối đa 20 công nghệ.');
  return result;
}
export function findTechnology<T extends { name: string }>(catalog: readonly T[], name: string): T | undefined {
  const key = technologyKey(name);
  return catalog.find(item => technologyKey(item.name) === key);
}
