/**
 * RoomCreateModal Stories
 *
 * Storybook stories for the Room Create Modal component
 */

import type { Meta, StoryObj } from '@storybook/react';
import { RoomCreateModal, RoomCreateModalProps } from '@/components/rooms/RoomCreateModal';
import { useState } from 'react';

const meta: Meta<RoomCreateModalProps> = {
  title: 'Rooms/RoomCreateModal',
  component: RoomCreateModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Modal for creating a new room with customizable settings.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Whether modal is open',
    },
    isLoading: {
      control: 'boolean',
      description: 'Is creation in progress',
    },
    onCreateRoom: {
      action: 'createRoom',
      description: 'Create room callback',
    },
    onClose: {
      action: 'close',
      description: 'Close modal callback',
    },
  },
};

export default meta;
type Story = StoryObj<RoomCreateModalProps>;

/**
 * Default modal state
 */
export const Default: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateRoom = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setIsLoading(false);
      setIsOpen(false);
    };

    return (
      <RoomCreateModal
        {...args}
        isOpen={isOpen}
        isLoading={isLoading}
        onClose={() => setIsOpen(false)}
        onCreateRoom={handleCreateRoom}
      />
    );
  },
};

/**
 * Loading state while creating room
 */
export const Loading: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <RoomCreateModal
        {...args}
        isOpen={isOpen}
        isLoading={true}
        onClose={() => setIsOpen(false)}
        onCreateRoom={async () => {}}
      />
    );
  },
};

/**
 * Modal trigger button demo
 */
export const WithTrigger: Story = {
  render: (args) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleCreateRoom = async () => {
      setIsLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setIsLoading(false);
      setIsOpen(false);
    };

    return (
      <div className="p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          创建房间
        </button>

        <RoomCreateModal
          {...args}
          isOpen={isOpen}
          isLoading={isLoading}
          onClose={() => setIsOpen(false)}
          onCreateRoom={handleCreateRoom}
        />
      </div>
    );
  },
};
