// AutoGridFromDescription.tsx - Complete working solution with pricing as separate section in grid layout, bottom orange CTA, and FAQ section
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

interface PricingPackage {
  id?: string;
  name: string;
  price: number;
  description: string;
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
    packages: PricingPackage[];
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

// Helper function to check if description has meaningful content
const hasValidDescription = (description?: string): boolean => {
  if (!description) return false;
  // Remove HTML tags and check if there's any non-whitespace content
  const strippedText = description.replace(/<[^>]*>/g, '').trim();
  return strippedText.length > 0;
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

  // Helper function to check if a session is "simple" (only date and location name)
  const isSimpleSession = (
    session: TrainingSession | TryoutSession,
  ): boolean => {
    const hasOnlyDateAndLocation =
      !!session.date &&
      !!session.location?.name &&
      !session.startTime &&
      !session.endTime &&
      !session.grades;
    return hasOnlyDateAndLocation;
  };

  // Helper function to check if a session has any meaningful data
  const hasSessionData = (
    session: TrainingSession | TryoutSession,
  ): boolean => {
    return !!(
      session.date ||
      session.startTime ||
      session.endTime ||
      session.grades ||
      session.location?.name
    );
  };

  // Filter sessions to only show those with data
  const getValidSessions = (
    sessions: (TrainingSession | TryoutSession)[],
  ): (TrainingSession | TryoutSession)[] => {
    return sessions.filter(hasSessionData);
  };

  // Component for simple session (date and location only)
  const SimpleSessionItem: React.FC<{
    session: TrainingSession | TryoutSession;
  }> = ({ session }) => (
    <div className='agd-session-simple'>
      <div className='agd-session-simple-content'>
        <span className='agd-session-simple-date'>
          <i className='ti ti-calendar' />
          {session.date}
        </span>
        <span className='agd-session-simple-separator'>→</span>
        <span className='agd-session-simple-location'>
          <i className='ti ti-map-pin' />
          {session.location?.name}
        </span>
      </div>
    </div>
  );

  // Component for detailed session (with time/grades)
  const DetailedSessionItem: React.FC<{
    session: TrainingSession | TryoutSession;
  }> = ({ session }) => (
    <div className='agd-session-card'>
      <div className='agd-session-header'>
        <div className='agd-session-time'>
          {session.date && (
            <span className='agd-session-date'>
              <i className='ti ti-calendar' />
              {session.date}
            </span>
          )}
          {(session.startTime || session.endTime) && (
            <span className='agd-session-time-range'>
              <i className='ti ti-clock' />
              {session.startTime && session.endTime
                ? formatTimeRange(session.startTime, session.endTime)
                : session.startTime || session.endTime}
            </span>
          )}
        </div>
        {session.grades && (
          <span className='agd-session-grades'>
            <i className='ti ti-users' />
            Grades {session.grades}
          </span>
        )}
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
                <i className='ti ti-external-link' /> Open in Google Maps
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );

  // FAQ Section Component
  const FAQSection: React.FC = () => (
    <div className='agd-tile agd-tile--faq'>
      <TileHead icon='ti-help-circle' label='Frequently Asked Questions' />
      <div className='agd-faq-content'>
        <p className='agd-faq-text'>
          Have questions about our programs, schedules, or registration process?
        </p>
        <a href='/faq' className='agd-faq-link'>
          <i className='ti ti-message-question' />
          Visit our FAQ page for answers to common questions
          <i className='ti ti-arrow-right' />
        </a>
      </div>
    </div>
  );

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
            {hasValidDescription(config?.description) && (
              <div className='agd-tile'>
                <div
                  dangerouslySetInnerHTML={{ __html: config.description! }}
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
            <FAQSection />
            <div className='agd-tile agd-tile--cta-bottom'>
              <button className='agd-cta-bottom' onClick={() => onRegister?.()}>
                <i className='ti ti-user-plus' /> Register Now{' '}
                <i className='ti ti-arrow-right' />
              </button>
            </div>
          </div>
        </div>
      );
    }

    const accent = '#3b82f6';
    const sortAgeGroups = (groups: string[]): string[] => {
      return [...groups].sort((a, b) => {
        // Define custom order: everything except College first, then College last
        const aIsCollege = a.toLowerCase().includes('college');
        const bIsCollege = b.toLowerCase().includes('college');

        if (aIsCollege && !bIsCollege) return 1; // College goes to end
        if (!aIsCollege && bIsCollege) return -1; // Non-College comes first

        // For non-College items, sort alphabetically or by grade number if possible
        return a.localeCompare(b);
      });
    };

    const ageGroupsDisplay = trainingDetails.ageGroups?.length
      ? sortAgeGroups(trainingDetails.ageGroups).join(', ')
      : '';
    const handleRegister = () => onRegister?.();

    // Get valid sessions for display
    const validSessions = getValidSessions(
      trainingDetails.trainingSessions || [],
    );

    // Separate sessions into simple and detailed
    const simpleSessions = validSessions.filter(isSimpleSession);
    const detailedSessions = validSessions.filter(
      (session) => !isSimpleSession(session),
    );

    // Check if there are any pricing packages
    const hasPricingPackages =
      config.pricing?.packages && config.pricing.packages.length > 0;
    const hasBasePrice =
      typeof config.pricing?.basePrice === 'number' &&
      config.pricing.basePrice > 0;

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
              {config?.season} {config?.year}
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

          {/* Top CTA Button */}
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

          {/* About the Program - Only show if description has valid content */}
          {hasValidDescription(config?.description) && (
            <div className='agd-tile'>
              <TileHead icon='ti-article' label='About the Program' />
              <div
                className='agd-desc'
                dangerouslySetInnerHTML={{ __html: config.description! }}
              />
            </div>
          )}

          {/* Program Details Section */}
          {(ageGroupsDisplay ||
            trainingDetails.gender ||
            trainingDetails.duration ||
            (trainingDetails.days?.length || 0) > 0 ||
            trainingDetails.dropOffTime ||
            trainingDetails.pickUpTime ||
            trainingDetails.maxParticipants) && (
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

          {/* Pricing Section - Separate section with grid layout */}
          {(hasBasePrice || hasPricingPackages) && (
            <div className='agd-tile'>
              <TileHead icon='ti-currency-dollar' label='Price' />

              {/* Base Price */}
              {hasBasePrice && (
                <div className='agd-base-price'>
                  <span className='agd-base-price-amount'>
                    ${config.pricing.basePrice}
                  </span>
                  <span className='agd-base-price-label'>per child</span>
                </div>
              )}

              {/* Pricing Packages Grid */}
              {hasPricingPackages && (
                <div
                  className='agd-packages-grid'
                  data-count={config.pricing.packages.length}
                >
                  {config.pricing.packages.map((pkg, idx) => (
                    <div key={pkg.id || idx} className='agd-package-card'>
                      <div className='agd-package-name'>{pkg.name}</div>
                      <div className='agd-package-price'>${pkg.price}</div>
                      {pkg.description && (
                        <div className='agd-package-description'>
                          {pkg.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Location Section */}
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

          {/* Training Schedule - Only show if there are valid sessions */}
          {validSessions.length > 0 && (
            <div className='agd-tile'>
              <TileHead icon='ti-calendar-event' label='Training Schedule' />
              <div className='agd-sessions-container'>
                {/* Simple sessions (date + location only) - shown in compact list */}
                {simpleSessions.length > 0 && (
                  <div className='agd-sessions-simple-list'>
                    {simpleSessions.map((session) => (
                      <SimpleSessionItem key={session.id} session={session} />
                    ))}
                  </div>
                )}

                {/* Detailed sessions (with time/grades) - shown in card layout */}
                {detailedSessions.length > 0 && (
                  <div className='agd-sessions-detailed-list'>
                    {detailedSessions.map((session) => (
                      <DetailedSessionItem key={session.id} session={session} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Important Notes Section */}
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

          {/* Contact Section */}
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

          {/* FAQ Section */}
          <FAQSection />

          {/* Bottom Orange CTA Button */}
          <div className='agd-tile agd-tile--cta-bottom'>
            <button className='agd-cta-bottom' onClick={handleRegister}>
              <i className='ti ti-user-plus' /> Register Now{' '}
              <i className='ti ti-arrow-right' />
            </button>
          </div>
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
            {hasValidDescription(config?.description) && (
              <div className='agd-tile'>
                <div
                  dangerouslySetInnerHTML={{ __html: config.description! }}
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
            <FAQSection />
            <div className='agd-tile agd-tile--cta-bottom'>
              <button className='agd-cta-bottom' onClick={() => onRegister?.()}>
                <i className='ti ti-user-plus' /> Register for Tryout{' '}
                <i className='ti ti-arrow-right' />
              </button>
            </div>
          </div>
        </div>
      );
    }

    const accent = '#f59e0b';
    const sortAgeGroups = (groups: string[]): string[] => {
      return [...groups].sort((a, b) => {
        const aIsCollege = a.toLowerCase().includes('college');
        const bIsCollege = b.toLowerCase().includes('college');

        if (aIsCollege && !bIsCollege) return 1;
        if (!aIsCollege && bIsCollege) return -1;

        return a.localeCompare(b);
      });
    };

    const ageGroupsDisplay = tryoutDetails.ageGroups?.length
      ? sortAgeGroups(tryoutDetails.ageGroups).join(', ')
      : '';
    const handleRegister = () => onRegister?.();

    const validTryoutSessions = getValidSessions(
      tryoutDetails.tryoutSessions || [],
    );
    const simpleTryoutSessions = validTryoutSessions.filter(isSimpleSession);
    const detailedTryoutSessions = validTryoutSessions.filter(
      (session) => !isSimpleSession(session),
    );

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

          {/* Top CTA Button */}
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

          {/* About Tryouts - Only show if description has valid content */}
          {hasValidDescription(config?.description) && (
            <div className='agd-tile'>
              <TileHead icon='ti-article' label='About Tryouts' />
              <div
                className='agd-desc'
                dangerouslySetInnerHTML={{ __html: config.description! }}
              />
            </div>
          )}

          {/* Tryout Details Section */}
          {(ageGroupsDisplay ||
            tryoutDetails.gender ||
            tryoutDetails.duration ||
            (tryoutDetails.days?.length || 0) > 0 ||
            tryoutDetails.dropOffTime ||
            tryoutDetails.pickUpTime ||
            tryoutDetails.maxParticipants) && (
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

          {/* Pricing Section for Tryouts */}
          {typeof config.tryoutFee === 'number' && config.tryoutFee > 0 && (
            <div className='agd-tile'>
              <TileHead icon='ti-currency-dollar' label='Price' />
              <div className='agd-base-price'>
                <span className='agd-base-price-amount'>
                  ${config.tryoutFee}
                </span>
                <span className='agd-base-price-label'>per player</span>
              </div>
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

          {/* Tryout Schedule - Only show if there are valid sessions */}
          {validTryoutSessions.length > 0 && (
            <div className='agd-tile'>
              <TileHead icon='ti-calendar-event' label='Tryout Schedule' />
              <div className='agd-sessions-container'>
                {/* Simple sessions (date + location only) - shown in compact list */}
                {simpleTryoutSessions.length > 0 && (
                  <div className='agd-sessions-simple-list'>
                    {simpleTryoutSessions.map((session) => (
                      <SimpleSessionItem key={session.id} session={session} />
                    ))}
                  </div>
                )}

                {/* Detailed sessions (with time/grades) - shown in card layout */}
                {detailedTryoutSessions.length > 0 && (
                  <div className='agd-sessions-detailed-list'>
                    {detailedTryoutSessions.map((session) => (
                      <DetailedSessionItem key={session.id} session={session} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* What to Bring Section */}
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

          {/* Important Notes Section */}
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

          {/* Contact Section */}
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

          {/* FAQ Section */}
          <FAQSection />

          {/* Bottom Orange CTA Button */}
          <div className='agd-tile agd-tile--cta-bottom'>
            <button className='agd-cta-bottom' onClick={handleRegister}>
              <i className='ti ti-user-plus' /> Register for Tryout{' '}
              <i className='ti ti-arrow-right' />
            </button>
          </div>
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
        {hasValidDescription(config?.description) && (
          <div className='agd-tile'>
            <div
              dangerouslySetInnerHTML={{ __html: config.description! }}
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
        <FAQSection />
        {/* Bottom Orange CTA Button for fallback */}
        <div className='agd-tile agd-tile--cta-bottom'>
          <button className='agd-cta-bottom' onClick={() => onRegister?.()}>
            <i className='ti ti-user-plus' /> Register Now{' '}
            <i className='ti ti-arrow-right' />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AutoGridFromDescription;
