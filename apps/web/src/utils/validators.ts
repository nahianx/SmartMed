export function validateEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateName(name: string): boolean {
  const trimmed = name.trim()
  if (trimmed.length < 2) return false
  const nameRegex = /^[A-Za-z\s-]+$/
  return nameRegex.test(trimmed)
}

export function validatePasswordBasic(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters.' }
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain an uppercase letter.' }
  if (!/[a-z]/.test(password)) return { valid: false, message: 'Password must contain a lowercase letter.' }
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain a number.' }
  if (!/[^A-Za-z0-9]/.test(password)) return { valid: false, message: 'Password must contain a special character.' }
  return { valid: true }
}
