// types/tournament.ts
export interface Team {
  _id: string;
  name: string;
  grade: string;
  sex: string;
  levelOfCompetition: 'Gold' | 'Silver';
  tournament: string;
  tournaments: Array<{
    tournament: string;
    year: number;
    registrationDate: string;
    paymentComplete: boolean;
    paymentStatus: string;
    levelOfCompetition?: string;
    amountPaid?: number;
  }>;
  coachIds: any[];
  isActive: boolean;
  registrationYear?: number;
  paymentComplete?: boolean;
  paymentStatus?: string;
}

export interface Match {
  _id: string;
  round: number;
  matchNumber: number;
  team1?: Team | null;
  team2?: Team | null;
  team1Score: number;
  team2Score: number;
  winner?: Team | null;
  loser?: Team | null;
  status:
    | 'scheduled'
    | 'in-progress'
    | 'completed'
    | 'cancelled'
    | 'walkover'
    | 'bye';
  scheduledTime?: string;
  court?: string;
  nextMatch?: string;
  bracketType?: 'winners' | 'losers' | 'final';
  [key: string]: any;
}

// Base tournament interface with common properties
export interface BaseTournament {
  _id?: string;
  name: string;
  year: number;
  status: string;
  description?: string;
  maxTeams?: number;
  minTeams?: number;
  format?: string;
  startDate?: string;
  endDate?: string;
  levelOfCompetition: string;
  sex: string;
  settings?: any;
  createdBy?: string;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
}

// Tournament from teams (extracted from team registrations)
export interface TournamentFromTeams extends BaseTournament {
  teams: Team[];
  teamCount: number;
  registeredTeams?: Team[]; // Alias for teams
  source?: 'teams_collection' | 'database';
}

// Database tournament (stored in tournaments collection)
export interface DatabaseTournament extends BaseTournament {
  _id: string;
  registeredTeams: string[] | Team[]; // Array of ObjectIds or populated teams
  groups?: any[];
  brackets?: any;
}

// Union type for tournament
export type Tournament = TournamentFromTeams | DatabaseTournament;

export interface Standing {
  team: Team;
  played: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifference: number;
  points: number;
  rank: number;
}

export interface TournamentData {
  name: string;
  description?: string;
  year: number;
  startDate: string;
  endDate: string;
  status?: 'draft' | 'open' | 'ongoing' | 'completed' | 'cancelled';
  levelOfCompetition: 'Gold' | 'Silver' | 'All';
  sex: 'Male' | 'Female' | 'Mixed';
  format:
    | 'single-elimination'
    | 'double-elimination'
    | 'round-robin'
    | 'group-stage';
  maxTeams: number;
  minTeams: number;
  settings?: {
    pointsPerWin?: number;
    pointsPerDraw?: number;
    pointsPerLoss?: number;
    matchDuration?: number;
    breakDuration?: number;
  };
}

export interface MatchData {
  team1Score?: number;
  team2Score?: number;
  status?: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'walkover';
  winner?: string;
  notes?: string;
}

export interface ScheduleData {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  courts: string[];
}

// Helper type guards
export function isTournamentFromTeams(
  tournament: Tournament
): tournament is TournamentFromTeams {
  return (tournament as TournamentFromTeams).teams !== undefined;
}

export function isDatabaseTournament(
  tournament: Tournament
): tournament is DatabaseTournament {
  return (
    (tournament as DatabaseTournament)._id !== undefined &&
    !(tournament as TournamentFromTeams).teams
  );
}

export interface RoundProgress {
  round: number;
  totalMatches: number;
  completedMatches: number;
  completionPercentage: number;
  winningTeamsCount: number;
  isComplete: boolean;
  winningTeams: Team[];
  hasByes: boolean;
}

export interface TournamentProgressData {
  progress: RoundProgress[];
  currentRound: number;
  totalRounds: number;
  tournamentStatus: string;
  currentRoundStats: {
    totalMatches: number;
    completedMatches: number;
    winningTeamsCount: number;
    allMatchesHaveWinners: boolean;
    canAdvance: boolean;
    isFinalRound: boolean;
  };
  rounds: number[];
  nextRound: number;
  nextRoundExists: boolean;
}

export interface RoundSummary {
  round: number;
  totalMatches: number;
  scheduledMatches: number;
  inProgressMatches: number;
  completedMatches: number;
  walkoverMatches: number;
  byeMatches: number;
  cancelledMatches: number;
  matchesWithWinners: number;
  matchesWithoutWinners: number;
  isRoundComplete: boolean;
  canAdvance: boolean;
  tournamentStatus: string;
  nextRound: number;
  nextRoundExists: boolean;
  winningTeams: Array<{
    id: string;
    name: string;
    matchId: string;
    matchNumber: number;
  }>;
  incompleteMatches: Array<{
    matchId: string;
    matchNumber: number;
    teams: string;
    status: string;
  }>;
  isFinalRound?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  tournament?: Tournament;
  teams?: Team[];
  matches?: Match[];
  standings?: Standing[];
  progress?: TournamentProgressData;
  summary?: RoundSummary;
  [key: string]: any;
}
