// feature-module/pages/tournament/ScheduleView.tsx
import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Filter,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';

interface ScheduleViewProps {
  matches: any[];
  showCompleted: boolean;
  showLiveOnly: boolean;
  viewMode: 'grid' | 'list' | 'detailed';
}

export default function ScheduleView({
  matches,
  showCompleted,
  showLiveOnly,
  viewMode,
}: ScheduleViewProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCourt, setSelectedCourt] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Filter matches based on props
  const filteredMatches = useMemo(() => {
    let filtered = matches;

    if (!showCompleted) {
      filtered = filtered.filter((match) => match.status !== 'completed');
    }

    if (showLiveOnly) {
      filtered = filtered.filter((match) => match.status === 'in-progress');
    }

    if (selectedDate) {
      filtered = filtered.filter((match) => {
        const matchDate = new Date(match.scheduledTime).toDateString();
        return matchDate === new Date(selectedDate).toDateString();
      });
    }

    if (selectedCourt) {
      filtered = filtered.filter((match) => match.court === selectedCourt);
    }

    return filtered;
  }, [matches, showCompleted, showLiveOnly, selectedDate, selectedCourt]);

  // Group matches by date
  const matchesByDate = useMemo(() => {
    const groups: Record<string, any[]> = {};

    filteredMatches.forEach((match) => {
      if (!match.scheduledTime) return;

      const date = new Date(match.scheduledTime);
      const dateKey = date.toDateString();

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push(match);
    });

    // Sort dates chronologically
    return Object.entries(groups)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([dateKey, matches]) => ({
        date: new Date(dateKey),
        matches: matches.sort(
          (a, b) =>
            new Date(a.scheduledTime).getTime() -
            new Date(b.scheduledTime).getTime()
        ),
      }));
  }, [filteredMatches]);

  // Get unique courts
  const courts = useMemo(() => {
    const courtSet = new Set<string>();
    matches.forEach((match) => {
      if (match.court) courtSet.add(match.court);
    });
    return Array.from(courtSet).sort();
  }, [matches]);

  // Get status badge
  const getStatusBadge = (status: string) => {
    const config = {
      scheduled: {
        icon: Clock,
        color: 'bg-blue-100 text-blue-800 border-blue-200',
      },
      'in-progress': {
        icon: PlayCircle,
        color: 'bg-green-100 text-green-800 border-green-200',
      },
      completed: {
        icon: CheckCircle,
        color: 'bg-purple-100 text-purple-800 border-purple-200',
      },
      cancelled: {
        icon: XCircle,
        color: 'bg-red-100 text-red-800 border-red-200',
      },
    }[status] || {
      icon: AlertCircle,
      color: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    const Icon = config.icon;
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${config.color}`}
      >
        <Icon className='w-3 h-3' />
        {status.replace('-', ' ')}
      </span>
    );
  };

  // Render match card
  const renderMatchCard = (match: any, index: number) => {
    const isLive = match.status === 'in-progress';
    const isCompleted = match.status === 'completed';
    const isUpcoming = match.status === 'scheduled';

    return (
      <div
        key={match._id}
        className={`
          p-4 border rounded-lg transition-all duration-300 hover:shadow-md
          ${
            isLive
              ? 'border-green-300 bg-gradient-to-r from-green-50 to-white'
              : isCompleted
              ? 'border-purple-200 bg-purple-50'
              : 'border-gray-200 bg-white'
          }
          ${index > 0 ? 'mt-3' : ''}
        `}
      >
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
          {/* Match info */}
          <div className='flex-1'>
            <div className='flex items-center justify-between mb-2'>
              <div className='flex items-center gap-2'>
                <span className='text-sm font-medium text-gray-700'>
                  Round {match.round} • Match {match.matchNumber}
                </span>
                {match.bracketType && (
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      match.bracketType === 'winners'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {match.bracketType === 'winners' ? 'Winners' : 'Losers'}
                  </span>
                )}
              </div>
              {getStatusBadge(match.status)}
            </div>

            {/* Teams */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div
                className={`p-3 rounded-lg flex items-center justify-between ${
                  isCompleted && match.winner?._id === match.team1?._id
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50'
                }`}
              >
                <div className='flex items-center gap-3'>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      isCompleted && match.winner?._id === match.team1?._id
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    }`}
                  >
                    {match.team1?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className='font-semibold text-gray-900'>
                      {match.team1?.name || 'TBD'}
                    </div>
                    {match.team1?.grade && (
                      <div className='text-xs text-gray-500'>
                        {match.team1.grade}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className={`text-xl font-bold ${
                    isCompleted && match.winner?._id === match.team1?._id
                      ? 'text-green-600'
                      : 'text-gray-700'
                  }`}
                >
                  {match.team1Score}
                </div>
              </div>

              <div
                className={`p-3 rounded-lg flex items-center justify-between ${
                  isCompleted && match.winner?._id === match.team2?._id
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-gray-50'
                }`}
              >
                <div className='flex items-center gap-3'>
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      isCompleted && match.winner?._id === match.team2?._id
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                        : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                    }`}
                  >
                    {match.team2?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className='font-semibold text-gray-900'>
                      {match.team2?.name || 'TBD'}
                    </div>
                    {match.team2?.grade && (
                      <div className='text-xs text-gray-500'>
                        {match.team2.grade}
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className={`text-xl font-bold ${
                    isCompleted && match.winner?._id === match.team2?._id
                      ? 'text-green-600'
                      : 'text-gray-700'
                  }`}
                >
                  {match.team2Score}
                </div>
              </div>
            </div>
          </div>

          {/* Time and location */}
          <div className='sm:w-48 space-y-3'>
            {match.scheduledTime && (
              <div className='p-3 bg-white border border-gray-200 rounded-lg'>
                <div className='flex items-center gap-2 text-gray-700 mb-1'>
                  <Calendar className='w-4 h-4' />
                  <span className='text-sm font-medium'>Date & Time</span>
                </div>
                <div className='text-sm'>
                  {new Date(match.scheduledTime).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div className='text-sm font-medium'>
                  {new Date(match.scheduledTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                {match.duration && (
                  <div className='text-xs text-gray-500 mt-1'>
                    Duration: {match.duration} min
                  </div>
                )}
              </div>
            )}

            {match.court && (
              <div className='p-3 bg-white border border-gray-200 rounded-lg'>
                <div className='flex items-center gap-2 text-gray-700 mb-1'>
                  <MapPin className='w-4 h-4' />
                  <span className='text-sm font-medium'>Location</span>
                </div>
                <div className='text-sm font-medium'>Court {match.court}</div>
              </div>
            )}
          </div>
        </div>

        {/* Additional info */}
        {isLive && (
          <div className='mt-3 pt-3 border-t border-green-200'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2 text-green-600'>
                <PlayCircle className='w-4 h-4 animate-pulse' />
                <span className='text-sm font-medium'>Match in progress</span>
              </div>
              <div className='text-sm text-gray-600'>
                Started{' '}
                {Math.floor(
                  (Date.now() -
                    new Date(
                      match.actualStartTime || match.scheduledTime
                    ).getTime()) /
                    60000
                )}{' '}
                minutes ago
              </div>
            </div>
          </div>
        )}

        {match.notes && (
          <div className='mt-3 pt-3 border-t border-gray-200'>
            <div className='text-sm text-gray-600'>
              <span className='font-medium'>Notes:</span> {match.notes}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render day view
  const renderDayView = (date: Date, dayMatches: any[]) => {
    const dateString = date.toDateString();
    const isExpanded = expandedDay === dateString;
    const isToday = date.toDateString() === new Date().toDateString();

    return (
      <div
        key={dateString}
        className='border border-gray-200 rounded-xl overflow-hidden'
      >
        <div
          className={`p-4 cursor-pointer transition-colors ${
            isToday ? 'bg-gradient-to-r from-blue-50 to-blue-100' : 'bg-gray-50'
          } hover:bg-gray-100`}
          onClick={() => setExpandedDay(isExpanded ? null : dateString)}
        >
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='text-center'>
                <div className='text-sm font-medium text-gray-600'>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div
                  className={`text-2xl font-bold ${
                    isToday ? 'text-blue-600' : 'text-gray-900'
                  }`}
                >
                  {date.getDate()}
                </div>
              </div>
              <div>
                <div className='font-semibold text-gray-900'>
                  {date.toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </div>
                <div className='text-sm text-gray-600'>
                  {dayMatches.length} match{dayMatches.length !== 1 ? 'es' : ''}
                </div>
              </div>
            </div>
            <div className='flex items-center gap-4'>
              <div className='flex gap-2'>
                <span className='px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800'>
                  {dayMatches.filter((m) => m.status === 'scheduled').length}{' '}
                  upcoming
                </span>
                <span className='px-2 py-1 text-xs rounded-full bg-green-100 text-green-800'>
                  {dayMatches.filter((m) => m.status === 'in-progress').length}{' '}
                  live
                </span>
                <span className='px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800'>
                  {dayMatches.filter((m) => m.status === 'completed').length}{' '}
                  completed
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className='w-5 h-5 text-gray-500' />
              ) : (
                <ChevronDown className='w-5 h-5 text-gray-500' />
              )}
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className='p-4 bg-white space-y-4'>
            {/* Court timeline view */}
            {courts.length > 0 && viewMode === 'detailed' && (
              <div className='mb-6'>
                <h4 className='text-sm font-semibold text-gray-700 mb-3'>
                  Court Schedule
                </h4>
                <div className='space-y-4'>
                  {courts.map((court) => {
                    const courtMatches = dayMatches.filter(
                      (m) => m.court === court
                    );
                    if (courtMatches.length === 0) return null;

                    return (
                      <div
                        key={court}
                        className='border border-gray-200 rounded-lg p-3'
                      >
                        <div className='flex items-center gap-2 mb-3'>
                          <MapPin className='w-4 h-4 text-gray-500' />
                          <span className='font-medium'>Court {court}</span>
                          <span className='text-sm text-gray-500 ml-auto'>
                            {courtMatches.length} match
                            {courtMatches.length !== 1 ? 'es' : ''}
                          </span>
                        </div>
                        <div className='space-y-2'>
                          {courtMatches.map((match) => (
                            <div
                              key={match._id}
                              className='flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200'
                            >
                              <div className='flex items-center gap-3'>
                                <div className='text-sm font-medium'>
                                  {match.team1?.name || 'TBD'} vs{' '}
                                  {match.team2?.name || 'TBD'}
                                </div>
                                {match.status === 'in-progress' && (
                                  <span className='w-2 h-2 rounded-full bg-green-500 animate-pulse'></span>
                                )}
                              </div>
                              <div className='text-sm text-gray-600'>
                                {new Date(
                                  match.scheduledTime
                                ).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Matches list */}
            <h4 className='text-sm font-semibold text-gray-700 mb-3'>
              All Matches
            </h4>
            {dayMatches.map((match, index) => renderMatchCard(match, index))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className='p-6'>
      {/* Filters */}
      <div className='mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div className='flex items-center gap-2'>
            <Filter className='w-5 h-5 text-gray-500' />
            <span className='font-medium text-gray-700'>Filter Schedule</span>
          </div>

          <div className='flex flex-wrap gap-3'>
            <select
              value={selectedDate || ''}
              onChange={(e) => setSelectedDate(e.target.value || null)}
              className='px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            >
              <option value=''>All Dates</option>
              {matchesByDate.map(({ date }) => (
                <option key={date.toDateString()} value={date.toISOString()}>
                  {date.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })}
                </option>
              ))}
            </select>

            {courts.length > 0 && (
              <select
                value={selectedCourt || ''}
                onChange={(e) => setSelectedCourt(e.target.value || null)}
                className='px-4 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              >
                <option value=''>All Courts</option>
                {courts.map((court) => (
                  <option key={court} value={court}>
                    Court {court}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => {
                setSelectedDate(null);
                setSelectedCourt(null);
              }}
              className='px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Schedule content */}
      <div className='space-y-6'>
        {matchesByDate.length === 0 ? (
          <div className='text-center py-12'>
            <Calendar className='w-12 h-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-lg font-semibold text-gray-700 mb-2'>
              No matches found
            </h3>
            <p className='text-gray-500'>
              Try adjusting your filters or check back later for scheduled
              matches.
            </p>
          </div>
        ) : (
          matchesByDate.map(({ date, matches }) => renderDayView(date, matches))
        )}
      </div>

      {/* Schedule summary */}
      {matchesByDate.length > 0 && (
        <div className='mt-8 pt-6 border-t border-gray-200'>
          <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
            <div className='p-4 bg-blue-50 rounded-lg border border-blue-200'>
              <div className='text-sm text-blue-700 font-medium mb-1'>
                Total Matches
              </div>
              <div className='text-2xl font-bold text-blue-900'>
                {matches.length}
              </div>
            </div>

            <div className='p-4 bg-green-50 rounded-lg border border-green-200'>
              <div className='text-sm text-green-700 font-medium mb-1'>
                Upcoming
              </div>
              <div className='text-2xl font-bold text-green-900'>
                {matches.filter((m) => m.status === 'scheduled').length}
              </div>
            </div>

            <div className='p-4 bg-yellow-50 rounded-lg border border-yellow-200'>
              <div className='text-sm text-yellow-700 font-medium mb-1'>
                Live Now
              </div>
              <div className='text-2xl font-bold text-yellow-900'>
                {matches.filter((m) => m.status === 'in-progress').length}
              </div>
            </div>

            <div className='p-4 bg-purple-50 rounded-lg border border-purple-200'>
              <div className='text-sm text-purple-700 font-medium mb-1'>
                Completed
              </div>
              <div className='text-2xl font-bold text-purple-900'>
                {matches.filter((m) => m.status === 'completed').length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
