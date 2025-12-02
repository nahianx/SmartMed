import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { InputField } from './InputField';
import { OAuthButton } from './OAuthButton';

interface LoginProps {
  onLogin: (email: string, password: string, role: 'patient' | 'doctor') => void;
  onNavigateToSignup: () => void;
  onBack: () => void;
  onGoogleOAuth: (role: 'patient' | 'doctor') => void;
  isLoading: boolean;
}

export function Login({ onLogin, onNavigateToSignup, onBack, onGoogleOAuth, isLoading }: LoginProps) {
  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!password.trim()) newErrors.password = 'Password is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onLogin(email, password, role);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
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
            <h1 className="text-gray-900 mb-2">Welcome back</h1>
            <p className="text-gray-600">Log in to your account</p>
          </div>

          {/* Role Toggle Pills */}
          <div className="flex gap-2 p-1 bg-gray-100 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => setRole('patient')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                role === 'patient'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Patient
            </button>
            <button
              type="button"
              onClick={() => setRole('doctor')}
              className={`flex-1 py-2 px-4 rounded-md transition-all ${
                role === 'doctor'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Doctor
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label="Email Address"
              type="email"
              value={email}
              onChange={(value) => {
                setEmail(value);
                if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
              }}
              error={errors.email}
              placeholder="your.email@example.com"
            />

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-gray-700">Password</label>
                <a href="#" className="text-blue-600 hover:text-blue-700 hover:underline">
                  Forgot password?
                </a>
              </div>
              <InputField
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                }}
                error={errors.password}
                placeholder="Enter your password"
                showPasswordToggle
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                hideLabel
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700">Remember me</span>
            </label>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-lg text-white transition-all ${
                role === 'patient'
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Logging in...' : 'Log In'}
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
              Don't have an account?{' '}
              <button
                onClick={onNavigateToSignup}
                className="text-blue-600 hover:text-blue-700 hover:underline"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
