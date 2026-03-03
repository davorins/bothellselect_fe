// services/tournamentApi.ts
import axios, { AxiosResponse, AxiosError } from 'axios';
import {
  Tournament,
  Team,
  Match,
  Standing,
  TournamentData,
  MatchData,
  ScheduleData,
  ApiResponse,
  TournamentFromTeams,
} from '../types/tournament';

const API_URL =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

const getAuthHeader = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json',
  },
});

const tournamentApi = {
  // Get tournaments extracted from teams
  getTournamentsFromTeams: (): Promise<AxiosResponse<ApiResponse>> =>
    axios.get(`${API_URL}/tournaments/from-teams`, getAuthHeader()),

  // Get tournament by name and year
  getTournamentByName: (
    name: string,
    year: number
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.get(
      `${API_URL}/tournaments/by-name/${encodeURIComponent(name)}/${year}`,
      getAuthHeader()
    ),

  // Create tournament from teams
  createTournamentFromTeams: (
    name: string,
    year: number
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.post(
      `${API_URL}/tournaments/create-from-teams`,
      { name, year },
      getAuthHeader()
    ),

  // Get teams from collection for a tournament
  getTeamsFromCollection: (
    name: string,
    year: number
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.get(
      `${API_URL}/tournaments/${encodeURIComponent(
        name
      )}/${year}/teams-from-collection`,
      getAuthHeader()
    ),

  // Tournament CRUD (existing)
  createTournament: (
    data: TournamentData
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.post(`${API_URL}/tournaments`, data, getAuthHeader()),

  getTournaments: (params?: any): Promise<AxiosResponse<ApiResponse>> =>
    axios.get(`${API_URL}/tournaments`, {
      ...getAuthHeader(),
      params,
    }),

  getTournament: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    axios.get(`${API_URL}/tournaments/${id}`, getAuthHeader()),

  updateTournament: (
    id: string,
    data: Partial<TournamentData>
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.put(`${API_URL}/tournaments/${id}`, data, getAuthHeader()),

  deleteTournament: (id: string): Promise<AxiosResponse<ApiResponse>> =>
    axios.delete(`${API_URL}/tournaments/${id}`, getAuthHeader()),

  // Team Management
  addTeamToTournament: (
    tournamentId: string,
    teamId: string
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.post(
      `${API_URL}/tournaments/${tournamentId}/teams/${teamId}`,
      {},
      getAuthHeader()
    ),

  removeTeamFromTournament: (
    tournamentId: string,
    teamId: string
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.delete(
      `${API_URL}/tournaments/${tournamentId}/teams/${teamId}`,
      getAuthHeader()
    ),

  getEligibleTeams: (
    tournamentId: string
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.get(
      `${API_URL}/tournaments/${tournamentId}/eligible-teams`,
      getAuthHeader()
    ),

  // Bracket Management
  generateBrackets: (
    tournamentId: string,
    format?: string
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.post(
      `${API_URL}/tournaments/${tournamentId}/generate-brackets`,
      { format },
      getAuthHeader()
    ),

  generateSchedule: (
    tournamentId: string,
    scheduleData: ScheduleData
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.post(
      `${API_URL}/tournaments/${tournamentId}/generate-schedule`,
      scheduleData,
      getAuthHeader()
    ),

  // Match Management
  updateMatch: (
    matchId: string,
    data: MatchData
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.put(`${API_URL}/tournaments/match/${matchId}`, data, getAuthHeader()),

  // Tournament Lifecycle
  startTournament: (
    tournamentId: string
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.put(
      `${API_URL}/tournaments/${tournamentId}/start`,
      {},
      getAuthHeader()
    ),

  completeTournament: (
    tournamentId: string
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.put(
      `${API_URL}/tournaments/${tournamentId}/complete`,
      {},
      getAuthHeader()
    ),

  // Data Retrieval
  getStandings: (tournamentId: string): Promise<AxiosResponse<ApiResponse>> =>
    axios.get(
      `${API_URL}/tournaments/${tournamentId}/standings`,
      getAuthHeader()
    ),

  getSchedule: (
    tournamentId: string,
    params?: any
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.get(`${API_URL}/tournaments/${tournamentId}/schedule`, {
      ...getAuthHeader(),
      params,
    }),

  // Get registered teams
  getRegisteredTeams: (
    tournamentId: string
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.get(
      `${API_URL}/tournaments/${tournamentId}/registered-teams`,
      getAuthHeader()
    ),

  // Batch add teams
  addTeamsToTournamentBatch: (
    tournamentId: string,
    teamIds: string[]
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.post(
      `${API_URL}/tournaments/${tournamentId}/teams/batch`,
      { teamIds },
      getAuthHeader()
    ),

  // Manual bracket management
  createManualBracket: (
    tournamentId: string,
    round: number,
    matches: any[]
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.post(
      `${API_URL}/tournaments/${tournamentId}/bracket/round/${round}`,
      { matches },
      getAuthHeader()
    ),

  getBracketMatches: (
    tournamentId: string,
    round: number
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.get(
      `${API_URL}/tournaments/${tournamentId}/bracket/round/${round}`,
      getAuthHeader()
    ),

  clearRoundMatches: (
    tournamentId: string,
    round: number
  ): Promise<AxiosResponse<ApiResponse>> =>
    axios.delete(
      `${API_URL}/tournaments/${tournamentId}/bracket/round/${round}`,
      getAuthHeader()
    ),

  // Utility function to handle API errors
  handleError: (
    error: AxiosError | any
  ): { success: boolean; message: string; data?: any } => {
    if (error.response) {
      return {
        success: false,
        message: error.response.data?.message || 'An error occurred',
        data: error.response.data,
      };
    } else if (error.request) {
      return {
        success: false,
        message: 'No response from server. Please check your connection.',
      };
    } else {
      return {
        success: false,
        message: error.message || 'An unexpected error occurred',
      };
    }
  },
};

export default tournamentApi;
