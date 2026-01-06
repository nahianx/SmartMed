export { 
  OnboardingProvider, 
  useOnboarding, 
  RestartTourButton 
} from './OnboardingTour'

export {
  patientTour,
  doctorTour,
  nurseTour,
  adminTour,
  getTourForRole,
  hasCompletedTour,
  markTourCompleted,
  resetTourCompletion,
  type Tour,
  type TourStep,
} from '../../config/onboardingTours'
