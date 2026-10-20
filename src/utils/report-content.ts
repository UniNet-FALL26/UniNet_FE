/**
 * The backend currently exposes one `content` column. New reports store the
 * user-entered title and body as JSON in that column. Plain-text legacy reports
 * remain readable and are treated as body-only content.
 */
export type ParsedReportContent = { title: string; body: string };

export function parseReportContent(raw: string | null | undefined): ParsedReportContent {
  const value = raw ?? '';
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      parsed && typeof parsed === 'object' &&
      'title' in parsed && 'content' in parsed &&
      typeof (parsed as { title: unknown }).title === 'string' &&
      typeof (parsed as { content: unknown }).content === 'string'
    ) {
      return {
        title: (parsed as { title: string }).title,
        body: (parsed as { content: string }).content,
      };
    }
  } catch {
    // Existing reports may contain plain text rather than the new JSON format.
  }
  return { title: '', body: value };
}

export function serializeReportContent(title: string, body: string): string {
  return JSON.stringify({ title: title.trim(), content: body.trim() });
}
