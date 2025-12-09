'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, User, Settings, Calendar, Heart } from 'lucide-react';
import { Button, Card, Badge, Alert, AlertDescription } from '@smartmed/ui';
import { useRequireAuth, useIsDoctor, useIsPatient } from '@/store/auth';
import { ProfileSection } from '@/components/profile/ProfileSection';
import { SecuritySection } from '@/components/profile/SecuritySection';
import { AvailabilitySection } from '@/components/profile/doctor/AvailabilitySection';
import { PreferredDoctorsSection } from '@/components/profile/patient/PreferredDoctorsSection';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User, forRole: 'all' },
  { id: 'availability', label: 'Availability', icon: Calendar, forRole: 'doctor' },
  { id: 'preferred-doctors', label: 'Preferred Doctors', icon: Heart, forRole: 'patient' },
  { id: 'security', label: 'Security', icon: Settings, forRole: 'all' },
];

export default function ProfilePage() {
  const router = useRouter();
  const { isLoading, isAuthenticated, user } = useRequireAuth();
  const isDoctor = useIsDoctor();
  const isPatient = useIsPatient();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Filter tabs based on user role
  const availableTabs = tabs.filter(tab => {
    if (tab.forRole === 'all') return true;
    if (tab.forRole === 'doctor' && isDoctor) return true;
    if (tab.forRole === 'patient' && isPatient) return true;
    return false;
  });

  const handleTabChange = (newTab: string) => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true);
      // Store the intended tab to switch to later
      sessionStorage.setItem('pendingTab', newTab);
    } else {
      setActiveTab(newTab);
    }
  };

  const handleDiscardChanges = () => {
    setHasUnsavedChanges(false);
    setShowUnsavedWarning(false);
    const pendingTab = sessionStorage.getItem('pendingTab');
    if (pendingTab) {
      setActiveTab(pendingTab);
      sessionStorage.removeItem('pendingTab');
    }
  };

  const handleKeepEditing = () => {
    setShowUnsavedWarning(false);
    sessionStorage.removeItem('pendingTab');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show not authenticated state
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSection onUnsavedChanges={setHasUnsavedChanges} />;
      case 'availability':
        return isDoctor ? (
          <AvailabilitySection onUnsavedChanges={setHasUnsavedChanges} />
        ) : null;
      case 'preferred-doctors':
        return isPatient ? <PreferredDoctorsSection /> : null;
      case 'security':
        return <SecuritySection />;
      default:
        return <ProfileSection onUnsavedChanges={setHasUnsavedChanges} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">Profile Settings</h1>
              <Badge variant="outline" className="text-xs">
                {user.role === 'DOCTOR' ? 'Healthcare Provider' : 
                 user.role === 'PATIENT' ? 'Patient' : user.role}
              </Badge>
            </div>
            <Button 
              variant="outline" 
              onClick={() => router.push('/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Unsaved changes warning */}
      {showUnsavedWarning && (
        <Alert className="mx-4 mt-4 bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span className="text-amber-800">
              You have unsaved changes. Are you sure you want to leave this tab?
            </span>
            <div className="flex gap-2 ml-4">
              <Button
                size="sm"
                variant="outline"
                onClick={handleKeepEditing}
                className="text-amber-800 border-amber-300 hover:bg-amber-100"
              >
                Keep Editing
              </Button>
              <Button
                size="sm"
                onClick={handleDiscardChanges}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Discard Changes
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 flex-shrink-0">
            <Card className="p-4">
              <nav className="space-y-1">
                {availableTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
              
              {hasUnsavedChanges && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800 font-medium">
                    Unsaved Changes
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Don&apos;t forget to save your changes before switching tabs.
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Card className="p-8">
              {renderTabContent()}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
