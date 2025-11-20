import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { InputField } from './InputField';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { OAuthButton } from './OAuthButton';

interface SignUpProps {
  role: 'patient' | 'doctor';
  onSignUp: (userData: any) => void;
  onNavigateToLogin: () => void;
  onBack: () => void;
  onGoogleOAuth: (role: 'patient' | 'doctor') => void;
  isLoading: boolean;
}

export function SignUp({ role, onSignUp, onNavigateToLogin, onBack, onGoogleOAuth, isLoading }: SignUpProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    license: '',
    specialization: '',
    affiliation: '',
    agreeToTerms: false,
    sendUpdates: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const calculatePasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 1) return 'weak';
    if (strength <= 3) return 'medium';
    return 'strong';
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least 1 uppercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain at least 1 number';
    if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least 1 special character';
    return '';
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Update password strength
    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!validateEmail(formData.email)) newErrors.email = 'Invalid email address';
    
    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (role === 'doctor') {
      if (!formData.license.trim()) newErrors.license = 'Medical license number is required';
      if (!formData.specialization) newErrors.specialization = 'Specialization is required';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the Terms of Service';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Store account for later login
    const accounts = JSON.parse(localStorage.getItem('smartmed_accounts') || '[]');
    accounts.push({ ...formData, role });
    localStorage.setItem('smartmed_accounts', JSON.stringify(accounts));

    onSignUp({
      name: formData.name,
      email: formData.email,
      role,
      ...(role === 'doctor' && {
        license: formData.license,
        specialization: formData.specialization,
        affiliation: formData.affiliation,
      }),
    });
  };

  const specializations = [
    'Cardiology',
    'Dermatology',
    'Emergency Medicine',
    'Family Medicine',
    'Internal Medicine',
    'Neurology',
    'Oncology',
    'Pediatrics',
    'Psychiatry',
    'Surgery',
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-gray-900 mb-2">
              Create your {role === 'patient' ? 'Patient' : 'Doctor'} account
            </h1>
            <p className="text-gray-600">Join SmartMed and get started</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label="Full Name"
              type="text"
              value={formData.name}
              onChange={(value) => handleChange('name', value)}
              error={errors.name}
              placeholder="Enter your full name"
            />

            <InputField
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(value) => handleChange('email', value)}
              error={errors.email}
              placeholder="your.email@example.com"
              showValidation={formData.email.length > 0}
              isValid={validateEmail(formData.email)}
            />

            <InputField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(value) => handleChange('password', value)}
              error={errors.password}
              placeholder="Create a strong password"
              showPasswordToggle
              showPassword={showPassword}
              onTogglePassword={() => setShowPassword(!showPassword)}
              tooltip="Min 8 characters, 1 uppercase, 1 number, 1 special char"
            />

            {formData.password && (
              <PasswordStrengthMeter strength={passwordStrength} />
            )}

            <InputField
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(value) => handleChange('confirmPassword', value)}
              error={errors.confirmPassword}
              placeholder="Re-enter your password"
              showPasswordToggle
              showPassword={showConfirmPassword}
              onTogglePassword={() => setShowConfirmPassword(!showConfirmPassword)}
              showValidation={formData.confirmPassword.length > 0}
              isValid={formData.password === formData.confirmPassword && formData.confirmPassword.length > 0}
            />

            {role === 'doctor' && (
              <>
                <InputField
                  label="Medical License Number"
                  type="text"
                  value={formData.license}
                  onChange={(value) => handleChange('license', value)}
                  error={errors.license}
                  placeholder="MD-XXXXXX"
                />

                <div>
                  <label className="block text-gray-700 mb-2">
                    Specialization <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.specialization}
                    onChange={(e) => handleChange('specialization', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.specialization ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select specialization</option>
                    {specializations.map(spec => (
                      <option key={spec} value={spec}>{spec}</option>
                    ))}
                  </select>
                  {errors.specialization && (
                    <p className="text-red-500 mt-1">{errors.specialization}</p>
                  )}
                </div>

                <InputField
                  label="Hospital/Clinic Affiliation"
                  type="text"
                  value={formData.affiliation}
                  onChange={(value) => handleChange('affiliation', value)}
                  placeholder="Optional"
                />
              </>
            )}

            <div className="space-y-3 pt-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={(e) => handleChange('agreeToTerms', e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">
                  I agree to the{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </a>
                </span>
              </label>
              {errors.agreeToTerms && (
                <p className="text-red-500">{errors.agreeToTerms}</p>
              )}

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.sendUpdates}
                  onChange={(e) => handleChange('sendUpdates', e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-gray-700">Send me updates and health tips</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg text-white transition-all ${
                role === 'patient'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-4 bg-white text-gray-500">OR</span>
              </div>
            </div>

            <div className="mt-6">
              <OAuthButton
                provider="google"
                onClick={() => onGoogleOAuth(role)}
                disabled={isLoading}
              />
              <p className="text-center text-gray-600 mt-3">
                We'll create/access your account securely using Google.
              </p>
            </div>
          </div>

          <div className="text-center mt-6">
            <p className="text-gray-600">
              Already have an account?{' '}
              <button
                onClick={onNavigateToLogin}
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                Log in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
