# Test Results Format

This document describes the format and location of test results in the CI/CD pipeline.

## Vitest Results

### Location
- **Directory:** `test-results/`
- **JSON Output:** `test-results/vitest-results.json`

### JSON Format

The Vitest JSON reporter generates results in the following structure:

```json
{
  "numTotalTestSuites": 10,
  "numPassedTestSuites": 9,
  "numFailedTestSuites": 1,
  "numPendingTestSuites": 0,
  "numTotalTests": 42,
  "numPassedTests": 40,
  "numFailedTests": 1,
  "numPendingTests": 0,
  "numTodoTests": 1,
  "startTime": 1703000000000,
  "success": false,
  "testResults": [
    {
      "name": "Button.test.tsx",
      "status": "failed",
      "message": "Button should render correctly",
      "assertionResults": [
        {
          "title": "should render button text",
          "status": "passed",
          "ancestorTitles": ["Button"],
          "duration": 12
        },
        {
          "title": "should handle click",
          "status": "failed",
          "ancestorTitles": ["Button"],
          "duration": 34,
          "failureMessages": ["Expected true to be false"]
        }
      ]
    }
  ]
}
```

### Viewing Results

#### In CI
Results are automatically uploaded as artifacts:
```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: test-results
    path: test-results/
```

#### Locally
Run tests with JSON output:
```bash
npm run test:run -- --reporter=json --outputFile=test-results/vitest-results.json
```

## Coverage Reports

### Location
- **Directory:** `coverage/`
- **HTML Report:** `coverage/index.html`
- **JSON Report:** `coverage/coverage-final.json`

### Thresholds
The project enforces the following coverage thresholds:
- Lines: 50%
- Functions: 50%
- Branches: 40%
- Statements: 50%

### Viewing Coverage

#### Locally
```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
```

#### In CI
Coverage is uploaded as an artifact:
```yaml
- uses: actions/upload-artifact@v4
  with:
    name: coverage-report
    path: coverage/
```

## Playwright E2E Results

### Location
- **Directory:** `playwright-report/`
- **HTML Report:** `playwright-report/index.html`
- **Test Results:** `test-results/` (screenshots, videos, traces)

### Viewing E2E Results

#### Locally
```bash
# Run E2E tests
npm run test:e2e

# View report
npm run test:e2e:report
```

#### In CI
```yaml
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: playwright-report
    path: |
      playwright-report/
      test-results/
```

## CI Artifacts

When tests run in GitHub Actions, the following artifacts are generated:

1. **test-results** - Contains all test output files
2. **coverage-report** - HTML and JSON coverage reports
3. **playwright-report** - E2E test results with screenshots

### Downloading Artifacts
Go to the GitHub Actions run page and download artifacts from the "Artifacts" section.

## Troubleshooting

### Failed Tests
1. Download the `test-results` artifact
2. Check `vitest-results.json` for detailed failure messages
3. Look for test logs in the CI output

### Low Coverage
1. Download the `coverage-report` artifact
2. Open `coverage/index.html` in a browser
3. Identify uncovered files and add tests

### Flaky Tests
1. Check test execution time in JSON results
2. Increase timeout if needed:
   ```ts
   test('slow test', async () => {
     // test code
   }, { timeout: 30000 })
   ```
3. Use retry mechanism:
   ```ts
   test('flaky test', async () => {
     // test code
   }, { retry: 3 })
   ```
