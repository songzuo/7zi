# UI Components Library

A comprehensive collection of responsive, accessible UI components for the 7zi project.

## 📦 Components

- **Button** - Flexible button with multiple variants and sizes
- **Modal** - Dialog component with backdrop and keyboard support
- **Tabs** - Tab navigation with horizontal/vertical layouts
- **Toast** - Notification system with multiple positions
- **Tooltip** - Hover information display with positioning

## 🚀 Quick Start

```tsx
import { Button, Modal, Tabs } from '@/components/ui';

function App() {
  return (
    <>
      <Button variant="primary">Click Me</Button>
      <Modal isOpen={true} onClose={() => {}}>
        Modal Content
      </Modal>
    </>
  );
}
```

## 📖 Documentation

For detailed documentation, see [docs/ui-components.md](../docs/ui-components.md)

## 🧪 Testing

All components include comprehensive test suites:

```bash
# Run all UI component tests
npm test src/components/ui/__tests__

# Run specific component tests
npm test src/components/ui/__tests__/Button.test.tsx
```

## ✨ Features

- **Responsive Design** - All components adapt to different screen sizes
- **Accessibility** - WCAG 2.1 compliant with keyboard navigation
- **Dark Mode** - Automatic dark mode support
- **TypeScript** - Full type safety with exported types
- **Customizable** - Flexible props for customization
- **Well-Tested** - Comprehensive test coverage

## 🎨 Variants

Each component supports multiple visual variants:

### Button
- primary, secondary, outline, ghost, danger, link

### Modal
- xs, sm, md, lg, xl, full

### Tabs
- underline, enclosed, soft-rounded

### Toast
- success, error, warning, info

### Tooltip
- top, bottom, left, right

## 📱 Responsive Breakpoints

- **Mobile**: < 640px
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

## ♿ Accessibility

All components follow WCAG 2.1 AA standards:

- Proper ARIA roles and attributes
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- Color contrast compliance

## 🌙 Dark Mode

All components automatically adapt to dark mode based on system preference or user settings.

## 📝 Examples

For usage examples, see [examples.tsx](./examples.tsx)

```tsx
// View all examples
import UIComponentExamples from '@/components/ui/examples';

<UIComponentExamples />
```

## 🔧 Customization

All components accept a `className` prop for custom styling:

```tsx
<Button className="custom-button">Custom Button</Button>
```

## 🤝 Contributing

When adding new components:

1. Create component file in `src/components/ui/`
2. Add comprehensive TypeScript types
3. Write unit tests in `__tests__/`
4. Update documentation in `docs/ui-components.md`
5. Add examples to `examples.tsx`
6. Export from `index.ts`

## 📚 Additional Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Documentation](https://react.dev)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Created**: 2026-03-18  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
