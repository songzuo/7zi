import type { Meta, StoryObj } from '@storybook/react';
import { useState, createContext, useContext, ReactNode } from 'react';
import Modal, { ModalButton } from './Modal';

// ============================================
// MODAL CONTEXT FOR STORIES
// ============================================

interface ModalContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const ModalContext = createContext<ModalContextType>({ isOpen: false, setIsOpen: () => {} });

function ModalWrapper({ children, isOpen, onClose, title, size, animation, footer }: {
  children?: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  animation?: 'fade' | 'scale' | 'slide-up' | 'slide-down';
  footer?: ReactNode;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      animation={animation}
      footer={footer}
    >
      {children}
    </Modal>
  );
}

function ModalOpener({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <ModalButton onClick={onClick}>{children}</ModalButton>;
}

// ============================================
// STORY COMPONENTS
// ============================================

function DefaultStory() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <ModalOpener onClick={() => setIsOpen(true)}>Open Modal</ModalOpener>
      <ModalWrapper isOpen={isOpen} onClose={() => setIsOpen(false)} title="Basic Modal">
        <p className="text-foreground">
          This is a basic modal with a title and content. It supports closing
          by clicking the backdrop or pressing Escape.
        </p>
      </ModalWrapper>
    </>
  );
}

function SmallStory() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <ModalOpener onClick={() => setIsOpen(true)}>Small Modal</ModalOpener>
      <ModalWrapper isOpen={isOpen} onClose={() => setIsOpen(false)} title="Small Modal" size="sm">
        <p className="text-foreground">
          This is a small modal for quick confirmations.
        </p>
      </ModalWrapper>
    </>
  );
}

function LargeStory() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <ModalOpener onClick={() => setIsOpen(true)}>Large Modal</ModalOpener>
      <ModalWrapper isOpen={isOpen} onClose={() => setIsOpen(false)} title="Large Modal" size="lg">
        <p className="text-foreground mb-4">
          This is a large modal for content that requires more space. It can
          contain more information and larger UI elements.
        </p>
        <div className="space-y-2">
          {['Item 1', 'Item 2', 'Item 3', 'Item 4'].map((item) => (
            <div key={item} className="p-3 bg-muted rounded-lg">
              {item}
            </div>
          ))}
        </div>
      </ModalWrapper>
    </>
  );
}

function WithFooterStory() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <ModalOpener onClick={() => setIsOpen(true)}>Modal with Footer</ModalOpener>
      <ModalWrapper
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Action"
        footer={
          <>
            <ModalButton variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </ModalButton>
            <ModalButton variant="primary" onClick={() => setIsOpen(false)}>
              Confirm
            </ModalButton>
          </>
        }
      >
        <p className="text-foreground">
          Are you sure you want to proceed with this action? This cannot be
          undone.
        </p>
      </ModalWrapper>
    </>
  );
}

function FullScreenStory() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <ModalOpener onClick={() => setIsOpen(true)}>Full Screen Modal</ModalOpener>
      <ModalWrapper isOpen={isOpen} onClose={() => setIsOpen(false)} title="Full Screen Modal" size="full">
        <p className="text-foreground mb-4">
          This modal takes up most of the screen and is useful for complex
          forms or detailed content.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted rounded-lg">Content A</div>
          <div className="p-4 bg-muted rounded-lg">Content B</div>
          <div className="p-4 bg-muted rounded-lg">Content C</div>
          <div className="p-4 bg-muted rounded-lg">Content D</div>
        </div>
      </ModalWrapper>
    </>
  );
}

function SlideUpAnimationStory() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <ModalOpener onClick={() => setIsOpen(true)}>Slide Up Animation</ModalOpener>
      <ModalWrapper isOpen={isOpen} onClose={() => setIsOpen(false)} title="Slide Animation" animation="slide-up">
        <p className="text-foreground">
          This modal uses a slide-up animation to appear on screen.
        </p>
      </ModalWrapper>
    </>
  );
}

function DangerModalStory() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <ModalButton variant="danger" onClick={() => setIsOpen(true)}>
        Delete Item
      </ModalButton>
      <ModalWrapper
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Delete Confirmation"
        footer={
          <>
            <ModalButton variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </ModalButton>
            <ModalButton variant="danger" onClick={() => setIsOpen(false)}>
              Delete
            </ModalButton>
          </>
        }
      >
        <p className="text-foreground">
          Are you sure you want to delete this item? This action is permanent
          and cannot be undone.
        </p>
      </ModalWrapper>
    </>
  );
}

// ============================================
// META
// ============================================

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', 'full'],
    },
    animation: {
      control: 'select',
      options: ['fade', 'scale', 'slide-up', 'slide-down'],
    },
    centered: {
      control: 'boolean',
    },
    closeOnBackdrop: {
      control: 'boolean',
    },
    closeOnEscape: {
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
  render: () => <DefaultStory />,
};

export const Small: Story = {
  render: () => <SmallStory />,
};

export const Large: Story = {
  render: () => <LargeStory />,
};

export const WithFooter: Story = {
  render: () => <WithFooterStory />,
};

export const FullScreen: Story = {
  render: () => <FullScreenStory />,
};

export const SlideUpAnimation: Story = {
  render: () => <SlideUpAnimationStory />,
};

export const DangerModal: Story = {
  render: () => <DangerModalStory />,
};
