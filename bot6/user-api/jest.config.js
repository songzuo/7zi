module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**',
    '!coverage/**'
  ],
  testMatch: [
    '**/test/**/*.test.js'
  ],
  verbose: true
};