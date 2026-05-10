import React, { useMemo, useState } from 'react';
import './AutoGridFromDescription.css';

/* ─────────────────────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────────────────────── */
interface ScheduleSlot {
  time: string;
  activity: string;
}
interface TryoutSlot {
  grade: string;
  time: string;
}

interface ParsedEvent {
  type: 'camp' | 'tryout' | 'generic';
  title: string;
  schoolName: string;
  location: string;
  address: string;
  dates: string;
  timeRange: string;
  schedule: ScheduleSlot[];
  tryoutSchedule: TryoutSlot[];
  coaches: string[];
  details: {
    ages: string;
    gender: string;
    price: string;
    dropOff: string;
    pickUp: string;
  };
  description: string;
  hasLimitedSpots: boolean;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */
function stripHtml(html: string): string {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent ?? d.innerText ?? '';
}

function normTime(s: string): string {
  return s
    .replace(/(\d+)(am|pm)/gi, (_, h, p) => `${h}:00 ${p.toUpperCase()}`)
    .replace(/(am|pm)/gi, (p) => p.toUpperCase())
    .trim();
}

function splitEvents(text: string): string[] {
  const parts = text
    .split(/\+\s*(?=We invite|Tryout|📍|🗓)/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length >= 2 ? parts : [text];
}

function addEmoji(a: string): string {
  const l = a.toLowerCase();
  if (/skill|drill|train/.test(l)) return '🎯 ' + a;
  if (/lunch|eat|food/.test(l)) return '🍱 ' + a;
  if (/game|scrim|play/.test(l)) return '🏀 ' + a;
  if (/endur|condit|fitness/.test(l)) return '💪 ' + a;
  return a;
}

const TIME_RX =
  /(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[–\-to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/gi;

/* ─────────────────────────────────────────────────────────────────────────────
   Core parser
───────────────────────────────────────────────────────────────────────────── */
function parseEvent(text: string): ParsedEvent {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const ev: ParsedEvent = {
    type: 'generic',
    title: '',
    schoolName: '',
    location: '',
    address: '',
    dates: '',
    timeRange: '',
    schedule: [],
    tryoutSchedule: [],
    coaches: [],
    details: { ages: '', gender: '', price: '', dropOff: '', pickUp: '' },
    description: '',
    hasLimitedSpots: false,
  };

  if (/tryout|try-out/i.test(text)) ev.type = 'tryout';
  else if (/camp|clinic|session/i.test(text)) ev.type = 'camp';

  // Extract Title
  for (const l of lines) {
    if (
      l.length > 8 &&
      l.length < 110 &&
      !/^📍|^🗓|^•|^\d{4}/.test(l) &&
      !/^\d+\s/.test(l)
    ) {
      ev.title = l
        .replace(/\s*@.*$/, '')
        .replace(/\s+\d{4}$/, '')
        .trim();
      break;
    }
  }

  // Extract School Name and Location
  const schoolPatterns = [
    /(?:@|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Middle|High|Elementary)\s+School))/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Middle|High|Elementary)\s+School))/i,
    /📍\s*(?:[Ll]ocation:?\s*)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Middle|High|Elementary)\s+School))/i,
  ];

  for (const pattern of schoolPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      ev.schoolName = match[1].trim();
      ev.location = ev.schoolName;
      break;
    }
  }

  // Extract full location (school + address if available)
  const eLoc = text.match(/📍\s*(?:[Ll]ocation:?\s*)?([^\n]+)\n?([^\n]*)/);
  if (eLoc) {
    const firstLine = eLoc[1].trim();
    const secondLine = eLoc[2].trim();

    // Check if first line contains a school name
    if (/Middle|High|Elementary|School/i.test(firstLine)) {
      if (!ev.schoolName) ev.schoolName = firstLine;
      ev.location = firstLine;
      if (secondLine && /\d/.test(secondLine)) {
        ev.address = secondLine;
      }
    } else if (firstLine && !ev.schoolName) {
      // If first line doesn't look like a school, it might be just address
      if (/\d/.test(firstLine)) {
        ev.address = firstLine;
      } else {
        ev.location = firstLine;
      }
      if (secondLine && /\d/.test(secondLine)) {
        ev.address = secondLine;
      }
    }
  }

  // Fallback location extraction
  if (!ev.location) {
    const m = text.match(/[Ll]ocation:?\s*([^\n.!]+)/);
    if (m) ev.location = m[1].trim();
  }
  if (!ev.location) {
    const m = text.match(/@\s*([^\n.!?,]+)/);
    if (m) ev.location = m[1].trim();
  }

  // Extract full address
  if (!ev.address) {
    const addressPatterns = [
      /\d{2,5}\s+[\w\s]+(?:Ave|St|Rd|Blvd|SE|NE|NW|SW)[,\s]+[\w\s]+,?\s*WA\s*\d{5}/i,
      /\d{2,5}\s+[\w\s]+(?:Avenue|Street|Road|Boulevard)[,\s]+[\w\s]+,?\s*[A-Z]{2}\s*\d{5}/i,
      /(?:address|located at):\s*([^\n.]+)/i,
    ];
    for (const pattern of addressPatterns) {
      const match = text.match(pattern);
      if (match) {
        ev.address = match[0].trim();
        break;
      }
    }
  }

  // Extract Dates
  const eDate = text.match(/🗓\s*([^\n]+)/);
  if (eDate) {
    ev.dates = eDate[1].trim();
  } else {
    const m = text.match(
      /(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[^,]*,?\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+(?:st|nd|rd|th)?(?:\s*(?:through|to|-|–)\s*(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[^,]*,?\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d+(?:st|nd|rd|th)?)?/i,
    );
    if (m) ev.dates = m[0].trim();
  }

  // Extract Time Range
  if (ev.type !== 'tryout') {
    const m = text.match(
      /\bfrom\s+(\d{1,2}(?::\d{2})?\s*[AP]M)\s+to\s+(\d{1,2}(?::\d{2})?\s*[AP]M)/i,
    );
    if (m) {
      ev.timeRange = `${normTime(m[1])} – ${normTime(m[2])}`;
    } else {
      TIME_RX.lastIndex = 0;
      const m2 = TIME_RX.exec(text);
      if (m2) ev.timeRange = `${normTime(m2[1])} – ${normTime(m2[2])}`;
    }
  }

  // Drop-off and Pick-up
  const dropOffMatch = text.match(
    /[Dd]rop[-\s]?off\s*:?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\s*[–\-to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))/i,
  );
  if (dropOffMatch) {
    ev.details.dropOff = `${normTime(dropOffMatch[1])} – ${normTime(dropOffMatch[2])}`;
  } else {
    // Fallback to simpler pattern
    const simpleDropOff = text.match(
      /[Dd]rop[-\s]?off\s*:?\s*([^\n.]+?)(?=\s*(?:and|\.|$|Pick))/i,
    );
    if (simpleDropOff) ev.details.dropOff = simpleDropOff[1].trim();
  }

  const pickUpMatch = text.match(
    /[Pp]ick[-\s]?up\s*:?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\s*[–\-to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))/i,
  );
  if (pickUpMatch) {
    ev.details.pickUp = `${normTime(pickUpMatch[1])} – ${normTime(pickUpMatch[2])}`;
  } else {
    // Fallback to simpler pattern
    const simplePickUp = text.match(
      /[Pp]ick[-\s]?up\s*:?\s*([^\n.]+?)(?=\s*(?:\.|and|$))/i,
    );
    if (simplePickUp) ev.details.pickUp = simplePickUp[1].trim();
  }

  // Tryout Schedule
  if (ev.type === 'tryout') {
    const bRx =
      /[•\-*]\s*(?:[Gg]rades?\s*)?(\d+(?:[–\-]\d+)?):?\s*(\d{1,2}(?::\d{2})?\s*[AP]M)\s*[–\-]\s*(\d{1,2}(?::\d{2})?\s*[AP]M)/gi;
    let bm: RegExpExecArray | null;
    while ((bm = bRx.exec(text)) !== null) {
      const g = bm[1];
      const single = /^\d+$/.test(g) && !g.includes('-') && !g.includes('–');
      ev.tryoutSchedule.push({
        grade: `Grade${single ? '' : 's'} ${g}`,
        time: `${normTime(bm[2])} – ${normTime(bm[3])}`,
      });
    }
  }

  // Daily Schedule for Camp
  if (ev.type === 'camp') {
    const bRx2 =
      /(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))\s*(?:till|to|-|–)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM))[^,\n]*?[–\-,\s]+([^.\n,]{4,40})/gi;
    const found: ScheduleSlot[] = [];
    let bm2: RegExpExecArray | null;
    while ((bm2 = bRx2.exec(text)) !== null) {
      const act = bm2[3].trim().replace(/^and\s+/i, '');
      if (act.length > 2)
        found.push({
          time: `${normTime(bm2[1])} – ${normTime(bm2[2])}`,
          activity: act,
        });
    }
    const seen = new Set<string>();
    for (const s of found) {
      if (!seen.has(s.time)) {
        ev.schedule.push({ ...s, activity: addEmoji(s.activity) });
        seen.add(s.time);
      }
    }
  }

  // Coaches
  const cM = text.match(
    /(?:[Hh]eaded by|[Dd]irectors?:?)\s+([^.(]+?)(?:\(|\.|$)/,
  );
  if (cM) {
    ev.coaches = cM[1]
      .split(/\s+and\s+|,\s*|\s+&\s+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 3 && !/former|supported/i.test(n));
  }

  // Ages/Grades
  const aM = text.match(
    /[Aa]ges?:?\s*([^\n.]+)|(?:[Gg]rades?\s*)(\d+(?:st|nd|rd|th)?(?:\s*[-–]\s*\d+(?:st|nd|rd|th)?)?(?:\s*grade)?)/i,
  );
  if (aM) ev.details.ages = (aM[1] || (aM[2] ? `Grades ${aM[2]}` : '')).trim();

  // Gender
  if (/boys and girls|co-?ed/i.test(text)) ev.details.gender = 'Boys & Girls';
  else if (/\bgirls\b/i.test(text) && !/\bboys\b/i.test(text))
    ev.details.gender = 'Girls';
  else if (/\bboys\b/i.test(text) && !/\bgirls\b/i.test(text))
    ev.details.gender = 'Boys';

  // Price
  const prM = text.match(/\$\s*(\d+(?:\.\d{2})?)/);
  if (prM) ev.details.price = `$${prM[1]}`;

  // Limited Spots
  ev.hasLimitedSpots = /limited|spots|space is limited|secure.*spot/i.test(
    text,
  );

  // Description
  const sents = text.match(/[^.!?]+[.!?]+/g) ?? [];
  const skip =
    /cost:|location:|ages:|gender:|spots are limited|tryout details|📍|🗓|headed by|director|drop.?off|pick.?up/i;
  const desc: string[] = [];
  for (const s of sents) {
    if (!skip.test(s) && s.trim().length > 35) {
      desc.push(s.trim());
      if (desc.length === 2) break;
    }
  }
  ev.description = desc.join(' ');

  return ev;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────────
   EventCard
───────────────────────────────────────────────────────────────────────────── */
const EventCard: React.FC<{
  ev: ParsedEvent;
  accent: string;
  onRegister?: () => void;
}> = ({ ev, accent, onRegister }) => {
  const isTryout = ev.type === 'tryout';

  return (
    <div className='agd-event'>
      {/* ── Header ── */}
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
        {ev.title && <h2 className='agd-title'>{ev.title}</h2>}
        {ev.schoolName && (
          <p className='agd-sub'>
            <i className='ti ti-building-school' style={{ opacity: 0.5 }} />{' '}
            {ev.schoolName}
          </p>
        )}
        {ev.location && !ev.schoolName && (
          <p className='agd-sub'>
            <i className='ti ti-map-pin' style={{ opacity: 0.5 }} />{' '}
            {ev.location}
          </p>
        )}
        {ev.dates && (
          <p className='agd-sub'>
            <i className='ti ti-calendar' style={{ opacity: 0.5 }} /> {ev.dates}
          </p>
        )}
        {ev.hasLimitedSpots && (
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

      {/* ── Programme details ── */}
      {(ev.details.ages ||
        ev.details.gender ||
        ev.details.dropOff ||
        ev.details.pickUp) && (
        <div className='agd-tile'>
          <TileHead icon='ti-info-circle' label='Programme Details' />
          <ul className='agd-list'>
            {ev.details.ages && (
              <InfoRow icon='ti-school'>
                <strong>Ages / Grades:</strong> {ev.details.ages}
              </InfoRow>
            )}
            {ev.details.gender && (
              <InfoRow icon='ti-gender-bigender'>
                <strong>Gender:</strong> {ev.details.gender}
              </InfoRow>
            )}
            {ev.details.dropOff && (
              <InfoRow icon='ti-car'>
                <strong>Drop-off:</strong> {ev.details.dropOff}
              </InfoRow>
            )}
            {ev.details.pickUp && (
              <InfoRow icon='ti-car'>
                <strong>Pick-up:</strong> {ev.details.pickUp}
              </InfoRow>
            )}
          </ul>
        </div>
      )}

      {/* ── Address ── */}
      {ev.address && (
        <div className='agd-tile'>
          <TileHead icon='ti-map-pin' label='Location Address' />
          <ul className='agd-list'>
            <InfoRow icon='ti-location-pin'>
              {ev.schoolName && <strong>{ev.schoolName}</strong>}
              {ev.schoolName && ev.address && <br />}
              {ev.address}
            </InfoRow>
          </ul>
          <a
            className='agd-map-link'
            href={`https://www.google.com/maps/search/${encodeURIComponent(
              ev.schoolName + ' ' + ev.address,
            )}`}
            target='_blank'
            rel='noopener noreferrer'
          >
            <i className='ti ti-external-link' /> Open in Google Maps
          </a>
        </div>
      )}

      {/* ── Tryout schedule ── */}
      {isTryout && ev.tryoutSchedule.length > 0 && (
        <div className='agd-tile'>
          <TileHead icon='ti-calendar-event' label='Tryout Schedule' />
          <div className='agd-sched'>
            {ev.tryoutSchedule.map((s, i) => (
              <div key={i} className='agd-srow'>
                <div className='agd-stime' style={{ color: accent }}>
                  {s.time}
                </div>
                <div className='agd-slabel'>
                  <i
                    className='ti ti-users'
                    style={{ color: accent, marginRight: 7 }}
                  />
                  {s.grade}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Camp hours ── */}
      {!isTryout && ev.timeRange && (
        <div className='agd-tile'>
          <TileHead icon='ti-clock' label='Camp Hours' />
          <ul className='agd-list'>
            <InfoRow icon='ti-clock'>
              <strong>{ev.timeRange}</strong> — Full Day
            </InfoRow>
          </ul>
        </div>
      )}

      {/* ── Daily schedule ── */}
      {!isTryout && ev.schedule.length > 0 && (
        <div className='agd-tile'>
          <TileHead icon='ti-list-check' label='Daily Schedule' />
          <div className='agd-sched'>
            {ev.schedule.map((s, i) => (
              <div key={i} className='agd-srow'>
                <div className='agd-stime' style={{ color: accent }}>
                  {s.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Coaches ── */}
      {ev.coaches.length > 0 && (
        <div className='agd-tile'>
          <TileHead icon='ti-star' label='Camp Directors' />
          <ul className='agd-list'>
            {ev.coaches.map((c, i) => (
              <InfoRow key={i} icon='ti-user-star'>
                <strong>{c}</strong>
              </InfoRow>
            ))}
          </ul>
        </div>
      )}

      {/* ── Price ── */}
      {ev.details.price && (
        <button
          className='agd-tile agd-tile--price agd-tile--clickable'
          onClick={onRegister}
          style={{ cursor: 'pointer', width: '100%', textAlign: 'left' }}
        >
          <TileHead icon='ti-currency-dollar' label='Investment' />
          <div className='agd-price'>
            <span className='agd-pamount' style={{ color: '#ffffff' }}>
              {ev.details.price}
            </span>
            <span className='agd-pper'>per child</span>
          </div>
        </button>
      )}

      {/* ── About ── */}
      {ev.description && (
        <div className='agd-tile'>
          <TileHead
            icon='ti-article'
            label={isTryout ? 'About Tryouts' : 'About the Programme'}
          />
          <p className='agd-desc'>{ev.description}</p>
        </div>
      )}

      {/* ── CTA ── */}
      <div className='agd-tile agd-tile--cta'>
        <button
          className='agd-cta'
          style={{ background: accent, boxShadow: `0 6px 20px ${accent}44` }}
          onClick={onRegister}
        >
          <i className='ti ti-user-plus' />
          Register Now
          <i className='ti ti-arrow-right' />
        </button>
        {ev.hasLimitedSpots && (
          <p className='agd-cta-note'>
            <i className='ti ti-alert-circle' /> Spots fill fast — don't wait!
          </p>
        )}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   Root export
───────────────────────────────────────────────────────────────────────────── */
interface AutoGridFromDescriptionProps {
  descriptionHtml: string;
  onRegister?: () => void;
}

const ACCENTS = ['rgba(80, 100, 220, 1)', '#3b82f6'];

const AutoGridFromDescription: React.FC<AutoGridFromDescriptionProps> = ({
  descriptionHtml,
  onRegister,
}) => {
  const [activeTab, setActiveTab] = useState(0);

  const events = useMemo(() => {
    const raw = stripHtml(descriptionHtml);
    return splitEvents(raw).map(parseEvent);
  }, [descriptionHtml]);

  if (!events.length) return null;

  const isMulti = events.length > 1;

  return (
    <div className='agd-root'>
      {isMulti && (
        <div className='agd-tabs'>
          {events.map((ev, i) => (
            <button
              key={i}
              className={`agd-tab${activeTab === i ? ' is-active' : ''}`}
              style={
                activeTab === i
                  ? {
                      borderColor: ACCENTS[i % ACCENTS.length],
                      boxShadow: `0 0 0 1px ${ACCENTS[i % ACCENTS.length]} inset`,
                    }
                  : {}
              }
              onClick={() => setActiveTab(i)}
            >
              <i
                className={`ti ${ev.type === 'tryout' ? 'ti-target-arrow' : 'ti-ball-basketball'}`}
                style={
                  activeTab === i ? { color: ACCENTS[i % ACCENTS.length] } : {}
                }
              />
              {ev.type === 'tryout'
                ? 'Tryouts'
                : ev.type === 'camp'
                  ? 'Camp'
                  : `Event ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      <EventCard
        ev={events[isMulti ? activeTab : 0]}
        accent={ACCENTS[(isMulti ? activeTab : 0) % ACCENTS.length]}
        onRegister={onRegister}
      />
    </div>
  );
};

export default AutoGridFromDescription;
