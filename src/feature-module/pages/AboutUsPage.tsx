import React, { useEffect, useRef, useState } from 'react';
import ImageWithBasePath from '../../core/common/imageWithBasePath';

const stats = [
  { value: '500+', label: 'Players Developed' },
  { value: '12+', label: 'Years of Excellence' },
  { value: '95%', label: 'College Placement' },
  { value: '30+', label: 'Championship Titles' },
];

const differentiators = [
  {
    icon: 'ti-ball-basketball',
    title: 'Expert Coaching',
    description:
      'Our camp is led by experienced coaches passionate about basketball and dedicated to helping each camper excel. With a focus on individualized instruction, our coaches bring a wealth of knowledge to every session.',
  },
  {
    icon: 'ti-clipboard-list',
    title: 'Comprehensive Curriculum',
    description:
      'We offer a curriculum designed for all skill levels — from beginners to advanced. Shooting, ball-handling, defense, teamwork, and more. Every aspect of the game, covered.',
  },
  {
    icon: 'ti-heart-handshake',
    title: 'Positive Environment',
    description:
      'We prioritize a positive, inclusive environment where campers feel supported and motivated. Building confidence, fostering friendships, and instilling sportsmanship and respect.',
  },
  {
    icon: 'ti-confetti',
    title: 'Fun & Engaging Activities',
    description:
      "Beyond training, our camp features team-building exercises, friendly competitions, and exciting challenges. There's never a dull moment at Bothell Select.",
  },
];

const AboutUsPage = () => {
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    new Set(),
  );
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-section');
            if (id) setVisibleSections((prev) => new Set([...prev, id]));
          }
        });
      },
      { threshold: 0.12 },
    );
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const setRef = (id: string) => (el: HTMLElement | null) => {
    sectionRefs.current[id] = el;
  };
  const isVisible = (id: string) => visibleSections.has(id);

  return (
    <div className='about-root'>
      {/* Background */}
      <div className='about-bg' />
      <div className='about-orb about-orb-1' />
      <div className='about-orb about-orb-2' />
      <div className='about-orb about-orb-3' />

      <div className='about-wrap'>
        {/* ── HERO ──────────────────────────────────────── */}
        <section
          className={`ab-section ab-hero ${isVisible('hero') ? 'vis' : ''}`}
          data-section='hero'
          ref={setRef('hero')}
        >
          <div className='hero-grid'>
            <div className='hero-text'>
              <div className='hero-eyebrow'>
                <span className='eyebrow-dot' />
                Bothell Select Basketball
              </div>
              <h1 className='hero-title'>
                Welcome to
                <br />
                <span className='hero-accent'>Where Champions</span>
                <br />
                Are Made
              </h1>
              <p className='hero-lead'>
                You are at the place where passion for basketball meets the joy
                of learning and growth. Established to provide aspiring young
                athletes with a platform to develop their skills, foster
                teamwork, and cultivate a love for the game — our camp is where
                dreams are nurtured.
              </p>
              <div className='hero-actions'>
                <a href='/register' className='btn-primary-glass'>
                  Join Our Program <i className='ti ti-arrow-right' />
                </a>
                <a href='/contact-us' className='btn-ghost-glass'>
                  Get in Touch
                </a>
              </div>
            </div>

            <div className='hero-img-col'>
              <div className='hero-img-glass'>
                <div className='hero-glow' />
                <ImageWithBasePath
                  src='assets/img/aboutus.jpg'
                  alt='Bothell Select Basketball'
                  className='hero-img'
                />
              </div>
              <div className='hero-badge'>
                <i className='ti ti-award' />
                <span>
                  #1 Youth Program
                  <br />
                  in the Pacific NW
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS ─────────────────────────────────────── */}
        {/* <section
          className={`ab-section ab-stats ${isVisible('stats') ? 'vis' : ''}`}
          data-section='stats'
          ref={setRef('stats')}
        >
          <div className='stats-row'>
            {stats.map((s, i) => (
              <div
                className='stat-card'
                key={i}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className='stat-val'>{s.value}</div>
                <div className='stat-lbl'>{s.label}</div>
              </div>
            ))}
          </div>
        </section> */}

        {/* ── MISSION ───────────────────────────────────── */}
        <section
          className={`ab-section ab-mission ${isVisible('mission') ? 'vis' : ''}`}
          data-section='mission'
          ref={setRef('mission')}
        >
          <div className='mission-card'>
            <div className='mission-icon-wrap'>
              <i className='ti ti-target-arrow' />
            </div>
            <div className='section-tag'>Our Mission</div>
            <h2 className='section-title'>More Than Just a Sport</h2>
            <p className='mission-body'>
              At Bothell Basketball Camp, our mission is simple yet profound: to
              inspire and empower young basketball players to reach their full
              potential, both on and off the court. We believe that basketball
              is more than just a sport — it's a vehicle for personal growth,
              character development, and lifelong friendships.
            </p>
            <div className='mission-rule' />
            <p className='mission-body'>
              Through expert coaching, comprehensive skill development programs,
              and a supportive community environment, we strive to create an
              unforgettable experience that leaves a lasting impact on every
              camper.
            </p>
            <blockquote className='mission-quote'>
              "Basketball is more than just a sport — it's a vehicle for
              personal growth, character development, and lifelong friendships."
              <cite>Zo Savovic — Bothell Select Basketball</cite>
            </blockquote>
          </div>
        </section>

        {/* ── WHAT SETS US APART ────────────────────────── */}
        <section
          className={`ab-section ab-diff ${isVisible('diff') ? 'vis' : ''}`}
          data-section='diff'
          ref={setRef('diff')}
        >
          <div className='section-hdr'>
            <div className='section-tag'>What Sets Us Apart</div>
            <h2 className='section-title'>The Bothell Select Difference</h2>
            <p className='section-sub'>
              Everything we do is designed to give every player the best
              possible foundation — on the court and in life.
            </p>
          </div>
          <div className='diff-grid'>
            {differentiators.map((d, i) => (
              <div
                className='diff-card'
                key={i}
                style={{ animationDelay: `${i * 0.12}s` }}
              >
                <div className='diff-icon'>
                  <i className={`ti ${d.icon}`} />
                </div>
                <h3 className='diff-title'>{d.title}</h3>
                <p className='diff-body'>{d.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── JOIN US ───────────────────────────────────── */}
        <section
          className={`ab-section ab-join ${isVisible('join') ? 'vis' : ''}`}
          data-section='join'
          ref={setRef('join')}
        >
          <div className='join-card'>
            <div className='join-glow' />
            <div className='section-tag'>Join Us!</div>
            <h2 className='join-title'>
              An Unforgettable Basketball Experience
            </h2>
            <p className='join-body'>
              Come be a part of our vibrant community, learn from expert
              coaches, make new friends, and take your basketball skills to new
              heights. For more information about our camp programs, coaching
              staff, registration details, and upcoming sessions — explore our
              website or contact us directly.
            </p>
            <p className='join-tagline'>
              We can't wait to welcome you to our family!
            </p>
            <div className='join-actions'>
              <a href='/register' className='btn-primary-glass'>
                Register Now <i className='ti ti-arrow-right' />
              </a>
              <a href='/contact-us' className='btn-ghost-glass'>
                Contact Us
              </a>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        /* ── Root & Background ──────────────────────────────────── */
        .about-root {
          min-height: 100vh;
          background: #000;
          position: relative;
          overflow-x: hidden;
          font-family: 'DM Sans', sans-serif;
          color: #fff;
        }

        .about-bg {
          position: fixed; inset: 0;
          background:
            radial-gradient(circle at 15% 40%, rgba(80,110,228,.18) 0%, transparent 55%),
            radial-gradient(circle at 85% 70%, rgba(120,140,255,.12) 0%, transparent 55%);
          pointer-events: none; z-index: 0;
        }

        .about-orb {
          position: fixed; border-radius: 50%;
          filter: blur(90px); pointer-events: none;
          animation: orbFloat 22s ease-in-out infinite; z-index: 0;
        }
        .about-orb-1 { width:420px; height:420px; background:rgba(80,110,228,.18); top:-120px; left:-120px; animation-delay:0s; }
        .about-orb-2 { width:520px; height:520px; background:rgba(120,140,255,.13); bottom:-160px; right:-160px; animation-delay:6s; }
        .about-orb-3 { width:320px; height:320px; background:rgba(80,110,228,.13); top:45%; left:42%; animation-delay:12s; }

        @keyframes orbFloat {
          0%,100% { transform: translate(0,0) rotate(0deg); }
          33%      { transform: translate(28px,-28px) rotate(120deg); }
          66%      { transform: translate(-18px,18px) rotate(240deg); }
        }

        /* ── Wrapper ──────────────────────────────────────────── */
        .about-wrap {
          position: relative; z-index: 1;
          max-width: 1200px; margin: 0 auto;
          padding: 80px 24px 100px;
          display: flex; flex-direction: column; gap: 80px;
        }

        /* ── Scroll reveal ────────────────────────────────────── */
        .ab-section {
          opacity: 0; transform: translateY(36px);
          transition: opacity .7s ease, transform .7s ease;
        }
        .ab-section.vis { opacity: 1; transform: translateY(0); }

        /* ── Shared tokens ────────────────────────────────────── */
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
          transition: all .25s ease;
        }
        .btn-primary-glass:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 28px rgba(80,110,228,.45); color: #fff;
        }

        .btn-ghost-glass {
          display: inline-flex; align-items: center; gap: 8px;
          background: rgba(255,255,255,.07); color: rgba(255,255,255,.85);
          padding: 13px 28px; border-radius: 40px;
          font-size: .95rem; font-weight: 600; text-decoration: none;
          border: 1px solid rgba(255,255,255,.15); transition: all .25s ease;
        }
        .btn-ghost-glass:hover {
          background: rgba(255,255,255,.12);
          border-color: rgba(255,255,255,.3);
          color: #fff; transform: translateY(-2px);
        }

        /* ── HERO ─────────────────────────────────────────────── */
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

        /* ── STATS ────────────────────────────────────────────── */
        .stats-row {
          display: grid; grid-template-columns: repeat(4,1fr); gap: 16px;
        }

        .stat-card {
          background: rgba(255,255,255,.05); backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,.1); border-radius: 24px;
          padding: 32px 24px; text-align: center;
          transition: all .25s ease; animation: fadeUp .6s ease both;
        }
        .stat-card:hover {
          background: rgba(255,255,255,.08);
          border-color: rgba(80,110,228,.4);
          transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,.3);
        }
        .stat-val {
          font-size: 2.6rem; font-weight: 900; letter-spacing: -.03em;
          background: linear-gradient(135deg,#fff,#506ee4);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          line-height: 1; margin-bottom: 8px;
        }
        .stat-lbl {
          font-size: .83rem; font-weight: 500;
          color: rgba(255,255,255,.55); letter-spacing: .02em;
        }

        /* ── MISSION ──────────────────────────────────────────── */
        .mission-card {
          background: rgba(255,255,255,.05); backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,.1); border-radius: 36px;
          padding: 56px 64px; text-align: center;
          box-shadow: 0 8px 40px rgba(0,0,0,.3);
        }

        .mission-icon-wrap {
          width: 64px; height: 64px;
          background: rgba(80,110,228,.2);
          border: 1px solid rgba(80,110,228,.35);
          border-radius: 20px; display: flex; align-items: center;
          justify-content: center; margin: 0 auto 20px;
        }
        .mission-icon-wrap i { font-size: 2rem; color: #506ee4; }

        .mission-body {
          font-size: 1.02rem; color: rgba(255,255,255,.68);
          line-height: 1.75; max-width: 720px; margin: 0 auto 24px;
        }

        .mission-rule {
          width: 60px; height: 2px;
          background: linear-gradient(90deg,transparent,#506ee4,transparent);
          margin: 0 auto 24px;
        }

        .mission-quote {
          font-size: 1rem; font-style: italic;
          color: rgba(255,255,255,.55);
          border: none; padding: 0; margin: 0; line-height: 1.7;
        }
        .mission-quote cite {
          display: block; margin-top: 10px;
          font-style: normal; font-size: .83rem;
          color: #506ee4; font-weight: 600;
        }

        /* ── DIFFERENTIATORS ──────────────────────────────────── */
        .diff-grid {
          display: grid; grid-template-columns: repeat(2,1fr); gap: 20px;
        }

        .diff-card {
          background: rgba(255,255,255,.05); backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,.1); border-radius: 28px;
          padding: 36px 32px; transition: all .25s ease;
          animation: fadeUp .6s ease both;
        }
        .diff-card:hover {
          background: rgba(255,255,255,.08);
          border-color: rgba(80,110,228,.35);
          transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,.3);
        }

        .diff-icon {
          width: 52px; height: 52px;
          background: rgba(80,110,228,.15);
          border: 1px solid rgba(80,110,228,.25);
          border-radius: 16px; display: flex; align-items: center;
          justify-content: center; margin-bottom: 20px;
        }
        .diff-icon i { font-size: 1.5rem; color: #506ee4; }

        .diff-title {
          font-size: 1.12rem; font-weight: 700; color: #fff; margin: 0 0 10px;
        }

        .diff-body {
          font-size: .9rem; color: rgba(255,255,255,.6);
          line-height: 1.65; margin: 0;
        }

        /* ── JOIN US ──────────────────────────────────────────── */
        .join-card {
          background: rgba(80,110,228,.08); backdrop-filter: blur(20px);
          border: 1px solid rgba(80,110,228,.25); border-radius: 36px;
          padding: 72px 80px; text-align: center;
          position: relative; overflow: hidden;
          box-shadow: 0 8px 40px rgba(0,0,0,.3);
        }

        .join-glow {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          width: 500px; height: 300px;
          background: rgba(80,110,228,.15); filter: blur(80px);
          pointer-events: none; border-radius: 50%;
        }

        .join-title {
          font-size: clamp(1.8rem, 3vw, 2.5rem);
          font-weight: 900; letter-spacing: -.025em;
          color: #fff; margin: 0 0 20px; position: relative;
        }

        .join-body {
          font-size: 1rem; color: rgba(255,255,255,.65);
          line-height: 1.75; max-width: 620px;
          margin: 0 auto 16px; position: relative;
        }

        .join-tagline {
          font-size: 1.05rem; font-weight: 600;
          color: rgba(255,255,255,.85);
          margin: 0 auto 36px; position: relative;
        }

        .join-actions {
          display: flex; gap: 14px; justify-content: center;
          flex-wrap: wrap; position: relative; margin-bottom: 40px;
        }

        .join-footer {
          font-size: .8rem; color: rgba(255,255,255,.35); position: relative;
        }

        .join-credit {
          color: #506ee4; text-decoration: none; font-weight: 600;
          transition: color .2s ease;
        }
        .join-credit:hover { color: #7b94f5; }

        /* ── Animation ────────────────────────────────────────── */
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* ── Responsive ───────────────────────────────────────── */
        @media (max-width: 1024px) {
          .stats-row    { grid-template-columns: repeat(2,1fr); }
          .mission-card { padding: 48px 40px; }
          .join-card    { padding: 56px 40px; }
        }

        @media (max-width: 768px) {
          .about-wrap { gap: 56px; padding: 60px 16px 80px; }
          .hero-grid  { grid-template-columns: 1fr; gap: 40px; }
          .hero-img-col { order: -1; }
          .hero-badge { bottom: -14px; right: 12px; font-size: .72rem; }
          .diff-grid  { grid-template-columns: 1fr; }
          .mission-card { padding: 36px 24px; }
          .join-card    { padding: 48px 24px; }
        }

        @media (max-width: 480px) {
          .stats-row { grid-template-columns: 1fr 1fr; gap: 12px; }
          .stat-val   { font-size: 2rem; }
          .hero-actions { flex-direction: column; }
          .btn-primary-glass,
          .btn-ghost-glass { justify-content: center; }
        }

        @media (prefers-reduced-motion: reduce) {
          .about-orb, .ab-section, .stat-card,
          .diff-card { animation: none; transition: none; }
          .ab-section { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
};

export default AboutUsPage;
