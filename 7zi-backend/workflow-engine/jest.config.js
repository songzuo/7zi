module.exports = {
  testEnvironment: 'node',
  // test/ 与 src/ 在本目录中是指向 workflow-engine/backend 的符号链接，
  // Jest 的 haste map 默认不遍历符号链接，因此必须显式声明 roots。
  roots: [
    '<rootDir>/test',
    '<rootDir>/__tests__'
  ],
  testMatch: [
    '**/test/**/*.test.js',
    '**/test/*.test.js',
    '**/__tests__/**/*.test.js'
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
