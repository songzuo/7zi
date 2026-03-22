/**
 * UI Components Examples
 *
 * This file demonstrates usage examples for all UI components.
 */

'use client';

import React, { useState } from 'react';
import {
  Button,
  ButtonGroup,
  IconButton,
  Modal,
  ConfirmDialog,
  Tabs,
  TabsList,
  TabTrigger,
  TabContent,
  ToastProvider,
  useToastActions,
  Tooltip,
  SimpleTooltip,
  InfoTooltip,
} from '@/components/ui';

/**
 * Button Examples Component
 */
export function ButtonExamples() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-bold mb-4">Button Variants</h2>
        <div className="flex gap-3 flex-wrap">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="link">Link</Button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Button Sizes</h2>
        <div className="flex gap-3 items-center flex-wrap">
          <Button size="xs">XS</Button>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="xl">XL</Button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Loading State</h2>
        <div className="flex gap-3">
          <Button loading>Submitting...</Button>
          <Button loading disabled>
            Disabled Loading
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Button with Icon</h2>
        <div className="flex gap-3 flex-wrap">
          <Button icon={<span>★</span>}>With Left Icon</Button>
          <Button icon={<span>★</span>} iconPosition="right">
            With Right Icon
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Button Group</h2>
        <ButtonGroup>
          <Button variant="primary">Save</Button>
          <Button variant="outline">Cancel</Button>
          <Button variant="danger">Delete</Button>
        </ButtonGroup>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Icon Button</h2>
        <div className="flex gap-3">
          <IconButton icon={<span>★</span>} tooltip="Add to favorites" />
          <IconButton icon={<span>⚙</span>} tooltip="Settings" />
          <IconButton icon={<span>🔔</span>} tooltip="Notifications" />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Full Width Button</h2>
        <Button fullWidth>Full Width Button</Button>
      </section>
    </div>
  );
}

/**
 * Modal Examples Component
 */
export function ModalExamples() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-bold mb-4">Basic Modal</h2>
        <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Example Modal"
          size="md"
          footer={
            <>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsModalOpen(false)}>Confirm</Button>
            </>
          }
        >
          <p>This is a basic modal example. You can put any content here.</p>
          <p className="mt-2">Modals are great for focused interactions.</p>
        </Modal>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Confirm Dialog</h2>
        <Button variant="danger" onClick={() => setIsConfirmOpen(true)}>
          Show Confirm Dialog
        </Button>

        <ConfirmDialog
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          title="Delete Item"
          message="Are you sure you want to delete this item? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          confirmVariant="danger"
          onConfirm={() => {/* Handle delete action here */}}
        />
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Modal Sizes</h2>
        <div className="flex gap-3 flex-wrap">
          <Button onClick={() => {/* ... */}}>XS Modal</Button>
          <Button onClick={() => {/* ... */}}>SM Modal</Button>
          <Button onClick={() => {/* ... */}}>MD Modal</Button>
          <Button onClick={() => {/* ... */}}>LG Modal</Button>
          <Button onClick={() => {/* ... */}}>XL Modal</Button>
        </div>
      </section>
    </div>
  );
}

/**
 * Tabs Examples Component
 */
export function TabsExamples() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-bold mb-4">Basic Tabs (Underline)</h2>
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabTrigger value="tab1">Tab 1</TabTrigger>
            <TabTrigger value="tab2">Tab 2</TabTrigger>
            <TabTrigger value="tab3">Tab 3</TabTrigger>
          </TabsList>

          <TabContent value="tab1">
            <p>Content for tab 1</p>
          </TabContent>
          <TabContent value="tab2">
            <p>Content for tab 2</p>
          </TabContent>
          <TabContent value="tab3">
            <p>Content for tab 3</p>
          </TabContent>
        </Tabs>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Enclosed Tabs</h2>
        <Tabs defaultValue="tab1" variant="enclosed">
          <TabsList>
            <TabTrigger value="tab1">Profile</TabTrigger>
            <TabTrigger value="tab2">Settings</TabTrigger>
            <TabTrigger value="tab3">Billing</TabTrigger>
          </TabsList>

          <TabContent value="tab1">
            <p>Profile content</p>
          </TabContent>
          <TabContent value="tab2">
            <p>Settings content</p>
          </TabContent>
          <TabContent value="tab3">
            <p>Billing content</p>
          </TabContent>
        </Tabs>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Soft Rounded Tabs</h2>
        <Tabs defaultValue="tab1" variant="soft-rounded">
          <TabsList>
            <TabTrigger value="tab1">Overview</TabTrigger>
            <TabTrigger value="tab2">Details</TabTrigger>
            <TabTrigger value="tab3">Analytics</TabTrigger>
          </TabsList>

          <TabContent value="tab1">
            <p>Overview content</p>
          </TabContent>
          <TabContent value="tab2">
            <p>Details content</p>
          </TabContent>
          <TabContent value="tab3">
            <p>Analytics content</p>
          </TabContent>
        </Tabs>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Tabs with Disabled State</h2>
        <Tabs defaultValue="tab1">
          <TabsList>
            <TabTrigger value="tab1">Active Tab</TabTrigger>
            <TabTrigger value="tab2">Another Tab</TabTrigger>
            <TabTrigger value="tab3" disabled>
              Disabled Tab
            </TabTrigger>
          </TabsList>

          <TabContent value="tab1">
            <p>Content for active tab</p>
          </TabContent>
          <TabContent value="tab2">
            <p>Content for another tab</p>
          </TabContent>
        </Tabs>
      </section>
    </div>
  );
}

/**
 * Toast Examples Component
 */
export function ToastExamples() {
  const { success, error, warning, info } = useToastActions();

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-bold mb-4">Toast Variants</h2>
        <div className="flex gap-3 flex-wrap">
          <Button onClick={() => success('Success!', 'Operation completed successfully')}>
            Success Toast
          </Button>
          <Button onClick={() => error('Error!', 'Something went wrong')}>
            Error Toast
          </Button>
          <Button onClick={() => warning('Warning!', 'Please review your input')}>
            Warning Toast
          </Button>
          <Button onClick={() => info('Info!', 'New update available')}>
            Info Toast
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Custom Duration</h2>
        <div className="flex gap-3">
          <Button onClick={() => success('Short', '2 seconds', 2000)}>
            2 Seconds
          </Button>
          <Button onClick={() => success('Medium', '5 seconds', 5000)}>
            5 Seconds
          </Button>
          <Button onClick={() => success('Long', '10 seconds', 10000)}>
            10 Seconds
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">With and Without Message</h2>
        <div className="flex gap-3">
          <Button onClick={() => success('Title Only')}>
            Title Only
          </Button>
          <Button onClick={() => success('Title', 'This is a message')}>
            Title + Message
          </Button>
        </div>
      </section>
    </div>
  );
}

/**
 * Tooltip Examples Component
 */
export function TooltipExamples() {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xl font-bold mb-4">Basic Tooltips</h2>
        <div className="flex gap-4">
          <Tooltip content="Top tooltip" position="top">
            <Button>Top</Button>
          </Tooltip>
          <Tooltip content="Bottom tooltip" position="bottom">
            <Button>Bottom</Button>
          </Tooltip>
          <Tooltip content="Left tooltip" position="left">
            <Button>Left</Button>
          </Tooltip>
          <Tooltip content="Right tooltip" position="right">
            <Button>Right</Button>
          </Tooltip>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Tooltip Sizes</h2>
        <div className="flex gap-4 items-center">
          <Tooltip content="Small tooltip" size="sm">
            <Button size="sm">Small</Button>
          </Tooltip>
          <Tooltip content="Medium tooltip" size="md">
            <Button>Medium</Button>
          </Tooltip>
          <Tooltip content="Large tooltip" size="lg">
            <Button size="lg">Large</Button>
          </Tooltip>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Simple Tooltip</h2>
        <SimpleTooltip content="This is a simple tooltip">
          <Button>Hover Me</Button>
        </SimpleTooltip>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Info Tooltip</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span>Username</span>
            <InfoTooltip content="Choose a unique username for your account." position="right" />
          </div>
          <div className="flex items-center gap-2">
            <span>Password</span>
            <InfoTooltip content="Use a strong password with at least 8 characters." position="right" />
          </div>
          <div className="flex items-center gap-2">
            <span>Email</span>
            <InfoTooltip content="We'll send a verification email to this address." position="right" />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Custom Delays</h2>
        <div className="flex gap-4">
          <Tooltip content="Instant show" delay={0}>
            <Button>Instant</Button>
          </Tooltip>
          <Tooltip content="Delay 500ms" delay={500}>
            <Button>Delayed</Button>
          </Tooltip>
        </div>
      </section>
    </div>
  );
}

/**
 * All Examples Component
 */
export default function UIComponentExamples() {
  return (
    <ToastProvider maxToasts={5} defaultPosition="top-right">
      <div className="max-w-6xl mx-auto p-8 space-y-12">
        <header>
          <h1 className="text-4xl font-bold mb-2">UI Component Examples</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Examples and usage patterns for all UI components
          </p>
        </header>

        <section>
          <h2 className="text-2xl font-bold mb-6">Button Component</h2>
          <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg">
            <ButtonExamples />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-6">Modal Component</h2>
          <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg">
            <ModalExamples />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-6">Tabs Component</h2>
          <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg">
            <TabsExamples />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-6">Toast Component</h2>
          <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg">
            <ToastExamples />
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-6">Tooltip Component</h2>
          <div className="p-6 bg-white dark:bg-zinc-800 rounded-lg">
            <TooltipExamples />
          </div>
        </section>
      </div>
    </ToastProvider>
  );
}
