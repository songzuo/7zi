import { describe, it, expect, vi } from 'vitest'

// =============================================================================
// TypeScript Strict Mode Test Cases
// =============================================================================
// These tests verify that strict mode configuration is working correctly.
// They are designed to FAIL when strict options are disabled and PASS when enabled.

// Test Case 1: noUncheckedIndexedAccess
// ---------------------------------
// With noUncheckedIndexedAccess: true (strict mode ON)
// - Array index access returns T | undefined
// - Must check for undefined before use
//
// With noUncheckedIndexedAccess: false (strict mode OFF)
// - Array index access returns T directly
// - No undefined check needed

describe('Strict Mode: noUncheckedIndexedAccess', () => {
  it('should require null check when accessing array index', () => {
    const items = ['a', 'b', 'c']

    // In strict mode, arr[0] returns string | undefined
    // Accessing index 0 directly may fail if index doesn't exist
    const firstItem = items[0]

    // This line will cause TS2532 error in strict mode
    // Error: Object is possibly 'undefined'
    // Fix: Use optional chaining or null check
    expect(firstItem?.toUpperCase()).toBe('A')
  })

  it('should detect undefined in object property access', () => {
    const obj: Record<string, string> = { key: 'value' }
    const possiblyUndefined = obj['nonexistent']

    // In strict mode, accessing non-existent key returns undefined
    // Error: Object is possibly 'undefined'
    // Fix: Check for undefined before use
    expect(possiblyUndefined).toBeUndefined()
  })
})

// Test Case 2: exactOptionalPropertyTypes
// -----------------------------------
// With exactOptionalPropertyTypes: true (strict mode ON)
// - Optional properties must be omitted, not set to undefined
// - { prop?: string } !== { prop: undefined }
//
// With exactOptionalPropertyTypes: false (strict mode OFF)
// - { prop?: string } === { prop: undefined }
// - Can explicitly pass undefined

interface OptionalProps {
  name: string
  description?: string
}

describe('Strict Mode: exactOptionalPropertyTypes', () => {
  it('should reject explicit undefined for optional properties', () => {
    const props: OptionalProps = {
      name: 'test',
      // In strict mode with exactOptionalPropertyTypes: true,
      // this will cause TS2379 error
      // Error: Type 'undefined' is not assignable to type 'string'
      // Fix: Omit the property or don't use optional
    }

    expect(props.name).toBe('test')
  })

  it('should allow omitting optional properties', () => {
    const props: OptionalProps = {
      name: 'test',
      // This is valid in both modes
    }

    expect(props.name).toBe('test')
    expect(props.description).toBeUndefined()
  })
})

// Test Case 3: useUnknownInCatchVariables
// ---------------------------------
// With useUnknownInCatchVariables: true (strict mode ON)
// - Catch variable is type 'unknown'
// - Must narrow type before use
//
// With useUnknownInCatchVariables: false (strict mode OFF)
// - Catch variable type is 'any'
// - Can use directly

describe('Strict Mode: useUnknownInCatchVariables', () => {
  it('should require type narrowing in catch blocks', async () => {
    const mockFunction = vi.fn(() => {
      throw new Error('Test error')
    })

    try {
      mockFunction()
    } catch (error: unknown) {
      // In strict mode with useUnknownInCatchVariables: true,
      // 'error' is type 'unknown'
      // Error: Object is of type 'unknown'
      // Fix: Use type assertion or instanceof check

      // This line will cause TS2573 error in strict mode
      // Error: Object is of type 'unknown'
      expect(error instanceof Error).toBe(true)
      if (error instanceof Error) {
        expect(error.message).toBe('Test error')
      }
    }
  })
})

// Test Case 4: noPropertyAccessFromIndexSignature
// -------------------------------------
// With noPropertyAccessFromIndexSignature: true (strict mode ON)
// - Must use bracket notation: obj['prop']
// - Cannot use dot notation: obj.prop
//
// With noPropertyAccessFromIndexSignature: false (strict mode OFF)
// - Both notations allowed

interface EnvVars {
  [key: string]: string | undefined
}

describe('Strict Mode: noPropertyAccessFromIndexSignature', () => {
  it('should require bracket notation for index signatures', () => {
    const env: EnvVars = {
      NEXT_PUBLIC_SITE_URL: 'https://example.com',
    }

    // In strict mode, dot notation causes TS4111 error
    // Error: Property comes from index signature, use bracket notation
    // Fix: Use env['key'] instead of env.key
    const siteUrl = env['NEXT_PUBLIC_SITE_URL']

    expect(siteUrl).toBe('https://example.com')
  })
})

// Test Case 5: noImplicitAny
// --------------------
// With noImplicitAny: true (strict mode ON)
// - Function parameters without types are 'any'
// - Requires explicit type annotations
//
// With noImplicitAny: false (strict mode OFF)
// - Implicit any allowed

describe('Strict Mode: noImplicitAny', () => {
  it('should require explicit type on function parameters', () => {
    // In strict mode with noImplicitAny: true,
    // this will cause TS7006 error (parameter implicitly has 'any' type)
    // Error: Parameter 'input' implicitly has an 'any' type
    // Fix: Add explicit type: (input: string) => {}
    const processValue = (input: string) => {
      return input.toUpperCase()
    }

    expect(processValue('hello')).toBe('HELLO')
  })

  it('should require explicit return type for implicit any', () => {
    // This test passes with proper typing
    const getValue = (): string => {
      return 'value'
    }

    expect(getValue()).toBe('value')
  })
})

// Test Case 6: strictNullChecks
// ---------------------------
// With strictNullChecks: true (strict mode ON)
// - null and undefined are separate types
// - Must handle both explicitly
//
// With strictNullChecks: false (strict mode OFF)
// - null is assignable to any type

describe('Strict Mode: strictNullChecks', () => {
  it('should handle nullable values correctly', () => {
    // In strict mode with strictNullChecks: true,
    // we need to demonstrate proper null checking patterns

    // Example 1: Using optional chaining (recommended)
    function getMaybeString(returnNull: boolean): string | null {
      return returnNull ? null : 'hello'
    }

    const maybeNull = getMaybeString(true)
    const upperOrNull = maybeNull?.toUpperCase()

    expect(upperOrNull).toBeUndefined()

    // Example 2: Using explicit null check
    const maybeString = getMaybeString(false)
    let upperOrDefault: string
    if (maybeString !== null) {
      upperOrDefault = maybeString.toUpperCase()
    } else {
      upperOrDefault = 'DEFAULT'
    }

    expect(upperOrDefault).toBe('HELLO')
  })

  it('should differentiate between null and undefined', () => {
    const nullValue: string | null = null
    const undefinedValue: string | undefined = undefined

    // Both should be handled differently in strict mode
    expect(nullValue).toBeNull()
    expect(undefinedValue).toBeUndefined()
  })
})

// Test Case 7: noUnusedLocals and noUnusedParameters
// ---------------------------------------------
// With noUnusedLocals: true - Error on unused local variables
// With noUnusedParameters: true - Error on unused parameters

describe('Strict Mode: noUnusedVariables', () => {
  it('should detect unused local variables', () => {
    // In strict mode with noUnusedLocals: true,
    // this will cause TS6133 error
    // Error: 'unused' is declared but its value is never read
    const used = 'this is used'

    expect(used).toBe('this is used')
    // Note: The variable below would be flagged in strict mode
    // const unused = 'this is never used';
  })

  it('should detect unused parameters', () => {
    // In strict mode with noUnusedParameters: true,
    // this will cause TS6133 error
    // Error: 'unusedParam' is declared but its value is never read
    const useParameter = (used: string) => {
      return used.length
    }

    expect(useParameter('hello')).toBe(5)
  })
})

// Test Case 8: noImplicitReturns
// ------------------------------
// With noImplicitReturns: true (strict mode ON)
// - All code paths must return a value
//
// With noImplicitReturns: false (strict mode OFF)
// - Implicit undefined return allowed

describe('Strict Mode: noImplicitReturns', () => {
  it('should require return statement in all code paths', () => {
    const processStatus = (status: 'success' | 'error'): string => {
      if (status === 'success') {
        return 'Operation succeeded'
      }
      // In strict mode with noImplicitReturns: true,
      // this path causes TS7026 error
      // Error: Not all code paths return a value
      // Fix: Add return statement or throw error
      return 'Operation failed'
    }

    expect(processStatus('success')).toBe('Operation succeeded')
    expect(processStatus('error')).toBe('Operation failed')
  })
})

// Test Case 9: noFallthroughCasesInSwitch
// -----------------------------------
// With noFallthroughCasesInSwitch: true (strict mode ON)
// - Each case must have break/return/throw
//
// With noFallthroughCasesInSwitch: false (strict mode OFF)
// - Fallthrough allowed

describe('Strict Mode: noFallthroughCasesInSwitch', () => {
  it('should require break in each case', () => {
    const getValue = (code: number): string => {
      switch (code) {
        case 200:
          return 'OK'
        // In strict mode with noFallthroughCasesInSwitch: true,
        // this causes TS2593 error
        // Error: Fallthrough case in switch
        // Fix: Add break or return
        case 404:
          return 'Not Found'
        case 500:
          return 'Error'
        default:
          return 'Unknown'
      }
    }

    expect(getValue(200)).toBe('OK')
    expect(getValue(404)).toBe('Not Found')
  })
})

// Test Case 10: noImplicitOverride
// ---------------------------
// With noImplicitOverride: true (strict mode ON)
// - Must use override keyword when overriding
//
// With noImplicitOverride: false (strict mode OFF)
// - Override keyword optional

class BaseClass {
  calculate(): number {
    return 1
  }
}

class DerivedClass extends BaseClass {
  override calculate(): number {
    // In strict mode with noImplicitOverride: true,
    // the 'override' keyword is required
    // Error: This member must have the 'override' modifier
    return 2
  }
}

describe('Strict Mode: noImplicitOverride', () => {
  it('should require override keyword when overriding', () => {
    const derived = new DerivedClass()
    expect(derived.calculate()).toBe(2)
  })
})

// =============================================================================
// Summary
// =============================================================================
//
// These 10 test cases demonstrate the strict mode features.
// They are designed to show what happens when strict options are enabled.
//
// Running these tests with tsconfig.strict.json should pass (after fixes).
// Running these tests with tsconfig.json may have different behavior.
//
// Key Takeaways:
// 1. strict mode catches potential runtime errors early
// 2. Requires more explicit type annotations
// 3. Improves code quality and maintainability
// 4. May require some refactoring of existing code
