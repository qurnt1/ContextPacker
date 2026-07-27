import '@testing-library/jest-dom';

// Mock crypto.randomUUID
if (!globalThis.crypto) {
  globalThis.crypto = {};
}
if (!globalThis.crypto.randomUUID) {
  let counter = 0;
  globalThis.crypto.randomUUID = () => `test-uuid-${++counter}`;
}
