const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript');
function load() {
  const exported = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/assessor-calendar.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports: exported });
  return exported;
}
test('calendar fetch respects the backend 31-day limit and merges duplicate overlapping slots', async () => {
  const { loadCalendarAvailability } = load();
  const from = new Date('2026-10-25T17:00:00Z'), to = new Date('2026-12-06T17:00:00Z');
  const signal = new AbortController().signal, calls = [];
  const overnight = { id: 'spanning', startAt: '2026-11-24T16:00:00Z', endAt: '2026-11-25T18:00:00Z' };
  const early = { id: 'early', startAt: '2026-11-01T06:00:00Z', endAt: '2026-11-01T07:00:00Z' };
  const late = { id: 'late', startAt: '2026-12-04T06:00:00Z', endAt: '2026-12-04T07:00:00Z' };
  const result = await loadCalendarAvailability(async (start, end, actualSignal) => {
    assert.equal(actualSignal, signal);
    assert(Date.parse(end) > Date.parse(start));
    assert(Date.parse(end) - Date.parse(start) <= 31 * 86400000, 'backend rejects wider ranges');
    calls.push([start, end]);
    return calls.length === 1 ? [overnight, early] : [late, overnight];
  }, from, to, signal);
  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], from.toISOString());
  assert.equal(calls[0][1], calls[1][0], 'range chunks have no gap');
  assert.equal(calls[1][1], to.toISOString());
  assert.equal(result.map(row => row.id).join(','), 'early,spanning,late');
});
test('a failed range request rejects the entire calendar load instead of showing partial results', async () => {
  const { loadCalendarAvailability } = load(); let calls = 0;
  await assert.rejects(loadCalendarAvailability(async () => {
    calls++; if (calls === 2) throw new Error('Calendar unavailable');
    return [];
  }, new Date('2026-10-25T17:00:00Z'), new Date('2026-12-06T17:00:00Z'), new AbortController().signal), /Calendar unavailable/);
});
test('calendar has 42 local dates starting Monday and handles year boundaries', () => {
  const { calendarDays } = load();
  const days = calendarDays(new Date(2027, 0, 15));
  assert.equal(days.length, 42);
  assert.equal(days[0].getDay(), 1);
  assert.equal(days[0].getFullYear(), 2026);
  assert.equal(days[0].getMonth(), 11);
  assert.equal(days[0].getDate(), 28);
  assert.equal(days[41].getMonth(), 1);
  assert.equal(days[41].getDate(), 7);
  assert.equal(days[0].getHours(), 0);
});
test('selected day includes overnight slots and excludes slots ending at its midnight', () => {
  const { slotsOnDay } = load();
  const iso = (day, hour) => new Date(2026, 10, day, hour).toISOString();
  const rows = [
    { id: 'later', startAt: iso(24, 15), endAt: iso(24, 16) },
    { id: 'overnight', startAt: iso(23, 22), endAt: iso(24, 2) },
    { id: 'midnight-end', startAt: iso(23, 22), endAt: iso(24, 0) },
    { id: 'tomorrow', startAt: iso(25, 0), endAt: iso(25, 1) },
    { id: 'earlier', startAt: iso(24, 9), endAt: iso(24, 10) },
    { id: 'invalid', startAt: 'invalid', endAt: 'invalid' },
  ];
  assert.equal(slotsOnDay(rows, new Date(2026, 10, 24)).map(r => r.id).join(','), 'overnight,earlier,later');
  assert.equal(rows[0].id, 'later', 'original API order remains unchanged');
});
