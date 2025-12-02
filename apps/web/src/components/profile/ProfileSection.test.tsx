import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProfileSection } from './ProfileSection';
import { useProfile } from '@/hooks/useProfile';
import { useAuthStore } from '@/store/auth';

// Mock the hooks
jest.mock('@/hooks/useProfile');
jest.mock('@/store/auth');
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseProfile = useProfile as jest.MockedFunction<typeof useProfile>;
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryClientWrapper';
  return Wrapper;
};

const mockProfile = {
  id: '1',
  email: 'john.doe@example.com',
  fullName: 'John Doe',
  phoneNumber: '+1234567890',
  role: 'PATIENT' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  profilePhotoUrl: 'https://example.com/photo.jpg',
  dateOfBirth: new Date('1990-01-01'),
  gender: 'MALE' as const,
  addressLine1: '123 Main St',
  city: 'New York',
  region: 'NY',
  postalCode: '10001',
  country: 'United States',
};

describe('ProfileSection', () => {
  beforeEach(() => {
    mockUseAuthStore.mockReturnValue({
      user: mockProfile,
      isAuthenticated: true,
      isLoading: false,
    } as any);

    mockUseProfile.mockReturnValue({
      data: mockProfile,
      isLoading: false,
      error: null,
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders profile information correctly', () => {
    const mockOnUnsavedChanges = jest.fn();
    render(<ProfileSection onUnsavedChanges={mockOnUnsavedChanges} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
  });

  it('shows loading state when profile is loading', () => {
    mockUseProfile.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    const mockOnUnsavedChanges = jest.fn();
    render(<ProfileSection onUnsavedChanges={mockOnUnsavedChanges} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('shows error state when profile fails to load', () => {
    mockUseProfile.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any);

    const mockOnUnsavedChanges = jest.fn();
    render(<ProfileSection onUnsavedChanges={mockOnUnsavedChanges} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Failed to load profile. Please try again.')).toBeInTheDocument();
  });

  it('calls onUnsavedChanges when form is edited', async () => {
    const mockOnUnsavedChanges = jest.fn();
    render(<ProfileSection onUnsavedChanges={mockOnUnsavedChanges} />, {
      wrapper: createWrapper(),
    });

    const fullNameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(fullNameInput, { target: { value: 'John Smith' } });

    await waitFor(() => {
      expect(mockOnUnsavedChanges).toHaveBeenCalledWith(true);
    });
  });

  it('validates required fields', async () => {
    const mockOnUnsavedChanges = jest.fn();
    render(<ProfileSection onUnsavedChanges={mockOnUnsavedChanges} />, {
      wrapper: createWrapper(),
    });

    const fullNameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(fullNameInput, { target: { value: '' } });

    // Trigger form validation by trying to save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Full name is required')).toBeInTheDocument();
    });
  });

  it('disables email field and shows helper text', () => {
    const mockOnUnsavedChanges = jest.fn();
    render(<ProfileSection onUnsavedChanges={mockOnUnsavedChanges} />, {
      wrapper: createWrapper(),
    });

    const emailInput = screen.getByDisplayValue('john.doe@example.com');
    expect(emailInput).toBeDisabled();
    expect(screen.getByText('Email cannot be changed')).toBeInTheDocument();
  });
});