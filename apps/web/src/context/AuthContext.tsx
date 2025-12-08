'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { tokenManager } from '../utils/tokenManager'
import { authService } from '../services/authService'

export type Role = 'DOCTOR' | 'PATIENT' | 'ADMIN' | 'NURSE'

export interface AuthUser {
  id: string
  email: string
  fullName: string
  role: Role
  emailVerified: boolean
}

interface AuthContextValue {
  user: AuthUser | null
  accessToken: string | null
  loading: boolean
  login: (data: {
    email: string
    password: string
    remember: boolean
  }) => Promise<void>
  logout: () => Promise<void>
  setUser: (user: AuthUser | null) => void
  setAccessToken: (token: string | null) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const stored = tokenManager.getAccessToken()
    if (stored) {
      setAccessToken(stored)
      authService
        .me(stored)
        .then((u) => setUser(u))
        .catch(() => {
          tokenManager.clear()
          setUser(null)
          setAccessToken(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async ({
    email,
    password,
    remember,
  }: {
    email: string
    password: string
    remember: boolean
  }) => {
    setLoading(true)
    try {
      const { user: loggedUser, accessToken: token } = await authService.login({
        email,
        password,
      })
      setUser(loggedUser)
      setAccessToken(token)
      tokenManager.setAccessToken(token, remember)
      if (loggedUser.role === 'DOCTOR') router.push('/dashboard/doctor')
      else if (loggedUser.role === 'PATIENT') router.push('/dashboard/patient')
      else if (loggedUser.role === 'ADMIN') router.push('/dashboard/admin')
      else router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } finally {
      tokenManager.clear()
      setUser(null)
      setAccessToken(null)
      router.push('/auth/login')
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        login,
        logout,
        setUser,
        setAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
