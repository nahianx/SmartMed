# @smartmed/ui

Shared React component library for SmartMed applications.

## Components

### Button

A customizable button component with variants.

```tsx
import { Button } from '@smartmed/ui'

;<Button variant="primary" onClick={handleClick}>
  Click me
</Button>
```

### Card

A container component with optional title.

```tsx
import { Card } from '@smartmed/ui'

;<Card title="Patient Information">
  <p>Card content here</p>
</Card>
```

### Input

A form input component with label and error handling.

```tsx
import { Input } from '@smartmed/ui'

;<Input
  label="Email"
  type="email"
  value={email}
  onChange={setEmail}
  error={emailError}
  required
/>
```

### Modal

A modal dialog component.

```tsx
import { Modal } from '@smartmed/ui'

;<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Confirmation"
  footer={<Button onClick={handleClose}>Close</Button>}
>
  <p>Modal content here</p>
</Modal>
```

## Usage

Import components from the package:

```tsx
import { Button, Card, Input, Modal } from '@smartmed/ui'
```

## Styling

Components use Tailwind CSS classes. Make sure Tailwind is configured in your consuming application.
