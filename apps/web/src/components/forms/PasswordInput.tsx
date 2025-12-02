import { useState, forwardRef } from "react"
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline"

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string
  error?: string
  showStrength?: boolean
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, showStrength, className = "", ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    return (
      <div>
        {label && (
          <label className="block text-sm font-medium mb-1" htmlFor={props.id}>
            {label}
          </label>
        )}
        <div className="relative">
          <input
            {...props}
            ref={ref}
            type={showPassword ? "text" : "password"}
            className={`w-full rounded-md border px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? "border-red-500" : "border-slate-300"
            } ${className}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? (
              <EyeSlashIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
        </div>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    )
  }
)

PasswordInput.displayName = "PasswordInput"