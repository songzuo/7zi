/**
 * Collaboration Manager
 * Real-time collaboration operations and transforms
 */

// ============================================================================
// Types
// ============================================================================

export interface Operation {
  type: 'insert' | 'delete' | 'retain';
  content?: string;
  length?: number;
  position?: number;
  attributes?: Record<string, unknown>;
}

export interface TextOperation {
  ops: Operation[];
  baseLength: number;
  targetLength: number;
}

export interface TransformResult {
  op1: TextOperation | DocumentOperation;
  op2: TextOperation | DocumentOperation;
}

export interface Cursor {
  userId: string;
  userName?: string;
  color?: string;
  x?: number;
  y?: number;
  position?: number;
  selection?: { start: number; end: number };
  timestamp: number;
}

export interface Presence {
  userId: string;
  name: string;
  online: boolean;
  lastSeen: number;
}

export interface DocumentState {
  content: string;
  revision: number;
  operations?: unknown[];
}

export interface DocumentOperation {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  content?: string;
  length?: number;
}

// ============================================================================
// Operation Composition
// ============================================================================

/**
 * Compose two operations together
 */
export function composeOperations(op1: TextOperation, op2: TextOperation): TextOperation {
  // Simplified composition logic
  const ops = [...op1.ops, ...op2.ops];
  return {
    ops,
    baseLength: op1.baseLength,
    targetLength: op2.targetLength,
  };
}

// ============================================================================
// Operation Transformation
// ============================================================================

/**
 * Transform operation op against operation otherOp
 * Returns a new operation that can be applied after otherOp
 */
export function transform(op: TextOperation, otherOp: TextOperation): TransformResult;
/**
 * Transform document operations
 */
export function transform(op: DocumentOperation, otherOp: DocumentOperation): TransformResult;
/**
 * Transform implementation
 */
export function transform(
  op: TextOperation | DocumentOperation,
  otherOp: TextOperation | DocumentOperation
): TransformResult {
  // Check if these are DocumentOperation types
  const isDocOp1 = 'position' in op && 'content' in op || 'length' in op;
  const isDocOp2 = 'position' in otherOp && 'content' in otherOp || 'length' in otherOp;

  if (isDocOp1 && isDocOp2) {
    // DocumentOperation transformation
    const docOp1 = op as DocumentOperation;
    const docOp2 = otherOp as DocumentOperation;

    // Simplified transformation logic
    if (docOp1.type === 'insert' && docOp2.type === 'insert') {
      if (docOp1.position <= docOp2.position) {
        // op1 before op2, op2 shifts
        return {
          op1: docOp1 as unknown as TextOperation,
          op2: {
            ...docOp2,
            position: docOp2.position + (docOp1.content?.length || 0),
          } as unknown as TextOperation,
        };
      } else {
        // op2 before op1, op1 shifts
        return {
          op1: {
            ...docOp1,
            position: docOp1.position + (docOp2.content?.length || 0),
          } as unknown as TextOperation,
          op2: docOp2 as unknown as TextOperation,
        };
      }
    } else if (docOp1.type === 'delete' && docOp2.type === 'insert') {
      if (docOp1.position < docOp2.position) {
        // Delete before insert, insert shifts back
        return {
          op1: docOp1 as unknown as TextOperation,
          op2: {
            ...docOp2,
            position: docOp2.position - (docOp1.length || 0),
          } as unknown as TextOperation,
        };
      } else {
        // Insert before delete, delete shifts forward
        return {
          op1: {
            ...docOp1,
            position: docOp1.position + (docOp2.content?.length || 0),
          } as unknown as TextOperation,
          op2: docOp2 as unknown as TextOperation,
        };
      }
    } else if (docOp1.type === 'insert' && docOp2.type === 'delete') {
      if (docOp1.position <= docOp2.position) {
        // Insert before delete, delete shifts forward
        return {
          op1: docOp1 as unknown as TextOperation,
          op2: {
            ...docOp2,
            position: docOp2.position + (docOp1.content?.length || 0),
          } as unknown as TextOperation,
        };
      } else {
        // Delete before insert, insert shifts back
        return {
          op1: {
            ...docOp1,
            position: docOp1.position - (docOp2.length || 0),
          } as unknown as TextOperation,
          op2: docOp2 as unknown as TextOperation,
        };
      }
    } else if (docOp1.type === 'delete' && docOp2.type === 'delete') {
      if (docOp1.position < docOp2.position) {
        // First delete before second, second shifts back
        return {
          op1: docOp1 as unknown as TextOperation,
          op2: {
            ...docOp2,
            position: docOp2.position - (docOp1.length || 0),
          } as unknown as TextOperation,
        };
      } else {
        // Second delete before first, first shifts back
        return {
          op1: {
            ...docOp1,
            position: docOp1.position - (docOp2.length || 0),
          } as unknown as TextOperation,
          op2: docOp2 as unknown as TextOperation,
        };
      }
    }

    // Default: return as-is
    return {
      op1: docOp1 as unknown as TextOperation,
      op2: docOp2 as unknown as TextOperation,
    };
  }

  // TextOperation transformation (original logic)
  return {
    op1: op as TextOperation,
    op2: otherOp as TextOperation,
  };
}

// ============================================================================
// Operation Application
// ============================================================================

/**
 * Apply an operation to a document (string version)
 */
export function applyOperation(doc: string, op: TextOperation): string;
/**
 * Apply a document operation to a document state
 */
export function applyOperation(
  doc: DocumentState,
  op: DocumentOperation,
  userId?: string,
  userName?: string
): DocumentState;
/**
 * Apply operation implementation
 */
export function applyOperation(
  doc: string | DocumentState,
  op: TextOperation | DocumentOperation,
  userId?: string,
  userName?: string
): string | DocumentState {
  // Handle string-based operations
  if (typeof doc === 'string') {
    const textOp = op as TextOperation;
    let result = doc;

    for (const operation of textOp.ops) {
      switch (operation.type) {
        case 'insert':
          result = operation.content ? result + operation.content : result;
          break;
        case 'delete':
          if (operation.length) {
            result = result.slice(0, -operation.length);
          }
          break;
        case 'retain':
          // Do nothing, just retain existing content
          break;
      }
    }

    return result;
  }

  // Handle DocumentState-based operations
  const docState = doc as DocumentState;
  const docOp = op as DocumentOperation;
  let result = docState.content;

  switch (docOp.type) {
    case 'insert':
      if (docOp.content !== undefined) {
        result = result.slice(0, docOp.position) + docOp.content + result.slice(docOp.position);
      }
      break;
    case 'delete':
      if (docOp.length !== undefined) {
        result = result.slice(0, docOp.position) + result.slice(docOp.position + docOp.length);
      }
      break;
    case 'retain':
      // Do nothing
      break;
  }

  return {
    ...docState,
    content: result,
    revision: docState.revision + 1,
    operations: [
      ...(docState.operations || []),
      {
        ...docOp,
        userId,
        userName,
        timestamp: Date.now(),
      },
    ],
  };
}

/**
 * Apply a document operation to content string (simplified version)
 */
export function applyOperationToContent(content: string, op: DocumentOperation): string {
  switch (op.type) {
    case 'insert':
      if (op.content !== undefined) {
        return content.slice(0, op.position) + op.content + content.slice(op.position);
      }
      return content;
    case 'delete':
      if (op.length !== undefined) {
        return content.slice(0, op.position) + content.slice(op.position + op.length);
      }
      return content;
    case 'retain':
      return content;
  }
}
