# Dark Mode Support

## Overview

SmartMed includes comprehensive dark mode support, allowing users to switch between light, dark, and system-preference themes. The theming system uses `next-themes` for reliable theme persistence and `class`-based Tailwind CSS dark mode.

## User Guide

### Switching Themes

1. Click the theme toggle button in the navigation bar (sun/moon/monitor icon)
2. Cycle through themes: Light → Dark → System
3. Your preference is saved and persists across sessions

### Theme Options

- **Light Mode** ☀️ - Light backgrounds with dark text
- **Dark Mode** 🌙 - Dark backgrounds with light text  
- **System** 🖥️ - Automatically follows your operating system preference

## Technical Implementation

### Dependencies

- `next-themes` - Theme management and persistence

### Configuration

#### Tailwind CSS

The `darkMode` option is set to `'class'` in `tailwind.config.js`:

```javascript
module.exports = {
  darkMode: 'class',
  // ...
}
```

#### CSS Variables

Theme colors are defined using CSS custom properties in `globals.css`:

```css
:root {
  --background: #ffffff;
  --foreground: oklch(0.145 0 0);
  /* ... other light mode variables */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  /* ... other dark mode variables */
}
```

### Components

#### ThemeProvider

Wraps the application to enable theming:

```tsx
import { ThemeProvider } from '@/components/theme/ThemeProvider'

<ThemeProvider>
  {children}
</ThemeProvider>
```

#### ThemeToggle

Simple toggle button that cycles through themes:

```tsx
import { ThemeToggle } from '@/components/theme/ThemeToggle'

// Icon only (for navigation)
<ThemeToggle iconOnly />

// With label
<ThemeToggle />
```

#### ThemeDropdown

Dropdown menu for theme selection:

```tsx
import { ThemeDropdown } from '@/components/theme/ThemeDropdown'

<ThemeDropdown />
```

### Using Dark Mode in Components

Add `dark:` variants to Tailwind classes:

```tsx
<div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
  Content
</div>
```

### Using the useTheme Hook

```tsx
import { useTheme } from 'next-themes'

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  
  // theme: 'light' | 'dark' | 'system'
  // resolvedTheme: 'light' | 'dark' (actual applied theme)
  // setTheme: (theme: string) => void
}
```

### Avoiding Hydration Mismatch

Since theme is determined client-side, components that render differently based on theme should handle the initial render:

```tsx
function ThemeAwareComponent() {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Return placeholder to avoid layout shift
    return <div className="h-10 w-10" />
  }

  return (
    <div>
      Current theme: {resolvedTheme}
    </div>
  )
}
```

## Design Guidelines

### Color Contrast

Ensure sufficient contrast in both modes:
- Light mode: Dark text on light backgrounds
- Dark mode: Light text on dark backgrounds

### Semantic Colors

Use semantic color names that adapt to theme:

```tsx
// Good - adapts to theme
<div className="bg-background text-foreground" />
<div className="bg-card text-card-foreground" />
<div className="bg-muted text-muted-foreground" />

// Also good - explicit dark variants
<div className="bg-white dark:bg-gray-800" />
```

### Images and Icons

Consider how images appear in dark mode:
- Use SVG icons that inherit text color
- Provide dark-mode alternatives for images if needed
- Consider adding subtle shadows or borders around light images in dark mode

### Borders and Dividers

Use theme-aware border colors:

```tsx
<div className="border border-gray-200 dark:border-gray-700" />
```

## Troubleshooting

### Theme flickers on load

Ensure `ThemeProvider` wraps your application at the root level and uses `disableTransitionOnChange={false}`.

### Theme doesn't persist

Check that `storageKey` is set in ThemeProvider:

```tsx
<ThemeProvider storageKey="smartmed-theme">
```

### Hydration mismatch errors

Use the mounted pattern shown above, or suppress hydration warnings for theme-dependent elements.

## File Structure

```
src/
  components/
    theme/
      index.ts              # Exports
      ThemeProvider.tsx     # next-themes provider wrapper
      ThemeToggle.tsx       # Toggle button component
      ThemeDropdown.tsx     # Dropdown menu component
  app/
    globals.css             # CSS variables for themes
```
