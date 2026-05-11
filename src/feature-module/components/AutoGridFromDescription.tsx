// AutoGridFromDescription.tsx
import React from 'react';
import './AutoGridFromDescription.css';

interface TrainingSession {
  id?: string;
  number: number;
  startTime: string;
  endTime: string;
  grades: string;
}

interface TrainingLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface TrainingDetails {
  startDate: string;
  endDate: string;
  duration: string;
  gender: string;
  days: string[];
  location: TrainingLocation;
  trainingSessions: TrainingSession[];
  notes: string[];
  dropOffTime: string;
  pickUpTime: string;
  hasLimitedSpots: boolean;
  contactEmail: string;
  ageGroups: string[];
  maxParticipants: number | null;
}

interface RegistrationFormConfig {
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
  trainingDetails?: TrainingDetails;
}

interface AutoGridFromDescriptionProps {
  config: RegistrationFormConfig;
  onRegister?: () => void;
}

const formatTimeRange = (startTime: string, endTime: string): string => {
  const formatTime = (time: string) => {
    const match = time.match(/(\d+)(?::(\d+))?\s*(am|pm)/i);
    if (match) {
      let hour = parseInt(match[1]);
      const minute = match[2] || '00';
      const period = match[3].toUpperCase();
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      return `${hour}:${minute.padStart(2, '0')} ${period}`;
    }
    return time;
  };
  return `${formatTime(startTime)} – ${formatTime(endTime)}`;
};

const formatDateRange = (startDate: string, endDate: string): string => {
  if (startDate && endDate) {
    return `${startDate} – ${endDate}`;
  }
  return startDate || endDate || '';
};

const formatDays = (days: string[]): string => {
  const dayAbbr: { [key: string]: string } = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
    Sunday: 'Sun',
  };
  return days.map((day) => dayAbbr[day] || day.slice(0, 3)).join(' · ');
};

const getFullAddress = (location: TrainingLocation): string => {
  const parts = [
    location.address,
    location.city,
    location.state,
    location.zipCode,
  ].filter(Boolean);
  return parts.join(', ');
};

const TileHead: React.FC<{ icon: string; label: string }> = ({
  icon,
  label,
}) => (
  <div className='agd-head'>
    <i
      className={`ti ${icon}`}
      style={{ color: '#ffffff', fontSize: '0.95rem' }}
    />
    <span style={{ color: '#ffffff', fontSize: '0.95rem' }}>{label}</span>
  </div>
);

const InfoRow: React.FC<{ icon: string; children: React.ReactNode }> = ({
  icon,
  children,
}) => (
  <li className='agd-row'>
    <i
      className={`ti ${icon}`}
      style={{ color: 'rgba(255,140,0,.7)', flexShrink: 0, marginTop: 2 }}
    />
    <span>{children}</span>
  </li>
);

const AutoGridFromDescription: React.FC<AutoGridFromDescriptionProps> = ({
  config,
  onRegister,
}) => {
  // Debug log to see what's being received
  console.log('🔍 AutoGridFromDescription received:', {
    season: config?.season,
    year: config?.year,
    hasTrainingDetails: !!config?.trainingDetails,
    trainingDetails: config?.trainingDetails,
    descriptionLength: config?.description?.length,
  });

  const details = config?.trainingDetails;

  // Check if we have valid training details
  const hasValidTrainingDetails =
    details &&
    (details.startDate ||
      details.location?.name ||
      details.trainingSessions?.length > 0);

  // If no training details, show fallback
  if (!hasValidTrainingDetails) {
    console.log('⚠️ No valid training details, showing fallback description');
    return (
      <div className='agd-root'>
        <div className='agd-event'>
          <div className='agd-tile agd-tile--hdr'>
            <div className='agd-hdr-icon'>
              <i className='ti ti-ball-basketball' />
            </div>
            <h2 className='agd-title'>
              {config?.season} {config?.year} Training
            </h2>
          </div>
          {config?.description && (
            <div className='agd-tile'>
              <div
                dangerouslySetInnerHTML={{ __html: config.description }}
                style={{ lineHeight: 1.6 }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  console.log('✅ Rendering with structured training details');
  const accent = '#3b82f6';
  const isTryout = config?.requiresQualification || false;
  const ageGroupsDisplay = details?.ageGroups?.length
    ? details.ageGroups.join(', ')
    : '';

  const handleRegister = () => {
    onRegister?.();
  };

  return (
    <div className='agd-root'>
      <div className='agd-event'>
        {/* Header */}
        <div
          className='agd-tile agd-tile--hdr'
          style={{ borderTop: `3px solid ${accent}` }}
        >
          <div
            className='agd-hdr-icon'
            style={{
              color: accent,
              background: `${accent}18`,
              borderColor: `${accent}44`,
            }}
          >
            <i
              className={`ti ${isTryout ? 'ti-target-arrow' : 'ti-ball-basketball'}`}
            />
          </div>

          <h2 className='agd-title'>
            {config?.season} {config?.year}{' '}
            {isTryout ? 'Tryouts' : 'Training Program'}
          </h2>

          {details?.location?.name && (
            <p className='agd-sub'>
              <i className='ti ti-building-school' style={{ opacity: 0.5 }} />{' '}
              {details.location.name}
            </p>
          )}

          {(details?.startDate || details?.endDate) && (
            <p className='agd-sub'>
              <i className='ti ti-calendar' style={{ opacity: 0.5 }} />{' '}
              {formatDateRange(details.startDate, details.endDate)}
            </p>
          )}

          {details?.hasLimitedSpots && (
            <span
              className='agd-badge'
              style={{
                color: accent,
                background: `${accent}20`,
                borderColor: `${accent}55`,
              }}
            >
              Limited Spots
            </span>
          )}
        </div>

        {/* About / Description */}
        {config?.description && (
          <div className='agd-tile'>
            <TileHead
              icon='ti-article'
              label={isTryout ? 'About Tryouts' : 'About the Program'}
            />
            <div
              className='agd-desc'
              dangerouslySetInnerHTML={{ __html: config.description }}
            />
          </div>
        )}

        {/* Program Details */}
        {(ageGroupsDisplay ||
          details?.gender ||
          details?.duration ||
          details?.days?.length > 0 ||
          details?.dropOffTime ||
          details?.pickUpTime) && (
          <div className='agd-tile'>
            <TileHead icon='ti-info-circle' label='Program Details' />
            <ul className='agd-list'>
              {ageGroupsDisplay && (
                <InfoRow icon='ti-school'>
                  <strong>Ages / Grades:</strong> {ageGroupsDisplay}
                </InfoRow>
              )}
              {details?.gender && (
                <InfoRow icon='ti-gender-bigender'>
                  <strong>Gender:</strong> {details.gender}
                </InfoRow>
              )}
              {details?.duration && (
                <InfoRow icon='ti-clock-hour-4'>
                  <strong>Duration:</strong> {details.duration}
                </InfoRow>
              )}
              {details?.days?.length > 0 && (
                <InfoRow icon='ti-calendar-week'>
                  <strong>Days:</strong> {formatDays(details.days)}
                </InfoRow>
              )}
              {details?.dropOffTime && (
                <InfoRow icon='ti-car'>
                  <strong>Drop-off:</strong> {details.dropOffTime}
                </InfoRow>
              )}
              {details?.pickUpTime && (
                <InfoRow icon='ti-car'>
                  <strong>Pick-up:</strong> {details.pickUpTime}
                </InfoRow>
              )}
              {details?.maxParticipants && (
                <InfoRow icon='ti-users'>
                  <strong>Max Participants:</strong> {details.maxParticipants}
                </InfoRow>
              )}
            </ul>
          </div>
        )}

        {/* Location & Address */}
        {(details?.location?.name ||
          getFullAddress(
            details?.location || {
              name: '',
              address: '',
              city: '',
              state: '',
              zipCode: '',
            },
          )) && (
          <div className='agd-tile'>
            <TileHead icon='ti-map-pin' label='Location' />
            <ul className='agd-list'>
              <InfoRow icon='ti-location-pin'>
                {details?.location?.name && (
                  <strong>{details.location.name}</strong>
                )}
                {details?.location?.name &&
                  getFullAddress(details.location) && <br />}
                {getFullAddress(details.location)}
              </InfoRow>
            </ul>
            {getFullAddress(details.location) && (
              <a
                className='agd-map-link'
                href={`https://www.google.com/maps/search/${encodeURIComponent(
                  [details.location.name, getFullAddress(details.location)]
                    .filter(Boolean)
                    .join(' '),
                )}`}
                target='_blank'
                rel='noopener noreferrer'
              >
                <i className='ti ti-external-link' /> Open in Google Maps
              </a>
            )}
          </div>
        )}

        {/* Training Sessions */}
        {details?.trainingSessions && details.trainingSessions.length > 0 && (
          <div className='agd-tile'>
            <TileHead icon='ti-calendar-event' label='Training Sessions' />
            <div className='agd-sched'>
              {details.trainingSessions.map((session) => (
                <div key={session.id} className='agd-srow'>
                  <div className='agd-stime' style={{ color: accent }}>
                    {formatTimeRange(session.startTime, session.endTime)}
                  </div>
                  <div className='agd-slabel'>
                    <i
                      className='ti ti-users'
                      style={{ color: accent, marginRight: 7 }}
                    />
                    {session.grades}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {details?.notes && details.notes.length > 0 && (
          <div className='agd-tile'>
            <TileHead icon='ti-notes' label='Important Notes' />
            <ul className='agd-list'>
              {details.notes.map((note, index) => (
                <InfoRow key={index} icon='ti-info-square'>
                  {note}
                </InfoRow>
              ))}
            </ul>
          </div>
        )}

        {/* Contact Email */}
        {details?.contactEmail && (
          <div className='agd-tile'>
            <TileHead icon='ti-mail' label='Contact' />
            <ul className='agd-list'>
              <InfoRow icon='ti-at'>
                <a
                  href={`mailto:${details.contactEmail}`}
                  style={{ color: accent, textDecoration: 'none' }}
                >
                  {details.contactEmail}
                </a>
              </InfoRow>
            </ul>
          </div>
        )}

        {/* Price */}
        {config?.pricing?.basePrice > 0 && (
          <button
            className='agd-tile agd-tile--price agd-tile--clickable'
            onClick={handleRegister}
            style={{ cursor: 'pointer', width: '100%', textAlign: 'left' }}
          >
            <TileHead icon='ti-currency-dollar' label='Investment' />
            <div className='agd-price'>
              <span className='agd-pamount' style={{ color: '#ffffff' }}>
                ${config.pricing.basePrice}
              </span>
              <span className='agd-pper'>per child</span>
            </div>
          </button>
        )}

        {/* CTA Button */}
        <div className='agd-tile agd-tile--cta'>
          <button
            className='agd-cta'
            style={{ background: accent, boxShadow: `0 6px 20px ${accent}44` }}
            onClick={handleRegister}
          >
            <i className='ti ti-user-plus' />
            Register Now
            <i className='ti ti-arrow-right' />
          </button>
          {details?.hasLimitedSpots && (
            <p className='agd-cta-note'>
              <i className='ti ti-alert-circle' /> Spots fill fast — don't wait!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutoGridFromDescription;
