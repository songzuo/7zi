import type { Meta, StoryObj } from '@storybook/react';
import Card, { CardHeader, CardBody, CardFooter, CardImage, StatsCard } from './Card';

// ============================================
// META
// ============================================

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outlined', 'elevated', 'ghost', 'gradient'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
    hoverable: {
      control: 'boolean',
    },
    clickable: {
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
    <Card>
      <CardHeader title="Card Title" subtitle="Card subtitle text" />
      <CardBody>
        <p className="text-foreground">
          This is the main content of the card. You can add any content here
          including text, images, or other components.
        </p>
      </CardBody>
      <CardFooter>
        <button className="text-sm text-primary hover:underline">Learn more</button>
      </CardFooter>
    </Card>
  ),
};

export const Outlined: Story = {
  render: () => (
    <Card variant="outlined">
      <CardHeader title="Outlined Card" subtitle="With border style" />
      <CardBody>
        <p className="text-foreground">
          This card has a visible border and transparent background.
        </p>
      </CardBody>
    </Card>
  ),
};

export const Elevated: Story = {
  render: () => (
    <Card variant="elevated">
      <CardHeader title="Elevated Card" subtitle="With shadow" />
      <CardBody>
        <p className="text-foreground">
          This card has a larger shadow for emphasis.
        </p>
      </CardBody>
    </Card>
  ),
};

export const Ghost: Story = {
  render: () => (
    <Card variant="ghost">
      <CardHeader title="Ghost Card" subtitle="Minimal style" />
      <CardBody>
        <p className="text-foreground">
          This card has no background or border - perfect for overlays.
        </p>
      </CardBody>
    </Card>
  ),
};

export const Gradient: Story = {
  render: () => (
    <Card variant="gradient">
      <CardHeader title="Gradient Card" subtitle="With gradient background" />
      <CardBody>
        <p className="text-foreground">
          This card features a gradient background for visual impact.
        </p>
      </CardBody>
    </Card>
  ),
};

export const Hoverable: Story = {
  render: () => (
    <Card hoverable>
      <CardHeader title="Hoverable Card" subtitle="Try hovering over me" />
      <CardBody>
        <p className="text-foreground">
          This card lifts up when hovered and adds a subtle shadow.
        </p>
      </CardBody>
    </Card>
  ),
};

export const Clickable: Story = {
  render: () => (
    <Card clickable onClick={() => alert('Card clicked!')}>
      <CardHeader title="Clickable Card" subtitle="Click to interact" />
      <CardBody>
        <p className="text-foreground">
          This card is fully interactive and responds to clicks.
        </p>
      </CardBody>
    </Card>
  ),
};

export const WithImage: Story = {
  render: () => (
    <Card padding="none">
      <CardImage
        src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=200&fit=crop"
        alt="Sample image"
        aspectRatio="video"
      />
      <div className="p-4">
        <CardHeader title="Card with Image" />
        <CardBody>
          <p className="text-foreground">
            This card includes an image at the top.
          </p>
        </CardBody>
      </div>
    </Card>
  ),
};

export const WithIcon: Story = {
  render: () => (
    <Card>
      <CardHeader
        title="With Icon"
        subtitle="Icon header example"
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
      />
      <CardBody>
        <p className="text-foreground">
          This card has an icon in the header for visual emphasis.
        </p>
      </CardBody>
    </Card>
  ),
};

export const StatsCardExample: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-4">
      <StatsCard
        label="Total Users"
        value="1,234"
        trend={{ value: 12, isPositive: true }}
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        }
      />
      <StatsCard
        label="Revenue"
        value="$45,678"
        trend={{ value: 8, isPositive: true }}
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
      <StatsCard
        label="Issues"
        value="23"
        trend={{ value: 5, isPositive: false }}
        icon={
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        }
      />
    </div>
  ),
};

export const CardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card hoverable>
        <CardHeader title="Feature One" />
        <CardBody>
          <p className="text-foreground">Description for the first feature card.</p>
        </CardBody>
      </Card>
      <Card hoverable>
        <CardHeader title="Feature Two" />
        <CardBody>
          <p className="text-foreground">Description for the second feature card.</p>
        </CardBody>
      </Card>
      <Card hoverable>
        <CardHeader title="Feature Three" />
        <CardBody>
          <p className="text-foreground">Description for the third feature card.</p>
        </CardBody>
      </Card>
      <Card hoverable>
        <CardHeader title="Feature Four" />
        <CardBody>
          <p className="text-foreground">Description for the fourth feature card.</p>
        </CardBody>
      </Card>
    </div>
  ),
};
