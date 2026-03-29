/**
 * Test Configuration
 * 
 * Centralized configuration for E2E tests
 */

export const config = {
  // Base URL for testing
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  
  // Test user credentials
  testUsers: {
    admin: {
      email: 'admin@example.com',
      password: 'Admin123456!',
      role: 'admin',
    },
    user: {
      email: 'test@example.com',
      password: 'Test123456!',
      role: 'user',
    },
    guest: {
      email: 'guest@example.com',
      password: 'Guest123456!',
      role: 'guest',
    },
  },
  
  // API endpoints
  api: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    user: '/api/users',
    notifications: '/api/notifications',
    feedback: '/api/feedback',
    search: '/api/search',
  },
  
  // Timeouts (in milliseconds)
  timeouts: {
    action: 10000,
    navigation: 30000,
    api: 5000,
    element: 5000,
  },
  
  // Retry configuration
  retries: {
    ci: 2,
    local: 0,
  },
  
  // Workers
  workers: {
    ci: 4,
    local: undefined, // Use all available
  },
  
  // Screenshot configuration
  screenshot: {
    enabled: true,
    fullPage: true,
    onFailure: true,
  },
  
  // Video configuration
  video: {
    enabled: true,
    onFailure: true,
  },
  
  // Trace configuration
  trace: {
    enabled: true,
    onFailure: true,
  },
  
  // Visual regression
  visualRegression: {
    maxDiffPixels: 100,
    threshold: 0.2,
  },
  
  // Test data
  testData: {
    validEmail: 'test@example.com',
    invalidEmail: 'invalid-email',
    validPassword: 'Test123456!',
    weakPassword: '123',
    strongPassword: 'Test123456!@#',
  },
  
  // Environment flags
  isCI: !!process.env.CI,
  isDebug: !!process.env.DEBUG,
  isHeaded: !!process.env.HEADED,
};

export default config;
