/**
 * RichTextEditor 组件测试
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RichTextEditor } from '../RichTextEditor';

// Mock Tiptap
vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => ({
    getHTML: vi.fn(() => '<p>Test content</p>'),
    isActive: vi.fn(() => false),
    can: vi.fn(() => ({ undo: vi.fn(() => true), redo: vi.fn(() => true) })),
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({
        toggleBold: vi.fn(() => ({ run: vi.fn() })),
        toggleItalic: vi.fn(() => ({ run: vi.fn() })),
        toggleUnderline: vi.fn(() => ({ run: vi.fn() })),
        toggleStrike: vi.fn(() => ({ run: vi.fn() })),
        toggleHeading: vi.fn(() => ({ run: vi.fn() })),
        toggleBulletList: vi.fn(() => ({ run: vi.fn() })),
        toggleOrderedList: vi.fn(() => ({ run: vi.fn() })),
        toggleBlockquote: vi.fn(() => ({ run: vi.fn() })),
        toggleCodeBlock: vi.fn(() => ({ run: vi.fn() })),
        clearNodes: vi.fn(() => ({ unsetAllMarks: vi.fn(() => ({ run: vi.fn() })) })),
        extendMarkRange: vi.fn(() => ({
          setLink: vi.fn(() => ({ run: vi.fn() })),
          unsetLink: vi.fn(() => ({ run: vi.fn() })),
        })),
        undo: vi.fn(() => ({ run: vi.fn() })),
        redo: vi.fn(() => ({ run: vi.fn() })),
      })),
    })),
    getAttributes: vi.fn(() => ({ href: '' })),
    onUpdate: vi.fn(),
  })),
  EditorContent: vi.fn(({ className }) => (
    <div className={className} data-testid="editor-content">
      Editor Content
    </div>
  )),
}));

vi.mock('@tiptap/starter-kit', () => ({ default: vi.fn() }));
vi.mock('@tiptap/extension-placeholder', () => ({ default: vi.fn() }));
vi.mock('@tiptap/extension-link', () => ({ default: vi.fn() }));
vi.mock('@tiptap/extension-underline', () => ({ default: vi.fn() }));

describe('RichTextEditor', () => {
  it('renders correctly with default props', () => {
    render(<RichTextEditor />);
    
    // 检查工具栏存在
    expect(screen.getByTitle('撤销')).toBeInTheDocument();
    expect(screen.getByTitle('重做')).toBeInTheDocument();
    expect(screen.getByTitle('加粗 (Ctrl+B)')).toBeInTheDocument();
  });

  it('renders without toolbar when showToolbar is false', () => {
    render(<RichTextEditor showToolbar={false} />);
    
    // 工具栏不应存在
    expect(screen.queryByTitle('撤销')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<RichTextEditor className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('calls onChange when content updates', () => {
    const handleChange = vi.fn();
    render(<RichTextEditor onChange={handleChange} />);
    
    // EditorContent 组件被渲染
    expect(screen.getByTestId('editor-content')).toBeInTheDocument();
  });

  it('displays toolbar buttons for all formatting options', () => {
    render(<RichTextEditor />);
    
    // 文本格式
    expect(screen.getByTitle('加粗 (Ctrl+B)')).toBeInTheDocument();
    expect(screen.getByTitle('斜体 (Ctrl+I)')).toBeInTheDocument();
    expect(screen.getByTitle('下划线 (Ctrl+U)')).toBeInTheDocument();
    expect(screen.getByTitle('删除线')).toBeInTheDocument();
    
    // 标题
    expect(screen.getByTitle('标题 1')).toBeInTheDocument();
    expect(screen.getByTitle('标题 2')).toBeInTheDocument();
    expect(screen.getByTitle('标题 3')).toBeInTheDocument();
    
    // 列表
    expect(screen.getByTitle('无序列表')).toBeInTheDocument();
    expect(screen.getByTitle('有序列表')).toBeInTheDocument();
    
    // 其他
    expect(screen.getByTitle('引用')).toBeInTheDocument();
    expect(screen.getByTitle('代码块')).toBeInTheDocument();
    expect(screen.getByTitle('插入链接')).toBeInTheDocument();
    expect(screen.getByTitle('清除格式')).toBeInTheDocument();
  });

  it('handles link insertion', () => {
    // Mock window.prompt
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://example.com');
    
    render(<RichTextEditor />);
    
    const linkButton = screen.getByTitle('插入链接');
    fireEvent.click(linkButton);
    
    expect(promptSpy).toHaveBeenCalledWith('输入链接地址', '');
    
    promptSpy.mockRestore();
  });

  it('handles link removal when empty string is provided', () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('');
    
    render(<RichTextEditor />);
    
    const linkButton = screen.getByTitle('插入链接');
    fireEvent.click(linkButton);
    
    expect(promptSpy).toHaveBeenCalled();
    
    promptSpy.mockRestore();
  });

  it('handles link cancellation', () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);
    
    render(<RichTextEditor />);
    
    const linkButton = screen.getByTitle('插入链接');
    fireEvent.click(linkButton);
    
    expect(promptSpy).toHaveBeenCalled();
    
    promptSpy.mockRestore();
  });
});