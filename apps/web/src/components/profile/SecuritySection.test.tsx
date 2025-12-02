import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SecuritySection } from './SecuritySection';
import { useProfile, useChangePassword, useToggleMFA } from '@/hooks/useProfile';

// Mock the hooks
jest.mock('@/hooks/useProfile');
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseProfile = useProfile as jest.MockedFunction<typeof useProfile>;
const mockUseChangePassword = useChangePassword as jest.MockedFunction<typeof useChangePassword>;
const mockUseToggleMFA = useToggleMFA as jest.MockedFunction<typeof useToggleMFA>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockProfile = {
  id: '1',
  email: 'john.doe@example.com',
  role: 'PATIENT' as const,
  isMfaEnabled: false,
  createdAt: new Date('2023-01-01'),
};

describe('SecuritySection', () => {
  beforeEach(() => {
    mockUseProfile.mockReturnValue({
      data: mockProfile,
      isLoading: false,
      error: null,
    } as any);

    mockUseChangePassword.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as any);

    mockUseToggleMFA.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders security settings correctly', () => {
    render(<SecuritySection />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Security Settings')).toBeInTheDocument();
    expect(screen.getByText('Change Password')).toBeInTheDocument();
    expect(screen.getByText('Two-Factor Authentication')).toBeInTheDocument();
    expect(screen.getByText('Account Information')).toBeInTheDocument();
  });

  it('validates password change form', async () => {
    render(<SecuritySection />, {
      wrapper: createWrapper(),
    });

    const updatePasswordButton = screen.getByText('Update Password');
    fireEvent.click(updatePasswordButton);

    await waitFor(() => {
      expect(screen.getByText('Current password is required')).toBeInTheDocument();
      expect(screen.getByText('New password is required')).toBeInTheDocument();
    });
  });

  it('shows password strength indicator', async () => {
    render(<SecuritySection />, {
      wrapper: createWrapper(),
    });

    const newPasswordInput = screen.getByPlaceholderText('Enter your new password');
    fireEvent.change(newPasswordInput, { target: { value: 'weak' } });

    await waitFor(() => {
      expect(screen.getByText('Weak')).toBeInTheDocument();
    });

    fireEvent.change(newPasswordInput, { target: { value: 'StrongPassword123!' } });

    await waitFor(() => {
      expect(screen.getByText('Strong')).toBeInTheDocument();
    });
  });

  it('validates password confirmation', async () => {
    render(<SecuritySection />, {
      wrapper: createWrapper(),
    });

    const newPasswordInput = screen.getByPlaceholderText('Enter your new password');
    const confirmPasswordInput = screen.getByPlaceholderText('Confirm your new password');

    fireEvent.change(newPasswordInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'Password456!' } });

    const updatePasswordButton = screen.getByText('Update Password');
    fireEvent.click(updatePasswordButton);

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('displays MFA status correctly', () => {
    render(<SecuritySection />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('shows account information', () => {
    render(<SecuritySection />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByText('Patient')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('displays security tips', () => {
    render(<SecuritySection />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Security Tips')).toBeInTheDocument();
    expect(screen.getByText(/Use a unique password/)).toBeInTheDocument();
    expect(screen.getByText(/Enable two-factor authentication/)).toBeInTheDocument();
    expect(screen.getByText(/Never share your login credentials/)).toBeInTheDocument();
    expect(screen.getByText(/Log out from shared or public computers/)).toBeInTheDocument();
  });
});