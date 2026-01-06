'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { useAuthContext } from '../../../context/AuthContext'
import { GoogleSignInButton } from '../../../components/auth/GoogleSignInButton'

export default function LoginPage() {
  const { login, loading } = useAuthContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await login({ email, password, remember })
    } catch (err: any) {
      if (err.response?.data?.error === 'ACCOUNT_INACTIVE') {
        setError('Your account has been deactivated. Please contact support.')
      } else if (err.response?.data?.error === 'INVALID_CREDENTIALS') {
        setError('Invalid email or password.')
      } else {
        setError('Invalid email or password.')
      }
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card shadow-lg rounded-2xl p-8 border border-border">
        <h1 className="text-2xl font-semibold mb-2 text-center text-foreground">Login</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Access your SmartMed dashboard.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-invalid={!!error}
              aria-describedby={error ? 'login-error' : undefined}
              className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1 text-foreground"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-invalid={!!error}
              aria-describedby={error ? 'login-error' : undefined}
              className="w-full rounded-md border border-border bg-background text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <label className="inline-flex items-center gap-2 text-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span>Remember me</span>
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          {error && (
            <p id="login-error" role="alert" aria-live="assertive" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-blue-600 text-white py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <GoogleSignInButton />
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/auth" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </main>
  )
}
