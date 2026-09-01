import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useMarketing } from '../../context/MarketingContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ImageWithBasePath from '../../core/common/imageWithBasePath';

interface TryoutEvent {
  _id: string;
  title: string;
  description: string;
  start: string;
  end: string;
  price: number;
  category: string;
  formId?: string;
  school?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  backgroundColor?: string;
}

interface FormConfig {
  _id: string;
  fields: any[];
  requiresPayment: boolean;
  pricing: {
    basePrice: number;
    packages: any[];
  };
}

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const TryoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [event, setEvent] = useState<TryoutEvent | null>(null);
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegistration, setShowRegistration] = useState(false);

  const { getMarketingAttribution } = useMarketing();

  useEffect(() => {
    fetchActiveTryout();
  }, []);

  useEffect(() => {
    const utmData = getMarketingAttribution();
    if (utmData.source !== 'direct') {
      console.log('📊 UTM Data captured:', utmData);
    }
  }, [searchParams, getMarketingAttribution]);

  const fetchActiveTryout = async () => {
    try {
      setLoading(true);

      const eventsResponse = await axios.get(
        `${API_BASE_URL}/events?category=tryout`,
      );
      const now = new Date();
      const activeTryout = eventsResponse.data
        .filter((e: any) => e.isActive !== false)
        .sort(
          (a: any, b: any) =>
            new Date(a.start).getTime() - new Date(b.start).getTime(),
        )
        .find(
          (e: any) =>
            new Date(e.start) > now ||
            new Date(e.start).toDateString() === now.toDateString(),
        );

      if (!activeTryout) {
        setError('No active tryouts available');
        setLoading(false);
        return;
      }

      setEvent(activeTryout);

      if (activeTryout.formId) {
        try {
          const formResponse = await axios.get(
            `${API_BASE_URL}/events/forms/${activeTryout.formId}`,
          );
          setFormConfig(formResponse.data);
        } catch (formErr) {
          console.warn('No form config found for this event');
        }
      }
    } catch (err) {
      console.error('Error fetching tryout:', err);
      setError('Failed to load tryout information');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    const marketing = getMarketingAttribution();
    console.log('📝 Registration started with:', marketing);
    setShowRegistration(true);
    document
      .getElementById('registration-section')
      ?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className='tryout-root'>
        <div className='tryout-wrap'>
          <div className='text-center py-5'>
            <LoadingSpinner />
            <p className='mt-3 text-muted'>Loading tryout information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className='tryout-root'>
        <div className='tryout-wrap'>
          <div className='text-center py-5'>
            <div className='display-1 text-muted mb-4'>🏀</div>
            <h3 className='text-white'>No Active Tryouts</h3>
            <p className='text-muted'>
              {error || 'Check back soon for upcoming tryout dates.'}
            </p>
            <Link to='/' className='btn-primary-glass mt-3'>
              Return Home <i className='ti ti-arrow-right' />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(event.start).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(event.start).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className='tryout-root'>
      {/* Background Effects - Matches AboutUsPage */}
      <div className='tryout-bg' />
      <div className='tryout-orb tryout-orb-1' />
      <div className='tryout-orb tryout-orb-2' />
      <div className='tryout-orb tryout-orb-3' />

      <div className='tryout-wrap'>
        {/* ─── HERO SECTION ──────────────────────────────────────── */}
        <section className='tryout-hero'>
          <div className='hero-grid'>
            <div className='hero-text'>
              <div className='hero-eyebrow'>
                <span className='eyebrow-dot' />
                {event.category || 'Tryout'} • {new Date().getFullYear()}
              </div>
              <h1 className='hero-title'>
                <span className='hero-accent'>{event.title}</span>
              </h1>
              <p className='hero-lead'>
                {event.description ||
                  'Join Bothell Select Basketball for the upcoming season'}
              </p>

              <div className='hero-info-grid'>
                <div className='hero-info-item'>
                  <i className='ti ti-calendar-event' />
                  <div>
                    <span className='label'>Date</span>
                    <span className='value'>{formattedDate}</span>
                  </div>
                </div>
                <div className='hero-info-item'>
                  <i className='ti ti-clock' />
                  <div>
                    <span className='label'>Time</span>
                    <span className='value'>{formattedTime}</span>
                  </div>
                </div>
                <div className='hero-info-item'>
                  <i className='ti ti-map-pin' />
                  <div>
                    <span className='label'>Location</span>
                    <span className='value'>
                      {event.school?.name || 'Bothell High School'}
                    </span>
                  </div>
                </div>
              </div>

              <div className='hero-actions'>
                <button className='btn-primary-glass' onClick={handleRegister}>
                  Register Now <i className='ti ti-arrow-right' />
                </button>
                <a href='#details' className='btn-ghost-glass'>
                  Learn More <i className='ti ti-chevron-down' />
                </a>
              </div>
            </div>

            <div className='hero-img-col'>
              <div className='hero-img-glass'>
                <div className='hero-glow' />
                <ImageWithBasePath
                  src='assets/img/tryout-hero.png'
                  alt='Bothell Select Tryouts'
                  className='hero-img'
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%231a1a2e"/%3E%3Ctext x="200" y="150" text-anchor="middle" fill="%23506ee4" font-size="24" font-family="Arial"%3E🏀 Tryouts%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
              <div className='hero-badge'>
                <i className='ti ti-award' />
                <span>
                  Limited Spots
                  <br />
                  Available
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── DETAILS SECTION ────────────────────────────────────── */}
        <section className='tryout-details' id='details'>
          <div className='section-hdr'>
            <div className='section-tag'>Everything You Need to Know</div>
            <h2 className='section-title'>Tryout Details</h2>
            <p className='section-sub'>
              Come prepared and ready to showcase your skills
            </p>
          </div>

          <div className='details-grid'>
            {/* What to Bring */}
            <div className='details-card'>
              <div className='details-icon'>
                <i className='ti ti-package' />
              </div>
              <h3 className='details-title'>What to Bring</h3>
              <ul className='details-list'>
                <li>
                  <i className='ti ti-check' /> Basketball shoes
                </li>
                <li>
                  <i className='ti ti-check' /> Water bottle
                </li>
                <li>
                  <i className='ti ti-check' /> Athletic wear
                </li>
                <li>
                  <i className='ti ti-check' /> Completed waiver
                </li>
              </ul>
            </div>

            {/* What to Expect */}
            <div className='details-card'>
              <div className='details-icon'>
                <i className='ti ti-info-circle' />
              </div>
              <h3 className='details-title'>What to Expect</h3>
              <p className='details-body'>
                Tryouts will consist of skill demonstrations, drills, and
                scrimmages. Players will be evaluated on their basketball
                fundamentals, athleticism, and teamwork.
              </p>
            </div>

            {/* Who Can Tryout */}
            <div className='details-card'>
              <div className='details-icon'>
                <i className='ti ti-users' />
              </div>
              <h3 className='details-title'>Who Can Tryout</h3>
              <ul className='details-list'>
                <li>
                  <i className='ti ti-check' /> Boys &amp; Girls
                </li>
                <li>
                  <i className='ti ti-check' /> Grades 3-8
                </li>
                <li>
                  <i className='ti ti-check' /> All skill levels welcome
                </li>
              </ul>
            </div>

            {/* Location */}
            <div className='details-card'>
              <div className='details-icon'>
                <i className='ti ti-map-pin' />
              </div>
              <h3 className='details-title'>Location</h3>
              <p className='details-body'>
                <strong>{event.school?.name || 'Bothell High School'}</strong>
                <br />
                {event.school?.address || '18100 92nd Ave NE'}
                <br />
                {event.school?.city || 'Bothell'}, {event.school?.state || 'WA'}{' '}
                {event.school?.zip || '98011'}
              </p>
              <p className='details-note'>
                <i className='ti ti-clock' /> Please arrive 30 minutes early for
                check-in
              </p>
            </div>
          </div>
        </section>

        {/* ─── PRICING / CTA SECTION ────────────────────────────── */}
        <section className='tryout-cta'>
          <div className='cta-card'>
            <div className='cta-glow' />
            <div className='section-tag'>Secure Your Spot</div>
            <h2 className='cta-title'>
              ${event.price || 50}{' '}
              <span className='cta-subtitle'>per player</span>
            </h2>
            <p className='cta-body'>
              Registration closes 24 hours before tryouts. Don't miss your
              chance to join Bothell Select Basketball.
            </p>

            <div className='cta-features'>
              <div className='cta-feature'>
                <i className='ti ti-check-circle' />
                <span>Expert Coaching</span>
              </div>
              <div className='cta-feature'>
                <i className='ti ti-check-circle' />
                <span>Skill Development</span>
              </div>
              <div className='cta-feature'>
                <i className='ti ti-check-circle' />
                <span>Competitive Play</span>
              </div>
            </div>

            <div className='cta-actions'>
              <button
                className='btn-primary-glass btn-large'
                onClick={handleRegister}
              >
                Register Now <i className='ti ti-arrow-right' />
              </button>
              <p className='cta-note'>
                <i className='ti ti-info-circle' /> Limited spots available
              </p>
            </div>
          </div>
        </section>

        {/* ─── UTM Debug (Development Only) ────────────────────── */}
        {process.env.NODE_ENV === 'development' && (
          <div className='tryout-debug'>
            <div className='debug-card'>
              <strong>🔍 UTM Debug:</strong>
              <pre>{JSON.stringify(getMarketingAttribution(), null, 2)}</pre>
            </div>
          </div>
        )}
      </div>

      {/* ─── STYLES ────────────────────────────────────────────────── */}
      <style>{`
        /* ── Root & Background ──────────────────────────────────── */
        .tryout-root {
          min-height: 100vh;
          background: #000;
          position: relative;
          overflow-x: hidden;
          font-family: 'DM Sans', sans-serif;
          color: #fff;
        }

        .tryout-bg {
          position: fixed; inset: 0;
          background:
            radial-gradient(circle at 15% 40%, rgba(80,110,228,.18) 0%, transparent 55%),
            radial-gradient(circle at 85% 70%, rgba(120,140,255,.12) 0%, transparent 55%);
          pointer-events: none; z-index: 0;
        }

        .tryout-orb {
          position: fixed; border-radius: 50%;
          filter: blur(90px); pointer-events: none;
          animation: tryoutOrbFloat 22s ease-in-out infinite; z-index: 0;
        }
        .tryout-orb-1 { width:420px; height:420px; background:rgba(80,110,228,.18); top:-120px; left:-120px; animation-delay:0s; }
        .tryout-orb-2 { width:520px; height:520px; background:rgba(120,140,255,.13); bottom:-160px; right:-160px; animation-delay:6s; }
        .tryout-orb-3 { width:320px; height:320px; background:rgba(80,110,228,.13); top:45%; left:42%; animation-delay:12s; }

        @keyframes tryoutOrbFloat {
          0%,100% { transform: translate(0,0) rotate(0deg); }
          33%      { transform: translate(28px,-28px) rotate(120deg); }
          66%      { transform: translate(-18px,18px) rotate(240deg); }
        }

        /* ── Wrapper ──────────────────────────────────────────── */
        .tryout-wrap {
          position: relative; z-index: 1;
          max-width: 1200px; margin: 0 auto;
          padding: 60px 24px 80px;
          display: flex; flex-direction: column; gap: 80px;
        }

        /* ── Shared Components ────────────────────────────────── */
        .section-tag {
          display: inline-block;
          font-size: .73rem; font-weight: 700;
          letter-spacing: .12em; text-transform: uppercase;
          color: #506ee4;
          background: rgba(80,110,228,.12);
          border: 1px solid rgba(80,110,228,.28);
          padding: 4px 14px; border-radius: 40px; margin-bottom: 12px;
        }

        .section-title {
          font-size: clamp(1.8rem, 3.5vw, 2.5rem);
          font-weight: 800; letter-spacing: -.025em; line-height: 1.15;
          margin: 0 0 12px;
          background: linear-gradient(135deg, #fff 40%, rgba(255,255,255,.55));
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }

        .section-sub {
          font-size: 1rem; color: rgba(255,255,255,.6);
          line-height: 1.65; max-width: 520px; margin: 0;
        }

        .section-hdr { text-align: center; margin-bottom: 48px; }
        .section-hdr .section-sub { margin: 0 auto; }

        /* ── Buttons ──────────────────────────────────────────── */
        .btn-primary-glass {
          display: inline-flex; align-items: center; gap: 8px;
          background: linear-gradient(135deg, #506ee4, #3f5cd6);
          color: #fff; padding: 13px 28px; border-radius: 40px;
          font-size: .95rem; font-weight: 600; text-decoration: none;
          border: none; cursor: pointer;
          transition: all .25s ease;
        }
        .btn-primary-glass:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(80,110,228,.45);
          color: #fff;
        }
        .btn-primary-glass.btn-large {
          padding: 16px 40px;
          font-size: 1.05rem;
        }

        .btn-ghost-glass {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,.07); color: rgba(255,255,255,.85);
          padding: 13px 28px; border-radius: 40px;
          font-size: .95rem; font-weight: 600; text-decoration: none;
          border: 1px solid rgba(255,255,255,.15);
          transition: all .25s ease;
        }
        .btn-ghost-glass:hover {
          background: rgba(255,255,255,.12);
          border-color: rgba(255,255,255,.3);
          color: #fff; transform: translateY(-2px);
        }

        /* ─── HERO ─────────────────────────────────────────────── */
        .hero-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 56px; align-items: center;
        }

        .hero-eyebrow {
          display: flex; align-items: center; gap: 8px;
          font-size: .78rem; font-weight: 600; letter-spacing: .1em;
          text-transform: uppercase; color: rgba(255,255,255,.5);
          margin-bottom: 18px;
        }
        .eyebrow-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #506ee4; box-shadow: 0 0 8px #506ee4; flex-shrink: 0;
        }

        .hero-title {
          font-size: clamp(2.2rem, 4.5vw, 3.6rem);
          font-weight: 900; letter-spacing: -.035em; line-height: 1.1;
          margin: 0 0 18px; color: #fff;
        }
        .hero-accent {
          background: linear-gradient(135deg, #506ee4, #7b94f5);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }

        .hero-lead {
          font-size: 1rem; color: rgba(255,255,255,.65);
          line-height: 1.72; margin-bottom: 32px;
        }

        .hero-info-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 16px; margin-bottom: 32px;
        }

        .hero-info-item {
          display: flex; align-items: center; gap: 12px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 12px;
          padding: 12px 16px;
        }
        .hero-info-item i {
          color: #506ee4; font-size: 1.2rem;
          flex-shrink: 0;
        }
        .hero-info-item .label {
          font-size: .7rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: .06em;
          color: rgba(255,255,255,.4);
          display: block;
        }
        .hero-info-item .value {
          font-size: .85rem; font-weight: 600;
          color: #fff;
          display: block;
        }

        .hero-actions { display: flex; gap: 14px; flex-wrap: wrap; }

        .hero-img-col { position: relative; }

        .hero-img-glass {
          background: rgba(255,255,255,.05); backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,.12); border-radius: 36px;
          padding: 40px 32px; text-align: center;
          position: relative; overflow: hidden;
          box-shadow: 0 8px 40px rgba(0,0,0,.35);
          transition: transform .3s ease, box-shadow .3s ease;
        }
        .hero-img-glass:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 56px rgba(0,0,0,.45);
        }

        .hero-glow {
          position: absolute; top: -60px; left: 50%;
          transform: translateX(-50%);
          width: 300px; height: 300px;
          background: rgba(80,110,228,.2); filter: blur(80px);
          pointer-events: none; border-radius: 50%;
        }

        .hero-img {
          max-width: 100%; height: auto; position: relative; z-index: 1;
          filter: drop-shadow(0 12px 32px rgba(0,0,0,.4));
        }

        .hero-badge {
          position: absolute; bottom: -20px; right: 20px;
          background: rgba(255,255,255,.08); backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,.18); border-radius: 18px;
          padding: 12px 18px; display: flex; align-items: center; gap: 10px;
          font-size: .78rem; font-weight: 600; line-height: 1.3;
          color: rgba(255,255,255,.9); box-shadow: 0 4px 20px rgba(0,0,0,.3);
        }
        .hero-badge i { font-size: 1.4rem; color: #f59e0b; flex-shrink: 0; }

        /* ─── DETAILS ───────────────────────────────────────────── */
        .details-grid {
          display: grid; grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .details-card {
          background: rgba(255,255,255,.05); backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,.1); border-radius: 28px;
          padding: 32px 28px;
          transition: all .25s ease;
        }
        .details-card:hover {
          background: rgba(255,255,255,.08);
          border-color: rgba(80,110,228,.35);
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0,0,0,.3);
        }

        .details-icon {
          width: 52px; height: 52px;
          background: rgba(80,110,228,.15);
          border: 1px solid rgba(80,110,228,.25);
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 16px;
        }
        .details-icon i { font-size: 1.5rem; color: #506ee4; }

        .details-title {
          font-size: 1.12rem; font-weight: 700;
          color: #fff; margin: 0 0 12px;
        }

        .details-body {
          font-size: .9rem; color: rgba(255,255,255,.6);
          line-height: 1.65; margin: 0;
        }

        .details-list {
          list-style: none; padding: 0; margin: 0;
        }
        .details-list li {
          display: flex; align-items: center; gap: 10px;
          font-size: .9rem; color: rgba(255,255,255,.6);
          padding: 4px 0;
        }
        .details-list li i {
          color: #4ade80; font-size: 1rem;
        }

        .details-note {
          font-size: .8rem; color: rgba(255,255,255,.4);
          margin: 12px 0 0;
          display: flex; align-items: center; gap: 6px;
        }
        .details-note i { color: #506ee4; }

        /* ─── CTA ────────────────────────────────────────────────── */
        .cta-card {
          background: rgba(80,110,228,.08); backdrop-filter: blur(20px);
          border: 1px solid rgba(80,110,228,.25); border-radius: 36px;
          padding: 64px 80px; text-align: center;
          position: relative; overflow: hidden;
          box-shadow: 0 8px 40px rgba(0,0,0,.3);
        }

        .cta-glow {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          width: 500px; height: 300px;
          background: rgba(80,110,228,.15); filter: blur(80px);
          pointer-events: none; border-radius: 50%;
        }

        .cta-title {
          font-size: clamp(2.5rem, 4vw, 3.5rem);
          font-weight: 900; letter-spacing: -.025em;
          color: #fff; margin: 0 0 8px; position: relative;
        }
        .cta-subtitle {
          font-size: 1.2rem; font-weight: 400;
          color: rgba(255,255,255,.5);
        }

        .cta-body {
          font-size: 1rem; color: rgba(255,255,255,.65);
          line-height: 1.75; max-width: 520px;
          margin: 0 auto 24px; position: relative;
        }

        .cta-features {
          display: flex; justify-content: center;
          gap: 24px; margin-bottom: 32px;
          flex-wrap: wrap;
        }
        .cta-feature {
          display: flex; align-items: center; gap: 8px;
          font-size: .9rem; color: rgba(255,255,255,.7);
        }
        .cta-feature i {
          color: #4ade80; font-size: 1.1rem;
        }

        .cta-actions {
          position: relative;
        }

        .cta-note {
          font-size: .8rem; color: rgba(255,255,255,.4);
          margin: 12px 0 0;
        }
        .cta-note i { color: #506ee4; }

        /* ─── DEBUG ────────────────────────────────────────────── */
        .tryout-debug {
          margin-top: 40px;
        }
        .debug-card {
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 12px;
          padding: 16px 20px;
        }
        .debug-card pre {
          margin: 8px 0 0;
          font-size: 11px;
          color: rgba(255,255,255,.5);
          overflow: auto;
        }

        /* ─── Responsive ───────────────────────────────────────── */
        @media (max-width: 1024px) {
          .details-grid { grid-template-columns: repeat(2,1fr); }
          .cta-card { padding: 48px 40px; }
        }

        @media (max-width: 768px) {
          .tryout-wrap { gap: 56px; padding: 40px 16px 60px; }
          .hero-grid { grid-template-columns: 1fr; gap: 40px; }
          .hero-img-col { order: -1; }
          .hero-badge { bottom: -14px; right: 12px; font-size: .72rem; }
          .hero-info-grid { grid-template-columns: 1fr; }
          .details-grid { grid-template-columns: 1fr; }
          .cta-card { padding: 40px 24px; }
          .cta-features { flex-direction: column; align-items: center; }
        }

        @media (max-width: 480px) {
          .hero-actions { flex-direction: column; }
          .btn-primary-glass,
          .btn-ghost-glass { justify-content: center; }
          .btn-primary-glass.btn-large { padding: 14px 28px; font-size: .95rem; }
        }

        @media (prefers-reduced-motion: reduce) {
          .tryout-orb { animation: none; }
          .hero-img-glass { transition: none; }
          .details-card { transition: none; }
        }
      `}</style>
    </div>
  );
};

export default TryoutPage;
