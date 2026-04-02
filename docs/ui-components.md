# UI Components Documentation

This document provides comprehensive documentation for the 7zi project's UI components library.

---

## 📦 Components Overview

| Component | Purpose                                    | Responsive | TypeScript |
| --------- | ------------------------------------------ | ---------- | ---------- |
| Button    | Interactive buttons with multiple variants | ✅         | ✅         |
| Modal     | Dialog/overlay component                   | ✅         | ✅         |
| Tabs      | Tab navigation system                      | ✅         | ✅         |
| Toast     | Notification system                        | ✅         | ✅         |
| Tooltip   | Hover information display                  | ✅         | ✅         |

---

## 🔘 Button Component

A flexible, responsive button component with multiple variants, sizes, and states.

### Features

- **Multiple variants**: primary, secondary, outline, ghost, danger, link
- **Size presets**: xs, sm, md, lg, xl
- **Loading state** with spinner
- **Icon support** with left/right positioning
- **Full width option**
- **Accessibility** with keyboard navigation
- **Responsive design**

### Basic Usage

```tsx
import { Button } from '@/components/ui'

export function Example() {
  return (
    <Button variant="primary" onClick={() => alert('Clicked!')}>
      Click Me
    </Button>
  )
}
```

### Variants

```tsx
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>
<Button variant="link">Link</Button>
```

### Sizes

```tsx
<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
<Button size="xl">Extra Large</Button>
```

### Loading State

```tsx
<Button loading disabled={isSubmitting}>
  {isSubmitting ? 'Submitting...' : 'Submit'}
</Button>
```

### With Icon

```tsx
<Button icon={<Icon />}>With Icon</Button>
<Button icon={<Icon />} iconPosition="right">
  Icon Right
</Button>
```

### Full Width

```tsx
<Button fullWidth>Full Width Button</Button>
```

### Button Group

```tsx
import { Button, ButtonGroup } from '@/components/ui'
;<ButtonGroup>
  <Button variant="primary">Save</Button>
  <Button variant="outline">Cancel</Button>
</ButtonGroup>
```

### Icon Button

```tsx
import { IconButton } from '@/components/ui'
;<IconButton icon={<StarIcon />} tooltip="Add to favorites" />
```

### Props Reference

| Prop         | Type                | Default     | Description           |
| ------------ | ------------------- | ----------- | --------------------- |
| variant      | `ButtonVariant`     | `'primary'` | Button visual variant |
| size         | `ButtonSize`        | `'md'`      | Button size preset    |
| loading      | `boolean`           | `false`     | Show loading spinner  |
| disabled     | `boolean`           | `false`     | Disable button        |
| fullWidth    | `boolean`           | `false`     | Full width button     |
| icon         | `ReactNode`         | -           | Icon element          |
| iconPosition | `'left' \| 'right'` | `'left'`    | Icon position         |
| className    | `string`            | -           | Custom classes        |

### Responsive Behavior

The Button component uses Tailwind CSS responsive classes to adapt to different screen sizes:

- **Mobile**: Smaller padding and text size
- **Tablet**: Medium sizing
- **Desktop**: Full configured sizing

All buttons are touch-friendly with minimum 44x44px tap targets on mobile devices.

---

## 📱 Modal Component

A responsive modal dialog component with backdrop, animation, and keyboard support.

### Features

- **Size presets**: xs, sm, md, lg, xl, full
- **Backdrop click** to close
- **Escape key** support
- **Focus trap** for accessibility
- **Body scroll** prevention
- **Animation** effects
- **Customizable** header, content, footer
- **Confirm dialog** variant

### Basic Usage

```tsx
import { Modal, Button } from '@/components/ui'

function Example() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Modal Title" size="md">
        <p>Modal content goes here...</p>
      </Modal>
    </>
  )
}
```

### With Footer Actions

```tsx
<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  footer={
    <>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleConfirm}>Confirm</Button>
    </>
  }
>
  <p>Are you sure you want to proceed?</p>
</Modal>
```

### Confirm Dialog

```tsx
import { ConfirmDialog } from '@/components/ui'
;<ConfirmDialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Delete Item"
  message="This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  confirmVariant="danger"
  onConfirm={handleDelete}
/>
```

### Responsive Behavior

- **Mobile**: Full-screen modal with bottom sheet behavior
- **Tablet**: Large modal with 90% viewport max-height
- **Desktop**: Configured size (md, lg, xl, etc.)

### Props Reference

| Prop                 | Type         | Default | Description                |
| -------------------- | ------------ | ------- | -------------------------- |
| isOpen               | `boolean`    | -       | Modal visibility           |
| onClose              | `() => void` | -       | Close handler              |
| title                | `string`     | -       | Modal title                |
| size                 | `ModalSize`  | `'md'`  | Modal size preset          |
| closeOnBackdropClick | `boolean`    | `true`  | Close on backdrop click    |
| closeOnEscape        | `boolean`    | `true`  | Close on escape key        |
| showCloseButton      | `boolean`    | `true`  | Show close button          |
| preventBodyScroll    | `boolean`    | `true`  | Prevent body scroll        |
| className            | `string`     | -       | Custom classes for content |

---

## 📑 Tabs Component

A responsive tab component with horizontal and vertical layouts.

### Features

- **Multiple variants**: underline, enclosed, soft-rounded
- **Horizontal and vertical** orientations
- **Controlled and uncontrolled** modes
- **Responsive layout** (auto-switches to vertical on mobile)
- **Animation** effects
- **Accessibility** with ARIA roles

### Basic Usage

```tsx
import { Tabs, TabsList, TabTrigger, TabContent } from '@/components/ui'

function Example() {
  return (
    <Tabs defaultValue="tab1">
      <TabsList>
        <TabTrigger value="tab1">Tab 1</TabTrigger>
        <TabTrigger value="tab2">Tab 2</TabTrigger>
        <TabTrigger value="tab3">Tab 3</TabTrigger>
      </TabsList>

      <TabContent value="tab1">Content for tab 1</TabContent>
      <TabContent value="tab2">Content for tab 2</TabContent>
      <TabContent value="tab3">Content for tab 3</TabContent>
    </Tabs>
  )
}
```

### Controlled Mode

```tsx
function ControlledExample() {
  const [activeTab, setActiveTab] = useState('tab1')

  return (
    <Tabs value={activeTab} onChange={setActiveTab}>
      {/* ... */}
    </Tabs>
  )
}
```

### Variants

```tsx
<Tabs variant="underline">
  {/* Underline style */}
</Tabs>

<Tabs variant="enclosed">
  {/* Enclosed box style */}
</Tabs>

<Tabs variant="soft-rounded">
  {/* Soft rounded style */}
</Tabs>
```

### Vertical Layout

```tsx
<Tabs orientation="vertical">
  <TabsList>{/* Vertical tab list */}</TabsList>
</Tabs>
```

### Responsive Tabs

```tsx
import { ResponsiveTabs } from '@/components/ui'
;<ResponsiveTabs breakpoint="md">
  {/* Auto-switches to vertical on mobile (< 768px) */}
</ResponsiveTabs>
```

### With Animation

```tsx
import { TabPanel } from '@/components/ui'
;<Tabs defaultValue="tab1">
  <TabsList>
    <TabTrigger value="tab1">Tab 1</TabTrigger>
  </TabsList>
  <TabPanel value="tab1">{/* Animated content */}</TabPanel>
</Tabs>
```

### Props Reference

#### Tabs Props

| Prop         | Type                                          | Default        | Description                       |
| ------------ | --------------------------------------------- | -------------- | --------------------------------- |
| defaultValue | `string`                                      | -              | Default active tab (uncontrolled) |
| value        | `string`                                      | -              | Current active tab (controlled)   |
| onChange     | `(tab: string) => void`                       | -              | On change callback                |
| variant      | `'underline' \| 'enclosed' \| 'soft-rounded'` | `'underline'`  | Tab variant                       |
| orientation  | `'horizontal' \| 'vertical'`                  | `'horizontal'` | Orientation                       |

#### TabTrigger Props

| Prop     | Type      | Default | Description                         |
| -------- | --------- | ------- | ----------------------------------- |
| value    | `string`  | -       | Tab value                           |
| label    | `string`  | -       | Tab label (alternative to children) |
| disabled | `boolean` | `false` | Disabled state                      |

---

## 🔔 Toast Component

A toast notification system with multiple variants and positions.

### Features

- **Multiple variants**: success, error, warning, info
- **Position presets**: 6 positions (top/bottom left/center/right)
- **Auto-dismiss** with duration
- **Manual dismiss** option
- **Stack management** with max limit
- **Animation** effects
- **Context API** for easy access

### Setup

Wrap your app with `ToastProvider`:

```tsx
import { ToastProvider } from '@/components/ui'

export function App() {
  return (
    <ToastProvider maxToasts={5} defaultPosition="top-right">
      {/* Your app */}
    </ToastProvider>
  )
}
```

### Basic Usage

```tsx
import { useToastActions } from '@/components/ui'

function Example() {
  const { success, error, warning, info } = useToastActions()

  const handleSuccess = () => {
    success('Success!', 'Operation completed successfully')
  }

  const handleError = () => {
    error('Error', 'Something went wrong')
  }

  return (
    <>
      <Button onClick={handleSuccess}>Show Success</Button>
      <Button onClick={handleError}>Show Error</Button>
    </>
  )
}
```

### Using useToast Hook

```tsx
import { useToast } from '@/components/ui'

function Example() {
  const { showToast } = useToast()

  const showToast = () => {
    showToast({
      variant: 'success',
      title: 'Success',
      message: 'Operation completed',
      duration: 5000,
      closable: true,
    })
  }
}
```

### Convenience Methods

```tsx
const { success, error, warning, info } = useToastActions()

// Success toast
success('Success!', 'Operation completed')

// Error toast
error('Error', 'Something went wrong')

// Warning toast
warning('Warning', 'Please review your input')

// Info toast
info('Info', 'New update available')
```

### Custom Toast

```tsx
const { custom } = useToastActions()

custom({
  variant: 'info',
  title: 'Custom Toast',
  message: 'This is a custom message',
  duration: 10000,
  closable: true,
})
```

### Props Reference

#### ToastProvider Props

| Prop            | Type            | Default       | Description               |
| --------------- | --------------- | ------------- | ------------------------- |
| maxToasts       | `number`        | `5`           | Maximum concurrent toasts |
| defaultPosition | `ToastPosition` | `'top-right'` | Default position          |

#### Toast Item

| Prop     | Type           | Description                |
| -------- | -------------- | -------------------------- |
| variant  | `ToastVariant` | Toast variant              |
| title    | `string`       | Toast title                |
| message  | `string`       | Toast message (optional)   |
| duration | `number`       | Auto-dismiss duration (ms) |
| closable | `boolean`      | Show close button          |

---

## 💡 Tooltip Component

A responsive tooltip component with positioning and animations.

### Features

- **4 positions**: top, bottom, left, right
- **Size presets**: sm, md, lg
- **Arrow indicator**
- **Configurable delays**
- **Touch-friendly**
- **Accessibility** support
- **Info tooltip** variant

### Basic Usage

```tsx
import { Tooltip } from '@/components/ui'

function Example() {
  return (
    <Tooltip content="This is a tooltip" position="top">
      <Button>Hover Me</Button>
    </Tooltip>
  )
}
```

### Positions

```tsx
<Tooltip content="Top tooltip" position="top">
  <button>Top</button>
</Tooltip>

<Tooltip content="Bottom tooltip" position="bottom">
  <button>Bottom</button>
</Tooltip>

<Tooltip content="Left tooltip" position="left">
  <button>Left</button>
</Tooltip>

<Tooltip content="Right tooltip" position="right">
  <button>Right</button>
</Tooltip>
```

### Sizes

```tsx
<Tooltip content="Small" size="sm">Small Tooltip</Tooltip>
<Tooltip content="Medium" size="md">Medium Tooltip</Tooltip>
<Tooltip content="Large" size="lg">Large Tooltip</Tooltip>
```

### Simple Tooltip

```tsx
import { SimpleTooltip } from '@/components/ui'
;<SimpleTooltip content="Simple tooltip">
  <Button>Simple</Button>
</SimpleTooltip>
```

### Info Tooltip

```tsx
import { InfoTooltip } from '@/components/ui'
;<InfoTooltip content="This is additional information" position="right" iconSize="md" />
```

### Higher-Order Component

```tsx
import { withTooltip } from '@/components/ui'

const ButtonWithTooltip = withTooltip(Button, 'This button performs an action', 'top')

;<ButtonWithTooltip>Action</ButtonWithTooltip>
```

### Props Reference

| Prop      | Type              | Default | Description          |
| --------- | ----------------- | ------- | -------------------- |
| content   | `ReactNode`       | -       | Tooltip content      |
| position  | `TooltipPosition` | `'top'` | Tooltip position     |
| size      | `TooltipSize`     | `'md'`  | Tooltip size         |
| showArrow | `boolean`         | `true`  | Show arrow indicator |
| delay     | `number`          | `200`   | Show delay (ms)      |
| hideDelay | `number`          | `100`   | Hide delay (ms)      |
| disabled  | `boolean`         | `false` | Disabled state       |

---

## 📱 Responsive Design Guidelines

All components in this library are designed to be responsive and work across all device sizes.

### Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Responsive Patterns

1. **Touch Targets**: Minimum 44x44px for mobile
2. **Typography**: Scales appropriately with viewport
3. **Spacing**: Increases on larger screens
4. **Layout**: Adapts (horizontal to vertical) on mobile

---

## ♿ Accessibility

All components follow WCAG 2.1 guidelines:

- **Keyboard navigation** fully supported
- **ARIA roles** properly implemented
- **Focus management** handled correctly
- **Screen reader** compatible
- **Color contrast** meets AA standards

---

## 🎨 Theming

Components use Tailwind CSS for styling and support dark mode:

```tsx
// Dark mode is automatic based on system preference or user setting
<Button>Button works in dark mode</Button>
```

---

## 📦 Installation

All components are already included in the project. Import from `@/components/ui`:

```tsx
import { Button, Modal, Tabs, Tooltip } from '@/components/ui'
```

---

## 🧪 Testing

All components include TypeScript type definitions for better development experience:

```tsx
// TypeScript will catch type errors
<Button variant="invalid"> {/* TypeScript error */} </Button>
```

---

## 📝 Best Practices

1. **Use semantic variants** (primary, danger) for clarity
2. **Provide clear labels** for accessibility
3. **Limit toast duration** to 5-10 seconds
4. **Keep modals focused** on single actions
5. **Use tabs for navigation** not content organization
6. **Add tooltips sparingly** - use for help only

---

## 🔧 Customization

All components accept `className` prop for custom styling:

```tsx
<Button className="custom-button">Custom Button</Button>
```

---

## 📞 Support

For issues or questions, please refer to the project documentation or contact the development team.
