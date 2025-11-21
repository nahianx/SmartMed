import { forwardRef } from "react"

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, hint, className = "", ...props }, ref) => {
    return (
      <div>
        {label && (
          <label className="block text-sm font-medium mb-1" htmlFor={props.id}>
            {label}
          </label>
        )}
        <input
          {...props}
          ref={ref}
          className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? "border-red-500" : "border-slate-300"
          } ${className}`}
        />
        {hint && !error && <p className="text-slate-500 text-xs mt-1">{hint}</p>}
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    )
  }
)

FormInput.displayName = "FormInput"