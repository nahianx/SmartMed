/**
 * Widget System Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { DashboardEditBar } from '@/components/dashboard/DashboardEditBar'
import { AddWidgetDialog } from '@/components/dashboard/AddWidgetDialog'
import {
  PATIENT_WIDGETS,
  DOCTOR_WIDGETS,
  ADMIN_WIDGETS,
  getWidgetsForRole,
  getDefaultLayout,
} from '@/constants/widgets'

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: jest.fn(),
    resolvedTheme: 'light',
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('Widget Registry', () => {
  describe('getWidgetsForRole', () => {
    it('returns patient widgets for PATIENT role', () => {
      const widgets = getWidgetsForRole('PATIENT')
      expect(widgets).toHaveLength(PATIENT_WIDGETS.length)
      widgets.forEach(w => {
        expect(w.allowedRoles).toContain('PATIENT')
      })
    })

    it('returns doctor widgets for DOCTOR role', () => {
      const widgets = getWidgetsForRole('DOCTOR')
      expect(widgets).toHaveLength(DOCTOR_WIDGETS.length)
      widgets.forEach(w => {
        expect(w.allowedRoles).toContain('DOCTOR')
      })
    })

    it('returns admin widgets for ADMIN role', () => {
      const widgets = getWidgetsForRole('ADMIN')
      expect(widgets).toHaveLength(ADMIN_WIDGETS.length)
      widgets.forEach(w => {
        expect(w.allowedRoles).toContain('ADMIN')
      })
    })
  })

  describe('getDefaultLayout', () => {
    it('returns default layout for PATIENT', () => {
      const layout = getDefaultLayout('PATIENT')
      expect(layout.length).toBeGreaterThan(0)
      expect(layout[0].widgetId).toBe('patient-status-cards')
    })

    it('returns default layout for DOCTOR', () => {
      const layout = getDefaultLayout('DOCTOR')
      expect(layout.length).toBeGreaterThan(0)
      expect(layout[0].widgetId).toBe('doctor-stats')
    })

    it('returns default layout for ADMIN', () => {
      const layout = getDefaultLayout('ADMIN')
      expect(layout.length).toBeGreaterThan(0)
      expect(layout[0].widgetId).toBe('admin-management-cards')
    })

    it('returns subset of doctor layout for NURSE', () => {
      const layout = getDefaultLayout('NURSE')
      expect(layout.length).toBeLessThan(getDefaultLayout('DOCTOR').length)
    })
  })

  describe('Widget Definitions', () => {
    it('all widgets have required properties', () => {
      const allWidgets = [...PATIENT_WIDGETS, ...DOCTOR_WIDGETS, ...ADMIN_WIDGETS]
      
      allWidgets.forEach(widget => {
        expect(widget.id).toBeDefined()
        expect(widget.title).toBeDefined()
        expect(widget.description).toBeDefined()
        expect(widget.component).toBeDefined()
        expect(widget.category).toBeDefined()
        expect(widget.defaultSize).toBeDefined()
        expect(widget.allowedRoles).toBeDefined()
        expect(widget.allowedRoles.length).toBeGreaterThan(0)
      })
    })

    it('all widget IDs are unique', () => {
      const allWidgets = [...PATIENT_WIDGETS, ...DOCTOR_WIDGETS, ...ADMIN_WIDGETS]
      const ids = allWidgets.map(w => w.id)
      const uniqueIds = new Set(ids)
      expect(ids.length).toBe(uniqueIds.size)
    })
  })
})

describe('DashboardEditBar', () => {
  const defaultProps = {
    isEditing: false,
    hasChanges: false,
    isSaving: false,
    onEditToggle: jest.fn(),
    onSave: jest.fn(),
    onCancel: jest.fn(),
    onReset: jest.fn(),
    onAddWidget: jest.fn(),
    hiddenWidgetCount: 0,
  }

  it('renders customize button in view mode', () => {
    render(<DashboardEditBar {...defaultProps} />)
    expect(screen.getByText('Customize')).toBeInTheDocument()
  })

  it('shows hidden widget count when widgets are hidden', () => {
    render(<DashboardEditBar {...defaultProps} hiddenWidgetCount={3} />)
    expect(screen.getByText('3 hidden')).toBeInTheDocument()
  })

  it('renders full control bar in edit mode', () => {
    render(<DashboardEditBar {...defaultProps} isEditing={true} />)
    expect(screen.getByText('Customizing Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Add Widget')).toBeInTheDocument()
    expect(screen.getByText('Reset')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Save Changes')).toBeInTheDocument()
  })

  it('disables save button when no changes', () => {
    render(<DashboardEditBar {...defaultProps} isEditing={true} hasChanges={false} />)
    const saveButton = screen.getByText('Save Changes').closest('button')
    expect(saveButton).toBeDisabled()
  })

  it('enables save button when there are changes', () => {
    render(<DashboardEditBar {...defaultProps} isEditing={true} hasChanges={true} />)
    const saveButton = screen.getByText('Save Changes').closest('button')
    expect(saveButton).not.toBeDisabled()
  })

  it('shows saving state', () => {
    render(<DashboardEditBar {...defaultProps} isEditing={true} isSaving={true} />)
    expect(screen.getByText('Saving...')).toBeInTheDocument()
  })

  it('calls onEditToggle when customize button is clicked', () => {
    const onEditToggle = jest.fn()
    render(<DashboardEditBar {...defaultProps} onEditToggle={onEditToggle} />)
    fireEvent.click(screen.getByText('Customize'))
    expect(onEditToggle).toHaveBeenCalled()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = jest.fn()
    render(<DashboardEditBar {...defaultProps} isEditing={true} onCancel={onCancel} />)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })
})

describe('AddWidgetDialog', () => {
  const mockWidgets = [
    {
      id: 'test-widget-1',
      title: 'Test Widget 1',
      description: 'First test widget',
      component: 'TestWidget1',
      category: 'stats' as const,
      defaultSize: 'medium' as const,
      minSize: 'small' as const,
      maxSize: 'large' as const,
      allowedRoles: ['PATIENT' as const],
      icon: 'Chart',
      removable: true,
      defaultOrder: 0,
    },
    {
      id: 'test-widget-2',
      title: 'Test Widget 2',
      description: 'Second test widget',
      component: 'TestWidget2',
      category: 'appointments' as const,
      defaultSize: 'large' as const,
      minSize: 'medium' as const,
      maxSize: 'full' as const,
      allowedRoles: ['PATIENT' as const],
      icon: 'Calendar',
      removable: true,
      defaultOrder: 1,
    },
  ]

  const defaultProps = {
    isOpen: true,
    availableWidgets: mockWidgets,
    currentWidgets: [],
    onClose: jest.fn(),
    onAddWidget: jest.fn(),
  }

  it('renders when open', () => {
    render(<AddWidgetDialog {...defaultProps} />)
    expect(screen.getByText('Add Widget')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<AddWidgetDialog {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Add Widget')).not.toBeInTheDocument()
  })

  it('displays available widgets', () => {
    render(<AddWidgetDialog {...defaultProps} />)
    expect(screen.getByText('Test Widget 1')).toBeInTheDocument()
    expect(screen.getByText('Test Widget 2')).toBeInTheDocument()
  })

  it('shows "Added" badge for widgets already in dashboard', () => {
    render(
      <AddWidgetDialog
        {...defaultProps}
        currentWidgets={[
          { widgetId: 'test-widget-1', order: 0, visible: true, size: 'medium' },
        ]}
      />
    )
    expect(screen.getByText('Added')).toBeInTheDocument()
  })

  it('filters widgets by search query', () => {
    render(<AddWidgetDialog {...defaultProps} />)
    const searchInput = screen.getByPlaceholderText('Search widgets...')
    fireEvent.change(searchInput, { target: { value: 'First' } })
    
    expect(screen.getByText('Test Widget 1')).toBeInTheDocument()
    expect(screen.queryByText('Test Widget 2')).not.toBeInTheDocument()
  })

  it('calls onAddWidget when Add button is clicked', () => {
    const onAddWidget = jest.fn()
    render(<AddWidgetDialog {...defaultProps} onAddWidget={onAddWidget} />)
    
    const addButtons = screen.getAllByText('Add')
    fireEvent.click(addButtons[0])
    
    expect(onAddWidget).toHaveBeenCalledWith('test-widget-1')
  })

  it('calls onClose when Done button is clicked', () => {
    const onClose = jest.fn()
    render(<AddWidgetDialog {...defaultProps} onClose={onClose} />)
    
    fireEvent.click(screen.getByText('Done'))
    expect(onClose).toHaveBeenCalled()
  })
})

describe('ThemeToggle', () => {
  it('renders without crashing', () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    )
  })

  it('renders icon-only variant', () => {
    render(
      <ThemeProvider>
        <ThemeToggle iconOnly />
      </ThemeProvider>
    )
  })
})
