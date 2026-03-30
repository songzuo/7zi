/**
 * InviteCodeModal Stories
 *
 * Storybook stories for the Invite Code Modal component
 */

import type { Meta, StoryObj } from '@storybook/react';
import { InviteCodeModal, InviteCodeModalProps } from '@/components/rooms/InviteCodeModal';
import { useState } from 'react';

const meta: Meta<InviteCodeModalProps> = {
  title: 'Rooms/InviteCodeModal',
  component: InviteCodeModal,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Modal for displaying and sharing room invite codes with QR code support.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Whether modal is open',
    },
    inviteCode: {
      control: 'text',
      description: 'Invite code to display',
    },
    roomName: {
      control: 'text',
      description: 'Room name for display',
    },
    expiresAt: {
      control: 'number',
      description: 'Expiration timestamp',
    },
    maxUses: {
      control: 'number',
      description: 'Max uses',
    },
    currentUses: {
      control: 'number',
      description: 'Current uses count',
    },
    onClose: {
      action: 'close',
      description: 'Close modal callback',
    },
  },
};

export default meta;
type Story = StoryObj<InviteCodeModalProps>;

/**
 * Default modal state
 */
export const Default: Story = {
  args: {
    isOpen: true,
    inviteCode: 'ABC123XYZ',
    roomName: '项目讨论组',
    onClose: () => {},
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <InviteCodeModal
        {...args}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    );
  },
};

/**
 * With expiration time (1 hour from now)
 */
export const WithExpiration: Story = {
  args: {
    isOpen: true,
    inviteCode: 'EXPIRE24H',
    roomName: '临时会议',
    expiresAt: Date.now() + 3600000, // 1 hour from now
    onClose: () => {},
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <InviteCodeModal
        {...args}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    );
  },
};

/**
 * With usage limit
 */
export const WithUsageLimit: Story = {
  args: {
    isOpen: true,
    inviteCode: 'LIMIT5',
    roomName: '小型团队',
    maxUses: 5,
    currentUses: 2,
    onClose: () => {},
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <InviteCodeModal
        {...args}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    );
  },
};

/**
 * With both expiration and usage limit
 */
export const FullFeatured: Story = {
  args: {
    isOpen: true,
    inviteCode: 'FULL123',
    roomName: 'VIP 讨论组',
    expiresAt: Date.now() + 86400000, // 24 hours from now
    maxUses: 10,
    currentUses: 3,
    onClose: () => {},
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <InviteCodeModal
        {...args}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    );
  },
};

/**
 * Expired invite
 */
export const Expired: Story = {
  args: {
    isOpen: true,
    inviteCode: 'OLD123',
    roomName: '过期的房间',
    expiresAt: Date.now() - 3600000, // 1 hour ago
    onClose: () => {},
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <InviteCodeModal
        {...args}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    );
  },
};

/**
 * Minimal (just code, no room name)
 */
export const Minimal: Story = {
  args: {
    isOpen: true,
    inviteCode: 'SIMPLE',
    onClose: () => {},
  },
  render: (args) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
      <InviteCodeModal
        {...args}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    );
  },
};

/**
 * Modal trigger button demo
 */
export const WithTrigger: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
      <div className="p-4">
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
        >
          显示邀请码
        </button>

        <InviteCodeModal
          isOpen={isOpen}
          inviteCode="TRIGGER123"
          roomName="触发示例房间"
          onClose={() => setIsOpen(false)}
        />
      </div>
    );
  },
};
