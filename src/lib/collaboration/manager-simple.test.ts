import { describe, it, expect } from 'vitest';
import { transform } from './manager';

// Simple test to verify the fix
describe('OT Transform Bug Fix - Simple', () => {
  it('should shift delete operation position after retain', () => {
    const op1 = { type: 'delete' as const, position: 3, length: 2 };
    const op2 = { type: 'retain' as const, position: 5 };

    const result = transform(op1, op2);

    console.log('Input op1:', JSON.stringify(op1));
    console.log('Input op2:', JSON.stringify(op2));
    console.log('Result op1:', JSON.stringify(result.op1));
    console.log('Result op2:', JSON.stringify(result.op2));
    console.log('');

    expect(result.op1.position).toBe(3);
    expect(result.op2.position).toBe(3); // 5 - 2 (deleted length)
  });
});
