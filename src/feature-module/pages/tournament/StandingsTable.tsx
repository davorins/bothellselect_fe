// feature-module/pages/tournament/StandingsTable.tsx
import React, { useState, useEffect } from 'react';
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Award,
  Star,
  ChevronUp,
  ChevronDown,
  Minus,
  Target,
  Hash,
  Filter,
} from 'lucide-react';

interface StandingsTableProps {
  tournament: any;
  matches: any[];
  viewMode: 'grid' | 'list' | 'detailed';
}

interface StandingRow {
  position: number;
  team: any;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  winRate: number;
  recentForm: string[];
}

export default function StandingsTable({
  tournament,
  matches,
  viewMode,
}: StandingsTableProps) {
  const [standings, setStandings] = useState<StandingRow[]>([]);
  const [sortBy, setSortBy] = useState<string>('points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    calculateStandings();
  }, [tournament, matches]);

  const calculateStandings = () => {
    const teamStats = new Map<string, StandingRow>();

    // Initialize teams
    tournament.registeredTeams.forEach((team: any) => {
      teamStats.set(team._id, {
        position: 0,
        team,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        winRate: 0,
        recentForm: [],
      });
    });

    // Process completed matches
    const completedMatches = matches.filter((m) => m.status === 'completed');

    completedMatches.forEach((match) => {
      if (match.team1 && match.team2) {
        const team1Id = match.team1._id;
        const team2Id = match.team2._id;

        const team1Stats = teamStats.get(team1Id);
        const team2Stats = teamStats.get(team2Id);

        if (team1Stats && team2Stats) {
          // Update matches played
          team1Stats.matchesPlayed++;
          team2Stats.matchesPlayed++;

          // Update goals
          team1Stats.goalsFor += match.team1Score;
          team1Stats.goalsAgainst += match.team2Score;
          team2Stats.goalsFor += match.team2Score;
          team2Stats.goalsAgainst += match.team1Score;

          // Update results and points
          if (match.team1Score > match.team2Score) {
            team1Stats.wins++;
            team1Stats.points += tournament.settings.pointsPerWin;
            team2Stats.losses++;
            team2Stats.points += tournament.settings.pointsPerLoss;
            team1Stats.recentForm.push('W');
            team2Stats.recentForm.push('L');
          } else if (match.team1Score < match.team2Score) {
            team2Stats.wins++;
            team2Stats.points += tournament.settings.pointsPerWin;
            team1Stats.losses++;
            team1Stats.points += tournament.settings.pointsPerLoss;
            team1Stats.recentForm.push('L');
            team2Stats.recentForm.push('W');
          } else {
            team1Stats.draws++;
            team2Stats.draws++;
            team1Stats.points += tournament.settings.pointsPerDraw;
            team2Stats.points += tournament.settings.pointsPerDraw;
            team1Stats.recentForm.push('D');
            team2Stats.recentForm.push('D');
          }

          // Update goal difference
          team1Stats.goalDifference =
            team1Stats.goalsFor - team1Stats.goalsAgainst;
          team2Stats.goalDifference =
            team2Stats.goalsFor - team2Stats.goalsAgainst;

          // Update win rate
          team1Stats.winRate =
            team1Stats.matchesPlayed > 0
              ? (team1Stats.wins / team1Stats.matchesPlayed) * 100
              : 0;
          team2Stats.winRate =
            team2Stats.matchesPlayed > 0
              ? (team2Stats.wins / team2Stats.matchesPlayed) * 100
              : 0;
        }
      }
    });

    // Convert to array and sort
    let standingsArray = Array.from(teamStats.values());

    // Sort based on current sort criteria
    standingsArray.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'position':
          comparison = a.position - b.position;
          break;
        case 'team':
          comparison = a.team.name.localeCompare(b.team.name);
          break;
        case 'points':
          comparison = b.points - a.points;
          break;
        case 'goalDifference':
          comparison = b.goalDifference - a.goalDifference;
          break;
        case 'goalsFor':
          comparison = b.goalsFor - a.goalsFor;
          break;
        case 'winRate':
          comparison = b.winRate - a.winRate;
          break;
        default:
          comparison = b.points - a.points;
      }

      return sortOrder === 'desc' ? comparison : -comparison;
    });

    // Assign positions
    standingsArray = standingsArray.map((row, index) => ({
      ...row,
      position: index + 1,
      recentForm: row.recentForm.slice(-5), // Last 5 matches
    }));

    setStandings(standingsArray);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <Minus className='w-4 h-4 text-gray-400' />;
    return sortOrder === 'desc' ? (
      <ChevronDown className='w-4 h-4' />
    ) : (
      <ChevronUp className='w-4 h-4' />
    );
  };

  const renderFormBadge = (result: string) => {
    const config = {
      W: { color: 'bg-green-100 text-green-800', label: 'Win' },
      L: { color: 'bg-red-100 text-red-800', label: 'Loss' },
      D: { color: 'bg-yellow-100 text-yellow-800', label: 'Draw' },
    }[result];

    const badgeConfig = config || {
      color: 'bg-gray-100 text-gray-800',
      label: 'N/A',
    };

    return (
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${badgeConfig.color}`}
      >
        {result}
      </div>
    );
  };

  const getPositionColor = (position: number) => {
    if (position === 1)
      return 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-200';
    if (position === 2)
      return 'bg-gradient-to-r from-gray-100 to-gray-50 border-gray-200';
    if (position === 3)
      return 'bg-gradient-to-r from-amber-100 to-amber-50 border-amber-200';
    return 'bg-white';
  };

  if (viewMode === 'grid') {
    return (
      <div className='p-6'>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {standings.map((row) => (
            <div
              key={row.team._id}
              className={`border rounded-xl p-4 ${getPositionColor(
                row.position
              )}`}
            >
              <div className='flex items-center justify-between mb-4'>
                <div className='flex items-center gap-3'>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                      row.position === 1
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                        : row.position === 2
                        ? 'bg-gradient-to-r from-gray-400 to-gray-600'
                        : row.position === 3
                        ? 'bg-gradient-to-r from-amber-600 to-amber-700'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    }`}
                  >
                    {row.position}
                  </div>
                  <div>
                    <div className='font-bold text-gray-900'>
                      {row.team.name}
                    </div>
                    <div className='text-sm text-gray-600'>
                      {row.team.grade}
                    </div>
                  </div>
                </div>
                <div className='text-right'>
                  <div className='text-2xl font-bold text-gray-900'>
                    {row.points}
                  </div>
                  <div className='text-xs text-gray-500'>PTS</div>
                </div>
              </div>

              <div className='grid grid-cols-3 gap-2 mb-4'>
                <div className='text-center p-2 bg-gray-50 rounded'>
                  <div className='font-bold'>{row.wins}</div>
                  <div className='text-xs text-gray-600'>W</div>
                </div>
                <div className='text-center p-2 bg-gray-50 rounded'>
                  <div className='font-bold'>{row.draws}</div>
                  <div className='text-xs text-gray-600'>D</div>
                </div>
                <div className='text-center p-2 bg-gray-50 rounded'>
                  <div className='font-bold'>{row.losses}</div>
                  <div className='text-xs text-gray-600'>L</div>
                </div>
              </div>

              <div className='flex items-center justify-between text-sm'>
                <div className='text-gray-600'>
                  GD:{' '}
                  <span
                    className={`font-bold ${
                      row.goalDifference > 0
                        ? 'text-green-600'
                        : row.goalDifference < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {row.goalDifference > 0 ? '+' : ''}
                    {row.goalDifference}
                  </span>
                </div>
                <div className='text-gray-600'>
                  GF: <span className='font-bold'>{row.goalsFor}</span>
                </div>
                <div className='text-gray-600'>
                  GA: <span className='font-bold'>{row.goalsAgainst}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Detailed/List view - Table format
  return (
    <div className='p-6'>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h3 className='text-lg font-semibold text-gray-900'>
            Tournament Standings
          </h3>
          <p className='text-sm text-gray-600'>
            Points: Win ({tournament.settings.pointsPerWin}), Draw (
            {tournament.settings.pointsPerDraw}), Loss (
            {tournament.settings.pointsPerLoss})
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <button
            onClick={() => handleSort('points')}
            className='px-3 py-1 text-sm bg-gray-100 rounded-lg flex items-center gap-1'
          >
            Sort by Points {getSortIcon('points')}
          </button>
        </div>
      </div>

      <div className='overflow-x-auto'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                #
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Team
              </th>
              <th
                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100'
                onClick={() => handleSort('matchesPlayed')}
              >
                <div className='flex items-center gap-1'>
                  MP {getSortIcon('matchesPlayed')}
                </div>
              </th>
              <th
                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100'
                onClick={() => handleSort('wins')}
              >
                <div className='flex items-center gap-1'>
                  W {getSortIcon('wins')}
                </div>
              </th>
              <th
                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100'
                onClick={() => handleSort('draws')}
              >
                <div className='flex items-center gap-1'>
                  D {getSortIcon('draws')}
                </div>
              </th>
              <th
                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100'
                onClick={() => handleSort('losses')}
              >
                <div className='flex items-center gap-1'>
                  L {getSortIcon('losses')}
                </div>
              </th>
              <th
                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100'
                onClick={() => handleSort('points')}
              >
                <div className='flex items-center gap-1'>
                  PTS {getSortIcon('points')}
                </div>
              </th>
              <th
                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100'
                onClick={() => handleSort('goalDifference')}
              >
                <div className='flex items-center gap-1'>
                  GD {getSortIcon('goalDifference')}
                </div>
              </th>
              <th
                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100'
                onClick={() => handleSort('goalsFor')}
              >
                <div className='flex items-center gap-1'>
                  GF {getSortIcon('goalsFor')}
                </div>
              </th>
              <th
                className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100'
                onClick={() => handleSort('goalsAgainst')}
              >
                <div className='flex items-center gap-1'>
                  GA {getSortIcon('goalsAgainst')}
                </div>
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                Form
              </th>
            </tr>
          </thead>
          <tbody className='bg-white divide-y divide-gray-200'>
            {standings.map((row) => (
              <tr
                key={row.team._id}
                className={`hover:bg-gray-50 ${getPositionColor(row.position)}`}
              >
                <td className='px-6 py-4 whitespace-nowrap'>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      row.position === 1
                        ? 'bg-yellow-100 text-yellow-800'
                        : row.position === 2
                        ? 'bg-gray-100 text-gray-800'
                        : row.position === 3
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {row.position}
                  </div>
                </td>
                <td className='px-6 py-4 whitespace-nowrap'>
                  <div className='flex items-center'>
                    <div className='flex-shrink-0 h-10 w-10'>
                      <div className='h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold'>
                        {row.team.name.charAt(0)}
                      </div>
                    </div>
                    <div className='ml-4'>
                      <div className='text-sm font-medium text-gray-900'>
                        {row.team.name}
                      </div>
                      <div className='text-sm text-gray-500'>
                        {row.team.grade}
                      </div>
                    </div>
                  </div>
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center'>
                  {row.matchesPlayed}
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-sm text-green-600 font-bold text-center'>
                  {row.wins}
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-sm text-yellow-600 font-bold text-center'>
                  {row.draws}
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold text-center'>
                  {row.losses}
                </td>
                <td className='px-6 py-4 whitespace-nowrap'>
                  <div className='text-lg font-bold text-gray-900 text-center'>
                    {row.points}
                  </div>
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-center'>
                  <span
                    className={`text-sm font-bold ${
                      row.goalDifference > 0
                        ? 'text-green-600'
                        : row.goalDifference < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {row.goalDifference > 0 ? '+' : ''}
                    {row.goalDifference}
                  </span>
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center'>
                  {row.goalsFor}
                </td>
                <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center'>
                  {row.goalsAgainst}
                </td>
                <td className='px-6 py-4 whitespace-nowrap'>
                  <div className='flex gap-1'>
                    {row.recentForm.map((result, index) => (
                      <div key={index}>{renderFormBadge(result)}</div>
                    ))}
                    {row.recentForm.length === 0 && (
                      <span className='text-sm text-gray-400'>-</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {standings.length === 0 && (
        <div className='text-center py-12'>
          <Trophy className='w-12 h-12 text-gray-400 mx-auto mb-4' />
          <h3 className='text-lg font-semibold text-gray-700 mb-2'>
            No standings available
          </h3>
          <p className='text-gray-500'>
            Standings will appear after matches are played
          </p>
        </div>
      )}
    </div>
  );
}
