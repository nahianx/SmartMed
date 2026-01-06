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
        // Redirect to role-appropriate profile/dashboard
        if (user.role === "DOCTOR") {
          router.replace("/profile?role=DOCTOR")
        } else if (user.role === "PATIENT") {
          router.replace("/profile?role=PATIENT")
        } else if (user.role === "ADMIN") {
          router.replace("/dashboard/admin")
        } else {
          router.replace("/")
        }
        return
      }

      // If user is logged in but trying to access auth pages
      if (!requireAuth && user) {
        if (user.role === "DOCTOR") {
          router.replace("/profile?role=DOCTOR")
        } else if (user.role === "PATIENT") {
          router.replace("/profile?role=PATIENT")
        } else if (user.role === "ADMIN") {
          router.replace("/dashboard/admin")
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Loading...</p>
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
