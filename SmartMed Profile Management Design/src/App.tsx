import { useState } from "react";
import { Search, Bell, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Toaster, toast } from "sonner@2.0.3";
import { ProfileSection } from "./components/ProfileSection";
import { AvailabilitySection } from "./components/AvailabilitySection";
import { PreferredDoctorsSection } from "./components/PreferredDoctorsSection";
import { SecuritySection } from "./components/SecuritySection";

type UserRole = "doctor" | "patient";

export default function App() {
  const [role, setRole] = useState<UserRole>("doctor");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleRoleToggle = () => {
    if (hasUnsavedChanges) {
      if (confirm("You have unsaved changes. Are you sure you want to switch roles?")) {
        setRole(role === "doctor" ? "patient" : "doctor");
        setHasUnsavedChanges(false);
      }
    } else {
      setRole(role === "doctor" ? "patient" : "doctor");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster position="top-right" />
      
      {/* Top App Bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <h1 className="text-blue-600">SmartMed</h1>
              <div className="hidden md:flex relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder="Search doctors, clinics, or patients..."
                  className="pl-9"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
              <Avatar>
                <AvatarImage src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop" />
                <AvatarFallback>DR</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {/* Role Toggle (Demo only) */}
        <div className="mb-6 flex items-center gap-3">
          <span className="text-sm text-slate-600">Demo mode:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRoleToggle}
          >
            Switch to {role === "doctor" ? "Patient" : "Doctor"} View
          </Button>
          <Badge variant={role === "doctor" ? "default" : "secondary"}>
            {role === "doctor" ? "Doctor" : "Patient"}
          </Badge>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content Area */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-200">
                <h2>Profile & Availability</h2>
                <p className="text-slate-600 mt-1">
                  {role === "doctor" 
                    ? "Manage your professional profile and set your availability for consultations"
                    : "Manage your profile information and preferred doctors"}
                </p>
              </div>

              <Tabs defaultValue="profile" className="w-full">
                <div className="border-b border-slate-200 px-6">
                  <TabsList className="bg-transparent h-auto p-0 gap-1">
                    <TabsTrigger 
                      value="profile"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      Profile
                    </TabsTrigger>
                    {role === "doctor" && (
                      <TabsTrigger 
                        value="availability"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        Availability
                      </TabsTrigger>
                    )}
                    {role === "patient" && (
                      <TabsTrigger 
                        value="preferred"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                      >
                        Preferred Doctors
                      </TabsTrigger>
                    )}
                    <TabsTrigger 
                      value="security"
                      className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                    >
                      Security
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="p-6">
                  <TabsContent value="profile" className="mt-0">
                    <ProfileSection 
                      role={role}
                      onUnsavedChanges={setHasUnsavedChanges}
                    />
                  </TabsContent>

                  {role === "doctor" && (
                    <TabsContent value="availability" className="mt-0">
                      <AvailabilitySection onUnsavedChanges={setHasUnsavedChanges} />
                    </TabsContent>
                  )}

                  {role === "patient" && (
                    <TabsContent value="preferred" className="mt-0">
                      <PreferredDoctorsSection />
                    </TabsContent>
                  )}

                  <TabsContent value="security" className="mt-0">
                    <SecuritySection />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          {/* Right Rail - Preview/Info */}
          <div className="hidden lg:block w-80">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 sticky top-20">
              <h3 className="mb-4">Profile Preview</h3>
              <div className="flex flex-col items-center text-center">
                <Avatar className="w-24 h-24 mb-4">
                  <AvatarImage src="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop" />
                  <AvatarFallback>DR</AvatarFallback>
                </Avatar>
                <h4>{role === "doctor" ? "Dr. Sarah Anderson" : "John Doe"}</h4>
                {role === "doctor" && (
                  <>
                    <p className="text-slate-600 mt-1">Cardiologist</p>
                    <div className="flex gap-2 mt-3">
                      <Badge variant="secondary">Tele-visit</Badge>
                      <Badge variant="secondary">In-person</Badge>
                    </div>
                    <div className="w-full mt-6 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-900">
                        <strong>15+</strong> years experience
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        City General Hospital
                      </p>
                    </div>
                  </>
                )}
                {role === "patient" && (
                  <div className="w-full mt-6 p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">
                      Member since 2023
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      3 preferred doctors
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
