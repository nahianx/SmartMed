/**
 * Widget System Types
 * 
 * Defines the interfaces and types for the customizable dashboard widget system.
 */

// Widget size options
export type WidgetSize = 'small' | 'medium' | 'large' | 'full'

// Widget categories for organization
export type WidgetCategory = 'appointments' | 'queue' | 'prescriptions' | 'stats' | 'activity' | 'health' | 'admin' | 'general'

// User roles that can use widgets
export type WidgetRole = 'PATIENT' | 'DOCTOR' | 'NURSE' | 'ADMIN'

/**
 * Widget definition - defines a widget type that can be used on dashboards
 */
export interface WidgetDefinition {
  /** Unique identifier for the widget type */
  id: string
  /** Display name for the widget */
  title: string
  /** Description of what the widget shows */
  description: string
  /** Component name to render (used for dynamic imports) */
  component: string
  /** Category for grouping in add widget dialog */
  category: WidgetCategory
  /** Default size when added to dashboard */
  defaultSize: WidgetSize
  /** Minimum size the widget can be */
  minSize: WidgetSize
  /** Maximum size the widget can be */
  maxSize: WidgetSize
  /** Roles that can use this widget */
  allowedRoles: WidgetRole[]
  /** Optional icon name from lucide-react */
  icon?: string
  /** Whether this widget can be removed (some are required) */
  removable: boolean
  /** Default order when added */
  defaultOrder: number
}

/**
 * Widget instance configuration - user's specific configuration for a widget
 */
export interface WidgetConfig {
  /** Reference to the widget definition id */
  widgetId: string
  /** Order in the dashboard (lower = earlier) */
  order: number
  /** Whether the widget is visible */
  visible: boolean
  /** Current size of the widget */
  size: WidgetSize
  /** Column span (1-4) for grid layout */
  colSpan?: number
  /** Custom settings specific to this widget instance */
  settings?: Record<string, unknown>
}

/**
 * Dashboard layout configuration - stored per user
 */
export interface DashboardLayout {
  /** User's ID */
  userId: string
  /** User's role (determines available widgets) */
  role: WidgetRole
  /** Array of widget configurations */
  widgets: WidgetConfig[]
  /** Layout version for migrations */
  version: number
  /** When the layout was last updated */
  updatedAt: string
}

/**
 * Widget state in the dashboard context
 */
export interface WidgetState {
  /** The widget definition */
  definition: WidgetDefinition
  /** The user's configuration for this widget */
  config: WidgetConfig
  /** Whether the widget is loading data */
  isLoading: boolean
  /** Any error that occurred */
  error?: string
}

/**
 * Dashboard edit context state
 */
export interface DashboardEditState {
  /** Whether the dashboard is in edit mode */
  isEditing: boolean
  /** Temporary configuration while editing */
  tempConfig: WidgetConfig[] | null
  /** Whether there are unsaved changes */
  hasChanges: boolean
  /** Whether saving is in progress */
  isSaving: boolean
}

/**
 * Available widgets response from API
 */
export interface AvailableWidgetsResponse {
  widgets: WidgetDefinition[]
  userConfig: WidgetConfig[]
  defaultConfig: WidgetConfig[]
}

/**
 * Dashboard config response from API
 */
export interface DashboardConfigResponse {
  config: DashboardLayout
  availableWidgets: WidgetDefinition[]
  isDefault: boolean
}

/**
 * Save dashboard config request
 */
export interface SaveDashboardConfigRequest {
  widgets: WidgetConfig[]
  version?: number
}

/**
 * Props for widget container component
 */
export interface WidgetContainerProps {
  definition: WidgetDefinition
  config: WidgetConfig
  isEditMode: boolean
  onVisibilityToggle?: (widgetId: string) => void
  onRemove?: (widgetId: string) => void
  children: React.ReactNode
}

/**
 * Props for the widget grid
 */
export interface WidgetGridProps {
  widgets: WidgetState[]
  isEditMode: boolean
  onReorder?: (widgets: WidgetConfig[]) => void
  onVisibilityToggle?: (widgetId: string) => void
  onRemove?: (widgetId: string) => void
}

/**
 * Props for add widget dialog
 */
export interface AddWidgetDialogProps {
  isOpen: boolean
  onClose: () => void
  availableWidgets: WidgetDefinition[]
  currentWidgets: WidgetConfig[]
  onAdd: (widgetId: string) => void
}
