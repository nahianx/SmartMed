interface PasswordStrengthMeterProps {
  strength: 'weak' | 'medium' | 'strong';
}

export function PasswordStrengthMeter({ strength }: PasswordStrengthMeterProps) {
  const getColor = () => {
    switch (strength) {
      case 'weak':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'strong':
        return 'bg-green-500';
    }
  };

  const getWidth = () => {
    switch (strength) {
      case 'weak':
        return 'w-1/3';
      case 'medium':
        return 'w-2/3';
      case 'strong':
        return 'w-full';
    }
  };

  const getLabel = () => {
    switch (strength) {
      case 'weak':
        return 'Weak';
      case 'medium':
        return 'Medium';
      case 'strong':
        return 'Strong';
    }
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Password strength:</span>
        <span className={`${
          strength === 'weak' ? 'text-red-600' :
          strength === 'medium' ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {getLabel()}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} ${getWidth()} transition-all duration-300`}
        />
      </div>
    </div>
  );
}
