/**
 * GlobalLoader Component Tests (Simplified)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
            <GlobalLoader />
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
            <GlobalLoader />
          </div>
        );
      }

      render(
        <GlobalLoadingProvider>
          <TestComponent />
        </GlobalLoadingProvider>
      );
      const startButton = screen.getByText('Start');
      startButton.click();

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display loading message', async () => {
      function TestComponent() {
        const { startLoading } = useGlobalLoading();
        return (
          <div>
            <button onClick={() => startLoading('Test loading...')}>Start</button>
            <GlobalLoader />
          </div>
        );
      }

      render(
        <GlobalLoadingProvider>
          <TestComponent />
        </GlobalLoadingProvider>
      );
      const startButton = screen.getByText('Start');
      startButton.click();

      await waitFor(() => {
        expect(screen.getByText('Test loading...')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Accessibility', () => {
    it('should have role="status"', async () => {
      function TestComponent() {
        const { startLoading } = useGlobalLoading();
        return (
          <div>
            <button onClick={() => startLoading('Loading...')}>Start</button>
            <GlobalLoader />
          </div>
        );
      }

      render(
        <GlobalLoadingProvider>
          <TestComponent />
        </GlobalLoadingProvider>
      );
      const startButton = screen.getByText('Start');
      startButton.click();

      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should have aria-label with loading message', async () => {
      function TestComponent() {
        const { startLoading } = useGlobalLoading();
        return (
          <div>
            <button onClick={() => startLoading('Test message')}>Start</button>
            <GlobalLoader />
          </div>
        );
      }

      render(
        <GlobalLoadingProvider>
          <TestComponent />
        </GlobalLoadingProvider>
      );
      const startButton = screen.getByText('Start');
      startButton.click();

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Test message');
      }, { timeout: 3000 });
    });

    it('should have aria-busy="true" when loading', async () => {
      function TestComponent() {
        const { startLoading } = useGlobalLoading();
        return (
          <div>
            <button onClick={() => startLoading('Loading...')}>Start</button>
            <GlobalLoader />
          </div>
        );
      }

      render(
        <GlobalLoadingProvider>
          <TestComponent />
        </GlobalLoadingProvider>
      );
      const startButton = screen.getByText('Start');
      startButton.click();

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true');
      }, { timeout: 3000 });
    });
  });
});

describe('MinimalLoader', () => {
  it('should render with custom message', async () => {
    function TestComponent() {
      const { startLoading } = useGlobalLoading();
      return (
        <div>
          <button onClick={() => startLoading('Custom message')}>Start</button>
          <MinimalLoader message="Custom message" />
        </div>
      );
    }

    render(
      <GlobalLoadingProvider>
        <TestComponent />
      </GlobalLoadingProvider>
    );
    const startButton = screen.getByText('Start');
    startButton.click();

    await waitFor(() => {
      expect(screen.getByText('Custom message')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
