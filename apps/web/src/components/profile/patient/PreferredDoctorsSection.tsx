import { useState, useMemo } from "react";
import { Search, Star, MapPin, Video, User as UserIcon, Loader2, ExternalLink } from "lucide-react";
import { 
  Input, 
  Button, 
  Badge, 
  Card, 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@smartmed/ui";
import { toast } from "sonner";
import { usePreferredDoctors, useAddPreferredDoctor, useRemovePreferredDoctor, useDoctorSearch } from "@/hooks/useProfile";
import { Doctor } from "@smartmed/types";

export function PreferredDoctorsSection() {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Query hooks
  const { data: preferredDoctors = [], isLoading: preferredLoading } = usePreferredDoctors();
  const { data: searchResults = [], isLoading: searchLoading } = useDoctorSearch(searchQuery);
  
  // Mutation hooks
  const addPreferredMutation = useAddPreferredDoctor();
  const removePreferredMutation = useRemovePreferredDoctor();
  
  // Filter search results to exclude already preferred doctors
  const filteredSearchResults = useMemo(() => {
    const preferredIds = new Set(preferredDoctors.map((d: any) => d.id));
    return searchResults.filter((doctor: any) => !preferredIds.has(doctor.id));
  }, [searchResults, preferredDoctors]);
  
  // Handle adding/removing preferred doctors
  const handleTogglePreferred = async (doctor: Doctor, isCurrentlyPreferred: boolean) => {
    try {
      if (isCurrentlyPreferred) {
        await removePreferredMutation.mutateAsync(doctor.id);
      } else {
        // Check limit (max 20 preferred doctors)
        if (preferredDoctors.length >= 20) {
          toast.error("You can only have up to 20 preferred doctors");
          return;
        }
        await addPreferredMutation.mutateAsync(doctor.id);
      }
    } catch (error) {
      console.error("Error toggling preferred doctor:", error);
    }
  };
  
  const DoctorCard = ({ 
    doctor, 
    isPreferred, 
    showReorder = false 
  }: { 
    doctor: Doctor; 
    isPreferred: boolean; 
    showReorder?: boolean;
  }) => {
    const isLoading = addPreferredMutation.isPending || removePreferredMutation.isPending;
    
    return (
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={(doctor as any).profilePhotoUrl || ""} />
            <AvatarFallback>
              {doctor.firstName?.[0]}{doctor.lastName?.[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="flex items-center gap-2 font-medium">
                  Dr. {doctor.firstName} {doctor.lastName}
                  {isPreferred && (
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  )}
                </h4>
                <p className="text-slate-600 mt-1">{doctor.specialization}</p>
              </div>
            </div>

            {/* Clinic information */}
            <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
              <MapPin className="w-4 h-4" />
              <span>
                {/* Note: Clinic info structure may need adjustment based on actual data model */}
                {(doctor as any).clinic?.name || "Private Practice"}
              </span>
            </div>

            {/* Service badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              {/* Note: These fields may need adjustment based on actual data model */}
              <Badge variant="secondary" className="gap-1">
                <Video className="w-3 h-3" />
                Tele-visit
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <UserIcon className="w-3 h-3" />
                In-person
              </Badge>
              {doctor.experience && (
                <Badge variant="outline">{doctor.experience}+ years</Badge>
              )}
            </div>

            {/* Consultation fee */}
            {doctor.consultationFee && (
              <p className="text-sm text-slate-600 mt-2">
                Consultation fee: ${doctor.consultationFee}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-4">
              <Button
                variant={isPreferred ? "outline" : "default"}
                size="sm"
                onClick={() => handleTogglePreferred(doctor, isPreferred)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Star className="w-4 h-4 mr-2" />
                )}
                {isPreferred ? "Remove" : "Add to Preferred"}
              </Button>
              <Button variant="ghost" size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Profile
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium">Preferred Doctors</h3>
        <p className="text-slate-600 mt-1">
          Manage your list of preferred doctors for quick booking (max 20)
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <Input
          type="search"
          placeholder="Search by name or specialty..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading state */}
      {preferredLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading preferred doctors...</span>
        </div>
      )}

      {/* Preferred Doctors List */}
      {!preferredLoading && preferredDoctors.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h4 className="font-medium">
              Your Preferred Doctors ({preferredDoctors.length}/20)
            </h4>
          </div>
          <div className="space-y-3">
            {preferredDoctors.map((doctor) => (
              <DoctorCard 
                key={doctor.id} 
                doctor={doctor} 
                isPreferred={true} 
                showReorder={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!preferredLoading && preferredDoctors.length === 0 && !searchQuery && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Star className="w-8 h-8 text-slate-400" />
            </div>
            <h4 className="font-medium mb-2">No Preferred Doctors Yet</h4>
            <p className="text-slate-600 mb-4">
              Add doctors to your preferred list for quick access and easy booking
            </p>
            <Button onClick={() => setSearchQuery("general")}>
              <Search className="w-4 h-4 mr-2" />
              Browse Doctors
            </Button>
          </div>
        </Card>
      )}

      {/* Search Results */}
      {searchQuery && (
        <div className="space-y-4">
          <h4 className="font-medium">
            Search Results
            {!searchLoading && ` (${filteredSearchResults.length})`}
          </h4>
          
          {searchLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Searching doctors...</span>
            </div>
          ) : filteredSearchResults.length > 0 ? (
            <div className="space-y-3">
              {filteredSearchResults.map((doctor) => (
                <DoctorCard 
                  key={doctor.id} 
                  doctor={doctor} 
                  isPreferred={false}
                />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center max-w-md mx-auto">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <h4 className="font-medium mb-2">No doctors found</h4>
                <p className="text-slate-600">
                  Try searching with different keywords or specialty
                </p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Show some suggestions when no search and no preferred doctors */}
      {!searchQuery && preferredDoctors.length === 0 && !preferredLoading && (
        <div className="space-y-4">
          <h4 className="font-medium">Popular Specializations</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              "General Practice",
              "Cardiology",
              "Dermatology",
              "Pediatrics",
              "Orthopedics",
              "Psychiatry",
              "Neurology",
              "Gynecology"
            ].map((specialty) => (
              <Button
                key={specialty}
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery(specialty.toLowerCase())}
                className="justify-start"
              >
                {specialty}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}