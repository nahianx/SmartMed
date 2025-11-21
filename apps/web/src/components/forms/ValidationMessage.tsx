interface ValidationMessageProps {
  message?: string
  type?: "error" | "warning" | "success" | "info"
  className?: string
}

export function ValidationMessage({
  message,
  type = "error",
  className = ""
}: ValidationMessageProps) {
  if (!message) return null

  const baseClasses = "text-xs mt-1"
  const typeClasses = {
    error: "text-red-500",
    warning: "text-amber-500",
    success: "text-emerald-500",
    info: "text-blue-500"
  }

  const icons = {
    error: "⚠️",
    warning: "⚠️",
    success: "✅",
    info: "ℹ️"
  }

  return (
    <p className={`${baseClasses} ${typeClasses[type]} ${className}`}>
      <span className="mr-1" role="img" aria-label={type}>
        {icons[type]}
      </span>
      {message}
    </p>
  )
}