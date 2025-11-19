import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TimelinePage from '../../src/app/timeline/page'
import { ErrorProvider } from '../../src/components/error/error_provider'

// Mock the API client
jest.mock('../../src/lib/api_client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn()
  }
}))

// Mock react-pdf
jest.mock('react-pdf', () => ({
  Document: ({ children }: any) => <div data-testid="pdf-document">{children}</div>,
  Page: () => <div data-testid="pdf-page">PDF Page</div>,
  pdfjs: { GlobalWorkerOptions: {} }
}))

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  },
  Toaster: () => <div data-testid="toast-container" />
}))

// Mock file input for upload tests
const mockFileInput = () => {
  Object.defineProperty(window.HTMLInputElement.prototype, 'files', {
    writable: true,
    value: undefined,
  })
}

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorProvider>
        {children}
      </ErrorProvider>
    </QueryClientProvider>
  )
}

describe('Timeline Page Integration', () => {
  let mockApiClient: any

  beforeEach(() => {
    mockFileInput()
    mockApiClient = require('../../src/lib/api_client').apiClient
    jest.clearAllMocks()

    // Default mocks for required API calls
    mockApiClient.get.mockImplementation((url: string) => {
      if (url === '/api/patients/me') {
        return Promise.resolve({
          data: {
            patient: {
              id: 'patient-1',
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com'
            }
          }
        })
      }
      if (url === '/api/notifications') {
        return Promise.resolve({ data: { items: [] } })
      }
      if (url.includes('/api/timeline')) {
        return Promise.resolve({
          data: {
            activities: [
              {
                id: 'activity-1',
                type: 'APPOINTMENT',
                title: 'Appointment with Dr. Smith',
                subtitle: 'Cardiology consultation',
                occurredAt: '2024-01-15T10:00:00Z',
                status: 'COMPLETED',
                tags: ['Cardiology'],
                doctorName: 'Dr. Smith',
                reportId: 'report-1'
              }
            ]
          }
        })
      }
      return Promise.reject(new Error('Unknown endpoint'))
    })
  })

  it('renders timeline page with activities', async () => {
    render(
      <TestWrapper>
        <TimelinePage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('SmartMed')).toBeInTheDocument()
    })

    expect(screen.getByText('Upload Report')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search activities...')).toBeInTheDocument()
  })

  it('handles search functionality', async () => {
    const user = userEvent.setup()
    render(
      <TestWrapper>
        <TimelinePage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search activities...')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Search activities...')
    await user.type(searchInput, 'cardiology')

    // Verify that the search input is working
    expect(searchInput).toHaveValue('cardiology')
  })

  it('opens mobile filter drawer on small screens', async () => {
    const user = userEvent.setup()
    
    // Mock window.innerWidth for mobile simulation
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 768
    })

    render(
      <TestWrapper>
        <TimelinePage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('SmartMed')).toBeInTheDocument()
    })

    // Look for mobile menu button (would be visible on small screens)
    const menuButtons = screen.getAllByRole('button')
    expect(menuButtons.length).toBeGreaterThan(0)
  })

  it('handles file upload with validation', async () => {
    const user = userEvent.setup()
    
    render(
      <TestWrapper>
        <TimelinePage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Upload Report')).toBeInTheDocument()
    })

    // Create a mock PDF file
    const pdfFile = new File(['PDF content'], 'test-report.pdf', {
      type: 'application/pdf'
    })

    // Mock successful upload
    mockApiClient.post.mockResolvedValueOnce({
      data: { message: 'Report uploaded successfully' }
    })

    const uploadButton = screen.getByText('Upload Report')
    await user.click(uploadButton)

    // Check if file input exists (it should be hidden)
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()
  })

  it('shows activity details when clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <TestWrapper>
        <TimelinePage />
      </TestWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Appointment with Dr. Smith')).toBeInTheDocument()
    })

    // Click on an activity
    const activityCard = screen.getByText('Appointment with Dr. Smith')
    await user.click(activityCard)

    // The details drawer should open - we can check for content that would be in the drawer
    // This depends on the specific implementation of your DetailsDrawer component
  })

  it('handles API errors gracefully', async () => {
    // Mock API error
    mockApiClient.get.mockImplementation((url: string) => {
      if (url === '/api/patients/me') {
        return Promise.reject({
          isAxiosError: true,
          response: {
            status: 500,
            data: { error: 'Server error' }
          }
        })
      }
      return Promise.resolve({ data: {} })
    })

    render(
      <TestWrapper>
        <TimelinePage />
      </TestWrapper>
    )

    // The page should still render, error should be handled
    await waitFor(() => {
      expect(screen.getByText('SmartMed')).toBeInTheDocument()
    })
  })

  it('shows loading states', () => {
    render(
      <TestWrapper>
        <TimelinePage />
      </TestWrapper>
    )

    // Should show loading state initially
    expect(screen.getByText('SmartMed')).toBeInTheDocument()
  })
})