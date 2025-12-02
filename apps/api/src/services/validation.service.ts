export class ValidationService {
  static validateEmail(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('INVALID_EMAIL')
    }
  }

  static validateName(name: string) {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      throw new Error('INVALID_NAME')
    }
    const nameRegex = /^[A-Za-z\s-]+$/
    if (!nameRegex.test(trimmed)) {
      throw new Error('INVALID_NAME')
    }
  }

  static validatePassword(password: string) {
    if (password.length < 8) {
      throw new Error('WEAK_PASSWORD')
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error('WEAK_PASSWORD')
    }
    if (!/[a-z]/.test(password)) {
      throw new Error('WEAK_PASSWORD')
    }
    if (!/[0-9]/.test(password)) {
      throw new Error('WEAK_PASSWORD')
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      throw new Error('WEAK_PASSWORD')
    }
  }

  static getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++

    if (score <= 2) return 'weak'
    if (score <= 4) return 'medium'
    return 'strong'
  }
}
