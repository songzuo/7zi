import { render, screen } from '@testing-library/react';
import { WebSocketStatusIndicator } from '../WebSocketStatusIndicator';

// Mock the useWebSocket hook
vi.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: vi.fn(),
}));

import { useWebSocket } from '@/hooks/useWebSocket';

describe('WebSocketStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render status dot', () => {
    useWebSocket.mockReturnValue({
      state: {
        connected: true,
        authenticated: true,
        connecting: false,
        error: undefined,
      },
      reconnect: vi.fn(),
    } as any);

    const { container } = render(<WebSocketStatusIndicator />);
    const dot = container.querySelector('.w-3.h-3');
    expect(dot).toBeInTheDocument();
  });

  it('should show green dot when connected and authenticated', () => {
    useWebSocket.mockReturnValue({
      state: {
        connected: true,
        authenticated: true,
        connecting: false,
        error: undefined,
      },
      reconnect: vi.fn(),
    } as any);

    const { container } = render(<WebSocketStatusIndicator />);
    const dot = container.querySelector('.w-3.h-3');
    expect(dot).toHaveClass('bg-green-500');
  });

  it('should show yellow dot when connecting', () => {
    useWebSocket.mockReturnValue({
      state: {
        connected: false,
        authenticated: false,
        connecting: true,
        error: undefined,
      },
      reconnect: vi.fn(),
    } as any);

    const { container } = render(<WebSocketStatusIndicator />);
    const dot = container.querySelector('.w-3.h-3');
    expect(dot).toHaveClass('bg-yellow-500', 'animate-pulse');
  });

  it('should show red dot when error', () => {
    useWebSocket.mockReturnValue({
      state: {
        connected: false,
        authenticated: false,
        connecting: false,
        error: 'Connection failed',
      },
      reconnect: vi.fn(),
    } as any);

    const { container } = render(<WebSocketStatusIndicator />);
    const dot = container.querySelector('.w-3.h-3');
    expect(dot).toHaveClass('bg-red-500');
  });

  it('should show detailed view when detailed prop is true', () => {
    useWebSocket.mockReturnValue({
      state: {
        connected: true,
        authenticated: true,
        connecting: false,
        error: undefined,
        roomId: 'room-123',
      },
      reconnect: vi.fn(),
    } as any);

    render(<WebSocketStatusIndicator detailed={true} />);
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('(room-123)')).toBeInTheDocument();
  });

  it('should show reconnect button when disconnected', () => {
    useWebSocket.mockReturnValue({
      state: {
        connected: false,
        authenticated: false,
        connecting: false,
        error: undefined,
      },
      reconnect: vi.fn(),
    } as any);

    render(<WebSocketStatusIndicator detailed={true} />);
    const reconnectBtn = screen.getByText('Reconnect');
    expect(reconnectBtn).toBeInTheDocument();
  });
});
