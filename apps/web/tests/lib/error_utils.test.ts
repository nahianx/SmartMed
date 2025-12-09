import { handleApiError, showSuccess, showError } from '../../src/lib/error_utils'
import { AxiosError } from 'axios'

// Mock react-hot-toast
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
}

jest.mock('react-hot-toast', () => mockToast)

describe('Error Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear console.error mock
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('handleApiError', () => {
    it('handles Axios errors with response', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: { error: 'Validation failed', details: ['Invalid email'] }
        }
      } as AxiosError

      handleApiError(axiosError, 'Fallback message')

      expect(mockToast.error).toHaveBeenCalledWith('Validation failed')
      expect(console.error).toHaveBeenCalledWith('API Error:', axiosError)
    })

    it('handles Axios errors with string data', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: 'Internal server error'
        }
      } as AxiosError

      handleApiError(axiosError, 'Fallback message')

      expect(mockToast.error).toHaveBeenCalledWith('Internal server error')
    })

    it('handles Axios network errors', () => {
      const axiosError = {
        isAxiosError: true,
        code: 'NETWORK_ERROR',
        message: 'Network Error'
      } as AxiosError

      handleApiError(axiosError, 'Fallback message')

      expect(mockToast.error).toHaveBeenCalledWith(
        'Network error. Please check your connection and try again.'
      )
    })

    it('handles timeout errors', () => {
      const axiosError = {
        isAxiosError: true,
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded'
      } as AxiosError

      handleApiError(axiosError, 'Fallback message')

      expect(mockToast.error).toHaveBeenCalledWith(
        'Request timed out. Please try again.'
      )
    })

    it('handles 401 unauthorized errors', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { error: 'Unauthorized' }
        }
      } as AxiosError

      handleApiError(axiosError, 'Fallback message')

      expect(mockToast.error).toHaveBeenCalledWith(
        'Your session has expired. Please log in again.'
      )
    })

    it('handles 403 forbidden errors', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 403,
          data: { error: 'Forbidden' }
        }
      } as AxiosError

      handleApiError(axiosError, 'Fallback message')

      expect(mockToast.error).toHaveBeenCalledWith(
        'You do not have permission to perform this action.'
      )
    })

    it('handles 404 not found errors', () => {
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { error: 'Not Found' }
        }
      } as AxiosError

      handleApiError(axiosError, 'Fallback message')

      expect(mockToast.error).toHaveBeenCalledWith(
        'The requested resource was not found.'
      )
    })

    it('uses fallback message for generic errors', () => {
      const error = new Error('Something went wrong')

      handleApiError(error, 'Fallback message')

      expect(mockToast.error).toHaveBeenCalledWith('Fallback message')
    })

    it('uses generic message when no fallback provided', () => {
      const error = new Error('Something went wrong')

      handleApiError(error)

      expect(mockToast.error).toHaveBeenCalledWith(
        'An unexpected error occurred. Please try again.'
      )
    })
  })

  describe('showSuccess', () => {
    it('displays success toast', () => {
      showSuccess('Operation completed successfully')

      expect(mockToast.success).toHaveBeenCalledWith(
        'Operation completed successfully'
      )
    })
  })

  describe('showError', () => {
    it('displays error toast', () => {
      showError('Something went wrong')

      expect(mockToast.error).toHaveBeenCalledWith('Something went wrong')
    })
  })
})
