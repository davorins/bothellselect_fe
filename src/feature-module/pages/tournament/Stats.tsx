// feature-module/pages/tournament/Stats.tsx
import React, { useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Target,
  Clock,
  Zap,
  Award,
  Users,
  Trophy,
  Star,
  TrendingDown,
  Calendar,
  Hash,
  LucideIcon,
} from 'lucide-react';

interface TournamentStatsProps {
  tournament: any;
  matches: any[];
  className?: string;
}

type ColorType = 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'gray';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: ColorType;
  trend?: number;
  description?: string;
}

export default function TournamentStats({
  tournament,
  matches,
  className = '',
}: TournamentStatsProps) {
  // Calculate tournament statistics
  const stats = useMemo(() => {
    const completedMatches = matches.filter((m) => m.status === 'completed');
    const liveMatches = matches.filter((m) => m.status === 'in-progress');
    const upcomingMatches = matches.filter((m) => m.status === 'scheduled');

    const totalPointsScored = completedMatches.reduce(
      (sum: number, match: any) =>
        sum + (match.team1Score || 0) + (match.team2Score || 0),
      0
    );

    const averagePointsPerMatch =
      completedMatches.length > 0
        ? totalPointsScored / completedMatches.length
        : 0;

    // Find highest scoring match
    const highestScoringMatch = [...completedMatches].sort(
      (a, b) =>
        (b.team1Score || 0) +
        (b.team2Score || 0) -
        ((a.team1Score || 0) + (a.team2Score || 0))
    )[0];

    // Find closest match
    const closestMatch = [...completedMatches].sort(
      (a, b) =>
        Math.abs((a.team1Score || 0) - (a.team2Score || 0)) -
        Math.abs((b.team1Score || 0) - (b.team2Score || 0))
    )[0];

    // Calculate team performances
    const teamStats = (tournament.registeredTeams || []).map((team: any) => {
      const teamMatches = completedMatches.filter(
        (m: any) => m.team1?._id === team._id || m.team2?._id === team._id
      );
      const wins = teamMatches.filter(
        (m: any) => m.winner?._id === team._id
      ).length;

      return {
        team,
        matches: teamMatches.length,
        wins,
        winRate: teamMatches.length > 0 ? (wins / teamMatches.length) * 100 : 0,
      };
    });

    const bestTeam =
      teamStats.length > 0
        ? [...teamStats].sort((a, b) => b.winRate - a.winRate)[0]
        : null;
    const mostActiveTeam =
      teamStats.length > 0
        ? [...teamStats].sort((a, b) => b.matches - a.matches)[0]
        : null;

    // Calculate match distribution by round
    const matchesByRound = completedMatches.reduce(
      (acc: Record<number, number>, match: any) => {
        const round = match.round || 1;
        acc[round] = (acc[round] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );

    const mostActiveRound = Object.entries(matchesByRound).sort(
      ([, a], [, b]) => (b as number) - (a as number)
    )[0] as [string, number] | undefined;

    const teamsByLevel = (tournament.registeredTeams || []).reduce(
      (acc: Record<string, number>, team: any) => {
        const level = team.levelOfCompetition || 'Unknown';
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      },
      {}
    );

    return {
      completedMatches: completedMatches.length,
      liveMatches: liveMatches.length,
      upcomingMatches: upcomingMatches.length,
      totalMatches: matches.length,
      totalPointsScored,
      averagePointsPerMatch: averagePointsPerMatch.toFixed(1),
      highestScoringMatch,
      closestMatch,
      bestTeam,
      mostActiveTeam,
      mostActiveRound,
      completionRate:
        matches.length > 0
          ? (completedMatches.length / matches.length) * 100
          : 0,
      averageMatchDuration: tournament.settings?.matchDuration || 40,
      teamsCount: tournament.registeredTeams?.length || 0,
      teamsByLevel,
    };
  }, [tournament, matches]);

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color = 'blue',
    trend,
    description,
  }: StatCardProps) => {
    const colorClasses: Record<ColorType, string> = {
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      purple: 'bg-purple-50 text-purple-700 border-purple-200',
      yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      red: 'bg-red-50 text-red-700 border-red-200',
      gray: 'bg-gray-50 text-gray-700 border-gray-200',
    };

    const iconColor: Record<ColorType, string> = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      purple: 'text-purple-600',
      yellow: 'text-yellow-600',
      red: 'text-red-600',
      gray: 'text-gray-600',
    };

    return (
      <div className={`p-4 rounded-xl border ${colorClasses[color]}`}>
        <div className='flex items-center justify-between mb-2'>
          <div>
            <div className='text-sm font-medium opacity-90'>{title}</div>
            <div className='text-2xl font-bold mt-1'>{value}</div>
          </div>
          <div className={`p-2 rounded-lg ${iconColor[color]} bg-white/50`}>
            <Icon className='w-6 h-6' />
          </div>
        </div>
        {trend !== undefined && (
          <div className='flex items-center gap-1 text-sm mt-2'>
            {trend > 0 ? (
              <>
                <TrendingUp className='w-4 h-4' />
                <span>+{trend}% from average</span>
              </>
            ) : (
              <>
                <TrendingDown className='w-4 h-4' />
                <span>{trend}% from average</span>
              </>
            )}
          </div>
        )}
        {description && (
          <div className='text-xs opacity-75 mt-2'>{description}</div>
        )}
      </div>
    );
  };

  interface ProgressBarProps {
    value: number;
    max?: number;
    color?: ColorType;
    label: string;
  }

  const ProgressBar = ({
    value,
    max = 100,
    color = 'blue',
    label,
  }: ProgressBarProps) => {
    const percentage = (value / max) * 100;
    const colorClasses: Record<ColorType, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
      gray: 'bg-gray-500',
    };

    return (
      <div className='space-y-1'>
        <div className='flex justify-between text-sm'>
          <span className='font-medium text-gray-700'>{label}</span>
          <span className='font-bold'>
            {value} / {max}
          </span>
        </div>
        <div className='h-2 bg-gray-200 rounded-full overflow-hidden'>
          <div
            className={`h-full rounded-full ${colorClasses[color]}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const getTeamName = (team: any) => team?.name || 'Unknown Team';
  const getTeamGrade = (team: any) => team?.grade || '';

  return (
    <div className={`${className}`}>
      <div className='flex items-center justify-between mb-6'>
        <h3 className='text-lg font-semibold text-gray-900 flex items-center gap-2'>
          <BarChart3 className='w-5 h-5 text-blue-500' />
          Tournament Statistics
        </h3>
        <div className='text-sm text-gray-500'>Updated in real-time</div>
      </div>

      {/* Key Stats Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
        <StatCard
          title='Total Matches'
          value={stats.totalMatches}
          icon={Hash}
          color='blue'
          description={`${stats.completedMatches} completed, ${stats.liveMatches} live`}
        />

        <StatCard
          title='Average Points'
          value={stats.averagePointsPerMatch}
          icon={Target}
          color='green'
          description={`${stats.totalPointsScored} total points scored`}
        />

        <StatCard
          title='Completion Rate'
          value={`${stats.completionRate.toFixed(1)}%`}
          icon={Trophy}
          color='purple'
          description={`${stats.completedMatches}/${stats.totalMatches} matches`}
        />

        <StatCard
          title='Active Teams'
          value={stats.teamsCount}
          icon={Users}
          color='yellow'
          description={`${stats.teamsByLevel.Gold || 0} Gold, ${
            stats.teamsByLevel.Silver || 0
          } Silver`}
        />
      </div>

      {/* Detailed Stats */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Match Progress */}
        <div className='lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200'>
          <h4 className='text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2'>
            <Calendar className='w-5 h-5 text-blue-500' />
            Match Progress
          </h4>

          <div className='space-y-4'>
            <ProgressBar
              value={stats.completedMatches}
              max={stats.totalMatches}
              color='green'
              label='Completed Matches'
            />

            <ProgressBar
              value={stats.liveMatches}
              max={stats.totalMatches}
              color='blue'
              label='Live Matches'
            />

            <ProgressBar
              value={stats.upcomingMatches}
              max={stats.totalMatches}
              color='yellow'
              label='Upcoming Matches'
            />
          </div>

          <div className='grid grid-cols-3 gap-4 mt-6'>
            <div className='text-center p-3 bg-gray-50 rounded-lg'>
              <div className='text-2xl font-bold text-gray-900'>
                {stats.completedMatches}
              </div>
              <div className='text-sm text-gray-600'>Completed</div>
            </div>
            <div className='text-center p-3 bg-blue-50 rounded-lg'>
              <div className='text-2xl font-bold text-blue-900'>
                {stats.liveMatches}
              </div>
              <div className='text-sm text-blue-600'>Live Now</div>
            </div>
            <div className='text-center p-3 bg-yellow-50 rounded-lg'>
              <div className='text-2xl font-bold text-yellow-900'>
                {stats.upcomingMatches}
              </div>
              <div className='text-sm text-yellow-600'>Upcoming</div>
            </div>
          </div>
        </div>

        {/* Performance Highlights */}
        <div className='bg-white p-6 rounded-xl border border-gray-200'>
          <h4 className='text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2'>
            <Award className='w-5 h-5 text-yellow-500' />
            Performance Highlights
          </h4>

          <div className='space-y-4'>
            {/* Best Team */}
            {stats.bestTeam && (
              <div className='p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-lg border border-yellow-200'>
                <div className='flex items-center gap-3 mb-2'>
                  <Trophy className='w-5 h-5 text-yellow-600' />
                  <span className='font-bold text-yellow-700'>
                    Best Performance
                  </span>
                </div>
                <div className='font-medium text-gray-900'>
                  {getTeamName(stats.bestTeam.team)}
                </div>
                <div className='text-sm text-gray-600'>
                  {stats.bestTeam.winRate.toFixed(1)}% win rate (
                  {stats.bestTeam.wins}W)
                </div>
              </div>
            )}

            {/* Highest Scoring Match */}
            {stats.highestScoringMatch && (
              <div className='p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200'>
                <div className='flex items-center gap-3 mb-2'>
                  <Zap className='w-5 h-5 text-blue-600' />
                  <span className='font-bold text-blue-700'>
                    Highest Scoring Match
                  </span>
                </div>
                <div className='font-medium text-gray-900'>
                  {getTeamName(stats.highestScoringMatch.team1)} vs{' '}
                  {getTeamName(stats.highestScoringMatch.team2)}
                </div>
                <div className='text-sm text-gray-600'>
                  {(stats.highestScoringMatch.team1Score || 0) +
                    (stats.highestScoringMatch.team2Score || 0)}{' '}
                  total points
                </div>
              </div>
            )}

            {/* Closest Match */}
            {stats.closestMatch && (
              <div className='p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200'>
                <div className='flex items-center gap-3 mb-2'>
                  <Star className='w-5 h-5 text-purple-600' />
                  <span className='font-bold text-purple-700'>
                    Closest Match
                  </span>
                </div>
                <div className='font-medium text-gray-900'>
                  {getTeamName(stats.closestMatch.team1)} vs{' '}
                  {getTeamName(stats.closestMatch.team2)}
                </div>
                <div className='text-sm text-gray-600'>
                  {Math.abs(
                    (stats.closestMatch.team1Score || 0) -
                      (stats.closestMatch.team2Score || 0)
                  )}{' '}
                  point difference
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className='mt-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200'>
          <div className='flex items-center gap-2 mb-2'>
            <Clock className='w-5 h-5 text-gray-600' />
            <span className='font-bold text-gray-700'>Average Duration</span>
          </div>
          <div className='text-2xl font-bold text-gray-900'>
            {stats.averageMatchDuration} min
          </div>
          <div className='text-sm text-gray-600'>Per match</div>
        </div>

        {stats.mostActiveRound && (
          <div className='p-4 bg-gradient-to-r from-green-50 to-emerald-100 rounded-xl border border-green-200'>
            <div className='flex items-center gap-2 mb-2'>
              <Hash className='w-5 h-5 text-green-600' />
              <span className='font-bold text-green-700'>
                Most Active Round
              </span>
            </div>
            <div className='text-2xl font-bold text-gray-900'>
              Round {stats.mostActiveRound[0]}
            </div>
            <div className='text-sm text-gray-600'>
              {stats.mostActiveRound[1]} matches played
            </div>
          </div>
        )}

        {stats.mostActiveTeam && (
          <div className='p-4 bg-gradient-to-r from-red-50 to-rose-100 rounded-xl border border-red-200'>
            <div className='flex items-center gap-2 mb-2'>
              <Users className='w-5 h-5 text-red-600' />
              <span className='font-bold text-red-700'>Most Active Team</span>
            </div>
            <div className='text-lg font-bold text-gray-900 truncate'>
              {getTeamName(stats.mostActiveTeam.team)}
            </div>
            <div className='text-sm text-gray-600'>
              {stats.mostActiveTeam.matches} matches played
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
