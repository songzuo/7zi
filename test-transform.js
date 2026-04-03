// Quick test for transform function
const op1 = { type: 'delete', position: 3, length: 2 };
const op2 = { type: 'retain', position: 5 };

// Simulate transformRetainByOp logic
function transformRetainByOp(retain, op) {
  const retainPos = retain.position;

  if (op.type === 'delete') {
    const delPos = op.position;
    const delLen = op.length || 0;

    // If retain is at or after the deleted region, shift left
    if (retainPos >= delPos + delLen) {
      return { ...retain, position: retainPos - delLen };
    }
    // If retain is within the deleted region, clamp to delete start
    if (retainPos > delPos) {
      return { ...retain, position: delPos };
    }
    // If retain is before delete, no change
    return retain;
  }

  return retain;
}

const result = transformRetainByOp(op2, op1);
console.log('Input op1:', JSON.stringify(op1));
console.log('Input op2:', JSON.stringify(op2));
console.log('Result op2:', JSON.stringify(result));
console.log('Expected op2.position: 3');
console.log('Actual op2.position:', result.position);
console.log('Test passed:', result.position === 3);