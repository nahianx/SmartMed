# Profile Management Migration Guide

## Quick Start for Developers

### Prerequisites
1. Ensure the backend API is running on `http://localhost:1080`
2. Install dependencies: `npm install` in the root directory
3. Start the development server: `npm run dev`

### Key Files to Understand

#### 1. Authentication Store (`apps/web/src/store/auth.ts`)
```typescript
// Usage in components
const { user, isAuthenticated, login, logout } = useAuthStore();
const isDoctor = useIsDoctor();
const isPatient = useIsPatient();
```

#### 2. API Services (`apps/web/src/services/api.ts`)
```typescript
// Available services
import { profileApi, doctorApi, patientApi } from '../services/api';

// Example usage
const profile = await profileApi.getProfile();
const doctors = await doctorApi.searchDoctors('cardiology');
```

#### 3. React Query Hooks (`apps/web/src/hooks/useProfile.ts`)
```typescript
// Use in components
const { data: profile, isLoading } = useProfile();
const updateProfile = useUpdateProfile();
const { data: availability } = useDoctorAvailability();
```

### Adding New Profile Fields

#### 1. Update Types
```typescript
// In packages/types/src/index.ts
export interface User {
  // Add new field
  newField?: string;
}
```

#### 2. Update API Service
```typescript
// In apps/web/src/services/api.ts
export const profileApi = {
  updateProfile: (data: Partial<User>) => 
    api.put('/profile', data).then(response => response.data.data),
};
```

#### 3. Update Component
```typescript
// In ProfileSection.tsx
<Input
  label="New Field"
  value={formData.newField || ''}
  onChange={(e) => setFormData({...formData, newField: e.target.value})}
/>
```

### Testing New Features

#### 1. Unit Tests
```bash
# Run specific test file
npx jest ProfileSection.test.tsx

# Run all tests
npm test
```

#### 2. Integration Testing
```typescript
// Mock API calls in tests
jest.mock('../services/api', () => ({
  profileApi: {
    updateProfile: jest.fn().mockResolvedValue(mockProfile),
  },
}));
```

### Common Patterns

#### 1. Loading States
```typescript
const { data, isLoading, error } = useProfile();

if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
return <ProfileContent data={data} />;
```

#### 2. Form Validation
```typescript
const [errors, setErrors] = useState<Record<string, string>>({});

const validateField = (name: string, value: string) => {
  // Add validation logic
  if (!value) return 'Field is required';
  return '';
};
```

#### 3. Role-based Rendering
```typescript
const isDoctor = useIsDoctor();
const isPatient = useIsPatient();

return (
  <div>
    {isDoctor && <DoctorSpecificComponent />}
    {isPatient && <PatientSpecificComponent />}
  </div>
);
```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Backend APIs accessible
- [ ] Authentication endpoints working
- [ ] Image upload service configured
- [ ] Error handling tested
- [ ] Performance optimization applied
- [ ] TypeScript compilation successful
- [ ] Tests passing

### Troubleshooting Quick Fixes

#### Authentication Issues
```typescript
// Check auth store state
console.log(useAuthStore.getState());

// Clear auth state
useAuthStore.getState().logout();
```

#### API Connection Issues
```typescript
// Check API configuration
console.log(process.env.NEXT_PUBLIC_API_URL);

// Test API endpoint manually
curl http://localhost:3001/api/profile
```

#### TypeScript Errors
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Fix common import issues
import { Component } from '@smartmed/ui';
```

This guide should help new developers quickly understand and work with the profile management feature.