// types/teamTypes.ts
export interface InternalTeam {
  _id: string;
  name: string;
  year: number;
  grade: string;
  gender: 'Male' | 'Female';
  coachIds: string[];
  playerIds: string[];
  status: 'active' | 'inactive';
  tryoutSeason: string;
  tryoutYear: number;
  notes: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface InternalTeamFormData {
  name: string;
  year: number;
  grade: string;
  gender: 'Male' | 'Female';
  coachIds: string[];
  playerIds: string[];
  tryoutSeason: string;
  tryoutYear: number;
  notes?: string;
}

export interface InternalTeamTableData {
  id: string;
  key: string;
  name: string;
  year: number;
  grade: string;
  gender: string;
  coachCount: number;
  playerCount: number;
  status: string;
  tryoutSeason: string;
  tryoutYear: number;
}
