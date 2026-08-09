import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Node 22+ ships its own experimental global `localStorage`, which resolves
// to `undefined` unless the process is started with --localstorage-file.
// That global appears to take precedence over jsdom's own (working) storage
// when vitest wires up the jsdom environment, silently breaking every test
// that touches localStorage — not a jsdom or app bug, just two different
// localStorage implementations colliding on the same global name. Install a
// minimal, deterministic in-memory implementation ourselves unconditionally
// (rather than feature-detecting first, which would mean reading Node's own
// broken getter just to check it — that alone triggers its warning) so tests
// don't depend on that interaction working out one way or the other.
class MemoryStorage {
  #store = new Map();
  get length() { return this.#store.size; }
  key(index) { return Array.from(this.#store.keys())[index] ?? null; }
  getItem(key) { return this.#store.has(key) ? this.#store.get(key) : null; }
  setItem(key, value) { this.#store.set(key, String(value)); }
  removeItem(key) { this.#store.delete(key); }
  clear() { this.#store.clear(); }
}

const storage = new MemoryStorage();
for (const target of [globalThis, typeof window !== 'undefined' ? window : null]) {
  if (!target) continue;
  Object.defineProperty(target, 'localStorage', {
    value: storage,
    configurable: true,
    writable: true,
  });
}

afterEach(() => {
  cleanup();
});
