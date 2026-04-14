/**
 * Unit tests for ShortcutSearch component
 */

import { render, screen, fireEvent, waitFor, act, renderHook } from '@testing-library/react';
import ShortcutSearch, { useShortcutSearch } from '../ShortcutSearch';
import { shortcutManager } from '@/lib/keyboard/shortcut-manager';

// Mock shortcutManager
vi.mock('@/lib/keyboard/shortcut-manager', () => ({
  shortcutManager: {
    search: vi.fn(),
  },
}));

describe('ShortcutSearch', () => {
  const mockShortcuts = [
    {
      key: 'cmd+k',
      description: 'Open global search',
      category: 'navigation',
      action: vi.fn(),
      enabled: true,
    },
    {
      key: 'cmd+s',
      description: 'Save',
      category: 'system',
      action: vi.fn(),
      enabled: true,
    },
  ];

  beforeEach(() => {
    (shortcutManager.search as ReturnType<typeof vi.fn>).mockReturnValue(mockShortcuts);
  });

  it('does not render when isOpen is false', () => {
    render(<ShortcutSearch isOpen={false} />);
    expect(screen.queryByPlaceholderText('Search shortcuts...')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(<ShortcutSearch isOpen={true} />);
    expect(screen.getByPlaceholderText('Search shortcuts...')).toBeInTheDocument();
  });

  it('displays search results', () => {
    render(<ShortcutSearch isOpen={true} />);
    expect(screen.getByText('Open global search')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('filters shortcuts based on search query', () => {
    (shortcutManager.search as ReturnType<typeof vi.fn>).mockReturnValue([mockShortcuts[0]]);

    render(<ShortcutSearch isOpen={true} />);
    const input = screen.getByPlaceholderText('Search shortcuts...');

    fireEvent.change(input, { target: { value: 'search' } });

    expect(shortcutManager.search).toHaveBeenCalledWith('search');
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<ShortcutSearch isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('triggers shortcut action when selected', () => {
    render(<ShortcutSearch isOpen={true} />);

    const shortcutButton = screen.getByText('Open global search').closest('button');
    fireEvent.click(shortcutButton!);

    expect(mockShortcuts[0].action).toHaveBeenCalled();
  });
});

describe('useShortcutSearch', () => {
  it('provides open and close functions', () => {
    const { result } = renderHook(() => useShortcutSearch());

    expect(result.current.isOpen).toBe(false);
    expect(typeof result.current.open).toBe('function');
    expect(typeof result.current.close).toBe('function');
  });

  it('opens search when open is called', () => {
    const { result } = renderHook(() => useShortcutSearch());

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('closes search when close is called', () => {
    const { result } = renderHook(() => useShortcutSearch());

    act(() => {
      result.current.open();
    });

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
  });
});