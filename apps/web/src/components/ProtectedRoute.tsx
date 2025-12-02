"use client"

import { useEffect, ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useAuthContext } from "../context/AuthContext"

interface ProtectedRouteProps {
  children: ReactNode
  requireRole?: "DOCTOR" | "PATIENT" | "ADMIN" | "NURSE"
  requireAuth?: boolean
  redirectTo?: string
}

export function ProtectedRoute({ 
  children, 
  requireRole, 
  requireAuth = true,
  redirectTo = "/auth/login" 
}: ProtectedRouteProps) {
  const { user, loading } = useAuthContext()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // If auth is required but user is not logged in
      if (requireAuth && !user) {
        router.replace(redirectTo)
        return
      }

      // If specific role is required but user doesn't have it
      if (requireRole && user && user.role !== requireRole) {
        // Redirect to appropriate dashboard based on user's role
        if (user.role === "DOCTOR") {
          router.replace("/dashboard/doctor")
        } else if (user.role === "PATIENT") {
          router.replace("/dashboard/patient")
        } else {
          router.replace("/")
        }
        return
      }

      // If user is logged in but trying to access auth pages
      if (!requireAuth && user) {
        if (user.role === "DOCTOR") {
          router.replace("/dashboard/doctor")
        } else if (user.role === "PATIENT") {
          router.replace("/dashboard/patient")
        } else {
          router.replace("/")
        }
        return
      }
    }
  }, [user, loading, router, requireAuth, requireRole, redirectTo])

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if auth requirements aren't met
  if (requireAuth && !user) return null
  if (requireRole && user && user.role !== requireRole) return null
  if (!requireAuth && user) return null

  return <>{children}</>
}