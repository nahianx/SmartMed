import { useState, useEffect } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { toast } from "sonner@2.0.3";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type UserRole = "doctor" | "patient";

interface ProfileSectionProps {
  role: UserRole;
  onUnsavedChanges: (hasChanges: boolean) => void;
}

const specializations = [
  "Cardiology",
  "Dermatology",
  "Neurology",
  "Pediatrics",
  "Orthopedics",
  "Psychiatry",
  "General Practice",
];

const languages = ["English", "Spanish", "French", "German", "Mandarin", "Hindi"];

export function ProfileSection({ role, onUnsavedChanges }: ProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop");
  
  // Common fields
  const [fullName, setFullName] = useState(role === "doctor" ? "Dr. Sarah Anderson" : "John Doe");
  const [email, setEmail] = useState(role === "doctor" ? "sarah.anderson@smartmed.com" : "john.doe@email.com");
  const [phone, setPhone] = useState("+1 (555) 123-4567");
  const [dateOfBirth, setDateOfBirth] = useState("1985-03-15");
  const [gender, setGender] = useState("female");
  const [addressLine1, setAddressLine1] = useState("123 Medical Plaza");
  const [addressLine2, setAddressLine2] = useState("Suite 400");
  const [city, setCity] = useState("New York");
  const [region, setRegion] = useState("NY");
  const [postalCode, setPostalCode] = useState("10001");
  const [country, setCountry] = useState("United States");

  // Doctor-only fields
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>(["Cardiology"]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["English", "Spanish"]);
  const [yearsExperience, setYearsExperience] = useState("15");
  const [consultationModes, setConsultationModes] = useState<string[]>(["tele-visit", "in-person"]);
  const [clinicName, setClinicName] = useState("City General Hospital");
  const [clinicAddress, setClinicAddress] = useState("456 Health Avenue, New York, NY 10002");
  const [feeNote, setFeeNote] = useState("$150 per consultation. Insurance accepted.");
  const [mapLink, setMapLink] = useState("https://maps.google.com/?q=City+General+Hospital");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isEditing) {
        onUnsavedChanges(true);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isEditing, fullName, phone, addressLine1, city, yearsExperience, clinicName]);

  const handleSave = () => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!phone.trim()) newErrors.phone = "Phone number is required";
    if (role === "doctor" && selectedSpecializations.length === 0) {
      newErrors.specializations = "At least one specialization is required";
    }
    if (role === "doctor" && !yearsExperience) {
      newErrors.yearsExperience = "Years of experience is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the validation errors");
      return;
    }

    setErrors({});
    setIsEditing(false);
    onUnsavedChanges(false);
    toast.success("Profile updated successfully");
  };

  const handleCancel = () => {
    if (isEditing) {
      setIsEditing(false);
      onUnsavedChanges(false);
      // Reset form would go here
    }
  };

  const toggleSpecialization = (spec: string) => {
    setSelectedSpecializations((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
    setIsEditing(true);
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
    setIsEditing(true);
  };

  const toggleConsultationMode = (mode: string) => {
    setConsultationModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    );
    setIsEditing(true);
  };

  return (
    <div className="space-y-8">
      {/* Avatar Section */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <Avatar className="w-24 h-24">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback>{fullName.split(" ").map(n => n[0]).join("")}</AvatarFallback>
          </Avatar>
          <button className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700">
            <Camera className="w-4 h-4" />
          </button>
        </div>
        <div>
          <h4>Profile Photo</h4>
          <p className="text-slate-600 text-sm mt-1">
            Upload a professional photo. JPG or PNG, max 5MB.
          </p>
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-6">
        <h3>Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="fullName">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setIsEditing(true);
                if (errors.fullName) {
                  setErrors((prev) => ({ ...prev, fullName: "" }));
                }
              }}
            />
            {errors.fullName && (
              <p className="text-sm text-red-600">{errors.fullName}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-slate-50"
            />
            <p className="text-xs text-slate-500">Connected via Google Sign-In</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setIsEditing(true);
                if (errors.phone) {
                  setErrors((prev) => ({ ...prev, phone: "" }));
                }
              }}
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              type="date"
              value={dateOfBirth}
              onChange={(e) => {
                setDateOfBirth(e.target.value);
                setIsEditing(true);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select value={gender} onValueChange={(value) => {
              setGender(value);
              setIsEditing(true);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Doctor-only fields */}
      {role === "doctor" && (
        <>
          <div className="space-y-6">
            <h3>Professional Information</h3>

            <div className="space-y-2">
              <Label>
                Specialization <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {specializations.map((spec) => (
                  <Badge
                    key={spec}
                    variant={selectedSpecializations.includes(spec) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSpecialization(spec)}
                  >
                    {spec}
                    {selectedSpecializations.includes(spec) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
              {errors.specializations && (
                <p className="text-sm text-red-600">{errors.specializations}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Languages</Label>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <Badge
                    key={lang}
                    variant={selectedLanguages.includes(lang) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleLanguage(lang)}
                  >
                    {lang}
                    {selectedLanguages.includes(lang) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="experience">
                  Years of Experience <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  max="60"
                  value={yearsExperience}
                  onChange={(e) => {
                    setYearsExperience(e.target.value);
                    setIsEditing(true);
                    if (errors.yearsExperience) {
                      setErrors((prev) => ({ ...prev, yearsExperience: "" }));
                    }
                  }}
                />
                {errors.yearsExperience && (
                  <p className="text-sm text-red-600">{errors.yearsExperience}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Consultation Mode</Label>
                <div className="flex gap-3 mt-2">
                  <Badge
                    variant={consultationModes.includes("tele-visit") ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleConsultationMode("tele-visit")}
                  >
                    Tele-visit
                  </Badge>
                  <Badge
                    variant={consultationModes.includes("in-person") ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleConsultationMode("in-person")}
                  >
                    In-person
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3>Clinic Details</h3>

            <div className="space-y-2">
              <Label htmlFor="clinicName">Clinic Name</Label>
              <Input
                id="clinicName"
                value={clinicName}
                onChange={(e) => {
                  setClinicName(e.target.value);
                  setIsEditing(true);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinicAddress">Clinic Address</Label>
              <Textarea
                id="clinicAddress"
                value={clinicAddress}
                onChange={(e) => {
                  setClinicAddress(e.target.value);
                  setIsEditing(true);
                }}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feeNote">Fee & Insurance Note</Label>
              <Textarea
                id="feeNote"
                value={feeNote}
                onChange={(e) => {
                  setFeeNote(e.target.value);
                  setIsEditing(true);
                }}
                rows={2}
                placeholder="e.g., $150 per consultation. Insurance accepted."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mapLink">Map Link (Optional)</Label>
              <Input
                id="mapLink"
                type="url"
                value={mapLink}
                onChange={(e) => {
                  setMapLink(e.target.value);
                  setIsEditing(true);
                }}
                placeholder="https://maps.google.com/?q=..."
              />
            </div>
          </div>
        </>
      )}

      {/* Address */}
      <div className="space-y-6">
        <h3>Address</h3>

        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <Label htmlFor="address1">Address Line 1</Label>
            <Input
              id="address1"
              value={addressLine1}
              onChange={(e) => {
                setAddressLine1(e.target.value);
                setIsEditing(true);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address2">Address Line 2</Label>
            <Input
              id="address2"
              value={addressLine2}
              onChange={(e) => {
                setAddressLine2(e.target.value);
                setIsEditing(true);
              }}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setIsEditing(true);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">State / Region</Label>
              <Input
                id="region"
                value={region}
                onChange={(e) => {
                  setRegion(e.target.value);
                  setIsEditing(true);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal">Postal Code</Label>
              <Input
                id="postal"
                value={postalCode}
                onChange={(e) => {
                  setPostalCode(e.target.value);
                  setIsEditing(true);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={country} onValueChange={(value) => {
                setCountry(value);
                setIsEditing(true);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="United States">United States</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                  <SelectItem value="Australia">Australia</SelectItem>
                  <SelectItem value="Germany">Germany</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-6 border-t border-slate-200">
        <Button onClick={handleSave}>
          Save Changes
        </Button>
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
