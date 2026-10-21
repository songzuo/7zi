module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    'server.js'
  ],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      lines: 60
    }
  },
  testTimeout: 20000
};
