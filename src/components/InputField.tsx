import { Eye, EyeOff, Check, X, Info } from 'lucide-react';

interface InputFieldProps {
  label?: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  showValidation?: boolean;
  isValid?: boolean;
  showPasswordToggle?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  tooltip?: string;
  hideLabel?: boolean;
}

export function InputField({
  label,
  type,
  value,
  onChange,
  error,
  placeholder,
  showValidation,
  isValid,
  showPasswordToggle,
  showPassword,
  onTogglePassword,
  tooltip,
  hideLabel,
}: InputFieldProps) {
  return (
    <div>
      {!hideLabel && label && (
        <div className="flex items-center gap-2 mb-2">
          <label className="text-gray-700">{label}</label>
          {tooltip && (
            <div className="group relative">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white rounded-lg z-10">
                {tooltip}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          } ${showPasswordToggle || showValidation ? 'pr-12' : ''}`}
        />
        
        {showPasswordToggle && onTogglePassword && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
        
        {showValidation && !showPasswordToggle && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isValid ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <X className="w-5 h-5 text-red-500" />
            )}
          </div>
        )}
      </div>
      {error && (
        <p className="text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
