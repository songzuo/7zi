/**
 * Tabs Component Test
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs, TabsList, TabTrigger, TabContent, ResponsiveTabs } from '../Tabs';

describe('Tabs Component', () => {
  describe('Basic Rendering', () => {
    it('renders all tabs', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabTrigger value="tab1">Tab 1</TabTrigger>
            <TabTrigger value="tab2">Tab 2</TabTrigger>
            <TabTrigger value="tab3">Tab 3</TabTrigger>
          </TabsList>
          <TabContent value="tab1">Content 1</TabContent>
          <TabContent value="tab2">Content 2</TabContent>
          <TabContent value="tab3">Content 3</TabContent>
        </Tabs>
      );
      expect(screen.getAllByRole('tab')).toHaveLength(3);
    });

    it('shows content for active tab only', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabTrigger value="tab1">Tab 1</TabTrigger>
            <TabTrigger value="tab2">Tab 2</TabTrigger>
          </TabsList>
          <TabContent value="tab1">Content 1</TabContent>
          <TabContent value="tab2">Content 2</TabContent>
        </Tabs>
      );
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    });
  });

  describe('Tab Switching', () => {
    it('switches tabs when clicked', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabTrigger value="tab1">Tab 1</TabTrigger>
            <TabTrigger value="tab2">Tab 2</TabTrigger>
          </TabsList>
          <TabContent value="tab1">Content 1</TabContent>
          <TabContent value="tab2">Content 2</TabContent>
        </Tabs>
      );
      
      const tab2 = screen.getByText('Tab 2');
      fireEvent.click(tab2);
      
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });

    it('calls onChange when tab is switched', () => {
      const handleChange = vi.fn();
      render(
        <Tabs defaultValue="tab1" onChange={handleChange}>
          <TabsList>
            <TabTrigger value="tab1">Tab 1</TabTrigger>
            <TabTrigger value="tab2">Tab 2</TabTrigger>
          </TabsList>
          <TabContent value="tab1">Content 1</TabContent>
        </Tabs>
      );
      
      fireEvent.click(screen.getByText('Tab 2'));
      expect(handleChange).toHaveBeenCalledWith('tab2');
    });
  });

  describe('Controlled Mode', () => {
    it('uses controlled value', () => {
      render(
        <Tabs value="tab2">
          <TabsList>
            <TabTrigger value="tab1">Tab 1</TabTrigger>
            <TabTrigger value="tab2">Tab 2</TabTrigger>
          </TabsList>
          <TabContent value="tab1">Content 1</TabContent>
          <TabContent value="tab2">Content 2</TabContent>
        </Tabs>
      );
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('applies underline variant', () => {
      render(
        <Tabs defaultValue="tab1" variant="underline">
          <TabsList>
            <TabTrigger value="tab1">Tab 1</TabTrigger>
          </TabsList>
        </Tabs>
      );
      const tab = screen.getByRole('tab');
      expect(tab).toHaveClass('border-b-2');
    });

    it('applies enclosed variant', () => {
      render(
        <Tabs defaultValue="tab1" variant="enclosed">
          <TabsList>
            <TabTrigger value="tab1">Tab 1</TabTrigger>
          </TabsList>
        </Tabs>
      );
      const list = screen.getByRole('tablist');
      expect(list).toHaveClass('bg-gray-100');
    });

    it('applies soft-rounded variant', () => {
      render(
        <Tabs defaultValue="tab1" variant="soft-rounded">
          <TabsList>
            <TabTrigger value="tab1">Tab 1</TabTrigger>
          </TabsList>
        </Tabs>
      );
      const tab = screen.getByRole('tab');
      expect(tab).toHaveClass('rounded-lg');
    });
  });

  describe('Orientation', () => {
    it('applies horizontal orientation by default', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabTrigger value="tab1">Tab 1</TabTrigger>
          </TabsList>
        </Tabs>
      );
      const list = screen.getByRole('tablist');
      expect(list).toHaveClass('flex-row');
    });

    it('applies vertical orientation', () => {
      render(
        <Tabs defaultValue="tab1" orientation="vertical">
          <TabsList>
            <TabTrigger value="tab1">Tab 1</TabTrigger>
          </TabsList>
        </Tabs>
      );
      const list = screen.getByRole('tablist');
      expect(list).toHaveClass('flex-col');
    });
  });

  describe('Disabled State', () => {
    it('disables tab when disabled prop is true', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabTrigger value="tab1">Tab 1</TabTrigger>
            <TabTrigger value="tab2" disabled>
              Tab 2
            </TabTrigger>
          </TabsList>
        </Tabs>
      );
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      expect(tab2).toBeDisabled();
    });

    it('does not switch to disabled tab', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabTrigger value="tab1">Tab 1</TabTrigger>
            <TabTrigger value="tab2" disabled>
              Tab 2
            </TabTrigger>
          </TabsList>
          <TabContent value="tab1">Content 1</TabContent>
          <TabContent value="tab2">Content 2</TabContent>
        </Tabs>
      );
      
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      fireEvent.click(tab2);
      
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('sets aria-selected correctly', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabTrigger value="tab1">Tab 1</TabTrigger>
            <TabTrigger value="tab2">Tab 2</TabTrigger>
          </TabsList>
        </Tabs>
      );
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      
      expect(tab1).toHaveAttribute('aria-selected', 'true');
      expect(tab2).toHaveAttribute('aria-selected', 'false');
    });

    it('switches aria-selected when tab is changed', () => {
      render(
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabTrigger value="tab1">Tab 1</TabTrigger>
            <TabTrigger value="tab2">Tab 2</TabTrigger>
          </TabsList>
        </Tabs>
      );
      
      fireEvent.click(screen.getByText('Tab 2'));
      
      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
      
      expect(tab1).toHaveAttribute('aria-selected', 'false');
      expect(tab2).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('ResponsiveTabs', () => {
    it('switches to vertical on small screens', () => {
      global.innerWidth = 500;
      
      render(
        <ResponsiveTabs defaultValue="tab1" breakpoint="md">
          <TabsList>
            <TabTrigger value="tab1">Tab 1</TabTrigger>
          </TabsList>
        </ResponsiveTabs>
      );
      
      const list = screen.getByRole('tablist');
      expect(list).toHaveClass('flex-col');
    });

    it('stays horizontal on large screens', () => {
      global.innerWidth = 1200;
      
      render(
        <ResponsiveTabs defaultValue="tab1" breakpoint="md">
          <TabsList>
            <TabTrigger value="tab1">Tab 1</TabTrigger>
          </TabsList>
        </ResponsiveTabs>
      );
      
      const list = screen.getByRole('tablist');
      expect(list).toHaveClass('flex-row');
    });
  });
});
