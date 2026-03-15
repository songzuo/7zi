import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ToastProvider, useToast, Toast, type ToastType } from './Toast';

// ============================================
// TOAST DEMO WRAPPER
// ============================================

function ToastDemo({ type, title, message }: { type: ToastType; title: string; message?: string }) {
  const { addToast } = useToast();
  return (
    <button
      onClick={() => addToast({ type, title, message })}
      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
    >
      Show {type} toast
    </button>
  );
}

function ToastDemoWithProvider({ type, title, message }: { type: ToastType; title: string; message?: string }) {
  return (
    <ToastProvider>
      <ToastDemo type={type} title={title} message={message} />
    </ToastProvider>
  );
}

// ============================================
// META
// ============================================

const meta: Meta<typeof Toast> = {
  title: 'UI/Toast',
  component: Toast,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['success', 'error', 'warning', 'info'],
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

export const SuccessToast: Story = {
  render: () => (
    <Toast type="success" title="Operation Successful" message="Your changes have been saved successfully." />
  ),
};

export const ErrorToast: Story = {
  render: () => (
    <Toast type="error" title="Error Occurred" message="Something went wrong. Please try again." />
  ),
};

export const WarningToast: Story = {
  render: () => (
    <Toast type="warning" title="Warning" message="Your session will expire in 5 minutes." />
  ),
};

export const InfoToast: Story = {
  render: () => (
    <Toast type="info" title="New Update" message="A new version of the app is available." />
  ),
};

export const ToastWithoutMessage: Story = {
  render: () => (
    <Toast type="success" title="Operation Completed" />
  ),
};

export const ToastWithDismiss: Story = {
  render: () => (
    <Toast 
      type="error" 
      title="Error Occurred" 
      message="Please fix the errors below." 
      onClose={() => console.log('Toast dismissed!')}
    />
  ),
};

export const ToastNotifications: Story = {
  render: () => (
    <ToastProvider>
      <div className="flex flex-wrap gap-3">
        <ToastDemo type="success" title="Saved!" message="Your changes have been saved." />
        <ToastDemo type="error" title="Error" message="Failed to save changes." />
        <ToastDemo type="warning" title="Warning" message="Session expiring soon." />
        <ToastDemo type="info" title="Info" message="New features available." />
      </div>
    </ToastProvider>
  ),
};

export const ToastWithLongMessage: Story = {
  render: () => (
    <Toast
      type="info"
      title="System Update"
      message="A major system update is scheduled for tonight at 2:00 AM. During this time, the system will be unavailable for approximately 30 minutes. Please save your work before the update."
    />
  ),
};

export const CustomDuration: Story = {
  render: () => (
    <ToastProvider>
      <ToastDemo type="success" title="Auto-dismiss" message="This toast will disappear in 10 seconds" />
    </ToastProvider>
  ),
};
