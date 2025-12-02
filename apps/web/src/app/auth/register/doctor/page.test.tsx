import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAuthContext } from '@/context/AuthContext'
import { authService } from '@/services/authService'
import DoctorRegisterPage from './page'

// Mock dependencies
jest.mock('@/context/AuthContext')
jest.mock('@/services/authService')
jest.mock('@/utils/tokenManager')
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn()
  })
}))

const mockUseAuthContext = useAuthContext as jest.MockedFunction<typeof useAuthContext>
const mockAuthService = authService as jest.Mocked<typeof authService>

describe('DoctorRegisterPage', () => {
  const mockSetUser = jest.fn()
  const mockSetAccessToken = jest.fn()

  beforeEach(() => {
    mockUseAuthContext.mockReturnValue({
      user: null,
      accessToken: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      setUser: mockSetUser,
      setAccessToken: mockSetAccessToken
    })

    mockAuthService.checkEmail.mockResolvedValue({ exists: false })
    mockAuthService.registerDoctor.mockResolvedValue({
      user: {
        id: 'user-123',
        email: 'doctor@test.com',
        fullName: 'Dr. Test',
        role: 'DOCTOR',
        emailVerified: false
      },
      accessToken: 'access-token'
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should render doctor registration form', () => {
    render(<DoctorRegisterPage />)

    expect(screen.getByText('Create Doctor Account')).toBeInTheDocument()
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('should validate required fields', async () => {
    const user = userEvent.setup()
    render(<DoctorRegisterPage />)

    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Full name is required')).toBeInTheDocument()
      expect(screen.getByText('Email is required')).toBeInTheDocument()
      expect(screen.getByText('Password is required')).toBeInTheDocument()
    })
  })

  it('should validate email format', async () => {
    const user = userEvent.setup()
    render(<DoctorRegisterPage />)

    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'invalid-email')
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument()
    })
  })

  it('should validate password strength', async () => {
    const user = userEvent.setup()
    render(<DoctorRegisterPage />)

    const passwordInput = screen.getByLabelText(/^password/i)
    await user.type(passwordInput, 'weak')
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Password must contain uppercase, lowercase, number, and special character/i)).toBeInTheDocument()
    })
  })

  it('should validate password confirmation', async () => {
    const user = userEvent.setup()
    render(<DoctorRegisterPage />)

    const passwordInput = screen.getByLabelText(/^password/i)
    const confirmInput = screen.getByLabelText(/confirm password/i)
    
    await user.type(passwordInput, 'SecurePass123!')
    await user.type(confirmInput, 'DifferentPass123!')
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })

  it('should check email availability on blur', async () => {
    const user = userEvent.setup()
    render(<DoctorRegisterPage />)

    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'doctor@test.com')
    await user.tab()

    await waitFor(() => {
      expect(mockAuthService.checkEmail).toHaveBeenCalledWith('doctor@test.com')
    })
  })

  it('should show error for existing email', async () => {
    mockAuthService.checkEmail.mockResolvedValue({ exists: true })
    const user = userEvent.setup()
    render(<DoctorRegisterPage />)

    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 'existing@test.com')
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText('This email is already registered')).toBeInTheDocument()
    })
  })

  it('should require terms acceptance', async () => {
    const user = userEvent.setup()
    render(<DoctorRegisterPage />)

    await user.type(screen.getByLabelText(/full name/i), 'Dr. Test')
    await user.type(screen.getByLabelText(/email/i), 'doctor@test.com')
    await user.type(screen.getByLabelText(/^password/i), 'SecurePass123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!')
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('You must accept the terms and conditions')).toBeInTheDocument()
    })
  })

  it('should successfully register doctor', async () => {
    const user = userEvent.setup()
    render(<DoctorRegisterPage />)

    // Fill form
    await user.type(screen.getByLabelText(/full name/i), 'Dr. Test')
    await user.type(screen.getByLabelText(/email/i), 'doctor@test.com')
    await user.type(screen.getByLabelText(/^password/i), 'SecurePass123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!')
    await user.click(screen.getByLabelText(/terms/i))
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockAuthService.registerDoctor).toHaveBeenCalledWith({
        fullName: 'Dr. Test',
        email: 'doctor@test.com',
        password: 'SecurePass123!'
      })
    })

    expect(mockSetUser).toHaveBeenCalled()
    expect(mockSetAccessToken).toHaveBeenCalledWith('access-token')
  })

  it('should show loading state during submission', async () => {
    mockAuthService.registerDoctor.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    const user = userEvent.setup()
    render(<DoctorRegisterPage />)

    // Fill form
    await user.type(screen.getByLabelText(/full name/i), 'Dr. Test')
    await user.type(screen.getByLabelText(/email/i), 'doctor@test.com')
    await user.type(screen.getByLabelText(/^password/i), 'SecurePass123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!')
    await user.click(screen.getByLabelText(/terms/i))
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    expect(screen.getByText('Creating Account...')).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('should handle registration errors', async () => {
    mockAuthService.registerDoctor.mockRejectedValue(
      new Error('Registration failed')
    )

    const user = userEvent.setup()
    render(<DoctorRegisterPage />)

    // Fill form
    await user.type(screen.getByLabelText(/full name/i), 'Dr. Test')
    await user.type(screen.getByLabelText(/email/i), 'doctor@test.com')
    await user.type(screen.getByLabelText(/^password/i), 'SecurePass123!')
    await user.type(screen.getByLabelText(/confirm password/i), 'SecurePass123!')
    await user.click(screen.getByLabelText(/terms/i))
    
    const submitButton = screen.getByRole('button', { name: /create account/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Registration failed. Please try again.')).toBeInTheDocument()
    })
  })
})