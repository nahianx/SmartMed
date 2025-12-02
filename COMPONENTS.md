# SmartMed Components Documentation

## Overview

This document provides comprehensive documentation for all components in the SmartMed authentication system, including their props, usage examples, and implementation details.

## Core Authentication Components

### AuthContext (`apps/web/src/context/AuthContext.tsx`)

Provides global authentication state for the Next.js frontend.

**Props**
- Wraps the entire app in `app/layout.tsx` – no external props.

**Context Interface:**
```typescript
interface AuthContextValue {
  user: AuthUser | null
  accessToken: string | null
  loading: boolean
  login: (data: { email: string; password: string; remember: boolean }) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: AuthUser | null) => void
  setAccessToken: (token: string | null) => void
}

interface AuthUser {
  id: string
  email: string
  fullName: string
  role: Role
  emailVerified: boolean
}
```

**Features:**
- Automatic token refresh handling
- Persistent authentication state
- Role-based access control
- Loading state management
- Secure logout with token cleanup

---

### GoogleSignInButton (`apps/web/src/components/auth/GoogleSignInButton.tsx`)

Renders the Google Identity Services button and wires it to the backend.

**Props:**
```typescript
interface Props {
  role?: "DOCTOR" | "PATIENT"
}
```

**Features:**
- Google Identity Services integration
- Role-specific account creation
- Automatic token handling
- Error handling and loading states
- CSRF protection integration

**Behavior:**
- Loads `https://accounts.google.com/gsi/client`
- Initializes Google client with `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- On success, calls `authService.googleSignIn(idToken, role)`
- Saves access token via `tokenManager` and updates `AuthContext`
- Redirects by role to `/dashboard/doctor` or `/dashboard/patient`

**Usage:**
```tsx
import { GoogleSignInButton } from '../components/auth/GoogleSignInButton'

function RegisterPage() {
  return (
    <div>
      {/* Other form elements */}
      <div className="divider">or</div>
      <GoogleSignInButton role="DOCTOR" />
    </div>
  )
}
```

---

## Form Components

### FormInput (`apps/web/src/components/forms/FormInput.tsx`)

Enhanced input component with validation and error display.

**Props:**
```typescript
interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}
```

**Features:**
- Built-in label and error display
- Validation state styling
- Accessibility support with ARIA labels
- Forward ref support
- Consistent styling across forms

**Usage:**
```tsx
import { FormInput } from '../components/forms/FormInput'

function ContactForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  return (
    <FormInput
      id="email"
      label="Email Address"
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      error={error}
      hint="We'll never share your email"
      required
    />
  )
}
```

---

### PasswordInput (`apps/web/src/components/forms/PasswordInput.tsx`)

Enhanced password input with visibility toggle and strength indicator.

**Props:**
```typescript
interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string
  error?: string
  showStrength?: boolean
}
```

**Features:**
- Show/hide password toggle
- Eye icon visual indicator
- Optional strength meter integration
- Accessibility support
- Consistent error handling

---

### LoadingButton (`apps/web/src/components/forms/LoadingButton.tsx`)

Button component with loading states for async operations.

**Props:**
```typescript
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  loadingText?: string
  variant?: "primary" | "secondary" | "danger"
  size?: "sm" | "md" | "lg"
}
```

**Features:**
- Loading spinner animation
- Customizable loading text
- Multiple variants and sizes
- Automatic disable during loading
- Accessibility support

---

### ValidationMessage (`apps/web/src/components/forms/ValidationMessage.tsx`)

Consistent validation message display component.

**Props:**
```typescript
interface ValidationMessageProps {
  message?: string
  type?: "error" | "warning" | "success" | "info"
  className?: string
}
```

**Features:**
- Color-coded message types
- Icon integration
- Conditional rendering
- Accessibility support

---

## Legacy Root Components (src/components/)

### Login (`src/components/Login.tsx`)

Main login component with role selection and OAuth support.

**Props:**
```typescript
interface LoginProps {
  onLogin: (email: string, password: string, role: 'patient' | 'doctor') => void
  onNavigateToSignup: () => void
  onBack: () => void
  onGoogleOAuth: (role: 'patient' | 'doctor') => void
  isLoading: boolean
}
```

**Features:**
- Role-based login (Patient/Doctor)
- Form validation with real-time feedback
- Google OAuth integration
- Remember me functionality
- Password visibility toggle

---

### SignUp (`src/components/SignUp.tsx`)

Universal signup component that handles both doctor and patient registration.

**Props:**
```typescript
interface SignUpProps {
  onSignup: (userData: RegisterData, role: 'patient' | 'doctor') => void
  onNavigateToLogin: () => void
  onBack: () => void
  onGoogleOAuth: (role: 'patient' | 'doctor') => void
  isLoading: boolean
}
```

---

### PasswordStrengthMeter (`src/components/PasswordStrengthMeter.tsx`)

Real-time password strength indicator with visual feedback.

**Props:**
```typescript
interface PasswordStrengthMeterProps {
  password: string
  className?: string
}
```

**Features:**
- Real-time strength calculation
- Visual strength indicator (weak/medium/strong)
- Color-coded feedback
- Requirements checklist

---

### RoleSelection (`src/components/RoleSelection.tsx`)

Role selection component for login and registration flows.

**Props:**
```typescript
interface RoleSelectionProps {
  onSelectRole: (role: 'doctor' | 'patient') => void
  selectedRole?: 'doctor' | 'patient'
  className?: string
}
```

---

## Utility Components

### ProtectedRoute (`apps/web/src/components/ProtectedRoute.tsx`)

Route protection component with role-based access control.

**Props:**
```typescript
interface ProtectedRouteProps {
  children: ReactNode
  requireRole?: "DOCTOR" | "PATIENT" | "ADMIN" | "NURSE"
  requireAuth?: boolean
  redirectTo?: string
}
```

**Features:**
- Authentication requirement enforcement
- Role-based access control
- Automatic redirects
- Loading state handling
- Unauthorized access prevention

**Usage:**
```tsx
import { ProtectedRoute } from '../components/ProtectedRoute'

function DoctorDashboard() {
  return (
    <ProtectedRoute requireRole="DOCTOR" redirectTo="/auth/login">
      <DashboardContent />
    </ProtectedRoute>
  )
}
```

---

## Authentication Pages

### `/auth` (Landing Page)
- CTA cards for "Sign up as Doctor" and "Sign up as Patient"
- Link to `/auth/login`
- Role-based navigation

### `/auth/login`
- Email/password form with remember-me and "Forgot password?" link
- Uses `useAuthContext().login`
- Renders `<GoogleSignInButton />`
- Client-side validation
- Error handling with user feedback

### `/auth/register/doctor` and `/auth/register/patient`
- Full name, email, password, confirm password, terms checkbox
- Password strength indicator (`getPasswordStrength`)
- Client-side validation using `validators.ts`
- Duplicate email check via `authService.checkEmail`
- `<GoogleSignInButton role="DOCTOR" | "PATIENT" />`
- Role-specific form styling and messaging

### `/auth/forgot-password`
- Email-only form calling `authService.requestPasswordReset`
- Rate limiting protection
- Confirmation message after submission
- Clear user feedback

### `/auth/reset-password/[token]`
- Token validation on page load
- New password and confirm password fields
- Password strength validation
- Calls `authService.completePasswordReset(token, newPassword)`
- Success/error handling

### `/auth/verify-email/[token]`
- Calls `authService.verifyEmail(token)` on mount
- Loading, success, or error state display
- CTA to login after successful verification
- Resend verification option

---

## Dashboard Components

### `/dashboard/doctor`
- Uses `useAuthContext` to guard access (`role === 'DOCTOR'`)
- Fetches `/api/dashboard/doctor` via `apiClient`
- Doctor-specific features and layout
- Performance metrics and patient overview

### `/dashboard/patient`
- Uses `useAuthContext` to guard access (`role === 'PATIENT'`)
- Fetches `/api/dashboard/patient` via `apiClient`
- Patient-focused health information
- Appointment and medication management

---

## Custom Hooks

### useAuth()

Access authentication context with type safety.

```typescript
function useAuth() {
  const context = useAuthContext()
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

### useLogin() (`apps/web/src/hooks/useLogin.ts`)

Login operation hook with state management.

**Returns:**
```typescript
{
  login: (data: LoginData) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
  error: string | null
  setError: (error: string | null) => void
}
```

### useRegister() (`apps/web/src/hooks/useRegister.ts`)

Registration operation hook for both user types.

### useFormValidation() (`apps/web/src/hooks/useFormValidation.ts`)

Comprehensive form validation hook with real-time feedback.

### usePasswordReset() (`apps/web/src/hooks/usePasswordReset.ts`)

Password reset flow hook with complete state management.

---

## Styling Guidelines

### Component CSS Classes

#### Form Controls
```css
.input-base {
  @apply w-full rounded-md border border-slate-300 px-3 py-2 text-sm;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

.input-error {
  @apply border-red-500 focus:ring-red-500;
}
```

#### Buttons
```css
.btn-primary {
  @apply bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-md;
  @apply focus:outline-none focus:ring-2 focus:ring-blue-500;
}
```

### Accessibility Features
- ARIA labels for all form controls
- Keyboard navigation support
- Screen reader compatibility
- Color contrast compliance (WCAG 2.1 AA)
- Focus indicators for all interactive elements

---

## Testing Components

### Unit Test Example
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { Login } from '../Login'

describe('Login Component', () => {
  test('renders login form', () => {
    render(<Login {...mockProps} />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })
})
```

### Integration Testing
- Component interaction testing
- Form validation testing
- Authentication flow testing
- Error handling verification

---

This documentation provides comprehensive guidance for implementing, testing, and maintaining all SmartMed authentication components.
