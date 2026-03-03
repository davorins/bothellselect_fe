// feature-module/pages/tournament/LiveScoreTicker.tsx
import React, { useState, useEffect } from 'react';
import {
  Zap,
  PlayCircle,
  Clock,
  MapPin,
  ChevronRight,
  Volume2,
  VolumeX,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

interface LiveScoreTickerProps {
  matches: any[];
}

export default function LiveScoreTicker({ matches }: LiveScoreTickerProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  // Filter live matches
  const liveMatches = matches.filter((match) => match.status === 'in-progress');

  // Auto-rotate through live matches - CORRECTED useEffect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (autoPlay && liveMatches.length > 1) {
      interval = setInterval(() => {
        setCurrentMatchIndex((prev) => (prev + 1) % liveMatches.length);
      }, 8000); // Rotate every 8 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoPlay, liveMatches.length]);

  // If no live matches, don't show the ticker
  if (liveMatches.length === 0) {
    return null;
  }

  const currentMatch = liveMatches[currentMatchIndex];

  // Calculate elapsed time
  const getElapsedTime = (match: any) => {
    const startTime = new Date(match.actualStartTime || match.scheduledTime);
    const now = new Date();
    const elapsedMs = now.getTime() - startTime.getTime();
    const elapsedMinutes = Math.floor(elapsedMs / 60000);

    if (elapsedMinutes < match.duration) {
      return {
        elapsed: elapsedMinutes,
        remaining: match.duration - elapsedMinutes,
        percentage: (elapsedMinutes / match.duration) * 100,
      };
    }

    return {
      elapsed: match.duration,
      remaining: 0,
      percentage: 100,
    };
  };

  const elapsedTime = getElapsedTime(currentMatch);

  const getScoreColor = (team: any, isLeading: boolean, isWinning: boolean) => {
    if (isWinning) return 'text-green-600';
    if (isLeading) return 'text-blue-600';
    return 'text-gray-700';
  };

  const isTeam1Winning = currentMatch.team1Score > currentMatch.team2Score;
  const isTeam2Winning = currentMatch.team2Score > currentMatch.team1Score;
  const isTied = currentMatch.team1Score === currentMatch.team2Score;

  const handleNextMatch = () => {
    setCurrentMatchIndex((prev) => (prev + 1) % liveMatches.length);
  };

  const handlePrevMatch = () => {
    setCurrentMatchIndex(
      (prev) => (prev - 1 + liveMatches.length) % liveMatches.length
    );
  };

  return (
    <div
      className={`bg-gradient-to-r from-blue-600 to-purple-600 text-white transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
      }`}
    >
      <div className='max-w-7xl mx-auto px-4 py-3'>
        <div className='flex items-center justify-between'>
          {/* Live indicator */}
          <div className='flex items-center gap-2'>
            <div className='flex items-center gap-2'>
              <div className='relative'>
                <Zap className='w-5 h-5 text-yellow-300 animate-pulse' />
                <div className='absolute inset-0 animate-ping'>
                  <Zap className='w-5 h-5 text-yellow-300 opacity-75' />
                </div>
              </div>
              <span className='font-bold text-yellow-300'>LIVE</span>
            </div>

            <div className='h-4 w-px bg-white/30 mx-2'></div>

            {/* Match navigation */}
            {liveMatches.length > 1 && (
              <div className='flex items-center gap-2'>
                <button
                  onClick={handlePrevMatch}
                  className='p-1 hover:bg-white/10 rounded transition-colors'
                >
                  <ChevronRight className='w-4 h-4 rotate-180' />
                </button>
                <span className='text-sm font-medium'>
                  Match {currentMatchIndex + 1} of {liveMatches.length}
                </span>
                <button
                  onClick={handleNextMatch}
                  className='p-1 hover:bg-white/10 rounded transition-colors'
                >
                  <ChevronRight className='w-4 h-4' />
                </button>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className='flex items-center gap-2'>
            <button
              onClick={() => setAutoPlay(!autoPlay)}
              className={`p-1 rounded transition-colors ${
                autoPlay ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
              title={autoPlay ? 'Auto-play on' : 'Auto-play off'}
            >
              <PlayCircle
                className={`w-4 h-4 ${autoPlay ? 'text-green-300' : ''}`}
              />
            </button>

            <button
              onClick={() => setIsMuted(!isMuted)}
              className='p-1 hover:bg-white/10 rounded transition-colors'
              title={isMuted ? 'Unmute sounds' : 'Mute sounds'}
            >
              {isMuted ? (
                <VolumeX className='w-4 h-4' />
              ) : (
                <Volume2 className='w-4 h-4' />
              )}
            </button>

            <button
              onClick={() => setIsVisible(false)}
              className='p-1 hover:bg-white/10 rounded transition-colors'
              title='Hide ticker'
            >
              <span className='text-lg leading-none'>&times;</span>
            </button>
          </div>
        </div>

        {/* Match details */}
        <div className='mt-3 grid grid-cols-1 lg:grid-cols-3 gap-4'>
          {/* Teams and scores */}
          <div className='lg:col-span-2'>
            <div className='flex items-center justify-between'>
              {/* Team 1 */}
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold'>
                  {currentMatch.team1?.name?.charAt(0) || 'T1'}
                </div>
                <div>
                  <div className='font-bold text-lg'>
                    {currentMatch.team1?.name || 'Team 1'}
                  </div>
                  <div className='text-sm text-white/80'>
                    {currentMatch.team1?.grade || ''}
                  </div>
                </div>
              </div>

              {/* Scores */}
              <div className='flex items-center gap-4'>
                <div
                  className={`text-4xl font-bold ${getScoreColor(
                    currentMatch.team1,
                    isTeam1Winning,
                    isTeam1Winning
                  )}`}
                >
                  {currentMatch.team1Score}
                </div>

                <div className='text-center'>
                  <div className='text-sm text-white/80'>TIME</div>
                  <div className='text-xl font-bold text-yellow-300'>
                    {elapsedTime.elapsed}' / {currentMatch.duration}'
                  </div>
                </div>

                <div
                  className={`text-4xl font-bold ${getScoreColor(
                    currentMatch.team2,
                    isTeam2Winning,
                    isTeam2Winning
                  )}`}
                >
                  {currentMatch.team2Score}
                </div>
              </div>

              {/* Team 2 */}
              <div className='flex items-center gap-3'>
                <div className='text-right'>
                  <div className='font-bold text-lg'>
                    {currentMatch.team2?.name || 'Team 2'}
                  </div>
                  <div className='text-sm text-white/80'>
                    {currentMatch.team2?.grade || ''}
                  </div>
                </div>
                <div className='w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold'>
                  {currentMatch.team2?.name?.charAt(0) || 'T2'}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className='mt-3'>
              <div className='h-1 bg-white/20 rounded-full overflow-hidden'>
                <div
                  className='h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full'
                  style={{ width: `${elapsedTime.percentage}%` }}
                ></div>
              </div>
              <div className='flex justify-between text-xs mt-1'>
                <span className='text-white/80'>START</span>
                <span className='text-yellow-300 font-medium'>
                  {elapsedTime.elapsed}' elapsed • {elapsedTime.remaining}'
                  remaining
                </span>
                <span className='text-white/80'>END</span>
              </div>
            </div>
          </div>

          {/* Match info and actions */}
          <div className='flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-start justify-between gap-3'>
            <div className='space-y-1'>
              <div className='flex items-center gap-2 text-sm'>
                <MapPin className='w-4 h-4 text-white/80' />
                <span>Court {currentMatch.court || 'TBD'}</span>
              </div>
              <div className='flex items-center gap-2 text-sm'>
                <Clock className='w-4 h-4 text-white/80' />
                <span>
                  Round {currentMatch.round} • Match {currentMatch.matchNumber}
                </span>
              </div>
              <div className='text-sm text-white/80'>
                {currentMatch.bracketType === 'winners'
                  ? 'Winners Bracket'
                  : 'Losers Bracket'}
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <button className='px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-1'>
                <RefreshCw className='w-4 h-4' />
                Refresh
              </button>
              <button className='px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-1'>
                <ExternalLink className='w-4 h-4' />
                View Match
              </button>
            </div>
          </div>
        </div>

        {/* Match status indicator */}
        <div className='mt-3 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className='w-2 h-2 rounded-full bg-green-500 animate-pulse'></div>
            <span className='text-sm font-medium'>LIVE - In Progress</span>
          </div>

          <div className='text-sm text-white/80'>
            Last updated:{' '}
            {new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>

      {/* Additional live matches indicator */}
      {liveMatches.length > 1 && (
        <div className='absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full'>
          <div className='flex gap-1'>
            {liveMatches.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentMatchIndex ? 'bg-yellow-400' : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
