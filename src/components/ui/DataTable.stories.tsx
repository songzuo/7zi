import type { Meta, StoryObj } from '@storybook/react';
import DataTable from './DataTable';
import type { Column } from './DataTable';

// ============================================
// TYPES
// ============================================

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

// ============================================
// SAMPLE DATA
// ============================================

const sampleData: User[] = [
  { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active', createdAt: '2024-01-15' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Developer', status: 'active', createdAt: '2024-02-20' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'Designer', status: 'inactive', createdAt: '2024-03-10' },
  { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'Developer', status: 'active', createdAt: '2024-04-05' },
  { id: '5', name: 'Charlie Wilson', email: 'charlie@example.com', role: 'Manager', status: 'active', createdAt: '2024-05-12' },
  { id: '6', name: 'Diana Lee', email: 'diana@example.com', role: 'Developer', status: 'inactive', createdAt: '2024-06-18' },
  { id: '7', name: 'Edward Miller', email: 'edward@example.com', role: 'Designer', status: 'active', createdAt: '2024-07-22' },
  { id: '8', name: 'Fiona Davis', email: 'fiona@example.com', role: 'Admin', status: 'active', createdAt: '2024-08-30' },
];

const columns: Column<User>[] = [
  {
    key: 'name',
    header: 'Name',
    sortable: true,
    render: (value) => <span className="font-medium">{String(value)}</span>,
  },
  {
    key: 'email',
    header: 'Email',
    sortable: true,
  },
  {
    key: 'role',
    header: 'Role',
    sortable: true,
    render: (value) => (
      <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
        {String(value)}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    render: (value) => (
      <span
        className={`px-2 py-1 text-xs rounded-full ${
          value === 'active'
            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
        }`}
      >
        {String(value)}
      </span>
    ),
  },
  {
    key: 'createdAt',
    header: 'Created',
    sortable: true,
  },
];

// ============================================
// META
// ============================================

const meta: Meta = {
  title: 'UI/DataTable',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: DataTable as any,
  tags: ['autodocs'],
  argTypes: {
    pageSize: {
      control: { type: 'number', min: 1, max: 50 },
    },
    pagination: {
      control: 'boolean',
    },
    sortable: {
      control: 'boolean',
    },
    filterable: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
  },
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj;

// ============================================
// STORIES
// ============================================

export const Default: Story = {
  render: () => (
    <DataTable
      data={sampleData}
      columns={columns}
      keyField="id"
      pageSize={5}
    />
  ),
};

export const WithoutPagination: Story = {
  render: () => (
    <DataTable
      data={sampleData}
      columns={columns}
      keyField="id"
      pagination={false}
    />
  ),
};

export const WithoutFilter: Story = {
  render: () => (
    <DataTable
      data={sampleData}
      columns={columns}
      keyField="id"
      filterable={false}
      pageSize={5}
    />
  ),
};

export const WithoutSorting: Story = {
  render: () => (
    <DataTable
      data={sampleData}
      columns={columns}
      keyField="id"
      sortable={false}
      pageSize={5}
    />
  ),
};

export const Loading: Story = {
  render: () => (
    <DataTable
      data={[]}
      columns={columns}
      keyField="id"
      loading={true}
      pageSize={5}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <DataTable
      data={[]}
      columns={columns}
      keyField="id"
      emptyMessage="No users found"
      pageSize={5}
    />
  ),
};

export const ClickableRows: Story = {
  render: () => (
    <DataTable
      data={sampleData}
      columns={columns}
      keyField="id"
      pageSize={5}
      onRowClick={(row) => console.log('Clicked:', row)}
    />
  ),
};

export const CustomFilter: Story = {
  render: () => (
    <DataTable
      data={sampleData}
      columns={columns}
      keyField="id"
      pageSize={5}
      filterPlaceholder="Search users..."
    />
  ),
};
