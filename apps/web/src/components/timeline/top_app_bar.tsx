import { Search, Menu, Bell, Upload } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage, Input, Button } from '@smartmed/ui'

interface TopAppBarProps {
  onMenuClick: () => void
  showMenuButton?: boolean
  onNotificationsClick?: () => void
  hasUnreadNotifications?: boolean
  onUploadClick?: () => void
  uploadDisabled?: boolean
  searchValue?: string
  onSearchChange?: (value: string) => void
  uploading?: boolean
}

export function TopAppBar({
  onMenuClick,
  showMenuButton = false,
  onNotificationsClick,
  hasUnreadNotifications,
  onUploadClick,
  uploadDisabled,
  searchValue = '',
  onSearchChange,
  uploading = false,
}: TopAppBarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="flex h-16 items-center gap-4 px-4">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
            aria-label="Open filters"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-semibold">SmartMed</span>
        </div>

        <div className="relative ml-auto flex-1 max-w-md hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="search"
            placeholder="Search records, doctors, medications..."
            className="pl-10"
            aria-label="Search"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="hidden md:inline-flex"
          onClick={onUploadClick}
          disabled={uploadDisabled || uploading}
        >
          {uploading ? (
            <svg
              className="h-4 w-4 mr-2 animate-spin text-gray-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" className="opacity-25" />
              <path d="M12 2a10 10 0 0 1 10 10" className="opacity-75" />
            </svg>
          ) : (
            <Upload className="h-4 w-4 mr-1" />
          )}
          {uploading ? 'Uploading...' : 'Upload report'}
        </Button>

        <button
          type="button"
          className="relative inline-flex items-center justify-center rounded-full p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-ring/50"
          aria-label="Notifications"
          onClick={onNotificationsClick}
        >
          <Bell className="h-5 w-5" />
          {hasUnreadNotifications && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          )}
          <span className="sr-only">Notifications</span>
        </button>

        <Avatar className="h-9 w-9">
          <AvatarImage src="" alt="User" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}