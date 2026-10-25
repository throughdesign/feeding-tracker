import { useEffect, useState } from "react";

/**
 * Current time, refreshed on an interval and whenever the page becomes visible
 * again (e.g. after the phone wakes). Timers derive elapsed time from stored
 * timestamps, so this is only a render trigger, never the source of truth.
 */
export function useNow(intervalMs = 1000, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [intervalMs, enabled]);
  return now;
}
