import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import ProfilePage from '../page';
import { useRequireAuth } from '@/store/auth';

// Mock the hooks and components
jest.mock('@/store/auth');
jest.mock('@/components/profile/ProfileSection', () => {
  return function MockProfileSection() {
    return <div>Profile Section</div>;
  };
});
jest.mock('@/components/profile/SecuritySection', () => {
  return function MockSecuritySection() {
    return <div>Security Section</div>;
  };
});
jest.mock('@/components/profile/doctor/AvailabilitySection', () => {
  return function MockAvailabilitySection() {
    return <div>Availability Section</div>;
  };
});
jest.mock('@/components/profile/patient/PreferredDoctorsSection', () => {
  return function MockPreferredDoctorsSection() {
    return <div>Preferred Doctors Section</div>;
  };
});

const mockUseRequireAuth = useRequireAuth as jest.MockedFunction<typeof useRequireAuth>;

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: '/profile',
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BrowserRouter>
  );
};

describe('ProfilePage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseRequireAuth.mockReturnValue({
      isLoading: true,
      isAuthenticated: false,
      user: null,
    });

    render(<ProfilePage />, { wrapper: createWrapper() });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects to login when not authenticated', () => {
    mockUseRequireAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: false,
      user: null,
    });

    render(<ProfilePage />, { wrapper: createWrapper() });

    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('renders profile page for patient', () => {
    mockUseRequireAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: {
        id: '1',
        role: 'PATIENT',
        email: 'patient@example.com',
      },
    });

    render(<ProfilePage />, { wrapper: createWrapper() });

    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    expect(screen.getByText('Patient')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Preferred Doctors')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.queryByText('Availability')).not.toBeInTheDocument();
  });

  it('renders profile page for doctor', () => {
    mockUseRequireAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: {
        id: '1',
        role: 'DOCTOR',
        email: 'doctor@example.com',
      },
    });

    render(<ProfilePage />, { wrapper: createWrapper() });

    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    expect(screen.getByText('Healthcare Provider')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Availability')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.queryByText('Preferred Doctors')).not.toBeInTheDocument();
  });

  it('renders profile section by default', () => {
    mockUseRequireAuth.mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: {
        id: '1',
        role: 'PATIENT',
        email: 'patient@example.com',
      },
    });

    render(<ProfilePage />, { wrapper: createWrapper() });

    expect(screen.getByText('Profile Section')).toBeInTheDocument();
  });
});