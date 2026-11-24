import type { AvailabilitySlot } from '@/services/assessor.service';

// The availability API accepts at most 31 days; a calendar grid spans 42.
export async function loadCalendarAvailability(
  fetchRange: (from: string, to: string, signal?: AbortSignal) => Promise<AvailabilitySlot[]>,
  from: Date, to: Date, signal: AbortSignal,
): Promise<AvailabilitySlot[]> {
  const slots = new Map<string, AvailabilitySlot>();
  const maxRange = 31 * 86400000;
  for (let start = from.getTime(); start < to.getTime(); start += maxRange) {
    if (signal.aborted) { const error = new Error('Calendar request aborted'); error.name = 'AbortError'; throw error; }
    const end = Math.min(start + maxRange, to.getTime());
    const rows = await fetchRange(new Date(start).toISOString(), new Date(end).toISOString(), signal);
    // An interval crossing a range boundary appears in both responses.
    for (const row of rows) slots.set(row.id, row);
  }
  return [...slots.values()].sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
}

export function calendarDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, index) => new Date(first.getFullYear(), first.getMonth(), 1 - offset + index));
}

export function sameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function slotsOnDay(rows: AvailabilitySlot[], day: Date): AvailabilitySlot[] {
  const from = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const to = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).getTime();
  return rows.filter(row => Date.parse(row.startAt) < to && Date.parse(row.endAt) > from)
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
}
