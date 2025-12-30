// React Query hooks for profile management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { profileApi, doctorApi, patientApi } from '@/services/api'
import { useAuthStore } from '@/store/auth'
import { User, Doctor, Patient, DoctorAvailability, Specialization } from '@smartmed/types'

// Query keys
export const queryKeys = {
  profile: ['profile'] as const,
  doctorProfile: ['doctor', 'profile'] as const,
  patientProfile: ['patient', 'profile'] as const,
  doctorAvailability: ['doctor', 'availability'] as const,
  preferredDoctors: ['patient', 'preferred-doctors'] as const,
  doctorSearch: (query?: string, specialization?: string, location?: string) =>
    ['doctor', 'search', query, specialization, location] as const,
  specializations: ['specializations'] as const
}

// Profile hooks
export const useProfile = (userId?: string) => {
  return useQuery({
    queryKey: [...queryKeys.profile, userId ?? 'self'],
    queryFn: () => profileApi.getProfile(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  const updateUser = useAuthStore((state: any) => state.updateUser)

  return useMutation({
    mutationFn: profileApi.updateProfile,
    onSuccess: (updatedUser) => {
      // Update cache
      queryClient.setQueryData(queryKeys.profile, updatedUser)
      // Update auth store
      updateUser(updatedUser)
      toast.success('Profile updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profile')
    }
  })
}

export const useUploadProfilePhoto = () => {
  const queryClient = useQueryClient()
  const updateUser = useAuthStore((state: any) => state.updateUser)

  return useMutation({
    mutationFn: profileApi.uploadPhoto,
    onSuccess: (data) => {
      // Update profile in cache
      queryClient.setQueryData(queryKeys.profile, (old: User | undefined) => 
        old ? { ...old, profilePhotoUrl: data.profilePhotoUrl } : old
      )
      // Update auth store
      updateUser({ profilePhotoUrl: data.profilePhotoUrl })
      toast.success('Profile photo uploaded successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to upload photo')
    }
  })
}

export const useRemoveProfilePhoto = () => {
  const queryClient = useQueryClient()
  const updateUser = useAuthStore((state: any) => state.updateUser)

  return useMutation({
    mutationFn: profileApi.removePhoto,
    onSuccess: () => {
      // Update profile in cache
      queryClient.setQueryData(queryKeys.profile, (old: User | undefined) => 
        old ? { ...old, profilePhotoUrl: null } : old
      )
      // Update auth store
      updateUser({ profilePhotoUrl: null })
      toast.success('Profile photo removed successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove photo')
    }
  })
}

export const useChangePassword = () => {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      profileApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast.success('Password changed successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to change password')
    }
  })
}

export const useToggleMFA = () => {
  const queryClient = useQueryClient()
  const updateUser = useAuthStore((state: any) => state.updateUser)

  return useMutation({
    mutationFn: profileApi.toggleMFA,
    onSuccess: (_, enabled) => {
      // Update profile in cache
      queryClient.setQueryData(queryKeys.profile, (old: User | undefined) => 
        old ? { ...old, isMfaEnabled: enabled } : old
      )
      // Update auth store
      updateUser({ isMfaEnabled: enabled })
      const isEnabled = Boolean(enabled)
      toast.success(`MFA ${isEnabled ? 'enabled' : 'disabled'} successfully`)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to toggle MFA')
    }
  })
}

// Doctor hooks
export const useDoctorProfile = (userId?: string, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.doctorProfile,
    queryFn: () => doctorApi.getDoctorProfile(userId),
    enabled,
    staleTime: 5 * 60 * 1000,
  })
}

export const useDoctorSearch = (
  query?: string,
  specialization?: string,
  location?: string
) => {
  return useQuery({
    queryKey: queryKeys.doctorSearch(query, specialization, location),
    queryFn: () => doctorApi.searchDoctors(query, specialization, location),
    enabled: !!(query || specialization || location), // Only fetch if there's a search term
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export const useSpecializations = () => {
  return useQuery({
    queryKey: queryKeys.specializations,
    queryFn: doctorApi.getSpecializations,
    staleTime: 30 * 60 * 1000, // 30 minutes - specializations don't change often
  })
}

export const useUpdateSpecializations = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: doctorApi.updateSpecializations,
    onSuccess: () => {
      // Invalidate doctor profile to refetch updated data
      queryClient.invalidateQueries({ queryKey: queryKeys.doctorProfile })
      toast.success('Specializations updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update specializations')
    }
  })
}

export const useUpdateClinicInfo = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: doctorApi.updateClinicInfo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.doctorProfile })
      toast.success('Clinic information updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update clinic information')
    }
  })
}

export const useDoctorAvailability = () => {
  return useQuery({
    queryKey: queryKeys.doctorAvailability,
    queryFn: doctorApi.getAvailability,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}

export const useUpdateAvailability = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: doctorApi.updateAvailability,
    onSuccess: (updatedAvailability) => {
      // Update cache with new availability
      queryClient.setQueryData(queryKeys.doctorAvailability, updatedAvailability)
      toast.success('Availability updated successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update availability')
    }
  })
}

export const useDeleteAvailabilitySlot = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: doctorApi.deleteAvailabilitySlot,
    onSuccess: () => {
      // Refetch availability after deletion
      queryClient.invalidateQueries({ queryKey: queryKeys.doctorAvailability })
      toast.success('Availability slot deleted successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete availability slot')
    }
  })
}

// Patient hooks
export const usePatientProfile = () => {
  return useQuery({
    queryKey: queryKeys.patientProfile,
    queryFn: patientApi.getPatientProfile,
    staleTime: 5 * 60 * 1000,
  })
}

export const usePreferredDoctors = () => {
  return useQuery({
    queryKey: queryKeys.preferredDoctors,
    queryFn: patientApi.getPreferredDoctors,
    staleTime: 5 * 60 * 1000,
  })
}

export const useAddPreferredDoctor = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: patientApi.addPreferredDoctor,
    onSuccess: () => {
      // Refetch preferred doctors list
      queryClient.invalidateQueries({ queryKey: queryKeys.preferredDoctors })
      toast.success('Doctor added to preferences successfully')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add preferred doctor')
    }
  })
}

export const useRemovePreferredDoctor = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: patientApi.removePreferredDoctor,
    onSuccess: () => {
      // Refetch preferred doctors list
      queryClient.invalidateQueries({ queryKey: queryKeys.preferredDoctors })
      toast.success('Doctor removed from preferences')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove preferred doctor')
    }
  })
}
