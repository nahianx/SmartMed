import { useState } from 'react';
import { Calendar, FileText, Pill, MessageSquare, User, Settings, LogOut, Info } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { LogoutModal } from './LogoutModal';

interface PatientDashboardProps {
  user: {
    name: string;
    email: string;
    role: 'patient' | 'doctor';
  };
  onLogout: () => void;
}

export function PatientDashboard({ user, onLogout }: PatientDashboardProps) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showOnboardingTooltip, setShowOnboardingTooltip] = useState(true);

  const handleLogout = () => {
    setShowLogoutModal(false);
    onLogout();
  };

  const cards = [
    {
      icon: Calendar,
      title: 'Book Appointment',
      description: 'Schedule a visit with your healthcare provider',
      color: 'blue',
      action: () => console.log('Book appointment'),
    },
    {
      icon: Pill,
      title: 'My Prescriptions',
      description: 'View and refill your current medications',
      color: 'purple',
      action: () => console.log('View prescriptions'),
    },
    {
      icon: FileText,
      title: 'Health Records',
      description: 'Access your medical history and test results',
      color: 'green',
      action: () => console.log('View records'),
    },
    {
      icon: MessageSquare,
      title: 'Messages',
      description: 'Communicate with your care team',
      color: 'orange',
      action: () => console.log('View messages'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-blue-600">SmartMed</h1>
              <p className="text-gray-600">Patient Portal</p>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-gray-900">{user.name}</p>
                  <p className="text-gray-600">{user.email}</p>
                </div>
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4" />
                    My Profile
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-gray-700">
                    <Settings className="w-4 h-4" />
                    Settings
                  </button>
                  <hr className="my-1 border-gray-200" />
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-gray-900 mb-2">Welcome back, {user.name.split(' ')[0]}!</h2>
          <p className="text-gray-600">Here's what you can do today</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 relative">
          {cards.map((card, index) => (
            <div key={index} className="relative">
              <DashboardCard {...card} />
              {index === 0 && showOnboardingTooltip && (
                <div className="absolute -top-16 left-0 bg-blue-600 text-white p-3 rounded-lg shadow-lg z-10 max-w-xs">
                  <div className="flex items-start gap-2">
                    <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p>Get started by booking your first appointment</p>
                    </div>
                    <button
                      onClick={() => setShowOnboardingTooltip(false)}
                      className="text-white hover:text-gray-200"
                    >
                      ×
                    </button>
                  </div>
                  <div className="absolute -bottom-2 left-8 w-4 h-4 bg-blue-600 transform rotate-45"></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <p className="text-gray-600 mb-1">Upcoming Appointments</p>
            <p className="text-gray-900">0</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <p className="text-gray-600 mb-1">Active Prescriptions</p>
            <p className="text-gray-900">0</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <p className="text-gray-600 mb-1">Unread Messages</p>
            <p className="text-gray-900">0</p>
          </div>
        </div>
      </main>

      {showLogoutModal && (
        <LogoutModal
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
    </div>
  );
}
