# Customizable Dashboard Widgets

## Overview

The SmartMed dashboard widget system allows users to customize their dashboard by:
- **Showing/hiding widgets** - Toggle visibility of individual widgets
- **Reordering widgets** - Drag and drop to rearrange widget positions
- **Resizing widgets** - Change widget size between small, medium, large, and full-width
- **Adding/removing widgets** - Add available widgets or remove ones you don't need

## User Guide

### Entering Edit Mode

1. Click the **Customize** button in the top-right corner of your dashboard
2. The dashboard will enter edit mode with a blue control bar

### Editing Your Dashboard

While in edit mode, you can:

- **Drag and drop** - Grab any widget by its drag handle (⋮⋮) and drag to reorder
- **Toggle visibility** - Click the eye icon to show/hide a widget
- **Resize** - Click the resize icon to cycle through sizes (small → medium → large → full)
- **Remove** - Click the X icon to remove a widget (core widgets cannot be removed)

### Adding Widgets

1. Click **Add Widget** in the edit bar
2. Browse or search available widgets
3. Click **Add** next to any widget you want to add
4. Click **Done** when finished

### Saving Changes

- Click **Save Changes** to save your customizations
- Click **Cancel** to discard changes and exit edit mode
- Click **Reset** to restore the default dashboard layout

## Widget Categories

### Patient Widgets
- **Quick Stats** - Overview of visits, doctors, and profile status
- **Queue Tracker** - Track your position in the doctor's queue
- **Upcoming Appointments** - View scheduled appointments
- **Recent Prescriptions** - View your recent medications
- **Health Tips** - Personalized health tips and reminders
- **Activity Timeline** - Your recent medical activity history
- **Doctor Availability** - See which doctors are available

### Doctor Widgets
- **Today's Stats** - Quick overview of patients and appointments
- **Patient Queue** - Manage your current patient queue
- **Today's Appointments** - View and manage appointments
- **Recent Prescriptions** - Prescriptions you've written
- **Notifications** - Important alerts and messages
- **Activity Timeline** - Recent practice activity

### Admin Widgets
- **Management Actions** - Quick access to admin functions
- **User Statistics** - Overview of all users
- **Appointment Statistics** - System-wide appointment metrics
- **Recent Activity** - Recent system-wide activity
- **Audit Logs** - Security and audit events

## Technical Details

### API Endpoints

```
GET  /api/dashboard-config           - Get current user's dashboard config
PUT  /api/dashboard-config           - Update dashboard config
POST /api/dashboard-config/reset     - Reset to default layout
PATCH /api/dashboard-config/widgets/:id  - Update single widget
POST /api/dashboard-config/widgets/:id/toggle - Toggle widget visibility
POST /api/dashboard-config/reorder   - Reorder widgets
POST /api/dashboard-config/widgets   - Add a widget
DELETE /api/dashboard-config/widgets/:id - Remove a widget
```

### Data Model

Dashboard configurations are stored in the `DashboardConfig` table:

```prisma
model DashboardConfig {
  id        String   @id @default(uuid())
  userId    String   @unique
  role      UserRole
  widgets   Json     // Array of WidgetConfig objects
  layout    Json?    // Optional grid layout metadata
  version   Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

### Widget Config Structure

```typescript
interface WidgetConfig {
  widgetId: string    // Unique widget identifier
  order: number       // Display order (0-based)
  visible: boolean    // Whether widget is shown
  size: 'small' | 'medium' | 'large' | 'full'
  colSpan?: number    // Grid column span
  rowSpan?: number    // Grid row span
  settings?: Record<string, unknown>  // Widget-specific settings
}
```

### Adding New Widgets

1. Define the widget in `constants/widgets.ts`:

```typescript
{
  id: 'my-new-widget',
  title: 'My Widget',
  description: 'Description of what this widget does',
  component: 'MyWidgetComponent',
  category: 'stats',
  defaultSize: 'medium',
  minSize: 'small',
  maxSize: 'large',
  allowedRoles: ['PATIENT'],
  icon: 'Chart',
  removable: true,
  defaultOrder: 10,
}
```

2. Create the widget component

3. Register the component in the dashboard's widget renderer

## Dependencies

- `@dnd-kit/core` - Drag and drop core functionality
- `@dnd-kit/sortable` - Sortable list implementation
- `@dnd-kit/utilities` - CSS transform utilities
