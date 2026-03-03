// types/registration-types.ts
export interface Address {
  street: string;
  street2: string;
  city: string;
  state: string;
  zip: string;
}

export interface SeasonRegistration {
  season: string;
  year: number;
  tryoutId?: string;
  registrationDate?: Date;
  paymentComplete?: boolean;
  paymentStatus?: string;
  amountPaid?: number;
  paymentId?: string;
  paymentMethod?: string;
  cardLast4?: string;
  cardBrand?: string;
}

export interface Player {
  _id?: string;
  fullName: string;
  gender: string;
  dob: string;
  schoolName: string;
  healthConcerns: string;
  aauNumber: string;
  registrationYear?: number;
  season?: string;
  grade: string;
  isGradeOverridden?: boolean;
  paymentComplete?: boolean;
  paymentStatus?: string;
  seasons?: SeasonRegistration[];
  parentId?: string;
  _saving?: boolean;
}

export interface Guardian {
  _id?: string;
  fullName: string;
  relationship: string;
  phone: string;
  email: string;
  address: Address;
  isCoach: boolean;
  aauNumber: string;
  usePrimaryAddress?: boolean;
}

export interface Team {
  _id?: string;
  name: string;
  grade: string;
  sex: 'Male' | 'Female';
  levelOfCompetition: string;
  registrationYear: number;
  tournament: string;
  coachIds?: string[];
  paymentComplete?: boolean;
  paymentStatus?: string;
  tournaments?: TournamentRegistration[];
  isActive?: boolean;
}

export interface TournamentRegistration {
  tournament: string;
  year: number;
  tournamentId?: string;
  tournamentName?: string;
  registrationDate?: Date;
  paymentComplete?: boolean;
  paymentStatus?: string;
  amountPaid?: number;
  paymentId?: string;
  paymentMethod?: string;
  cardLast4?: string;
  cardBrand?: string;
  levelOfCompetition?: string;
}

export interface TournamentRegistrationModuleProps {
  isExistingUser?: boolean;
  existingTeams?: Team[];
  tournamentConfig?: TournamentSpecificConfig;
  coachId?: string;
  onComplete?: () => void;
  onBack?: () => void;
  formData: FormData;
  updateFormData: (newData: Partial<FormData>) => void;
  eventData?: any;
  onValidationChange?: (isValid: boolean) => void;
}

export interface UserRegistrationData {
  _id?: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  fullName: string;
  relationship: string;
  phone: string;
  address: Address;
  isCoach: boolean;
  aauNumber: string;
  agreeToTerms: boolean;
  additionalGuardians: Guardian[];
  tournamentName?: string;
  tournamentYear?: number;
  registrationType?: 'tournament' | 'tryout' | 'training' | 'player';
}

export interface Parent {
  _id: string;
  email: string;
  fullName: string;
  role: string;
  phone: string;
  address: Address | string;
  relationship: string;
  players: string[] | Player[];
  isCoach: boolean;
  aauNumber: string;
  additionalGuardians: Guardian[];
  dismissedNotifications: string[];
  playersSeason: string[];
  playersYear: number[];
  emailVerified?: boolean;
  registrationComplete?: boolean;
  paymentComplete?: boolean;
  avatar?: string;
}

export interface PlayerRegistrationData {
  players: Player[];
}

export interface TeamRegistrationData {
  team: Team;
}

export interface PaymentData {
  amount: number;
  amountInCents: number;
  playerCount?: number;
  perPlayerAmount?: number;
  token?: string;
  breakdown: {
    basePrice: number;
    subtotal: number;
    total: number;
  };
}

export interface UserRegistrationProps {
  isExistingUser?: boolean;
  initialData?: Partial<UserRegistrationData>;
  onDataChange: (data: UserRegistrationData) => void;
  showAccountFields?: boolean;
  shouldProceedAfterSubmit?: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

export interface PlayerRegistrationProps {
  players: Player[];
  onPlayersChange: (players: Player[]) => void;
  maxPlayers?: number;
  allowMultiple?: boolean;
  registrationYear: number;
  season: string;
  isExistingUser?: boolean;
  existingPlayers?: Player[];
  paidPlayers?: Player[];
  onValidationChange?: (isValid: boolean) => void;
  showCheckboxes?: boolean;
  selectedPlayerIds?: string[];
  onPlayerSelection?: (playerId: string) => void;
  onPaymentCalculation?: (playerCount: number) => void;
  parentId?: string;
  authToken?: string;
  onComplete?: () => void;
  onBack?: () => void;
  requiresPayment?: boolean;
}

export interface TeamRegistrationProps {
  initialTeam?: Partial<Team>;
  onTeamChange: (team: Team) => void;
  tournament: string;
  year: number;
  registrationYear?: number;
  isExistingUser?: boolean;
  existingTeams?: Team[];
  onValidationChange?: (isValid: boolean) => void;
}

export interface PaymentModuleProps {
  amount: number;
  customerEmail: string;
  onPaymentSuccess: (paymentResult: any) => void;
  onPaymentError: (error: string) => void;
  description?: string;
  isProcessing?: boolean;
  appId?: string;
  locationId?: string;
  onComplete?: (data: any) => void;
  onBack?: () => void;
  formData?: any;
  eventData?: {
    season: string;
    year: number;
    eventId?: string;
  };
  formConfig?: RegistrationFormConfig;
  playerCount?: number;
  selectedPackage?: PricingPackage | null;
  disabled?: boolean;
  players?: any[];
  team?: any;
  onPaymentComplete?: (successData: any) => void;
  savedUserData?: any;
  savedPlayers?: any[];
  pendingRegistrationId?: string | null;
}

export interface TermsAndConditionsProps {
  agreeToTerms: boolean;
  onAgreeToTermsChange: (agree: boolean) => void;
  validationError?: string;
  waiverModalId?: string;
}

export interface AccountCreationProps {
  onComplete: (data: { email: string; password: string }) => void;
}

export interface EmailVerificationProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
  isVerificationSent?: boolean;
}

export type RegistrationType =
  | 'tryout'
  | 'tournament'
  | 'team'
  | 'training'
  | 'season';

export type WizardStep =
  | 'account'
  | 'verifyEmail'
  | 'user'
  | 'guardian'
  | 'player'
  | 'team'
  | 'payment'
  | 'terms';

export interface RegistrationWizardProps {
  registrationType?:
    | 'player'
    | 'tournament'
    | 'training'
    | 'tryout'
    | 'team'
    | 'auto';
  eventData?: {
    season?: string;
    tournament?: string;
    year: number;
    eventId?: string;
    tryoutId?: string;
    tournamentId?: string;
  };
  onSuccess?: (data: any) => void;
  isExistingUser?: boolean;
  skipToStep?: WizardStep;
  formConfig?: RegistrationFormConfig;
  seasonEvent?: SeasonEvent;
  existingPlayers?: Player[];
}

export interface FormData {
  user?: any;
  userCompleted?: boolean;
  guardian?: Guardian;
  players?: Player[];
  teamIds?: string[];
  team?: Team;
  teams?: Team[];
  payment?: PaymentData;
  eventData?: {
    season: string;
    year: number;
    eventId?: string;
    tournamentFee?: number;
  };
  tempAccount?: {
    email: string;
    password: string;
  };
  tournamentConfig?: TournamentSpecificConfig;
}

export interface PricingPackage {
  id?: string;
  name: string;
  price: number;
  description: string;
}

export interface RegistrationFormConfig {
  _id?: any;
  eventId?: string;
  season?: string;
  year?: number;
  isActive: boolean;
  requiresPayment: boolean;
  requiresQualification: boolean;
  pricing: {
    basePrice: number;
    packages: any[];
  };
  description?: string;
  tournamentName?: string;
  tournamentYear?: number;
  displayName?: string;
  registrationDeadline?: string;
  tournamentDates?: string[];
  locations?: string[];
  divisions?: string[];
  ageGroups?: string[];
  requiresRoster?: boolean;
  requiresInsurance?: boolean;
  paymentDeadline?: string;
  refundPolicy?: string;
  rulesDocumentUrl?: string;
  scheduleDocumentUrl?: string;
  tournamentFee?: number;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  tryoutDates?: string[];
  tryoutLocations?: string[];
  tryoutFee?: number;
  tryoutName?: string;
  tryoutYear?: number;
}

export interface SeasonEvent {
  _id?: string;
  season: string;
  year: number;
  eventId: string;
  description?: string;
  pricing?: Pricing;
  registrationOpens?: Date;
  registrationCloses?: Date;
  createdAt?: Date;
}

export interface Pricing {
  basePrice: number;
  packages: PricingPackage[];
}

export interface Qualification {
  _id?: string;
  user: string;
  season: string;
  year: number;
  status: 'passed' | 'failed' | 'pending';
  qualifiedAt?: Date;
  createdAt?: Date;
}

export interface EnhancedRegistrationWizardProps {
  registrationType: RegistrationType;
  seasonEvent: SeasonEvent;
  formConfig: RegistrationFormConfig;
  isExistingUser?: boolean;
  existingPlayers?: Player[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export interface WizardStepCommonProps {
  onComplete?: (data?: Partial<FormData>) => void;
  onBack?: () => void;
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  eventData?: {
    season: string;
    year: number;
    eventId?: string;
    tournamentFee?: number;
  };
  isExistingUser?: boolean;
  shouldProceedAfterSubmit?: boolean;
  formConfig?: RegistrationFormConfig;
  seasonEvent?: SeasonEvent;
  onValidationChange?: (isValid: boolean) => void;
  tournamentConfig?: TournamentSpecificConfig;
}

export interface AdminRegistrationConfig {
  seasonEvent: SeasonEvent;
  formConfig: RegistrationFormConfig;
}

export interface RegistrationContextType {
  activeRegistrations: AdminRegistrationConfig[];
  isLoading: boolean;
  refreshRegistrations: () => Promise<void>;
}

export interface TournamentSpecificConfig {
  _id?: any;
  tournamentId?: string;
  tournamentName: string;
  tournamentYear: number;
  displayName?: string;
  description?: string;
  registrationDeadline: string;
  tournamentDates: string[];
  locations: string[];
  divisions: string[];
  ageGroups: string[];
  requiresRoster: boolean;
  requiresInsurance: boolean;
  paymentDeadline: string;
  refundPolicy: string;
  rulesDocumentUrl: string;
  scheduleDocumentUrl: string;
  tournamentFee: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface TryoutSpecificConfig {
  _id?: any;
  tryoutName: string;
  tryoutYear: number;
  displayName?: string;
  eventId?: string;
  season?: string;
  description?: string;
  registrationDeadline: string;
  tryoutDates: string[];
  locations: string[];
  divisions?: string[];
  ageGroups?: string[];
  requiresPayment: boolean;
  requiresRoster?: boolean;
  requiresInsurance?: boolean;
  paymentDeadline?: string;
  refundPolicy?: string;
  tryoutFee: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}
