import { profileApi, doctorApi, patientApi } from './api';
// Note: This test requires msw package to be installed
// npm install -D msw
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock server setup
const server = setupServer(
  // Profile endpoints
  http.get('http://localhost:3001/api/profile', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: '1',
        email: 'test@example.com',
        fullName: 'Test User',
        phoneNumber: '+1234567890',
        role: 'PATIENT',
        profilePhotoUrl: 'https://example.com/photo.jpg',
      },
    });
  }),

  http.put('http://localhost:3001/api/profile', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: '1',
        email: 'test@example.com',
        fullName: 'Updated User',
        phoneNumber: '+1234567890',
        role: 'PATIENT',
      },
    });
  }),

  http.post('http://localhost:3001/api/profile/photo', () => {
    return HttpResponse.json({
      success: true,
      data: {
        profilePhotoUrl: 'https://example.com/new-photo.jpg',
      },
    });
  }),

  http.delete('http://localhost:3001/api/profile/photo', () => {
    return HttpResponse.json({
      success: true,
    });
  }),

  // Doctor endpoints
  http.get('http://localhost:3001/api/doctor/search', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '1',
          firstName: 'John',
          lastName: 'Doe',
          specialization: 'Cardiology',
          experience: 10,
        },
      ],
    });
  }),

  http.get('http://localhost:3001/api/doctor/availability', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '1',
          doctorId: '1',
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00',
          hasBreak: false,
          isAvailable: true,
        },
      ],
    });
  }),

  // Patient endpoints
  http.get('http://localhost:3001/api/patient/preferred-doctors', () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id: '1',
          firstName: 'Jane',
          lastName: 'Smith',
          specialization: 'Dermatology',
        },
      ],
    });
  }),

  http.post('http://localhost:3001/api/patient/preferred-doctors/1', () => {
    return HttpResponse.json({
      success: true,
    });
  })
);

// Mock localStorage for auth token
const mockLocalStorage = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('API Services Integration', () => {
  beforeAll(() => {
    server.listen();
    // Mock auth token in localStorage
    mockLocalStorage.setItem(
      'smartmed-auth',
      JSON.stringify({
        state: {
          token: 'mock-jwt-token',
        },
      })
    );
  });

  afterEach(() => {
    server.resetHandlers();
    jest.clearAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  describe('Profile API', () => {
    it('fetches user profile', async () => {
      const profile = await profileApi.getProfile();
      
      expect(profile).toEqual({
        id: '1',
        email: 'test@example.com',
        fullName: 'Test User',
        phoneNumber: '+1234567890',
        role: 'PATIENT',
        profilePhotoUrl: 'https://example.com/photo.jpg',
      });
    });

    it('updates user profile', async () => {
      const updates = { fullName: 'Updated User' };
      const updatedProfile = await profileApi.updateProfile(updates);
      
      expect(updatedProfile.fullName).toBe('Updated User');
    });

    it('uploads profile photo', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await profileApi.uploadPhoto(file);
      
      expect(result.profilePhotoUrl).toBe('https://example.com/new-photo.jpg');
    });

    it('removes profile photo', async () => {
      await expect(profileApi.removePhoto()).resolves.not.toThrow();
    });
  });

  describe('Doctor API', () => {
    it('searches doctors', async () => {
      const doctors = await doctorApi.searchDoctors('cardiology');
      
      expect(doctors).toHaveLength(1);
      expect(doctors[0].specialization).toBe('Cardiology');
    });

    it('fetches doctor availability', async () => {
      const availability = await doctorApi.getAvailability();
      
      expect(availability).toHaveLength(1);
      expect(availability[0].dayOfWeek).toBe(1);
      expect(availability[0].startTime).toBe('09:00');
    });
  });

  describe('Patient API', () => {
    it('fetches preferred doctors', async () => {
      const preferredDoctors = await patientApi.getPreferredDoctors();
      
      expect(preferredDoctors).toHaveLength(1);
      expect(preferredDoctors[0].specialization).toBe('Dermatology');
    });

    it('adds preferred doctor', async () => {
      await expect(patientApi.addPreferredDoctor('1')).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      server.use(
        http.get('http://localhost:3001/api/profile', () => {
          return HttpResponse.json(
            {
              success: false,
              error: 'Profile not found',
            },
            { status: 404 }
          );
        })
      );

      await expect(profileApi.getProfile()).rejects.toThrow('Profile not found');
    });

    it('handles network errors', async () => {
      server.use(
        http.get('http://localhost:3001/api/profile', () => {
          return HttpResponse.error();
        })
      );

      await expect(profileApi.getProfile()).rejects.toThrow();
    });
  });
});