import { User, Stethoscope } from 'lucide-react';

interface RoleSelectionProps {
  onRoleSelect: (role: 'patient' | 'doctor') => void;
  onNavigateToLogin: () => void;
}

export function RoleSelection({ onRoleSelect, onNavigateToLogin }: RoleSelectionProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-blue-600 mb-2">Welcome to SmartMed</h1>
          <p className="text-gray-600">Choose how you'd like to continue</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => onRoleSelect('patient')}
            className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-500 hover:scale-105"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-500 transition-colors">
                <User className="w-10 h-10 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <h2 className="text-gray-900 mb-2">Continue as Patient</h2>
              <p className="text-gray-600">Book appointments, access your health records, and manage prescriptions</p>
            </div>
          </button>

          <button
            onClick={() => onRoleSelect('doctor')}
            className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-purple-500 hover:scale-105"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-500 transition-colors">
                <Stethoscope className="w-10 h-10 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <h2 className="text-gray-900 mb-2">Continue as Doctor</h2>
              <p className="text-gray-600">Manage appointments, prescribe medications, and access patient records</p>
            </div>
          </button>
        </div>

        <div className="text-center">
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
  );
}
