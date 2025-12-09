import { fireEvent, render, screen } from '@testing-library/react';
import ProfilePage from './page';

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
jest.mock('@/components/timeline/timeline_container', () => {
  return {
    TimelineContainer: function MockTimelineContainer() {
      return <div>Timeline Section</div>;
    },
  };
});

const mockPush = jest.fn();
const mockSearchParams = {
  get: jest.fn<string | null, [string]>((key: string) => {
    if (key === 'role') return null;
    return null;
  }),
};

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: '/profile',
  }),
  useSearchParams: () => mockSearchParams,
}));

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders patient tabs including timeline and preferred doctors', () => {
    mockSearchParams.get.mockImplementation((key) => {
      if (key === 'role') return 'PATIENT';
      return null;
    });

    render(<ProfilePage />);

    expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Preferred Doctors')).toBeInTheDocument();
    expect(screen.queryByText('Availability')).not.toBeInTheDocument();
    expect(screen.getByText('Profile Section')).toBeInTheDocument();
  });

  it('renders doctor tabs including availability and timeline', () => {
    mockSearchParams.get.mockImplementation((key) => {
      if (key === 'role') return 'DOCTOR';
      return null;
    });

    render(<ProfilePage />);

    expect(screen.getByText('Timeline')).toBeInTheDocument();
    expect(screen.getByText('Availability')).toBeInTheDocument();
    expect(screen.queryByText('Preferred Doctors')).not.toBeInTheDocument();
  });

  it('shows embedded timeline content when the tab is selected', () => {
    mockSearchParams.get.mockImplementation((key) => {
      if (key === 'role') return null;
      return null;
    });

    render(<ProfilePage />);

    fireEvent.click(screen.getByText('Timeline'));

    expect(screen.getByText('Timeline Section')).toBeInTheDocument();
  });
});
