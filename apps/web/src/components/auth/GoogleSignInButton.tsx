"use client"

import { useEffect, useRef } from "react"
import { authService } from "../../services/authService"
import { tokenManager } from "../../utils/tokenManager"
import { useRouter } from "next/navigation"
import { useAuthContext } from "../../context/AuthContext"

declare global {
  interface Window {
    google?: any
  }
}

interface Props {
  role?: "DOCTOR" | "PATIENT"
}

export function GoogleSignInButton({ role }: Props) {
  const buttonRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()
  const { setUser, setAccessToken } = useAuthContext()

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) return

    const initialize = () => {
      if (!window.google || !buttonRef.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          try {
            const { user, accessToken } = await authService.googleSignIn(
              response.credential,
              role,
            )
            setUser(user)
            setAccessToken(accessToken)
            tokenManager.setAccessToken(accessToken, true)
            if (user.role === "DOCTOR") router.push("/dashboard/doctor")
            else if (user.role === "PATIENT") router.push("/dashboard/patient")
            else router.push("/")
          } catch (e) {
            console.error("Google sign-in failed", e)
          }
        },
      })
      window.google.accounts.id.renderButton(buttonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "pill",
      })
    }

    if (!window.google) {
      const script = document.createElement("script")
      script.src = "https://accounts.google.com/gsi/client"
      script.async = true
      script.defer = true
      script.onload = initialize
      document.body.appendChild(script)
      return () => {
        document.body.removeChild(script)
      }
    }

    initialize()
  }, [role, router, setUser, setAccessToken])

  return (
    <div className="mt-4">
      <div ref={buttonRef} aria-label="Sign in with Google" />
    </div>
  )
}
