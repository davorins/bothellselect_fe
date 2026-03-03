// feature-module/pages/tournament/MatchHighlights.tsx
import React, { useState } from 'react';
import {
  Trophy,
  Zap,
  Award,
  Star,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Crown,
} from 'lucide-react';

interface MatchHighlightsProps {
  matches: any[];
}

export default function MatchHighlights({ matches }: MatchHighlightsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (matches.length === 0) {
    return null;
  }

  // Get top 3 exciting matches based on criteria
  const getHighlightedMatches = () => {
    return matches
      .map((match) => {
        const scoreDiff = Math.abs(match.team1Score - match.team2Score);
        const totalScore = match.team1Score + match.team2Score;
        const isCloseGame = scoreDiff <= 3;
        const isHighScoring = totalScore >= 40;

        // Calculate excitement score
        let excitement = 0;
        if (isCloseGame) excitement += 3;
        if (isHighScoring) excitement += 2;
        if (match.round >= 3) excitement += 1; // Later rounds are more exciting
        if (match.bracketType === 'final') excitement += 5; // Finals are most exciting

        return { ...match, excitement };
      })
      .sort((a, b) => b.excitement - a.excitement)
      .slice(0, 3);
  };

  const highlightedMatches = getHighlightedMatches();
  const currentMatch = highlightedMatches[currentIndex];

  const nextHighlight = () => {
    setCurrentIndex((prev) => (prev + 1) % highlightedMatches.length);
  };

  const prevHighlight = () => {
    setCurrentIndex(
      (prev) =>
        (prev - 1 + highlightedMatches.length) % highlightedMatches.length
    );
  };

  const getHighlightType = (match: any) => {
    const scoreDiff = Math.abs(match.team1Score - match.team2Score);
    const totalScore = match.team1Score + match.team2Score;

    if (scoreDiff <= 3) {
      return {
        label: 'THRILLER',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
      };
    }
    if (totalScore >= 40) {
      return {
        label: 'HIGH SCORING',
        color: 'bg-green-100 text-green-800 border-green-200',
      };
    }
    if (match.round >= 3) {
      return {
        label: 'KNOCKOUT STAGE',
        color: 'bg-red-100 text-red-800 border-red-200',
      };
    }
    return {
      label: 'MATCH HIGHLIGHT',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
    };
  };

  const renderMatchHighlight = (match: any) => {
    const highlightType = getHighlightType(match);
    const isCloseGame = Math.abs(match.team1Score - match.team2Score) <= 3;
    const winnerScore =
      match.winner?._id === match.team1?._id
        ? match.team1Score
        : match.team2Score;
    const loserScore =
      match.winner?._id === match.team1?._id
        ? match.team2Score
        : match.team1Score;

    return (
      <div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white'>
        {/* Background pattern */}
        <div className='absolute inset-0 opacity-10'>
          <div
            className='absolute inset-0'
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            }}
          ></div>
        </div>

        <div className='relative p-8'>
          {/* Match type badge */}
          <div
            className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-bold border ${highlightType.color}`}
          >
            {highlightType.label}
          </div>

          {/* Round info */}
          <div className='flex items-center gap-2 mb-6'>
            <Crown className='w-5 h-5 text-yellow-300' />
            <span className='text-sm font-medium'>
              {match.bracketType === 'final'
                ? 'CHAMPIONSHIP'
                : `Round ${match.round}`}
            </span>
          </div>

          <div className='flex flex-col lg:flex-row items-center justify-between gap-8'>
            {/* Teams and scores */}
            <div className='flex-1'>
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                {/* Winning team */}
                <div className='relative'>
                  <div className='absolute -top-3 -left-3'>
                    <Crown className='w-6 h-6 text-yellow-300' />
                  </div>
                  <div className='p-6 bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 rounded-xl border border-yellow-500/20'>
                    <div className='flex items-center gap-4 mb-4'>
                      <div className='w-16 h-16 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-2xl font-bold'>
                        {match.winner?.name?.charAt(0) || 'W'}
                      </div>
                      <div>
                        <div className='text-2xl font-bold text-yellow-300'>
                          {match.winner?.name || 'Winner'}
                        </div>
                        <div className='text-sm text-gray-300'>
                          {match.winner?.grade || 'Team'}
                        </div>
                      </div>
                    </div>
                    <div className='text-center'>
                      <div className='text-5xl font-bold text-white mb-2'>
                        {winnerScore}
                      </div>
                      <div className='text-sm text-gray-300'>POINTS</div>
                    </div>
                  </div>
                </div>

                {/* Losing team */}
                <div className='p-6 bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700/50'>
                  <div className='flex items-center gap-4 mb-4'>
                    <div className='w-16 h-16 rounded-full bg-gradient-to-r from-gray-500 to-gray-700 flex items-center justify-center text-white text-2xl font-bold'>
                      {match.loser?.name?.charAt(0) || 'L'}
                    </div>
                    <div>
                      <div className='text-2xl font-bold text-white'>
                        {match.loser?.name || 'Runner-up'}
                      </div>
                      <div className='text-sm text-gray-300'>
                        {match.loser?.grade || 'Team'}
                      </div>
                    </div>
                  </div>
                  <div className='text-center'>
                    <div className='text-5xl font-bold text-white mb-2'>
                      {loserScore}
                    </div>
                    <div className='text-sm text-gray-300'>POINTS</div>
                  </div>
                </div>
              </div>

              {/* VS and result */}
              <div className='relative mt-8'>
                <div className='absolute inset-0 flex items-center'>
                  <div className='w-full border-t border-gray-700'></div>
                </div>
                <div className='relative flex justify-center'>
                  <div className='px-8 py-2 bg-gray-900 rounded-full'>
                    <div className='flex items-center gap-4'>
                      <div className='text-2xl font-bold text-yellow-300'>
                        {winnerScore} - {loserScore}
                      </div>
                      <div className='w-px h-6 bg-gray-700'></div>
                      <div className='text-sm font-medium text-gray-300'>
                        FINAL SCORE
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Match stats */}
            <div className='lg:w-80 space-y-4'>
              <div className='p-4 bg-gradient-to-r from-blue-900/30 to-blue-800/30 rounded-xl border border-blue-700/30'>
                <div className='flex items-center gap-2 mb-3'>
                  <Zap className='w-5 h-5 text-blue-300' />
                  <h4 className='font-bold text-blue-200'>Match Highlights</h4>
                </div>
                <div className='space-y-2'>
                  <div className='flex justify-between text-sm'>
                    <span className='text-gray-300'>Score Difference</span>
                    <span className='font-bold text-white'>
                      {Math.abs(match.team1Score - match.team2Score)} points
                    </span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-gray-300'>Total Points</span>
                    <span className='font-bold text-white'>
                      {match.team1Score + match.team2Score} points
                    </span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span className='text-gray-300'>Match Type</span>
                    <span
                      className={`font-bold ${
                        match.bracketType === 'winners'
                          ? 'text-green-300'
                          : match.bracketType === 'losers'
                          ? 'text-red-300'
                          : 'text-yellow-300'
                      }`}
                    >
                      {match.bracketType?.toUpperCase() || 'REGULAR'}
                    </span>
                  </div>
                  {isCloseGame && (
                    <div className='flex items-center gap-2 text-sm'>
                      <Star className='w-4 h-4 text-yellow-300' />
                      <span className='text-yellow-300'>
                        Close game (≤3 points difference)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className='p-4 bg-gradient-to-r from-purple-900/30 to-purple-800/30 rounded-xl border border-purple-700/30'>
                <div className='flex items-center gap-2 mb-3'>
                  <Award className='w-5 h-5 text-purple-300' />
                  <h4 className='font-bold text-purple-200'>
                    Championship Impact
                  </h4>
                </div>
                <div className='space-y-2 text-sm'>
                  <div className='flex items-center gap-2'>
                    <TrendingUp className='w-4 h-4 text-green-300' />
                    <span className='text-gray-300'>
                      {match.winner?.name} advanced to next round
                    </span>
                  </div>
                  {match.round >= 3 && (
                    <div className='flex items-center gap-2'>
                      <Star className='w-4 h-4 text-yellow-300' />
                      <span className='text-gray-300'>
                        Knockout stage match
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Match details */}
          <div className='mt-8 pt-6 border-t border-gray-700'>
            <div className='flex flex-wrap items-center justify-between gap-4'>
              <div className='flex items-center gap-4'>
                {match.court && (
                  <div className='flex items-center gap-2 text-sm text-gray-300'>
                    <div className='w-2 h-2 rounded-full bg-blue-500'></div>
                    Court {match.court}
                  </div>
                )}
                {match.scheduledTime && (
                  <div className='flex items-center gap-2 text-sm text-gray-300'>
                    <Clock className='w-4 h-4' />
                    {new Date(match.scheduledTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                )}
                {match.duration && (
                  <div className='flex items-center gap-2 text-sm text-gray-300'>
                    <PlayCircle className='w-4 h-4' />
                    Duration: {match.duration} minutes
                  </div>
                )}
              </div>

              <div className='flex items-center gap-2'>
                <span className='text-sm text-gray-300'>
                  Match #{match.matchNumber}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className='relative mb-8'>
      {/* Navigation arrows */}
      {highlightedMatches.length > 1 && (
        <>
          <button
            onClick={prevHighlight}
            className='absolute left-4 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-all'
          >
            <ChevronLeft className='w-6 h-6' />
          </button>
          <button
            onClick={nextHighlight}
            className='absolute right-4 top-1/2 transform -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-all'
          >
            <ChevronRight className='w-6 h-6' />
          </button>
        </>
      )}

      {/* Current highlight */}
      {renderMatchHighlight(currentMatch)}

      {/* Dots navigation */}
      {highlightedMatches.length > 1 && (
        <div className='flex justify-center gap-2 mt-4'>
          {highlightedMatches.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-blue-600 scale-125'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
      )}

      {/* Highlights header */}
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-semibold text-gray-900 flex items-center gap-2'>
          <Zap className='w-5 h-5 text-yellow-500' />
          Match Highlights
        </h3>
        <div className='text-sm text-gray-500'>
          {currentIndex + 1} of {highlightedMatches.length}
        </div>
      </div>
    </div>
  );
}
