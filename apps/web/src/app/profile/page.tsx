'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, User, Settings, Calendar, Heart, Clock3 } from 'lucide-react';
import { Button, Card, Badge, Alert, AlertDescription } from '@smartmed/ui';
import { ProfileSection } from '@/components/profile/ProfileSection';
import { SecuritySection } from '@/components/profile/SecuritySection';
import { AvailabilitySection } from '@/components/profile/doctor/AvailabilitySection';
import { PreferredDoctorsSection } from '@/components/profile/patient/PreferredDoctorsSection';
import { TimelineContainer } from '@/components/timeline/timeline_container';
import { useAuthContext } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';

const tabs = [
  { id: 'profile', label: 'Profile', icon: User, forRole: 'all' },
  { id: 'availability', label: 'Availability', icon: Calendar, forRole: 'doctor' },
  { id: 'preferred-doctors', label: 'Preferred Doctors', icon: Heart, forRole: 'patient' },
  { id: 'security', label: 'Security', icon: Settings, forRole: 'all' },
];

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const { data: profile } = useProfile();
  const roleParam = (searchParams.get('role') || '').toUpperCase();
  const userIdFromUrl = searchParams.get('userId') || undefined;

  const resolvedRole =
    (user?.role?.toUpperCase() as 'DOCTOR' | 'PATIENT' | 'ADMIN' | 'NURSE' | undefined) ||
    (roleParam === 'DOCTOR' ? 'DOCTOR' : roleParam === 'PATIENT' ? 'PATIENT' : undefined);
  const resolvedUserId = user?.id || userIdFromUrl || undefined;
  const isDoctor = resolvedRole === 'DOCTOR';
  const isPatient = resolvedRole === 'PATIENT';
  
  const [activeTab, setActiveTab] = useState('profile');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSection onUnsavedChanges={setHasUnsavedChanges} userId={resolvedUserId} />;
      case 'availability':
        return isDoctor ? (
          <AvailabilitySection onUnsavedChanges={setHasUnsavedChanges} />
        ) : null;
      case 'preferred-doctors':
        return isPatient ? <PreferredDoctorsSection /> : null;
      case 'timeline':
        return (
          <TimelineContainer
            variant="embedded"
            initialRole={isDoctor ? 'doctor' : 'patient'}
            lockRole
            heading="Activity Timeline"
            subheading={`Connected to this ${isDoctor ? 'doctor' : 'patient'} profile`}
            uploadPatientId={isPatient ? resolvedUserId : undefined}
          />
        );
      case 'security':
        return <SecuritySection userId={resolvedUserId} />;
      default:
        return <ProfileSection onUnsavedChanges={setHasUnsavedChanges} userId={resolvedUserId} />;
    }
  };

  const completeness = useMemo(() => {
    if (!profile) return 0;
    const fields = [
      profile.fullName,
      profile.phoneNumber,
      profile.dateOfBirth,
      profile.addressLine1,
      profile.city,
      profile.country,
    ];
    const filled = fields.filter(Boolean).length;
    const doctorExtras = isDoctor ? [profile.gender, profile.profilePhotoUrl] : [];
    const total = fields.length + doctorExtras.length || 1;
    return Math.round(((filled + doctorExtras.filter(Boolean).length) / total) * 100);
  }, [profile, isDoctor]);

  if (!resolvedUserId && !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-destructive">Profile requires a signed-in user.</p>
          <Button onClick={() => router.push('/auth/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold text-foreground">Profile Settings</h1>
                <Badge variant="outline" className="text-xs">
                  {isDoctor ? 'Healthcare Provider' : isPatient ? 'Patient' : 'User'}
                </Badge>
                {profile && (
                  <Badge variant="secondary" className="text-xs">
                    {completeness}% complete
                  </Badge>
                )}
              </div>
            <Button 
              variant="outline" 
              onClick={() => {
                if (user?.role === 'DOCTOR') router.push('/dashboard/doctor');
                else if (user?.role === 'PATIENT') router.push('/dashboard/patient');
                else router.push('/dashboard');
              }}
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
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'text-foreground hover:bg-muted'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
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
