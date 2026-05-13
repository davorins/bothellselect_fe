// AutoGridFromDescription.tsx - Complete working solution
import React from 'react';
import './AutoGridFromDescription.css';

interface TrainingSession {
  id?: string;
  number: number;
  date?: string;
  startTime: string;
  endTime: string;
  grades: string;
  location?: TryoutLocation;
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

interface TryoutSession {
  id?: string;
  number: number;
  date?: string;
  startTime: string;
  endTime: string;
  grades: string;
  location?: TryoutLocation;
}

interface TryoutLocation {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface TryoutDetails {
  startDate: string;
  endDate: string;
  duration: string;
  gender: string;
  days: string[];
  locations?: TryoutLocation[];
  location?: TryoutLocation;
  tryoutSessions: TryoutSession[];
  notes: string[];
  dropOffTime: string;
  pickUpTime: string;
  hasLimitedSpots: boolean;
  contactEmail: string;
  ageGroups: string[];
  maxParticipants: number | null;
  whatToBring: string[];
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
  tryoutDetails?: TryoutDetails;
  tryoutName?: string;
  tryoutYear?: number;
  tryoutFee?: number;
  displayName?: string;
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

const getFullAddress = (location: any): string => {
  if (!location) return '';
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
  const trainingDetails = config?.trainingDetails;
  const tryoutDetails = config?.tryoutDetails;
  const isTryout = !!tryoutDetails;

  // Helper function to get tryout locations (handles both old and new format)
  const getTryoutLocations = (): TryoutLocation[] => {
    if (!tryoutDetails) return [];

    // New format: locations array
    if (tryoutDetails.locations && tryoutDetails.locations.length > 0) {
      return tryoutDetails.locations;
    }

    // Old format: single location
    if (tryoutDetails.location && tryoutDetails.location.name) {
      return [tryoutDetails.location];
    }

    return [];
  };

  // TRAINING VIEW
  if (!isTryout && trainingDetails) {
    const hasValidTrainingDetails =
      trainingDetails.startDate ||
      trainingDetails.location?.name ||
      (trainingDetails.trainingSessions?.length || 0) > 0;

    if (!hasValidTrainingDetails) {
      const accent = '#3b82f6';
      return (
        <div className='agd-root'>
          <div className='agd-event'>
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
            <div className='agd-tile agd-tile--cta'>
              <button
                className='agd-cta'
                style={{
                  background: accent,
                  boxShadow: `0 6px 20px ${accent}44`,
                }}
                onClick={() => onRegister?.()}
              >
                <i className='ti ti-user-plus' /> Register Now{' '}
                <i className='ti ti-arrow-right' />
              </button>
            </div>
          </div>
        </div>
      );
    }

    const accent = '#3b82f6';
    const ageGroupsDisplay = trainingDetails.ageGroups?.length
      ? trainingDetails.ageGroups.join(', ')
      : '';
    const handleRegister = () => onRegister?.();

    return (
      <div className='agd-root'>
        <div className='agd-event'>
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
              <i className='ti ti-ball-basketball' />
            </div>
            <h2 className='agd-title'>
              {config?.season} {config?.year} Training Program
            </h2>
            {(trainingDetails.startDate || trainingDetails.endDate) && (
              <p className='agd-sub'>
                <i className='ti ti-calendar' style={{ opacity: 0.5 }} />{' '}
                {formatDateRange(
                  trainingDetails.startDate,
                  trainingDetails.endDate,
                )}
              </p>
            )}
            {trainingDetails.hasLimitedSpots && (
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

          <div className='agd-tile agd-tile--cta'>
            <button
              className='agd-cta'
              style={{
                background: accent,
                boxShadow: `0 6px 20px ${accent}44`,
              }}
              onClick={handleRegister}
            >
              <i className='ti ti-user-plus' /> Register Now{' '}
              <i className='ti ti-arrow-right' />
            </button>
          </div>

          {config?.description && (
            <div className='agd-tile'>
              <TileHead icon='ti-article' label='About the Program' />
              <div
                className='agd-desc'
                dangerouslySetInnerHTML={{ __html: config.description }}
              />
            </div>
          )}

          {(ageGroupsDisplay ||
            trainingDetails.gender ||
            trainingDetails.duration ||
            (trainingDetails.days?.length || 0) > 0 ||
            trainingDetails.dropOffTime ||
            trainingDetails.pickUpTime) && (
            <div className='agd-tile'>
              <TileHead icon='ti-info-circle' label='Program Details' />
              <ul className='agd-list'>
                {ageGroupsDisplay && (
                  <InfoRow icon='ti-school'>
                    <strong>Ages / Grades:</strong> {ageGroupsDisplay}
                  </InfoRow>
                )}
                {trainingDetails.gender && (
                  <InfoRow icon='ti-gender-bigender'>
                    <strong>Gender:</strong> {trainingDetails.gender}
                  </InfoRow>
                )}
                {trainingDetails.duration && (
                  <InfoRow icon='ti-clock-hour-4'>
                    <strong>Duration:</strong> {trainingDetails.duration}
                  </InfoRow>
                )}
                {(trainingDetails.days?.length || 0) > 0 && (
                  <InfoRow icon='ti-calendar-week'>
                    <strong>Days:</strong> {formatDays(trainingDetails.days)}
                  </InfoRow>
                )}
                {trainingDetails.dropOffTime && (
                  <InfoRow icon='ti-car'>
                    <strong>Drop-off:</strong> {trainingDetails.dropOffTime}
                  </InfoRow>
                )}
                {trainingDetails.pickUpTime && (
                  <InfoRow icon='ti-car'>
                    <strong>Pick-up:</strong> {trainingDetails.pickUpTime}
                  </InfoRow>
                )}
                {trainingDetails.maxParticipants && (
                  <InfoRow icon='ti-users'>
                    <strong>Max Participants:</strong>{' '}
                    {trainingDetails.maxParticipants}
                  </InfoRow>
                )}
              </ul>
            </div>
          )}

          {(trainingDetails.location?.name ||
            getFullAddress(trainingDetails.location)) && (
            <div className='agd-tile'>
              <TileHead icon='ti-map-pin' label='Location' />
              <ul className='agd-list'>
                <InfoRow icon='ti-location-pin'>
                  {trainingDetails.location?.name && (
                    <strong>{trainingDetails.location.name}</strong>
                  )}
                  {trainingDetails.location?.name &&
                    getFullAddress(trainingDetails.location) && <br />}
                  {getFullAddress(trainingDetails.location)}
                </InfoRow>
              </ul>
              {getFullAddress(trainingDetails.location) && (
                <a
                  className='agd-map-link'
                  href={`https://www.google.com/maps/search/${encodeURIComponent([trainingDetails.location.name, getFullAddress(trainingDetails.location)].filter(Boolean).join(' '))}`}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  <i className='ti ti-external-link' /> Open in Google Maps
                </a>
              )}
            </div>
          )}

          {(trainingDetails.trainingSessions?.length || 0) > 0 && (
            <div className='agd-tile'>
              <TileHead icon='ti-calendar-event' label='Training Schedule' />
              <div className='agd-sessions-container'>
                {trainingDetails.trainingSessions.map((session) => (
                  <div key={session.id} className='agd-session-card'>
                    <div className='agd-session-header'>
                      <div className='agd-session-time'>
                        {session.date && (
                          <span className='agd-session-date'>
                            <i className='ti ti-calendar' />
                            {session.date}
                          </span>
                        )}
                        <span className='agd-session-time-range'>
                          <i className='ti ti-clock' />
                          {formatTimeRange(session.startTime, session.endTime)}
                        </span>
                      </div>
                      <span className='agd-session-grades'>
                        <i className='ti ti-users' />
                        Grades {session.grades}
                      </span>
                    </div>

                    {session.location?.name && (
                      <div className='agd-session-location'>
                        <i className='ti ti-map-pin agd-session-location-icon' />
                        <div className='agd-session-location-details'>
                          <span className='agd-session-location-name'>
                            {session.location.name}
                          </span>
                          {getFullAddress(session.location) && (
                            <span className='agd-session-location-address'>
                              {getFullAddress(session.location)}
                            </span>
                          )}
                          {getFullAddress(session.location) && (
                            <a
                              className='agd-session-map-link'
                              href={`https://www.google.com/maps/search/${encodeURIComponent([session.location.name, getFullAddress(session.location)].filter(Boolean).join(' '))}`}
                              target='_blank'
                              rel='noopener noreferrer'
                            >
                              <i className='ti ti-external-link' /> Open in
                              Google Maps
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(trainingDetails.notes?.length || 0) > 0 && (
            <div className='agd-tile'>
              <TileHead icon='ti-notes' label='Important Notes' />
              <ul className='agd-list'>
                {trainingDetails.notes.map((note, index) => (
                  <InfoRow key={index} icon='ti-info-square'>
                    {note}
                  </InfoRow>
                ))}
              </ul>
            </div>
          )}

          {trainingDetails.contactEmail && (
            <div className='agd-tile'>
              <TileHead icon='ti-mail' label='Contact' />
              <ul className='agd-list'>
                <InfoRow icon='ti-at'>
                  <a
                    href={`mailto:${trainingDetails.contactEmail}`}
                    style={{ color: accent, textDecoration: 'none' }}
                  >
                    {trainingDetails.contactEmail}
                  </a>
                </InfoRow>
              </ul>
            </div>
          )}

          {typeof config?.pricing?.basePrice === 'number' &&
            config.pricing.basePrice > 0 && (
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
        </div>
      </div>
    );
  }

  // TRYOUT VIEW
  if (isTryout && tryoutDetails) {
    const tryoutLocations = getTryoutLocations();
    const hasValidTryoutDetails =
      tryoutDetails.startDate ||
      tryoutLocations.length > 0 ||
      (tryoutDetails.tryoutSessions?.length || 0) > 0;

    if (!hasValidTryoutDetails) {
      const accent = '#f59e0b';
      return (
        <div className='agd-root'>
          <div className='agd-event'>
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
                <i className='ti ti-target-arrow' />
              </div>
              <h2 className='agd-title'>
                {config.displayName || config.tryoutName || 'Tryout'}{' '}
                {config.tryoutYear || ''}
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
            <div className='agd-tile agd-tile--cta'>
              <button
                className='agd-cta'
                style={{
                  background: accent,
                  boxShadow: `0 6px 20px ${accent}44`,
                }}
                onClick={() => onRegister?.()}
              >
                <i className='ti ti-user-plus' /> Register for Tryout{' '}
                <i className='ti ti-arrow-right' />
              </button>
            </div>
          </div>
        </div>
      );
    }

    const accent = '#f59e0b';
    const ageGroupsDisplay = tryoutDetails.ageGroups?.length
      ? tryoutDetails.ageGroups.join(', ')
      : '';
    const handleRegister = () => onRegister?.();

    return (
      <div className='agd-root'>
        <div className='agd-event'>
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
              <i className='ti ti-target-arrow' />
            </div>
            <h2 className='agd-title'>
              {config.displayName || config.tryoutName || 'Tryout'}{' '}
              {config.tryoutYear || ''}
            </h2>
            {(tryoutDetails.startDate || tryoutDetails.endDate) && (
              <p className='agd-sub'>
                <i className='ti ti-calendar' style={{ opacity: 0.5 }} />{' '}
                {formatDateRange(
                  tryoutDetails.startDate,
                  tryoutDetails.endDate,
                )}
              </p>
            )}
            {tryoutDetails.hasLimitedSpots && (
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

          <div className='agd-tile agd-tile--cta'>
            <button
              className='agd-cta'
              style={{
                background: accent,
                boxShadow: `0 6px 20px ${accent}44`,
              }}
              onClick={handleRegister}
            >
              <i className='ti ti-user-plus' /> Register for Tryout{' '}
              <i className='ti ti-arrow-right' />
            </button>
          </div>

          {config?.description && (
            <div className='agd-tile'>
              <TileHead icon='ti-article' label='About Tryouts' />
              <div
                className='agd-desc'
                dangerouslySetInnerHTML={{ __html: config.description }}
              />
            </div>
          )}

          {(ageGroupsDisplay ||
            tryoutDetails.gender ||
            tryoutDetails.duration ||
            (tryoutDetails.days?.length || 0) > 0 ||
            tryoutDetails.dropOffTime ||
            tryoutDetails.pickUpTime) && (
            <div className='agd-tile'>
              <TileHead icon='ti-info-circle' label='Tryout Details' />
              <ul className='agd-list'>
                {ageGroupsDisplay && (
                  <InfoRow icon='ti-school'>
                    <strong>Age Groups:</strong> {ageGroupsDisplay}
                  </InfoRow>
                )}
                {tryoutDetails.gender && (
                  <InfoRow icon='ti-gender-bigender'>
                    <strong>Gender:</strong> {tryoutDetails.gender}
                  </InfoRow>
                )}
                {tryoutDetails.duration && (
                  <InfoRow icon='ti-clock-hour-4'>
                    <strong>Duration:</strong> {tryoutDetails.duration}
                  </InfoRow>
                )}
                {(tryoutDetails.days?.length || 0) > 0 && (
                  <InfoRow icon='ti-calendar-week'>
                    <strong>Days:</strong> {formatDays(tryoutDetails.days)}
                  </InfoRow>
                )}
                {tryoutDetails.dropOffTime && (
                  <InfoRow icon='ti-car'>
                    <strong>Check-in:</strong> {tryoutDetails.dropOffTime}
                  </InfoRow>
                )}
                {tryoutDetails.pickUpTime && (
                  <InfoRow icon='ti-car'>
                    <strong>Pick-up:</strong> {tryoutDetails.pickUpTime}
                  </InfoRow>
                )}
                {tryoutDetails.maxParticipants && (
                  <InfoRow icon='ti-users'>
                    <strong>Max Participants:</strong>{' '}
                    {tryoutDetails.maxParticipants}
                  </InfoRow>
                )}
              </ul>
            </div>
          )}

          {/* Locations section - supports multiple locations */}
          {tryoutLocations.length > 0 && (
            <div className='agd-tile'>
              <TileHead
                icon='ti-map-pin'
                label={tryoutLocations.length === 1 ? 'Location' : 'Locations'}
              />
              <div className='agd-locations'>
                {tryoutLocations.map((location, idx) => (
                  <div key={idx} className='agd-location-item'>
                    <ul className='agd-list'>
                      <InfoRow icon='ti-location-pin'>
                        <strong>{location.name}</strong>
                        {location.name && getFullAddress(location) && <br />}
                        {getFullAddress(location)}
                      </InfoRow>
                    </ul>
                    {getFullAddress(location) && (
                      <a
                        className='agd-map-link'
                        href={`https://www.google.com/maps/search/${encodeURIComponent([location.name, getFullAddress(location)].filter(Boolean).join(' '))}`}
                        target='_blank'
                        rel='noopener noreferrer'
                      >
                        <i className='ti ti-external-link' /> Open in Google
                        Maps
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(tryoutDetails.tryoutSessions?.length || 0) > 0 && (
            <div className='agd-tile'>
              <TileHead icon='ti-calendar-event' label='Tryout Schedule' />
              <div className='agd-sessions-container'>
                {tryoutDetails.tryoutSessions.map((session) => (
                  <div key={session.id} className='agd-session-card'>
                    <div className='agd-session-header'>
                      <div className='agd-session-time'>
                        {session.date && (
                          <span className='agd-session-date'>
                            <i className='ti ti-calendar' />
                            {session.date}
                          </span>
                        )}
                        <span className='agd-session-time-range'>
                          <i className='ti ti-clock' />
                          {formatTimeRange(session.startTime, session.endTime)}
                        </span>
                      </div>
                      <span className='agd-session-grades'>
                        <i className='ti ti-users' />
                        Grades {session.grades}
                      </span>
                    </div>

                    {session.location?.name && (
                      <div className='agd-session-location'>
                        <i className='ti ti-map-pin agd-session-location-icon' />
                        <div className='agd-session-location-details'>
                          <span className='agd-session-location-name'>
                            {session.location.name}
                          </span>
                          {getFullAddress(session.location) && (
                            <span className='agd-session-location-address'>
                              {getFullAddress(session.location)}
                            </span>
                          )}
                          {getFullAddress(session.location) && (
                            <a
                              className='agd-session-map-link'
                              href={`https://www.google.com/maps/search/${encodeURIComponent([session.location.name, getFullAddress(session.location)].filter(Boolean).join(' '))}`}
                              target='_blank'
                              rel='noopener noreferrer'
                            >
                              <i className='ti ti-external-link' /> Open in
                              Google Maps
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(tryoutDetails.whatToBring?.length || 0) > 0 && (
            <div className='agd-tile'>
              <TileHead icon='ti-backpack' label='What to Bring' />
              <ul className='agd-list'>
                {tryoutDetails.whatToBring.map((item, idx) => (
                  <InfoRow key={idx} icon='ti-check'>
                    {item}
                  </InfoRow>
                ))}
              </ul>
            </div>
          )}

          {(tryoutDetails.notes?.length || 0) > 0 && (
            <div className='agd-tile'>
              <TileHead icon='ti-notes' label='Important Notes' />
              <ul className='agd-list'>
                {tryoutDetails.notes.map((note, idx) => (
                  <InfoRow key={idx} icon='ti-info-square'>
                    {note}
                  </InfoRow>
                ))}
              </ul>
            </div>
          )}

          {tryoutDetails.contactEmail && (
            <div className='agd-tile'>
              <TileHead icon='ti-mail' label='Contact' />
              <ul className='agd-list'>
                <InfoRow icon='ti-at'>
                  <a
                    href={`mailto:${tryoutDetails.contactEmail}`}
                    style={{ color: accent, textDecoration: 'none' }}
                  >
                    {tryoutDetails.contactEmail}
                  </a>
                </InfoRow>
              </ul>
            </div>
          )}

          {typeof config.tryoutFee === 'number' && config.tryoutFee > 0 && (
            <button
              className='agd-tile agd-tile--price agd-tile--clickable'
              onClick={handleRegister}
              style={{ cursor: 'pointer', width: '100%', textAlign: 'left' }}
            >
              <TileHead icon='ti-currency-dollar' label='Investment' />
              <div className='agd-price'>
                <span className='agd-pamount' style={{ color: '#ffffff' }}>
                  ${config.tryoutFee}
                </span>
                <span className='agd-pper'>per player</span>
              </div>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Fallback for when no details are available
  return (
    <div className='agd-root'>
      <div className='agd-event'>
        <div
          className='agd-tile agd-tile--hdr'
          style={{ borderTop: `3px solid #3b82f6` }}
        >
          <div
            className='agd-hdr-icon'
            style={{
              color: '#3b82f6',
              background: `#3b82f618`,
              borderColor: `#3b82f644`,
            }}
          >
            <i className='ti ti-ball-basketball' />
          </div>
          <h2 className='agd-title'>
            {config?.season || 'Registration'} {config?.year || ''}
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
        <div className='agd-tile agd-tile--cta'>
          <button
            className='agd-cta'
            style={{ background: '#3b82f6', boxShadow: `0 6px 20px #3b82f644` }}
            onClick={() => onRegister?.()}
          >
            <i className='ti ti-user-plus' /> Register Now{' '}
            <i className='ti ti-arrow-right' />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoGridFromDescription;
