export type GitRefreshState = 'idle' | 'refreshing' | 'waiting' | 'timeout' | 'error';
type Timer = ReturnType<typeof setTimeout> | number;
type Options = {
  run: (signal: AbortSignal) => Promise<boolean>; onState: (state: GitRefreshState) => void;
  terminalError?: (cause: unknown) => boolean;
  now?: () => number; later?: (fn: () => void, ms: number) => Timer; cancel?: (timer: Timer) => void;
  maxAttempts?: number; deadlineMs?: number; minGapMs?: number;
};
// One in-flight read, bounded waiting and no automatic mutation. Injectable clock for deterministic tests.
export function createGitHubRefresh(options: Options) {
  const now = options.now ?? Date.now, later = options.later ?? setTimeout, cancel = options.cancel ?? clearTimeout;
  const max = options.maxAttempts ?? 5, deadlineMs = options.deadlineMs ?? 90000, gap = options.minGapMs ?? 1500;
  let disposed = false, active = true, controller: AbortController | null = null, timer: Timer | null = null, requestTimer: Timer | null = null;
  let waiting = false, attempts = 0, deadline = 0, last = -Infinity, sequence = 0;
  const emit = (state: GitRefreshState) => { if (!disposed) options.onState(state); };
  const clear = () => { if (timer !== null) cancel(timer); timer = null; };
  function schedule() {
    clear(); if (disposed || !active || !waiting) return;
    if (attempts >= max || now() >= deadline) { waiting = false; emit('timeout'); return; }
    const backoff = [2000, 5000, 10000, 20000, 30000][Math.min(attempts, 4)];
    timer = later(() => { timer = null; void trigger(); }, Math.max(0, Math.min(backoff, deadline - now())));
  }
  async function trigger(force = false) {
    if (disposed || !active || controller) return;
    if (!force && now() - last < gap) {
      if (timer === null) timer = later(() => { timer = null; void trigger(); }, gap - (now() - last));
      return; // Coalesce focus + visibility without losing a fast return from GitHub.
    }
    if (waiting && (attempts >= max || now() >= deadline)) { waiting = false; emit('timeout'); return; }
    clear(); const request = ++sequence; const own = new AbortController(); controller = own; last = now();
    if (waiting) attempts++;
    emit('refreshing');
    // Bound even an unresponsive provider; abort prevents stale writes in consumers.
    const timeout = later(() => { if (request === sequence && controller === own) {
      requestTimer = null; own.abort(); controller = null; sequence++; waiting = false; emit('timeout');
    } }, Math.max(1, Math.min(20000, waiting ? deadline - now() : 20000)));
    requestTimer = timeout;
    try {
      const changed = await options.run(own.signal);
      if (disposed || own.signal.aborted || request !== sequence) return;
      if (changed) waiting = false;
      emit(waiting ? 'waiting' : 'idle');
    } catch (cause) {
      if (!disposed && !own.signal.aborted && request === sequence) {
        if (options.terminalError?.(cause)) waiting = false;
        emit(waiting ? 'waiting' : 'error');
      }
    } finally {
      cancel(timeout);
      if (requestTimer === timeout) requestTimer = null;
      if (controller === own) controller = null;
      if (!disposed && request === sequence) schedule();
    }
  }
  return {
    trigger,
    wait() { if (disposed) return; waiting = true; attempts = 0; deadline = now() + deadlineMs; emit('waiting'); schedule(); },
    stopWaiting() { waiting = false; clear(); emit('idle'); },
    setActive(value: boolean) {
      if (disposed || active === value) return;
      active = value;
      if (!active) { clear(); if (requestTimer !== null) cancel(requestTimer); requestTimer = null; sequence++; controller?.abort(); controller = null; }
      else { if (waiting && now() >= deadline) { waiting = false; emit('timeout'); } void trigger(); }
    },
    dispose() { disposed = true; clear(); if (requestTimer !== null) cancel(requestTimer); requestTimer = null; sequence++; controller?.abort(); controller = null; },
  };
}
