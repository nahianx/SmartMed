import { useState } from 'react';
import { Calendar, Search, Pill, FileText, User, Settings, LogOut } from 'lucide-react';
import { DashboardCard } from './DashboardCard';
import { LogoutModal } from './LogoutModal';

interface DoctorDashboardProps {
  user: {
    name: string;
    email: string;
    role: 'patient' | 'doctor';
    license?: string;
    specialization?: string;
    affiliation?: string;
  };
  onLogout: () => void;
}

export function DoctorDashboard({ user, onLogout }: DoctorDashboardProps) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(false);
    onLogout();
  };

  const cards = [
    {
      icon: Calendar,
      title: "Today's Appointments",
      description: 'View and manage your scheduled consultations',
      color: 'purple',
      action: () => console.log('View appointments'),
    },
    {
      icon: Search,
      title: 'Patient Search',
      description: 'Find and access patient medical records',
      color: 'blue',
      action: () => console.log('Search patients'),
    },
    {
      icon: Pill,
      title: 'Prescribe Medication',
      description: 'Create and send prescriptions to patients',
      color: 'green',
      action: () => console.log('Prescribe'),
    },
    {
      icon: FileText,
      title: 'Consultation History',
      description: 'Review past appointments and notes',
      color: 'orange',
      action: () => console.log('View history'),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-purple-600">SmartMed</h1>
              <p className="text-gray-600">Doctor Portal</p>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-gray-900">{user.name}</p>
                  <p className="text-gray-600">{user.specialization || user.email}</p>
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
          <h2 className="text-gray-900 mb-2">Welcome, {user.name}!</h2>
          <div className="flex flex-wrap gap-4 text-gray-600">
            {user.license && (
              <span className="flex items-center gap-1">
                License: <span className="text-gray-900">{user.license}</span>
              </span>
            )}
            {user.specialization && (
              <span className="flex items-center gap-1">
                Specialization: <span className="text-gray-900">{user.specialization}</span>
              </span>
            )}
            {user.affiliation && (
              <span className="flex items-center gap-1">
                Affiliation: <span className="text-gray-900">{user.affiliation}</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
          {cards.map((card, index) => (
            <DashboardCard key={index} {...card} />
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <p className="text-gray-600 mb-1">Today's Patients</p>
            <p className="text-gray-900">0</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <p className="text-gray-600 mb-1">Pending Prescriptions</p>
            <p className="text-gray-900">0</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <p className="text-gray-600 mb-1">This Week</p>
            <p className="text-gray-900">0 appointments</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <p className="text-gray-600 mb-1">Patient Messages</p>
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
