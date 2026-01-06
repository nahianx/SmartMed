'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Bell, 
  User, 
  LogOut, 
  Settings, 
  ChevronDown,
  Menu,
  X
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage, Button } from '@smartmed/ui'
import { useAuthStore } from '@/store/auth'
import { UserRole } from '@smartmed/types'
import { resolveProfilePhotoUrl } from '@/utils/apiBase'

interface DashboardHeaderProps {
  onMenuClick?: () => void
  showMenuButton?: boolean
  onNotificationsClick?: () => void
  hasUnreadNotifications?: boolean
  children?: React.ReactNode
}

// Helper to get user initials
function getUserInitials(user: { fullName?: string; email?: string } | null): string {
  if (!user) return 'U'
  if (user.fullName) {
    const parts = user.fullName.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return user.fullName[0].toUpperCase()
  }
  if (user.email) return user.email[0].toUpperCase()
  return 'U'
}

// Helper to get first name from fullName
function getFirstName(fullName?: string): string {
  if (!fullName) return ''
  return fullName.split(' ')[0]
}

// Helper to get dashboard path based on role
function getDashboardPath(role?: UserRole): string {
  switch (role) {
    case UserRole.DOCTOR:
      return '/dashboard/doctor'
    case UserRole.ADMIN:
      return '/dashboard/admin'
    case UserRole.PATIENT:
    default:
      return '/dashboard/patient'
  }
}

// SmartMed Logo Component
export function SmartMedLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { wrapper: 'h-8 w-8', icon: 18 },
    md: { wrapper: 'h-9 w-9', icon: 20 },
    lg: { wrapper: 'h-10 w-10', icon: 22 },
  }
  const s = sizes[size]
  
  return (
    <div className={`flex ${s.wrapper} items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm`}>
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    </div>
  )
}

export function DashboardHeader({
  onMenuClick,
  showMenuButton = false,
  onNotificationsClick,
  hasUnreadNotifications,
  children,
}: DashboardHeaderProps) {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  const initials = getUserInitials(user)
  const dashboardPath = getDashboardPath(user?.role as UserRole)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        {/* Logo - clickable to dashboard */}
        <button
          onClick={() => router.push(dashboardPath)}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg p-1 -ml-1"
          aria-label="Go to dashboard"
        >
          <SmartMedLogo size="md" />
          <span className="font-semibold text-lg tracking-tight hidden sm:inline">SmartMed</span>
        </button>

        {/* Center content slot */}
        <div className="flex-1 flex items-center justify-center">
          {children}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          {onNotificationsClick && (
            <button
              type="button"
              className="relative inline-flex items-center justify-center rounded-full p-2 text-muted-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/50 transition-colors"
              aria-label="Notifications"
              onClick={onNotificationsClick}
            >
              <Bell className="h-5 w-5" />
              {hasUnreadNotifications && (
                <span className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              )}
              <span className="sr-only">Notifications</span>
            </button>
          )}

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 rounded-full p-1 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/50 transition-colors"
              aria-expanded={showUserMenu ? 'true' : 'false'}
              aria-haspopup="true"
            >
              <Avatar className="h-9 w-9 border-2 border-transparent hover:border-primary/20 transition-colors">
                {user?.profilePhotoUrl ? (
                  <img 
                    src={resolveProfilePhotoUrl(user.profilePhotoUrl)} 
                    alt={user?.fullName || 'User'} 
                    className="aspect-square h-full w-full object-cover"
                    onError={(e) => {
                      // Hide broken image and show fallback
                      (e.target as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : null}
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className={`h-4 w-4 text-muted-foreground hidden sm:block transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border bg-card shadow-lg ring-1 ring-black/5 focus:outline-none animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                {/* User Info */}
                <div className="px-4 py-3 border-b">
                  <p className="text-sm font-medium truncate">
                    {user?.fullName || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      router.push('/profile')
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    View Profile
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      router.push('/profile?tab=settings')
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    Settings
                  </button>
                </div>

                {/* Logout */}
                <div className="border-t py-1">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
