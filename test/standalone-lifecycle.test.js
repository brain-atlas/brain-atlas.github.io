import assert from 'node:assert/strict';
import test from 'node:test';

async function loadLifecycleModule() {
  let lifecycle;
  try {
    lifecycle = await import('../src/standalone/lifecycle.js');
  } catch {
    lifecycle = null;
  }
  assert.equal(typeof lifecycle?.holdServerLifecycle, 'function');
  return lifecycle;
}

test('standalone lifecycle holds one authenticated same-origin response open', async () => {
  const { LIFECYCLE_PATH, holdServerLifecycle } = await loadLifecycleModule();
  const stopped = new AbortController();
  let request;
  let consumed = false;

  const run = holdServerLifecycle({
    signal: stopped.signal,
    fetchImpl: async (path, options) => {
      request = { path, options };
      return {
        ok: true,
        async text() {
          consumed = true;
          stopped.abort();
        },
      };
    },
    waitForRetry: async () => {},
  });

  await run;

  assert.equal(LIFECYCLE_PATH, '/_brain-atlas/lifecycle');
  assert.equal(request.path, LIFECYCLE_PATH);
  assert.equal(request.options.credentials, 'same-origin');
  assert.equal(request.options.cache, 'no-store');
  assert.equal(request.options.signal, stopped.signal);
  assert.equal(consumed, true);
});

test('standalone lifecycle reconnects after a completed stream', async () => {
  const { holdServerLifecycle } = await loadLifecycleModule();
  const stopped = new AbortController();
  let requests = 0;
  let retries = 0;

  await holdServerLifecycle({
    signal: stopped.signal,
    fetchImpl: async () => {
      requests += 1;
      if (requests === 2) stopped.abort();
      return { ok: true, text: async () => {} };
    },
    waitForRetry: async () => {
      retries += 1;
    },
  });

  assert.equal(requests, 2);
  assert.equal(retries, 1);
});

test('standalone lifecycle backs off after rejected responses', async () => {
  const { holdServerLifecycle } = await loadLifecycleModule();
  const stopped = new AbortController();
  let retries = 0;

  await holdServerLifecycle({
    signal: stopped.signal,
    fetchImpl: async () => ({ ok: false, status: 403, text: async () => {} }),
    waitForRetry: async () => {
      retries += 1;
      stopped.abort();
    },
  });

  assert.equal(retries, 1);
});
