/**
 * @fileoverview MSW setup for API integration tests
 * @description Configures MSW server before all tests
 */

import { beforeAll, afterAll } from 'vitest';
import { server } from './mocks/handlers';

// Start MSW server before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn',
  });
});

// Clean up after all tests
afterAll(() => {
  server.close();
});
