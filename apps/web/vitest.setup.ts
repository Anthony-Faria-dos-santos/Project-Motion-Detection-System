import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Mirror React Testing Library's default behaviour from jest-dom: unmount
// components between tests so that no DOM leaks across specs.
afterEach(() => {
  cleanup();
});
