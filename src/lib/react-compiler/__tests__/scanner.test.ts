/**
 * React Compiler Diagnostics Scanner Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentScanner, quickScan, IncompatibilityReport } from '../diagnostics/scanner';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock glob module
vi.mock('glob', () => ({
  glob: vi.fn((patterns: string | string[], options: any) => {
    // Return files that exist in the mock directory
    const cwd = options.cwd;
    if (patterns instanceof Array) {
      patterns = patterns[0];
    }
    return Promise.resolve([]);
  }),
}));

describe('ComponentScanner', () => {
  let tempDir: string;
  let scanner: ComponentScanner;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'react-compiler-test-'));
    scanner = new ComponentScanner(tempDir);
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  describe('scanFile', () => {
    it('should detect ref.current assignment', async () => {
      const filePath = path.join(tempDir, 'Test.tsx');
      await fs.promises.writeFile(filePath, `
        import { useRef } from 'react';
        
        export function Test() {
          const ref = useRef(null);
          ref.current = 'value';
          return <div ref={ref} />;
        }
      `);

      const report = await scanner.scanFile(filePath);
      
      expect(report.issues.length).toBeGreaterThan(0);
      expect(report.issues.some(i => i.message.includes('ref.current'))).toBe(true);
    });

    it('should detect dangerouslySetInnerHTML', async () => {
      const filePath = path.join(tempDir, 'Danger.tsx');
      await fs.promises.writeFile(filePath, `
        export function Danger() {
          return <div dangerouslySetInnerHTML={{ __html: '<p>test</p>' }} />;
        }
      `);

      const report = await scanner.scanFile(filePath);
      
      expect(report.issues.some(i => i.message.includes('dangerouslySetInnerHTML'))).toBe(true);
    });

    it('should detect createRef usage', async () => {
      const filePath = path.join(tempDir, 'OldRef.tsx');
      await fs.promises.writeFile(filePath, `
        import { createRef } from 'react';
        
        export function OldRef() {
          const ref = createRef();
          return <div ref={ref} />;
        }
      `);

      const report = await scanner.scanFile(filePath);
      
      expect(report.issues.some(i => i.message.includes('createRef'))).toBe(true);
    });

    it('should mark clean components as compilable', async () => {
      const filePath = path.join(tempDir, 'Clean.tsx');
      await fs.promises.writeFile(filePath, `
        import { useState } from 'react';
        
        export function Clean() {
          const [count, setCount] = useState(0);
          return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
        }
      `);

      const report = await scanner.scanFile(filePath);
      
      expect(report.issues.length).toBe(0);
      expect(report.canCompile).toBe(true);
    });

    it('should extract component name', async () => {
      const filePath = path.join(tempDir, 'NamedComponent.tsx');
      await fs.promises.writeFile(filePath, `
        export function MyComponent() {
          return <div>Hello</div>;
        }
      `);

      const report = await scanner.scanFile(filePath);
      
      expect(report.componentName).toBe('MyComponent');
    });

    it('should detect performance warnings', async () => {
      const filePath = path.join(tempDir, 'Nested.tsx');
      await fs.promises.writeFile(filePath, `
        export function Nested({ items }) {
          return (
            <div>
              {items.map(item => (
                <div key={item.id}>
                  {item.children.map(child => (
                    <span key={child.id}>{child.name}</span>
                  ))}
                </div>
              ))}
            </div>
          );
        }
      `);

      const report = await scanner.scanFile(filePath);
      
      expect(report.issues.some(i => i.type === 'performance-warning')).toBe(true);
    });
  });

  describe('scanAllComponents', () => {
    it('should handle empty directories gracefully', async () => {
      const result = await scanner.scanAllComponents();
      
      expect(result.totalFiles).toBe(0);
      expect(result.reports).toHaveLength(0);
    });

    it('should generate summary statistics for scanned reports', async () => {
      const result = await scanner.scanAllComponents();
      
      expect(result.summary.byType).toBeDefined();
      expect(result.summary.bySeverity).toBeDefined();
    });
  });
});

describe('quickScan', () => {
  it('should return scan result', async () => {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'quick-scan-'));
    
    try {
      await fs.promises.writeFile(path.join(tempDir, 'Test.tsx'), 'export function Test() { return <div/>; }');
      
      const result = await quickScan(tempDir);
      
      expect(result).toHaveProperty('totalFiles');
      expect(result).toHaveProperty('compatibleFiles');
      expect(result).toHaveProperty('reports');
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  });
});
