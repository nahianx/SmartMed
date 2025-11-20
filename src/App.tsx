import { useState, useEffect } from 'react';
import { RoleSelection } from './components/RoleSelection';
import { SignUp } from './components/SignUp';
import { Login } from './components/Login';
import { PatientDashboard } from './components/PatientDashboard';
import { DoctorDashboard } from './components/DoctorDashboard';
import { Toast } from './components/Toast';

type UserRole = 'patient' | 'doctor' | null;
type View = 'landing' | 'signup' | 'login' | 'dashboard';

interface User {
  name: string;
  email: string;
  role: 'patient' | 'doctor';
  license?: string;
  specialization?: string;
  affiliation?: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<View>('landing');
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [user, setUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem('smartmed_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      setCurrentView('dashboard');
    }
  }, []);

  const handleRoleSelect = (role: 'patient' | 'doctor') => {
    setSelectedRole(role);
    setCurrentView('signup');
  };

  const handleSignUp = (userData: User) => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      localStorage.setItem('smartmed_user', JSON.stringify(userData));
      setUser(userData);
      setToast({ message: `Welcome, ${userData.name}! Redirecting...`, type: 'success' });
      setTimeout(() => {
        setCurrentView('dashboard');
        setIsLoading(false);
      }, 2000);
    }, 1000);
  };

  const handleLogin = (email: string, password: string, role: 'patient' | 'doctor') => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const storedAccounts = JSON.parse(localStorage.getItem('smartmed_accounts') || '[]');
      const account = storedAccounts.find((acc: any) => 
        acc.email === email && acc.password === password && acc.role === role
      );

      if (account) {
        const userData = { ...account };
        delete userData.password;
        localStorage.setItem('smartmed_user', JSON.stringify(userData));
        setUser(userData);
        setToast({ message: `Welcome back, ${userData.name}!`, type: 'success' });
        setTimeout(() => {
          setCurrentView('dashboard');
          setIsLoading(false);
        }, 2000);
      } else {
        setToast({ message: 'Email or password incorrect', type: 'error' });
        setIsLoading(false);
      }
    }, 1000);
  };

  const handleGoogleOAuth = (role: 'patient' | 'doctor') => {
    setIsLoading(true);
    // Simulate OAuth flow
    setTimeout(() => {
      const mockUser: User = {
        name: role === 'patient' ? 'Sarah Johnson' : 'Dr. Michael Chen',
        email: `${role}@example.com`,
        role: role,
        ...(role === 'doctor' && {
          license: 'MD-123456',
          specialization: 'Cardiology',
          affiliation: 'City General Hospital'
        })
      };
      localStorage.setItem('smartmed_user', JSON.stringify(mockUser));
      setUser(mockUser);
      setToast({ message: `Welcome, ${mockUser.name}! Redirecting...`, type: 'success' });
      setTimeout(() => {
        setCurrentView('dashboard');
        setIsLoading(false);
      }, 2000);
    }, 1500);
  };

  const handleLogout = () => {
    localStorage.removeItem('smartmed_user');
    setUser(null);
    setCurrentView('landing');
    setSelectedRole(null);
    setToast({ message: 'Logged out successfully', type: 'success' });
  };

  const handleNavigateToLogin = () => {
    setCurrentView('login');
  };

  const handleNavigateToSignup = () => {
    setCurrentView('signup');
  };

  const handleBackToLanding = () => {
    setCurrentView('landing');
    setSelectedRole(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {currentView === 'landing' && (
        <RoleSelection 
          onRoleSelect={handleRoleSelect}
          onNavigateToLogin={handleNavigateToLogin}
        />
      )}

      {currentView === 'signup' && selectedRole && (
        <SignUp
          role={selectedRole}
          onSignUp={handleSignUp}
          onNavigateToLogin={handleNavigateToLogin}
          onBack={handleBackToLanding}
          onGoogleOAuth={handleGoogleOAuth}
          isLoading={isLoading}
        />
      )}

      {currentView === 'login' && (
        <Login
          onLogin={handleLogin}
          onNavigateToSignup={handleNavigateToSignup}
          onBack={handleBackToLanding}
          onGoogleOAuth={handleGoogleOAuth}
          isLoading={isLoading}
        />
      )}

      {currentView === 'dashboard' && user && (
        user.role === 'patient' ? (
          <PatientDashboard user={user} onLogout={handleLogout} />
        ) : (
          <DoctorDashboard user={user} onLogout={handleLogout} />
        )
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
