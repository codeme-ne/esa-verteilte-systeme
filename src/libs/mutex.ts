/*
  Minimal async mutex keyed by string.
  Chains promises per key so only one operation runs at a time.
*/

const locks = new Map<string, Promise<void>>();

export async function withLock<T>(
  key: string,
  fn: () => Promise<T> | T,
): Promise<T> {
  const previous = locks.get(key) ?? Promise.resolve();

  // New placeholder promise to signal completion of this lock holder
  let release: () => void = () => {};
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  // Queue current after previous
  locks.set(key, previous.then(() => current));

  // Wait for previous operations on this key to finish
  await previous;

  try {
    return await fn();
  } finally {
    release();
    // Clean up if no further waiters are chained
    const tail = locks.get(key);
    if (tail === current) {
      locks.delete(key);
    }
  }
}
