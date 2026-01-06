import { useState, useEffect, useCallback, useRef } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { 
  Button, 
  Input, 
  Label, 
  Textarea, 
  Avatar, 
  AvatarFallback, 
  AvatarImage, 
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@smartmed/ui";
import { toast } from "sonner";
import { useProfile, useUpdateProfile, useUploadProfilePhoto, useRemoveProfilePhoto, useSpecializations, useDoctorProfile, useUpdateSpecializations, useUpdateClinicInfo } from "@/hooks/useProfile";
import { UserRole, User } from "@smartmed/types";

interface ProfileSectionProps {
  onUnsavedChanges: (hasChanges: boolean) => void;
  userId?: string;
}

export function ProfileSection({ onUnsavedChanges, userId }: ProfileSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Query hooks
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile(userId);
  const isDoctor = profile?.role === UserRole.DOCTOR;
  const { data: doctorProfile, isLoading: doctorLoading } = useDoctorProfile(userId, !!isDoctor);
  const { data: specializations = [] } = useSpecializations();
  
  // Mutation hooks
  const updateProfileMutation = useUpdateProfile();
  const uploadPhotoMutation = useUploadProfilePhoto();
  const removePhotoMutation = useRemoveProfilePhoto();
  const updateSpecializationsMutation = useUpdateSpecializations();
  const updateClinicInfoMutation = useUpdateClinicInfo();
  
  // Local form state
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    dateOfBirth: "",
    gender: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    region: "",
    postalCode: "",
    country: "",
    // Doctor-specific fields
    selectedSpecializations: [] as string[],
    yearsExperience: "",
    clinicName: "",
    clinicAddress: "",
    clinicPhone: "",
    consultationFee: "",
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        fullName: profile.fullName || "",
        phoneNumber: profile.phoneNumber || "",
        dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : "",
        gender: profile.gender || "",
        addressLine1: profile.addressLine1 || "",
        addressLine2: profile.addressLine2 || "",
        city: profile.city || "",
        region: profile.region || "",
        postalCode: profile.postalCode || "",
        country: profile.country || "",
      }));
    }
  }, [profile]);
  
  // Initialize doctor-specific data
  useEffect(() => {
    if (doctorProfile && isDoctor) {
      setFormData(prev => ({
        ...prev,
        selectedSpecializations: doctorProfile.specialization ? [doctorProfile.specialization] : [],
        yearsExperience: doctorProfile.experience?.toString() || "",
      }));
      
      // Set clinic data if available
      // Note: This would need to be adapted based on actual clinic data structure
    }
  }, [doctorProfile, isDoctor]);
  
  // Handle form changes
  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setIsEditing(true);
    
    // Clear errors for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  }, [errors]);
  
  // Notify parent of unsaved changes
  useEffect(() => {
    onUnsavedChanges(hasChanges);
  }, [hasChanges, onUnsavedChanges]);
  
  // Validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    }
    if (isDoctor && formData.selectedSpecializations.length === 0) {
      newErrors.specializations = "At least one specialization is required";
    }
    if (isDoctor && !formData.yearsExperience) {
      newErrors.yearsExperience = "Years of experience is required";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Handle save
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }
    
    try {
      // Update basic profile
      const profileUpdates: Partial<User> = {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined,
        gender: formData.gender as "MALE" | "FEMALE" | "OTHER",
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        city: formData.city,
        region: formData.region,
        postalCode: formData.postalCode,
        country: formData.country,
      };
      
      await updateProfileMutation.mutateAsync(profileUpdates);
      
      // Update doctor-specific data if applicable
      if (isDoctor) {
        if (formData.selectedSpecializations.length > 0) {
          // Note: This assumes specialization IDs - you may need to map names to IDs
          const specializationIds = formData.selectedSpecializations;
          await updateSpecializationsMutation.mutateAsync(specializationIds);
        }
        
        if (formData.clinicName || formData.clinicAddress || formData.clinicPhone || formData.consultationFee) {
          await updateClinicInfoMutation.mutateAsync({
            name: formData.clinicName,
            address: formData.clinicAddress,
            phone: formData.clinicPhone,
            consultationFee: parseFloat(formData.consultationFee) || 0,
          });
        }
      }
      
      setIsEditing(false);
      setHasChanges(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    }
  };
  
  // Handle cancel
  const handleCancel = () => {
    if (hasChanges) {
      // Reset form to original values
      if (profile) {
        setFormData(prev => ({
          ...prev,
          fullName: profile.fullName || "",
          phoneNumber: profile.phoneNumber || "",
          dateOfBirth: profile.dateOfBirth ? new Date(profile.dateOfBirth).toISOString().split('T')[0] : "",
          gender: profile.gender || "",
          addressLine1: profile.addressLine1 || "",
          addressLine2: profile.addressLine2 || "",
          city: profile.city || "",
          region: profile.region || "",
          postalCode: profile.postalCode || "",
          country: profile.country || "",
        }));
      }
      setIsEditing(false);
      setHasChanges(false);
      setErrors({});
    }
  };
  
  // Handle photo upload
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file
    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error("File size must be less than 5MB");
      return;
    }
    
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      toast.error("Only JPG and PNG files are allowed");
      return;
    }
    
    uploadPhotoMutation.mutate(file);
  };
  
  // Handle photo remove
  const handlePhotoRemove = () => {
    removePhotoMutation.mutate();
  };
  
  // Toggle specialization
  const toggleSpecialization = (spec: string) => {
    const newSpecializations = formData.selectedSpecializations.includes(spec)
      ? formData.selectedSpecializations.filter(s => s !== spec)
      : [...formData.selectedSpecializations, spec];
    handleFieldChange("selectedSpecializations", newSpecializations);
  };
  
  // Show loading state
  if (profileLoading || (isDoctor && doctorLoading)) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading profile...</span>
      </div>
    );
  }
  
  // Show error state
  if (profileError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load profile. Please try again.</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }
  
  if (!profile) {
    return <div>No profile data available</div>;
  }
  
  return (
    <div className="space-y-8">
      {/* Avatar Section */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <Avatar className="w-24 h-24">
            <AvatarImage src={profile.profilePhotoUrl || ""} />
            <AvatarFallback>
              {formData.fullName.split(" ").map(n => n[0]).join("").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadPhotoMutation.isPending}
            className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50"
          >
            {uploadPhotoMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            onChange={handlePhotoUpload}
            className="hidden"
            aria-label="Upload profile photo"
          />
        </div>
        <div>
          <h4 className="font-medium">Profile Photo</h4>
          <p className="text-muted-foreground text-sm mt-1">
            Upload a professional photo. JPG or PNG, max 5MB.
          </p>
          {profile.profilePhotoUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePhotoRemove}
              disabled={removePhotoMutation.isPending}
              className="mt-2"
            >
              {removePhotoMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : null}
              Remove Photo
            </Button>
          )}
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Basic Information</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="fullName">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fullName"
              value={formData.fullName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("fullName", e.target.value)}
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
              value={profile.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phoneNumber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("phoneNumber", e.target.value)}
            />
            {errors.phoneNumber && (
              <p className="text-sm text-red-600">{errors.phoneNumber}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input
              id="dob"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("dateOfBirth", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select value={formData.gender} onValueChange={(value: string) => handleFieldChange("gender", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Doctor-only fields */}
      {isDoctor && (
        <>
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Professional Information</h3>

            <div className="space-y-2">
              <Label>
                Specialization <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {specializations.map((spec: any) => (
                  <Badge
                    key={spec.id}
                    variant={formData.selectedSpecializations.includes(spec.name) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleSpecialization(spec.name)}
                  >
                    {spec.name}
                    {formData.selectedSpecializations.includes(spec.name) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
              {errors.specializations && (
                <p className="text-sm text-red-600">{errors.specializations}</p>
              )}
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
                  value={formData.yearsExperience}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("yearsExperience", e.target.value)}
                />
                {errors.yearsExperience && (
                  <p className="text-sm text-red-600">{errors.yearsExperience}</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-medium">Clinic Details</h3>

            <div className="space-y-2">
              <Label htmlFor="clinicName">Clinic Name</Label>
              <Input
                id="clinicName"
                value={formData.clinicName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("clinicName", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinicAddress">Clinic Address</Label>
              <Textarea
                id="clinicAddress"
                value={formData.clinicAddress}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleFieldChange("clinicAddress", e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="clinicPhone">Clinic Phone</Label>
                <Input
                  id="clinicPhone"
                  type="tel"
                  value={formData.clinicPhone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("clinicPhone", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consultationFee">Consultation Fee ($)</Label>
                <Input
                  id="consultationFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.consultationFee}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("consultationFee", e.target.value)}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Address */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium">Address</h3>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address1">Address Line 1</Label>
            <Input
              id="address1"
              value={formData.addressLine1}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("addressLine1", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address2">Address Line 2</Label>
            <Input
              id="address2"
              value={formData.addressLine2}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("addressLine2", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("city", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">State / Region</Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("region", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="postal">Postal Code</Label>
              <Input
                id="postal"
                value={formData.postalCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFieldChange("postalCode", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={formData.country} onValueChange={(value: string) => handleFieldChange("country", value)}>
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
      {hasChanges && (
        <div className="flex gap-3 pt-6 border-t border-border">
          <Button 
            onClick={handleSave}
            disabled={updateProfileMutation.isPending || updateSpecializationsMutation.isPending || updateClinicInfoMutation.isPending}
          >
            {updateProfileMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Save Changes
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
