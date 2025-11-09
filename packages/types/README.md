# @smartmed/types

Shared TypeScript types and interfaces for SmartMed applications.

## Usage

Import types in your application:

```typescript
import type { Patient, Doctor, Appointment } from '@smartmed/types'

const patient: Patient = {
  id: '123',
  userId: '456',
  firstName: 'John',
  lastName: 'Doe',
  // ... other fields
}
```

## Available Types

### User Types

- `User` - User account
- `UserRole` - Enum for user roles (ADMIN, DOCTOR, PATIENT, NURSE)

### Patient Types

- `Patient` - Patient profile and medical information

### Doctor Types

- `Doctor` - Doctor profile and availability
- `TimeSlot` - Doctor availability time slots

### Appointment Types

- `Appointment` - Appointment details
- `AppointmentStatus` - Enum for appointment status

### Prescription Types

- `Prescription` - Prescription details
- `Medication` - Medication information

### API Types

- `ApiResponse<T>` - Standard API response wrapper
- `PaginatedResponse<T>` - Paginated API response

## Type Safety

All types are fully typed with TypeScript for maximum type safety across the monorepo.
