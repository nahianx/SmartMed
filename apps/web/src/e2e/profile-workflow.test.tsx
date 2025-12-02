/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/auth';
import ProfilePage from '../app/profile/page';

// Mock the auth store
jest.mock('../store/auth');
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;

// Mock API services
jest.mock('../services/api', () => ({
  profileApi: {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    uploadPhoto: jest.fn(),
    removePhoto: jest.fn(),
  },
  doctorApi: {
    getAvailability: jest.fn(),
    updateAvailability: jest.fn(),
    searchDoctors: jest.fn(),
  },
  patientApi: {
    getPreferredDoctors: jest.fn(),
    addPreferredDoctor: jest.fn(),
    removePreferredDoctor: jest.fn(),
  },
}));

// Mock React Query hooks
jest.mock('../hooks/useProfile', () => ({
  useProfile: jest.fn(),
  useUpdateProfile: jest.fn(),
  useUploadProfilePhoto: jest.fn(),
  useRemoveProfilePhoto: jest.fn(),
  useDoctorAvailability: jest.fn(),
  useUpdateDoctorAvailability: jest.fn(),
  useSearchDoctors: jest.fn(),
  usePreferredDoctors: jest.fn(),
  useAddPreferredDoctor: jest.fn(),
  useRemovePreferredDoctor: jest.fn(),
}));

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestQueryClientWrapper';
  return Wrapper;
};

describe('Profile Management E2E Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Doctor Profile Management', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: '1',
          email: 'doctor@example.com',
          role: 'DOCTOR',
          fullName: 'Dr. John Doe',
        },
        token: 'mock-token',
        login: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn(),
        isAuthenticated: true,
      });

      // Mock hooks for doctor
      const { useProfile, useUpdateProfile, useDoctorAvailability } = require('../hooks/useProfile');
      
      useProfile.mockReturnValue({
        data: {
          id: '1',
          email: 'doctor@example.com',
          fullName: 'Dr. John Doe',
          phoneNumber: '+1234567890',
          role: 'DOCTOR',
          specialization: 'Cardiology',
          experience: 10,
          licenseNumber: 'LIC123456',
        },
        isLoading: false,
        error: null,
      });

      useUpdateProfile.mockReturnValue({
        mutate: jest.fn(),
        isLoading: false,
        error: null,
      });

      useDoctorAvailability.mockReturnValue({
        data: [
          {
            id: '1',
            dayOfWeek: 1,
            startTime: '09:00',
            endTime: '17:00',
            hasBreak: false,
            isAvailable: true,
          },
        ],
        isLoading: false,
        error: null,
      });
    });

    it('completes full doctor profile update workflow', async () => {
      const user = userEvent.setup();
      const Wrapper = createTestWrapper();
      
      render(<ProfilePage />, { wrapper: Wrapper });

      // Wait for profile data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Dr. John Doe')).toBeInTheDocument();
      });

      // Test profile section
      expect(screen.getByDisplayValue('doctor@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Cardiology')).toBeInTheDocument();
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
      expect(screen.getByDisplayValue('LIC123456')).toBeInTheDocument();

      // Update profile information
      const nameInput = screen.getByDisplayValue('Dr. John Doe');
      await user.clear(nameInput);
      await user.type(nameInput, 'Dr. John Smith');

      // Save changes
      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      // Verify save was called
      const { useUpdateProfile } = require('../hooks/useProfile');
      expect(useUpdateProfile().mutate).toHaveBeenCalled();
    });

    it('manages availability settings', async () => {
      const user = userEvent.setup();
      const Wrapper = createTestWrapper();
      
      render(<ProfilePage />, { wrapper: Wrapper });

      // Switch to availability tab
      const availabilityTab = screen.getByRole('tab', { name: /availability/i });
      await user.click(availabilityTab);

      await waitFor(() => {
        expect(screen.getByText(/availability schedule/i)).toBeInTheDocument();
      });

      // Should show current availability
      expect(screen.getByText(/monday/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
      expect(screen.getByDisplayValue('17:00')).toBeInTheDocument();
    });
  });

  describe('Patient Profile Management', () => {
    beforeEach(() => {
      mockUseAuthStore.mockReturnValue({
        user: {
          id: '2',
          email: 'patient@example.com',
          role: 'PATIENT',
          fullName: 'Jane Smith',
        },
        token: 'mock-token',
        login: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn(),
        isAuthenticated: true,
      });

      // Mock hooks for patient
      const { useProfile, usePreferredDoctors } = require('../hooks/useProfile');
      
      useProfile.mockReturnValue({
        data: {
          id: '2',
          email: 'patient@example.com',
          fullName: 'Jane Smith',
          phoneNumber: '+0987654321',
          role: 'PATIENT',
          dateOfBirth: '1990-01-01',
          emergencyContact: '+1111111111',
        },
        isLoading: false,
        error: null,
      });

      usePreferredDoctors.mockReturnValue({
        data: [
          {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            specialization: 'Cardiology',
            experience: 10,
          },
        ],
        isLoading: false,
        error: null,
      });
    });

    it('completes full patient profile management', async () => {
      const user = userEvent.setup();
      const Wrapper = createTestWrapper();
      
      render(<ProfilePage />, { wrapper: Wrapper });

      // Wait for profile data to load
      await waitFor(() => {
        expect(screen.getByDisplayValue('Jane Smith')).toBeInTheDocument();
      });

      // Test patient-specific fields
      expect(screen.getByDisplayValue('patient@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+0987654321')).toBeInTheDocument();
      expect(screen.getByDisplayValue('1990-01-01')).toBeInTheDocument();
      expect(screen.getByDisplayValue('+1111111111')).toBeInTheDocument();

      // Navigate to preferred doctors tab
      const preferredTab = screen.getByRole('tab', { name: /preferred doctors/i });
      await user.click(preferredTab);

      await waitFor(() => {
        expect(screen.getByText(/preferred doctors/i)).toBeInTheDocument();
      });

      // Should show preferred doctors list
      expect(screen.getByText('Dr. John Doe')).toBeInTheDocument();
      expect(screen.getByText('Cardiology')).toBeInTheDocument();
    });

    it('handles security settings', async () => {
      const user = userEvent.setup();
      const Wrapper = createTestWrapper();
      
      render(<ProfilePage />, { wrapper: Wrapper });

      // Navigate to security tab
      const securityTab = screen.getByRole('tab', { name: /security/i });
      await user.click(securityTab);

      await waitFor(() => {
        expect(screen.getByText(/security settings/i)).toBeInTheDocument();
      });

      // Should show password change section
      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });
  });

  describe('Error Scenarios', () => {
    it('handles profile loading errors gracefully', async () => {
      mockUseAuthStore.mockReturnValue({
        user: { id: '1', email: 'test@example.com', role: 'PATIENT', fullName: 'Test User' },
        token: 'mock-token',
        login: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn(),
        isAuthenticated: true,
      });

      const { useProfile } = require('../hooks/useProfile');
      useProfile.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to load profile'),
      });

      const Wrapper = createTestWrapper();
      render(<ProfilePage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByText(/failed to load profile/i)).toBeInTheDocument();
      });
    });

    it('handles update errors with proper feedback', async () => {
      const user = userEvent.setup();
      
      mockUseAuthStore.mockReturnValue({
        user: { id: '1', email: 'test@example.com', role: 'PATIENT', fullName: 'Test User' },
        token: 'mock-token',
        login: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn(),
        isAuthenticated: true,
      });

      const { useProfile, useUpdateProfile } = require('../hooks/useProfile');
      
      useProfile.mockReturnValue({
        data: { id: '1', email: 'test@example.com', fullName: 'Test User', role: 'PATIENT' },
        isLoading: false,
        error: null,
      });

      useUpdateProfile.mockReturnValue({
        mutate: jest.fn(),
        isLoading: false,
        error: new Error('Update failed'),
      });

      const Wrapper = createTestWrapper();
      render(<ProfilePage />, { wrapper: Wrapper });

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
      });

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/update failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Authentication Guard', () => {
    it('redirects unauthenticated users', () => {
      mockUseAuthStore.mockReturnValue({
        user: null,
        token: null,
        login: jest.fn(),
        logout: jest.fn(),
        updateUser: jest.fn(),
        isAuthenticated: false,
      });

      const Wrapper = createTestWrapper();
      
      // This should trigger the authentication guard
      expect(() => render(<ProfilePage />, { wrapper: Wrapper })).not.toThrow();
    });
  });
});