import { transform } from './src/lib/collaboration/manager.js';

const op1 = { type: 'delete', position: 3, length: 2 };
const op2 = { type: 'retain', position: 5 };

console.log('Calling transform with:');
console.log('op1:', JSON.stringify(op1));
console.log('op2:', JSON.stringify(op2));
console.log('');

try {
  const result = transform(op1, op2);
  console.log('Result:');
  console.log('result.op1:', JSON.stringify(result.op1));
  console.log('result.op2:', JSON.stringify(result.op2));
  console.log('');
  console.log('Expected op2.position: 3');
  console.log('Actual op2.position:', result.op2.position);
  console.log('Test passed:', result.op2.position === 3);
} catch (error) {
  console.error('Error:', error);
}
