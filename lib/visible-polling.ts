/** Start only visible work, with one request at a time and a full interval after completion. */
export function startVisiblePolling(
  task: () => Promise<void>,
  intervalMs: number,
) {
  let stopped = false;
  let running = false;
  let completedAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const isVisible = () => document.visibilityState !== "hidden";
  async function run() {
    if (stopped || running || !isVisible()) return;
    running = true;
    try {
      await task();
    } finally {
      running = false;
      completedAt = Date.now();
      if (!stopped && isVisible())
        timer = setTimeout(() => void run(), intervalMs);
    }
  }
  function visibilityChanged() {
    clearTimeout(timer);
    if (isVisible() && !running) {
      const delay = Math.max(0, intervalMs - (Date.now() - completedAt));
      timer = setTimeout(() => void run(), delay);
    }
  }
  document.addEventListener("visibilitychange", visibilityChanged);
  void run();
  return () => {
    stopped = true;
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", visibilityChanged);
  };
}
