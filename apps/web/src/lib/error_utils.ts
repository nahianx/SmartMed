import toast from 'react-hot-toast'
import { AxiosError } from 'axios'

interface ErrorResponse {
  error?: string
  message?: string
}

export function handleApiError(error: unknown, defaultMessage = 'An unexpected error occurred') {
  console.error('API Error:', error)

  let message = defaultMessage

  if (error instanceof AxiosError) {
    const responseData = error.response?.data as ErrorResponse | undefined
    
    // Use server error message if available
    if (responseData?.error) {
      message = responseData.error
    } else if (responseData?.message) {
      message = responseData.message
    } else if (error.response?.status) {
      // Provide user-friendly status messages
      switch (error.response.status) {
        case 400:
          message = 'Invalid request. Please check your input.'
          break
        case 401:
          message = 'You are not authorized. Please sign in again.'
          break
        case 403:
          message = 'You do not have permission to perform this action.'
          break
        case 404:
          message = 'The requested resource was not found.'
          break
        case 409:
          message = 'This action conflicts with existing data.'
          break
        case 413:
          message = 'File size is too large. Please choose a smaller file.'
          break
        case 429:
          message = 'Too many requests. Please wait a moment and try again.'
          break
        case 500:
          message = 'Server error. Please try again later.'
          break
        case 503:
          message = 'Service temporarily unavailable. Please try again later.'
          break
        default:
          message = `Request failed (${error.response.status}). Please try again.`
      }
    } else if (error.code === 'NETWORK_ERROR') {
      message = 'Network error. Please check your connection and try again.'
    } else if (error.code === 'TIMEOUT') {
      message = 'Request timed out. Please try again.'
    }
  } else if (error instanceof Error) {
    message = error.message
  }

  toast.error(message)
  return message
}

export function showSuccess(message: string) {
  toast.success(message)
}

export function showInfo(message: string) {
  toast(message, {
    icon: 'ℹ️',
  })
}

export function showWarning(message: string) {
  toast(message, {
    icon: '⚠️',
    style: {
      background: '#fef3c7',
      color: '#92400e',
      border: '1px solid #fbbf24',
    },
  })
}