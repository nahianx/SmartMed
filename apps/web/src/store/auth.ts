// Authentication store using Zustand
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, UserRole } from '@smartmed/types'

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (updates: Partial<User>) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      
      login: (user: User, token: string) => {
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false
        })
      },
      
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        })
      },
      
      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...updates }
          })
        }
      },
      
      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      }
    }),
    {
      name: 'smartmed-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

// Helper hooks for role-based access
export const useIsDoctor = () => {
  const user = useAuthStore(state => state.user)
  return user?.role === UserRole.DOCTOR
}

export const useIsPatient = () => {
  const user = useAuthStore(state => state.user)
  return user?.role === UserRole.PATIENT
}

export const useRequireAuth = () => {
  const { isAuthenticated, user, isLoading } = useAuthStore()
  
  if (isLoading) {
    return { isLoading: true, isAuthenticated: false, user: null }
  }
  
  return { isLoading: false, isAuthenticated, user }
}