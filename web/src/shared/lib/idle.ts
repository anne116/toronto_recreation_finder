/** Runs `callback` once the browser is idle, so it doesn't compete with critical initial page load work. Returns a function that cancels the pending call. */
export function scheduleWhenIdle(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback);
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, 200);
  return () => window.clearTimeout(id);
}
