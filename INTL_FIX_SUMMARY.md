# Fix Summary: LanguageSwitcher E2E Test Intl Provider Issue

## Problem
The `LanguageSwitcher` component tests were failing with the error:
```
Error: No intl context found
```

This error occurred because:
1. The `LanguageSwitcher` component uses `useLocale()` from `next-intl`
2. The `useLocale` hook was not mocked in the test setup (`src/test/setup.tsx`)
3. When the component tried to access the intl context, it was undefined

## Solution
Added proper mocks for `next-intl` hooks in `/root/.openclaw/workspace/7zi-project/src/test/setup.tsx`:

```typescript
// Mock next-intl hooks
const mockUseLocale = vi.fn(() => 'zh');
const mockUseTranslations = vi.fn(() => (key: string) => key);

vi.mock('next-intl', () => ({
  useLocale: () => mockUseLocale(),
  useTranslations: () => mockUseTranslations(),
  NextIntlClientProvider: ({ children, locale }: { children: React.ReactNode; locale?: string }) => {
    // Update the mock locale when provider is called with a locale
    if (locale) {
      mockUseLocale.mockReturnValue(locale);
    }
    return <>{children}</>;
  },
}))
```

Additionally, updated the `beforeEach` hook to reset the locale mock to the default 'zh' before each test:

```typescript
// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
  // Reset locale mock to default 'zh'
  mockUseLocale.mockReturnValue('zh')
})
```

## Key Features of the Fix

1. **Dynamic Locale Support**: The mock locale is updated when `NextIntlClientProvider` receives a `locale` prop, allowing tests to test both 'zh' and 'en' locales.

2. **Test Isolation**: The locale is reset to 'zh' before each test to ensure tests don't interfere with each other.

3. **Full next-intl Coverage**: Mocks both `useLocale` and `useTranslations` hooks, as well as the `NextIntlClientProvider` component.

## Test Results
All 19 LanguageSwitcher tests now pass:
- ✓ renders current locale flag and name
- ✓ renders dropdown arrow icon
- ✓ renders switch language button
- ✓ applies custom className
- ✓ has hover group for dropdown
- ✓ shows both language options
- ✓ shows checkmark for current locale
- ✓ has correct button styling
- ✓ renders correctly with English locale
- ✓ renders current locale flag (compact)
- ✓ renders as a button (compact)
- ✓ has correct aria-label for zh locale (compact)
- ✓ has correct aria-label for en locale (compact)
- ✓ has correct title attribute (compact)
- ✓ applies custom className (compact)
- ✓ has correct button styling (compact)
- ✓ calls router.replace when clicked from zh to en (compact)
- ✓ calls router.replace when clicked from en to zh (compact)
- ✓ is a square button (compact)

## Files Modified
- `/root/.openclaw/workspace/7zi-project/src/test/setup.tsx` - Added next-intl mocks and locale reset logic

## Verification
Run the following command to verify the fix:
```bash
npm test -- --run src/test/components/LanguageSwitcher.test.tsx
```

Expected output: All 19 tests passing.
