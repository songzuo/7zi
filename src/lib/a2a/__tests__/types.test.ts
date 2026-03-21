/**
 * A2A Types Tests
 * Tests for A2A protocol type definitions and constants
 */

import { describe, it, expect } from 'vitest';
import { A2AErrorCodes } from '../types';

describe('A2A Error Codes', () => {
  it('should have all JSON-RPC standard error codes', () => {
    expect(A2AErrorCodes.PARSE_ERROR).toBe(-32700);
    expect(A2AErrorCodes.INVALID_REQUEST).toBe(-32600);
    expect(A2AErrorCodes.METHOD_NOT_FOUND).toBe(-32601);
    expect(A2AErrorCodes.INVALID_PARAMS).toBe(-32602);
    expect(A2AErrorCodes.INTERNAL_ERROR).toBe(-32603);
  });

  it('should have all A2A specific error codes', () => {
    expect(A2AErrorCodes.TASK_NOT_FOUND).toBe(-32001);
    expect(A2AErrorCodes.TASK_NOT_CANCELABLE).toBe(-32002);
    expect(A2AErrorCodes.PUSH_NOTIFICATION_NOT_SUPPORTED).toBe(-32003);
    expect(A2AErrorCodes.UNSUPPORTED_OPERATION).toBe(-32004);
    expect(A2AErrorCodes.CONTENT_TYPE_NOT_SUPPORTED).toBe(-32005);
    expect(A2AErrorCodes.INVALID_AGENT_RESPONSE).toBe(-32006);
    expect(A2AErrorCodes.EXTENDED_AGENT_CARD_NOT_CONFIGURED).toBe(-32007);
    expect(A2AErrorCodes.EXTENSION_SUPPORT_REQUIRED).toBe(-32008);
    expect(A2AErrorCodes.VERSION_NOT_SUPPORTED).toBe(-32009);
  });

  it('should have all error codes as negative numbers', () => {
    const allCodes = Object.values(A2AErrorCodes);
    allCodes.forEach(code => {
      expect(code).toBeLessThan(0);
    });
  });

  it('should have unique error codes', () => {
    const allCodes = Object.values(A2AErrorCodes);
    const uniqueCodes = new Set(allCodes);
    expect(uniqueCodes.size).toBe(allCodes.length);
  });
});
