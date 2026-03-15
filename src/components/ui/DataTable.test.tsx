/**
 * @fileoverview DataTable 组件测试
 * @module src/components/ui/DataTable.test.tsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import DataTable from './DataTable';

// Test data types
interface TestRow {
  id: string;
  name: string;
  email: string;
  age: number;
  status: 'active' | 'inactive';
}

// Sample test data
const testData: TestRow[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com', age: 30, status: 'active' },
  { id: '2', name: 'Bob', email: 'bob@example.com', age: 25, status: 'inactive' },
  { id: '3', name: 'Charlie', email: 'charlie@example.com', age: 35, status: 'active' },
  { id: '4', name: 'Diana', email: 'diana@example.com', age: 28, status: 'active' },
  { id: '5', name: 'Eve', email: 'eve@example.com', age: 22, status: 'inactive' },
];

const defaultColumns = [
  { key: 'name' as const, header: 'Name', sortable: true },
  { key: 'email' as const, header: 'Email', sortable: true },
  { key: 'age' as const, header: 'Age', sortable: true },
  { key: 'status' as const, header: 'Status', sortable: true },
];

describe('DataTable Component', () => {
  describe('Basic Rendering', () => {
    it('should render table with data', () => {
      render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
        />
      );

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('charlie@example.com')).toBeInTheDocument();
    });

    it('should render column headers', () => {
      render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
        />
      );

      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should render empty message when no data', () => {
      render(
        <DataTable
          data={[]}
          columns={defaultColumns}
          keyField="id"
          emptyMessage="No records found"
        />
      );

      expect(screen.getByText('No records found')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          className="custom-table"
        />
      );

      expect(container.querySelector('.custom-table')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading is true', () => {
      render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          loading={true}
        />
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      // Should show loading spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not show data when loading', () => {
      render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          loading={true}
        />
      );

      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should render filter input when filterable is true', () => {
      render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          filterable={true}
        />
      );

      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('should not render filter input when filterable is false', () => {
      render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          filterable={false}
        />
      );

      expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument();
    });

    it('should filter data based on input', () => {
      render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          filterable={true}
        />
      );

      const filterInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(filterInput, { target: { value: 'Alice' } });

      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
      expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
    });

    it('should filter case-insensitively', () => {
      render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          filterable={true}
        />
      );

      const filterInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(filterInput, { target: { value: 'ALICE' } });

      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('should use custom filter placeholder', () => {
      render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          filterable={true}
          filterPlaceholder="Search users..."
        />
      );

      expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
    });

    it('should show empty message when filter has no matches', () => {
      render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          filterable={true}
          emptyMessage="No matches"
        />
      );

      const filterInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(filterInput, { target: { value: 'NonexistentUser' } });

      expect(screen.getByText('No matches')).toBeInTheDocument();
    });
  });

  describe('Sorting', () => {
    it('should show sort icons on sortable columns', () => {
      render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          sortable={true}
        />
      );

      // Sort icons (↕) should be visible
      const sortIcons = screen.getAllByText('↕');
      expect(sortIcons.length).toBeGreaterThan(0);
    });

    it('should sort ascending on first click', () => {
      render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          sortable={true}
        />
      );

      const nameHeader = screen.getByText('Name');
      fireEvent.click(nameHeader);

      // Should show ascending icon (↑)
      expect(screen.getByText('↑')).toBeInTheDocument();

      // Verify data is sorted (first row should be Alice after sort by name)
      const rows = screen.getAllByRole('row');
      // Skip header row, check first data row
      const firstDataRow = rows[1];
      expect(within(firstDataRow).getByText('Alice')).toBeInTheDocument();
    });

    it('should sort descending on second click', () => {
      render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          sortable={true}
        />
      );

      const nameHeader = screen.getByText('Name');
      fireEvent.click(nameHeader); // Ascending
      fireEvent.click(nameHeader); // Descending

      // Should show descending icon (↓)
      expect(screen.getByText('↓')).toBeInTheDocument();
    });

    it('should clear sort on third click', () => {
      render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          sortable={true}
        />
      );

      const nameHeader = screen.getByText('Name');
      fireEvent.click(nameHeader); // Ascending
      fireEvent.click(nameHeader); // Descending
      fireEvent.click(nameHeader); // Clear

      // Should return to default icon (↕) - there are multiple so use getAllByText
      expect(screen.getAllByText('↕').length).toBeGreaterThan(0);
    });

    it('should not allow sorting when sortable is false', () => {
      render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          sortable={false}
        />
      );

      const nameHeader = screen.getByText('Name');
      fireEvent.click(nameHeader);

      // No sort icon should appear (no ↑ or ↓)
      expect(screen.queryByText('↑')).not.toBeInTheDocument();
      expect(screen.queryByText('↓')).not.toBeInTheDocument();
    });

    it('should sort numeric values correctly', () => {
      render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          sortable={true}
        />
      );

      const ageHeader = screen.getByText('Age');
      fireEvent.click(ageHeader);

      // Check that ages are sorted (22, 25, 28, 30, 35)
      const rows = screen.getAllByRole('row').slice(1); // Skip header
      const ages = rows.map(row => within(row).getByText(/\d+/).textContent);
      const numericAges = ages.map(Number);
      
      for (let i = 1; i < numericAges.length; i++) {
        expect(numericAges[i]).toBeGreaterThanOrEqual(numericAges[i - 1]);
      }
    });
  });

  describe('Pagination', () => {
    const largeDataSet = Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      age: 20 + i,
      status: 'active' as const,
    }));

    it('should show pagination when pagination is enabled', () => {
      render(
        <DataTable
          data={largeDataSet}
          columns={defaultColumns}
          keyField="id"
          pagination={true}
          pageSize={10}
        />
      );

      expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Prev')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Last')).toBeInTheDocument();
    });

    it('should not show pagination when pagination is disabled', () => {
      render(
        <DataTable
          data={largeDataSet}
          columns={defaultColumns}
          keyField="id"
          pagination={false}
        />
      );

      expect(screen.queryByText('First')).not.toBeInTheDocument();
    });

    it('should navigate to next page', () => {
      render(
        <DataTable
          data={largeDataSet}
          columns={defaultColumns}
          keyField="id"
          pagination={true}
          pageSize={10}
        />
      );

      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      expect(screen.getByText(/Page 2 of/)).toBeInTheDocument();
    });

    it('should navigate to previous page', () => {
      render(
        <DataTable
          data={largeDataSet}
          columns={defaultColumns}
          keyField="id"
          pagination={true}
          pageSize={10}
        />
      );

      // Go to page 2 first
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByText(/Page 2 of/)).toBeInTheDocument();

      // Then go back
      const prevButton = screen.getByText('Prev');
      fireEvent.click(prevButton);
      expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
    });

    it('should navigate to first page', () => {
      render(
        <DataTable
          data={largeDataSet}
          columns={defaultColumns}
          keyField="id"
          pagination={true}
          pageSize={10}
        />
      );

      // Navigate to page 2
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByText(/Page 2 of/)).toBeInTheDocument();

      // Click First
      fireEvent.click(screen.getByText('First'));
      expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
    });

    it('should navigate to last page', () => {
      render(
        <DataTable
          data={largeDataSet}
          columns={defaultColumns}
          keyField="id"
          pagination={true}
          pageSize={10}
        />
      );

      fireEvent.click(screen.getByText('Last'));
      expect(screen.getByText(/Page 3 of/)).toBeInTheDocument();
    });

    it('should disable prev/first buttons on first page', () => {
      render(
        <DataTable
          data={largeDataSet}
          columns={defaultColumns}
          keyField="id"
          pagination={true}
          pageSize={10}
        />
      );

      expect(screen.getByText('First')).toBeDisabled();
      expect(screen.getByText('Prev')).toBeDisabled();
    });

    it('should disable next/last buttons on last page', () => {
      render(
        <DataTable
          data={largeDataSet}
          columns={defaultColumns}
          keyField="id"
          pagination={true}
          pageSize={10}
        />
      );

      fireEvent.click(screen.getByText('Last'));

      expect(screen.getByText('Next')).toBeDisabled();
      expect(screen.getByText('Last')).toBeDisabled();
    });

    it('should show correct item count', () => {
      render(
        <DataTable
          data={largeDataSet}
          columns={defaultColumns}
          keyField="id"
          pagination={true}
          pageSize={10}
        />
      );

      expect(screen.getByText('Showing 1 to 10 of 25 results')).toBeInTheDocument();
    });

    it('should reset to page 1 when filtering', () => {
      render(
        <DataTable
          data={largeDataSet}
          columns={defaultColumns}
          keyField="id"
          pagination={true}
          pageSize={10}
          filterable={true}
        />
      );

      // Go to page 2
      fireEvent.click(screen.getByText('Next'));
      expect(screen.getByText(/Page 2 of/)).toBeInTheDocument();

      // Filter - should reset to page 1
      const filterInput = screen.getByPlaceholderText('Search...');
      fireEvent.change(filterInput, { target: { value: 'User' } });
      expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
    });
  });

  describe('Row Interactions', () => {
    it('should call onRowClick when row is clicked', () => {
      const handleRowClick = vi.fn();

      render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          onRowClick={handleRowClick}
        />
      );

      // Click on a row (find Alice's row)
      const aliceCell = screen.getByText('Alice');
      const row = aliceCell.closest('tr');
      fireEvent.click(row!);

      expect(handleRowClick).toHaveBeenCalledTimes(1);
      expect(handleRowClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: '1', name: 'Alice' })
      );
    });

    it('should apply cursor-pointer class when onRowClick is provided', () => {
      const { container } = render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          onRowClick={() => {}}
        />
      );

      const row = container.querySelector('tbody tr');
      expect(row).toHaveClass('cursor-pointer');
    });

    it('should apply custom rowClassName string', () => {
      const { container } = render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          rowClassName="custom-row"
        />
      );

      const row = container.querySelector('tbody tr');
      expect(row).toHaveClass('custom-row');
    });

    it('should apply custom rowClassName function', () => {
      const { container } = render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
          rowClassName={(row) => row.status === 'active' ? 'active-row' : 'inactive-row'}
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      // First row (Alice) is active
      expect(rows[0]).toHaveClass('active-row');
      // Second row (Bob) is inactive
      expect(rows[1]).toHaveClass('inactive-row');
    });
  });

  describe('Custom Column Rendering', () => {
    it('should use custom render function for columns', () => {
      const columnsWithRender = [
        { key: 'name' as const, header: 'Name' },
        {
          key: 'status' as const,
          header: 'Status',
          render: (value: TestRow['status']) => (
            <span className={`status-badge ${value}`}>
              {value.toUpperCase()}
            </span>
          ),
        },
      ];

      render(
        <DataTable
          data={testData}
          columns={columnsWithRender}
          keyField="id"
        />
      );

      // Multiple rows have active/inactive status
      expect(screen.getAllByText('ACTIVE').length).toBeGreaterThan(0);
      expect(screen.getAllByText('INACTIVE').length).toBeGreaterThan(0);
    });

    it('should pass row data and index to render function', () => {
      const renderMock = vi.fn((value, row, index) => String(value));

      const columnsWithRender = [
        { key: 'name' as const, header: 'Name', render: renderMock },
      ];

      render(
        <DataTable
          data={testData.slice(0, 2)}
          columns={columnsWithRender}
          keyField="id"
        />
      );

      expect(renderMock).toHaveBeenCalledWith('Alice', expect.objectContaining({ id: '1' }), 0);
      expect(renderMock).toHaveBeenCalledWith('Bob', expect.objectContaining({ id: '2' }), 1);
    });
  });

  describe('Column Width and Alignment', () => {
    it('should apply column width', () => {
      const columnsWithWidth = [
        { key: 'name' as const, header: 'Name', width: '200px' },
        { key: 'email' as const, header: 'Email', width: '300px' },
      ];

      render(
        <DataTable
          data={testData}
          columns={columnsWithWidth}
          keyField="id"
        />
      );

      const nameHeader = screen.getByText('Name').closest('th');
      const emailHeader = screen.getByText('Email').closest('th');

      expect(nameHeader).toHaveStyle({ width: '200px' });
      expect(emailHeader).toHaveStyle({ width: '300px' });
    });

    it('should apply column alignment', () => {
      const columnsWithAlign = [
        { key: 'name' as const, header: 'Name', align: 'left' as const },
        { key: 'age' as const, header: 'Age', align: 'center' as const },
        { key: 'status' as const, header: 'Status', align: 'right' as const },
      ];

      render(
        <DataTable
          data={testData}
          columns={columnsWithAlign}
          keyField="id"
        />
      );

      const ageHeader = screen.getByText('Age').closest('th');
      const statusHeader = screen.getByText('Status').closest('th');

      expect(ageHeader).toHaveAttribute('align', 'center');
      expect(statusHeader).toHaveAttribute('align', 'right');
    });
  });

  describe('Accessibility', () => {
    it('should render table with proper semantics', () => {
      const { container } = render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
        />
      );

      expect(container.querySelector('table')).toBeInTheDocument();
      expect(container.querySelector('thead')).toBeInTheDocument();
      expect(container.querySelector('tbody')).toBeInTheDocument();
    });

    it('should have proper table structure', () => {
      const { container } = render(
        <DataTable
          data={testData}
          columns={defaultColumns}
          keyField="id"
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(testData.length);

      // Each row should have correct number of cells
      const cells = rows[0].querySelectorAll('td');
      expect(cells.length).toBe(defaultColumns.length);
    });
  });
});
