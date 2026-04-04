/**
 * Unit tests for ShortcutTutorial component
 */

import { render, screen, fireEvent, waitFor, act, renderHook } from '@testing-library/react';
import ShortcutTutorial, { TutorialProgress, useShortcutTutorial } from '../ShortcutTutorial';

// Mock shortcutManager
jest.mock('@/lib/keyboard/shortcut-manager', () => ({
  shortcutManager: {
    getAll: jest.fn().mockReturnValue([
      {
        key: 'cmd+k',
        description: 'Open global search',
        category: 'navigation',
        action: jest.fn(),
        enabled: true,
      },
      {
        key: 'cmd+s',
        description: 'Save',
        category: 'system',
        action: jest.fn(),
        enabled: true,
      },
    ]),
  },
}));

describe('ShortcutTutorial', () => {
  it('does not render when isOpen is false', () => {
    render(<ShortcutTutorial isOpen={false} />);
    expect(screen.queryByText('Keyboard Shortcuts Tutorial')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(<ShortcutTutorial isOpen={true} />);
    expect(screen.getByText('Keyboard Shortcuts Tutorial')).toBeInTheDocument();
  });

  it('shows current step instruction', () => {
    render(<ShortcutTutorial isOpen={true} />);
    expect(screen.getByText('Try this shortcut:')).toBeInTheDocument();
  });

  it('displays progress bar', () => {
    render(<ShortcutTutorial isOpen={true} />);
    expect(screen.getByText(/Step 1 of/)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<ShortcutTutorial isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('calls onComplete when tutorial finishes', async () => {
    const onComplete = jest.fn();
    
    // We need to mock the keyboard event to trigger completion
    render(
      <ShortcutTutorial
        isOpen={true}
        onComplete={onComplete}
        shortcuts={[
          {
            key: 'cmd+k',
            description: 'Test',
            category: 'navigation',
            action: jest.fn(),
            enabled: true,
          },
        ]}
      />
    );

    // Simulate pressing the correct key
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalled();
    }, { timeout: 1000 });
  });
});

describe('TutorialProgress', () => {
  it('renders progress correctly', () => {
    render(<TutorialProgress completed={2} total={5} />);
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = jest.fn();
    render(<TutorialProgress completed={2} total={5} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('useShortcutTutorial', () => {
  it('provides initial state', () => {
    const { result } = renderHook(() => useShortcutTutorial());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.completed).toBe(0);
  });

  it('opens tutorial', () => {
    const { result } = renderHook(() => useShortcutTutorial());

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it('closes tutorial', () => {
    const { result } = renderHook(() => useShortcutTutorial());

    act(() => {
      result.current.open();
    });

    act(() => {
      result.current.close();
    });

    expect(result.current.isOpen).toBe(false);
  });
});
