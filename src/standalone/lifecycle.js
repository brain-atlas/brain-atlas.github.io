export const LIFECYCLE_PATH = '/_brain-atlas/lifecycle';

function waitForRetry(delayMs, signal) {
  if (signal?.aborted) return Promise.resolve();

  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, delayMs);
    signal?.addEventListener('abort', finish, { once: true });
  });
}

export async function holdServerLifecycle({
  signal,
  fetchImpl = globalThis.fetch,
  retryDelayMs = 1_000,
  waitForRetry: wait = waitForRetry,
} = {}) {
  while (!signal?.aborted) {
    try {
      const response = await fetchImpl(LIFECYCLE_PATH, {
        cache: 'no-store',
        credentials: 'same-origin',
        signal,
      });
      if (!response.ok) throw new Error(`Lifecycle request failed with status ${response.status}`);
      await response.text();
    } catch {
      // A reload, browser sleep, or transient server error may close the stream.
    }

    if (!signal?.aborted) await wait(retryDelayMs, signal);
  }
}

if (typeof window !== 'undefined') {
  let controller;

  const connect = () => {
    if (controller && !controller.signal.aborted) return;
    controller = new AbortController();
    void holdServerLifecycle({ signal: controller.signal });
  };
  const disconnect = () => controller?.abort();

  window.addEventListener('pagehide', disconnect);
  window.addEventListener('pageshow', connect);
  connect();
}
