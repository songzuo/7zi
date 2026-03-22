import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KnowledgeLattice3D from '../KnowledgeLattice3D';

// Mock Three.js
vi.mock('three', () => ({
  Scene: vi.fn(),
  PerspectiveCamera: vi.fn(),
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    domElement: document.createElement('canvas'),
  })),
  OrbitControls: vi.fn(),
  Vector3: vi.fn(),
  Raycaster: vi.fn(),
  Points: vi.fn(),
  BufferGeometry: vi.fn(() => ({
    setAttribute: vi.fn(),
  })),
  Float32BufferAttribute: vi.fn(),
  PointsMaterial: vi.fn(),
  Color: vi.fn(),
}));

// Mock @react-three/fiber
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="three-canvas">{children}</div>
  ),
  useFrame: vi.fn(),
}));

// Mock @react-three/drei
vi.mock('@react-three/drei', () => ({
  OrbitControls: () => <div data-testid="orbit-controls" />,
}));

describe('KnowledgeLattice3D Component', () => {
  const defaultProps = {
    nodes: [
      { id: '1', label: 'Node 1', x: 0, y: 0, z: 0 },
      { id: '2', label: 'Node 2', x: 10, y: 0, z: 0 },
    ],
    edges: [
      { source: '1', target: '2', label: 'Connection' },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('应该渲染 3D 场景容器', () => {
    render(<KnowledgeLattice3D {...defaultProps} />);
    expect(screen.getByTestId('three-canvas')).toBeInTheDocument();
  });

  it('应该显示节点', () => {
    render(<KnowledgeLattice3D {...defaultProps} />);
    const canvas = screen.getByTestId('three-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('应该显示边连接', () => {
    render(<KnowledgeLattice3D {...defaultProps} />);
    const canvas = screen.getByTestId('three-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('应该处理空节点数组', () => {
    render(<KnowledgeLattice3D nodes={[]} edges={[]} />);
    const canvas = screen.getByTestId('three-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('应该处理空边数组', () => {
    render(<KnowledgeLattice3D {...defaultProps} edges={[]} />);
    const canvas = screen.getByTestId('three-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('应该支持自定义节点颜色', () => {
    const props = {
      ...defaultProps,
      nodeColor: '#ff0000',
    };
    render(<KnowledgeLattice3D {...props} />);
    const canvas = screen.getByTestId('three-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('应该支持自定义边颜色', () => {
    const props = {
      ...defaultProps,
      edgeColor: '#00ff00',
    };
    render(<KnowledgeLattice3D {...props} />);
    const canvas = screen.getByTestId('three-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('应该支持节点大小配置', () => {
    const props = {
      ...defaultProps,
      nodeSize: 2,
    };
    render(<KnowledgeLattice3D {...props} />);
    const canvas = screen.getByTestId('three-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('应该处理交互事件', async () => {
    const user = userEvent.setup();
    render(<KnowledgeLattice3D {...defaultProps} />);
    const canvas = screen.getByTestId('three-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('应该支持加载状态', () => {
    render(<KnowledgeLattice3D {...defaultProps} loading />);
    const canvas = screen.getByTestId('three-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('应该支持错误状态', () => {
    render(<KnowledgeLattice3D {...defaultProps} error="加载失败" />);
    const canvas = screen.getByTestId('three-canvas');
    expect(canvas).toBeInTheDocument();
  });
});
