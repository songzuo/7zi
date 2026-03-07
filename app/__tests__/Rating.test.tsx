import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Rating, RatingDisplay } from '@/components/Rating';

describe('Rating', () => {
  describe('基础渲染', () => {
    it('应该渲染正确数量的星星', () => {
      render(<Rating value={3} maxStars={5} />);
      const buttons = screen.getAllByRole('radio');
      expect(buttons).toHaveLength(5);
    });

    it('应该显示正确的评分文字', () => {
      render(<Rating value={4} showValue />);
      expect(screen.getByText('很好')).toBeInTheDocument();
    });

    it('应该支持自定义最大星数', () => {
      render(<Rating value={2} maxStars={10} />);
      const buttons = screen.getAllByRole('radio');
      expect(buttons).toHaveLength(10);
    });
  });

  describe('评分状态', () => {
    it('应该正确显示满星', () => {
      render(<Rating value={5} />);
      const buttons = screen.getAllByRole('radio');
      expect(buttons[0]).toHaveAttribute('aria-checked', 'true');
      expect(buttons[4]).toHaveAttribute('aria-checked', 'true');
    });

    it('应该正确显示零分', () => {
      render(<Rating value={0} />);
      expect(screen.getByText('未评分')).toBeInTheDocument();
    });

    it('应该正确显示1分', () => {
      render(<Rating value={1} showValue />);
      expect(screen.getByText('很差')).toBeInTheDocument();
    });

    it('应该正确显示3分', () => {
      render(<Rating value={3} showValue />);
      expect(screen.getByText('一般')).toBeInTheDocument();
    });

    it('应该正确显示5分', () => {
      render(<Rating value={5} showValue />);
      expect(screen.getByText('完美')).toBeInTheDocument();
    });
  });

  describe('交互功能', () => {
    it('应该在点击时触发 onChange', () => {
      const handleChange = vi.fn();
      render(<Rating value={0} onChange={handleChange} />);

      const buttons = screen.getAllByRole('radio');
      fireEvent.click(buttons[3], {
        clientX: 20,
        currentTarget: { getBoundingClientRect: () => ({ left: 0, width: 24 }) },
      });

      expect(handleChange).toHaveBeenCalledWith(4);
    });

    it('应该在只读模式下禁用交互', () => {
      const handleChange = vi.fn();
      render(<Rating value={3} onChange={handleChange} readonly />);

      const buttons = screen.getAllByRole('radio');
      fireEvent.click(buttons[2]);

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('应该在禁用状态下禁用交互', () => {
      const handleChange = vi.fn();
      render(<Rating value={3} onChange={handleChange} disabled />);

      const buttons = screen.getAllByRole('radio');
      fireEvent.click(buttons[2]);

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('应该支持键盘操作 - 箭头右键增加评分', () => {
      const handleChange = vi.fn();
      render(<Rating value={3} onChange={handleChange} />);

      const buttons = screen.getAllByRole('radio');
      fireEvent.keyDown(buttons[2], { key: 'ArrowRight' });

      expect(handleChange).toHaveBeenCalledWith(3.5);
    });

    it('应该支持键盘操作 - 箭头左键减少评分', () => {
      const handleChange = vi.fn();
      render(<Rating value={3} onChange={handleChange} />);

      const buttons = screen.getAllByRole('radio');
      fireEvent.keyDown(buttons[2], { key: 'ArrowLeft' });

      expect(handleChange).toHaveBeenCalledWith(2.5);
    });

    it('应该支持键盘操作 - Enter键选择', () => {
      const handleChange = vi.fn();
      render(<Rating value={0} onChange={handleChange} />);

      const buttons = screen.getAllByRole('radio');
      fireEvent.keyDown(buttons[3], { key: 'Enter' });

      expect(handleChange).toHaveBeenCalledWith(4);
    });

    it('评分不应该超过最大值', () => {
      const handleChange = vi.fn();
      render(<Rating value={5} onChange={handleChange} maxStars={5} />);

      const buttons = screen.getAllByRole('radio');
      fireEvent.keyDown(buttons[4], { key: 'ArrowRight' });

      expect(handleChange).toHaveBeenCalledWith(5);
    });

    it('评分不应该低于0', () => {
      const handleChange = vi.fn();
      render(<Rating value={0} onChange={handleChange} />);

      const buttons = screen.getAllByRole('radio');
      fireEvent.keyDown(buttons[0], { key: 'ArrowLeft' });

      expect(handleChange).toHaveBeenCalledWith(0);
    });
  });

  describe('鼠标交互', () => {
    it('鼠标悬停应该更新显示值', () => {
      render(<Rating value={2} onChange={vi.fn()} />);

      const buttons = screen.getAllByRole('radio');
      fireEvent.mouseMove(buttons[3], {
        clientX: 20,
        currentTarget: { getBoundingClientRect: () => ({ left: 0, width: 24 }) },
      });

      expect(screen.getByText('很好')).toBeInTheDocument();
    });
  });

  describe('尺寸变体', () => {
    it('应该支持小尺寸', () => {
      render(<Rating value={3} size="sm" />);
      const buttons = screen.getAllByRole('radio');
      expect(buttons[0]).toHaveClass('w-4', 'h-4');
    });

    it('应该支持中等尺寸 (默认)', () => {
      render(<Rating value={3} size="md" />);
      const buttons = screen.getAllByRole('radio');
      expect(buttons[0]).toHaveClass('w-6', 'h-6');
    });

    it('应该支持大尺寸', () => {
      render(<Rating value={3} size="lg" />);
      const buttons = screen.getAllByRole('radio');
      expect(buttons[0]).toHaveClass('w-8', 'h-8');
    });
  });

  describe('无障碍性', () => {
    it('应该有正确的 radiogroup 角色', () => {
      render(<Rating value={3} />);
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    });

    it('应该有正确的 aria-label', () => {
      render(<Rating value={3} label="服务评分" />);
      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-label', '服务评分');
    });

    it('每个星星应该有正确的 aria-label', () => {
      render(<Rating value={3} />);
      expect(screen.getByLabelText('1 星')).toBeInTheDocument();
      expect(screen.getByLabelText('5 星')).toBeInTheDocument();
    });
  });

  describe('标签显示', () => {
    it('应该显示自定义标签', () => {
      render(<Rating value={3} label="产品评分" />);
      expect(screen.getByText('产品评分')).toBeInTheDocument();
    });

    it('应该隐藏评分文字', () => {
      render(<Rating value={3} showValue={false} />);
      expect(screen.queryByText('一般')).not.toBeInTheDocument();
    });
  });
});

describe('RatingDisplay', () => {
  it('应该是只读的评分显示', () => {
    render(<RatingDisplay value={4} />);
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
  });

  it('应该显示正确的评分', () => {
    render(<RatingDisplay value={4} />);
    expect(screen.getByText('很好')).toBeInTheDocument();
  });

  it('应该默认不显示评分文字', () => {
    render(<RatingDisplay value={4} showValue={false} />);
    expect(screen.queryByText('很好')).not.toBeInTheDocument();
  });
});