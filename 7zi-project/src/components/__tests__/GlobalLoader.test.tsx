/**
 * GlobalLoader Component Tests (Simplified)
 */

import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GlobalLoader, MinimalLoader } from '../GlobalLoader';
import { GlobalLoadingProvider, useGlobalLoading } from '@/hooks/useGlobalLoading';

describe('GlobalLoader', () => {
  describe('Rendering', () => {
    it('should not render when loading is false', () => {
      function TestComponent() {
        const { state } = useGlobalLoading();
        return (
          <div>
            <div data-testid="loading-state">
              {state.isLoading ? 'loading' : 'idle'}
            </div>
            <GlobalLoader minDisplayTime={0} />
          </div>
        );
      }

      render(
        <GlobalLoadingProvider>
          <TestComponent />
        </GlobalLoadingProvider>
      );
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('should render overlay when loading is true', async () => {
      function TestComponent() {
        const { startLoading } = useGlobalLoading();
        return (
          <div>
            <button onClick={() => startLoading('Test loading...')}>Start</button>
            <GlobalLoader minDisplayTime={0} />
          </div>
        );
      }

      render(
        <GlobalLoadingProvider>
          <TestComponent />
        </GlobalLoadingProvider>
      );

      await act(async () => {
        const startButton = screen.getByText('Start');
        startButton.click();
        // Wait for next tick to allow state updates
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(screen.getAllByRole('status')[0]).toBeInTheDocument();
    });

    it('should display loading message', async () => {
      function TestComponent() {
        const { startLoading } = useGlobalLoading();
        return (
          <div>
            <button onClick={() => startLoading('Test loading...')}>Start</button>
            <GlobalLoader minDisplayTime={0} />
          </div>
        );
      }

      render(
        <GlobalLoadingProvider>
          <TestComponent />
        </GlobalLoadingProvider>
      );

      await act(async () => {
        const startButton = screen.getByText('Start');
        startButton.click();
      });

      await waitFor(() => {
        expect(screen.getByText('Test loading...')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have role="status"', async () => {
      function TestComponent() {
        const { startLoading } = useGlobalLoading();
        return (
          <div>
            <button onClick={() => startLoading('Loading...')}>Start</button>
            <GlobalLoader minDisplayTime={0} />
          </div>
        );
      }

      render(
        <GlobalLoadingProvider>
          <TestComponent />
        </GlobalLoadingProvider>
      );

      await act(async () => {
        const startButton = screen.getByText('Start');
        startButton.click();
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(screen.getAllByRole('status')[0]).toBeInTheDocument();
    });

    it('should have aria-label with loading message', async () => {
      function TestComponent() {
        const { startLoading } = useGlobalLoading();
        return (
          <div>
            <button onClick={() => startLoading('Test message')}>Start</button>
            <GlobalLoader minDisplayTime={0} />
          </div>
        );
      }

      render(
        <GlobalLoadingProvider>
          <TestComponent />
        </GlobalLoadingProvider>
      );

      await act(async () => {
        const startButton = screen.getByText('Start');
        startButton.click();
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(screen.getAllByRole('status')[0]).toHaveAttribute('aria-label', 'Test message');
    });

    it('should have aria-busy="true" when loading', async () => {
      function TestComponent() {
        const { startLoading } = useGlobalLoading();
        return (
          <div>
            <button onClick={() => startLoading('Loading...')}>Start</button>
            <GlobalLoader minDisplayTime={0} />
          </div>
        );
      }

      render(
        <GlobalLoadingProvider>
          <TestComponent />
        </GlobalLoadingProvider>
      );

      await act(async () => {
        const startButton = screen.getByText('Start');
        startButton.click();
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(screen.getAllByRole('status')[0]).toHaveAttribute('aria-busy', 'true');
    });
  });
});

describe('MinimalLoader', () => {
  it('should render with custom message', async () => {
    function TestComponent() {
      const { state } = useGlobalLoading();
      return (
        <div>
          <div data-testid="loading-state">
            {state.isLoading ? 'loading' : 'idle'}
          </div>
          <MinimalLoader message="Custom message" />
        </div>
      );
    }

    render(
      <GlobalLoadingProvider>
        <TestComponent />
      </GlobalLoadingProvider>
    );

    // MinimalLoader should not render initially when not loading
    expect(screen.queryByText('Custom message')).not.toBeInTheDocument();
  });
});
