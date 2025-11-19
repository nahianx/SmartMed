import { useState } from "react";
import { Search, Star, MapPin, Video, User as UserIcon, GripVertical, ExternalLink } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { toast } from "sonner@2.0.3";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  clinic: string;
  avatar: string;
  teleVisit: boolean;
  inPerson: boolean;
  yearsExperience: number;
  languages: string[];
  isPreferred: boolean;
}

const mockDoctors: Doctor[] = [
  {
    id: "1",
    name: "Dr. Sarah Anderson",
    specialty: "Cardiology",
    clinic: "City General Hospital",
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop",
    teleVisit: true,
    inPerson: true,
    yearsExperience: 15,
    languages: ["English", "Spanish"],
    isPreferred: true,
  },
  {
    id: "2",
    name: "Dr. Michael Chen",
    specialty: "Dermatology",
    clinic: "Skin Health Center",
    avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=200&h=200&fit=crop",
    teleVisit: true,
    inPerson: false,
    yearsExperience: 8,
    languages: ["English", "Mandarin"],
    isPreferred: true,
  },
  {
    id: "3",
    name: "Dr. Emily Rodriguez",
    specialty: "Pediatrics",
    clinic: "Children's Wellness Clinic",
    avatar: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=200&h=200&fit=crop",
    teleVisit: true,
    inPerson: true,
    yearsExperience: 12,
    languages: ["English", "Spanish", "French"],
    isPreferred: true,
  },
  {
    id: "4",
    name: "Dr. James Wilson",
    specialty: "Orthopedics",
    clinic: "Sports Medicine Institute",
    avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=200&h=200&fit=crop",
    teleVisit: false,
    inPerson: true,
    yearsExperience: 20,
    languages: ["English"],
    isPreferred: false,
  },
  {
    id: "5",
    name: "Dr. Priya Patel",
    specialty: "Psychiatry",
    clinic: "Mental Health Associates",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop",
    teleVisit: true,
    inPerson: true,
    yearsExperience: 10,
    languages: ["English", "Hindi"],
    isPreferred: false,
  },
  {
    id: "6",
    name: "Dr. Robert Thompson",
    specialty: "Neurology",
    clinic: "Brain & Spine Center",
    avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&h=200&fit=crop",
    teleVisit: true,
    inPerson: true,
    yearsExperience: 18,
    languages: ["English", "German"],
    isPreferred: false,
  },
];

export function PreferredDoctorsSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>(mockDoctors);

  const preferredDoctors = doctors.filter((d) => d.isPreferred);
  const otherDoctors = doctors.filter(
    (d) =>
      !d.isPreferred &&
      (d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.specialty.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const togglePreferred = (doctorId: string) => {
    setDoctors((prev) =>
      prev.map((d) => {
        if (d.id === doctorId) {
          const newPreferred = !d.isPreferred;
          toast.success(
            newPreferred
              ? `${d.name} added to preferred doctors`
              : `${d.name} removed from preferred doctors`
          );
          return { ...d, isPreferred: newPreferred };
        }
        return d;
      })
    );
  };

  const DoctorCard = ({ doctor }: { doctor: Doctor }) => (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {doctor.isPreferred && (
          <div className="flex items-start">
            <GripVertical className="w-5 h-5 text-slate-400 cursor-grab" />
          </div>
        )}
        
        <Avatar className="w-16 h-16">
          <AvatarImage src={doctor.avatar} />
          <AvatarFallback>
            {doctor.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="flex items-center gap-2">
                {doctor.name}
                {doctor.isPreferred && (
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                )}
              </h4>
              <p className="text-slate-600 mt-1">{doctor.specialty}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4" />
            <span>{doctor.clinic}</span>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {doctor.teleVisit && (
              <Badge variant="secondary" className="gap-1">
                <Video className="w-3 h-3" />
                Tele-visit
              </Badge>
            )}
            {doctor.inPerson && (
              <Badge variant="secondary" className="gap-1">
                <UserIcon className="w-3 h-3" />
                In-person
              </Badge>
            )}
            <Badge variant="outline">{doctor.yearsExperience}+ years</Badge>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant={doctor.isPreferred ? "outline" : "default"}
              size="sm"
              onClick={() => togglePreferred(doctor.id)}
            >
              {doctor.isPreferred ? (
                <>
                  <Star className="w-4 h-4 mr-2" />
                  Remove
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 mr-2" />
                  Add to Preferred
                </>
              )}
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

  return (
    <div className="space-y-8">
      <div>
        <h3>Preferred Doctors</h3>
        <p className="text-slate-600 mt-1">
          Manage your list of preferred doctors for quick booking
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

      {/* Preferred Doctors List */}
      {preferredDoctors.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            <h4>Your Preferred Doctors ({preferredDoctors.length})</h4>
          </div>
          <p className="text-sm text-slate-600">
            Drag to reorder your preferred doctors
          </p>
          <div className="space-y-3">
            {preferredDoctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {preferredDoctors.length === 0 && !searchQuery && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Star className="w-8 h-8 text-slate-400" />
            </div>
            <h4 className="mb-2">No Preferred Doctors Yet</h4>
            <p className="text-slate-600 mb-4">
              Add doctors to your preferred list for quick access and easy booking
            </p>
            <Button onClick={() => setSearchQuery("")}>
              <Search className="w-4 h-4 mr-2" />
              Browse Doctors
            </Button>
          </div>
        </Card>
      )}

      {/* Search Results */}
      {(searchQuery || preferredDoctors.length > 0) && otherDoctors.length > 0 && (
        <div className="space-y-4">
          <h4>
            {searchQuery ? "Search Results" : "Other Doctors"}
            {searchQuery && ` (${otherDoctors.length})`}
          </h4>
          <div className="space-y-3">
            {otherDoctors.map((doctor) => (
              <DoctorCard key={doctor.id} doctor={doctor} />
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {searchQuery && otherDoctors.length === 0 && preferredDoctors.length === 0 && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-slate-400" />
            </div>
            <h4 className="mb-2">No doctors found</h4>
            <p className="text-slate-600">
              Try searching with different keywords or specialty
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
