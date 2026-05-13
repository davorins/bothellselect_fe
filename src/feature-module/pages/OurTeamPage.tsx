import React, { useEffect, useRef, useState } from 'react';
import ImageWithBasePath from '../../core/common/imageWithBasePath';

const OurTeamPage = () => {
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

  const philosophies = [
    {
      icon: 'ti ti-chart-line',
      title: 'Skill Development',
      description:
        'We prioritize individual skill development in all aspects of the game, including shooting, ball-handling, passing, defense, and more.',
    },
    {
      icon: 'ti ti-users',
      title: 'Teamwork & Collaboration',
      description:
        'We emphasize the importance of teamwork, communication, and collaboration both on and off the court. Campers learn to work together, support each other, and celebrate success as a team.',
    },
    {
      icon: 'ti ti-hand-grab',
      title: 'Sportsmanship & Respect',
      description:
        'We instill values of sportsmanship, respect, and integrity in our campers, teaching them to compete with honor and respect for their opponents, coaches, and officials.',
    },
    {
      icon: 'ti ti-smile',
      title: 'Fun & Positive Environment',
      description:
        'We believe that learning and improvement are most effective in a fun, positive, and supportive environment. Our coaches strive to create an atmosphere where campers feel motivated, encouraged, and inspired to do their best.',
    },
  ];

  return (
    <div className='team-root'>
      {/* Background */}
      <div className='team-bg' />
      <div className='team-orb team-orb-1' />
      <div className='team-orb team-orb-2' />
      <div className='team-orb team-orb-3' />

      <div className='team-wrap'>
        {/* ── HERO ──────────────────────────────────────── */}
        <section
          className={`tm-section tm-hero ${isVisible('hero') ? 'vis' : ''}`}
          data-section='hero'
          ref={setRef('hero')}
        >
          <div className='hero-grid'>
            <div className='hero-text'>
              <div className='hero-eyebrow'>
                <span className='eyebrow-dot' />
                Our Team
              </div>
              <h1 className='hero-title'>
                Our Team
                <br />
                <span className='hero-accent'>& Coaches</span>
              </h1>
              <p className='hero-lead'>
                At Bothell Select, we take pride in assembling a team of
                dedicated and experienced coaches who are passionate about
                basketball and committed to providing an enriching experience
                for all participants. Our coaches bring a wealth of knowledge,
                skills, and enthusiasm to each session, ensuring that every
                player receives top-notch instruction and guidance.
              </p>
            </div>

            <div className='hero-img-col'>
              <div className='hero-img-glass'>
                <div className='hero-glow' />
                <ImageWithBasePath
                  src='assets/img/ourteam.png'
                  alt='Our Team and Coaches'
                  className='hero-img'
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── COACHING PHILOSOPHY ───────────────────────────────────── */}
        <section
          className={`tm-section tm-philosophy ${isVisible('philosophy') ? 'vis' : ''}`}
          data-section='philosophy'
          ref={setRef('philosophy')}
        >
          <div className='section-hdr'>
            <div className='section-tag'>Our Philosophy</div>
            <h2 className='section-title'>Our Coaching Philosophy</h2>
            <p className='section-sub'>
              At Bothell Select, we believe that basketball is more than just a
              game – it's an opportunity for growth, development, and personal
              excellence.
            </p>
          </div>

          <div className='philosophy-grid'>
            {philosophies.map((ph, i) => (
              <div className='philosophy-card' key={i}>
                <div className='philosophy-icon'>
                  <i className={ph.icon} />
                </div>
                <h3>{ph.title}</h3>
                <p>{ph.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── JOIN US ────────────────────────────────────────── */}
        <section
          className={`tm-section tm-join ${isVisible('join') ? 'vis' : ''}`}
          data-section='join'
          ref={setRef('join')}
        >
          <div className='join-card'>
            <div className='join-glow' />
            <div className='section-tag'>Join Us</div>
            <h2 className='join-title'>
              An Unforgettable Basketball Experience
            </h2>
            <p className='join-body'>
              Whether your child is a beginner looking to learn the fundamentals
              of basketball or an experienced player seeking to take their game
              to the next level,
              <strong> Bothell Select</strong> is the perfect place.
            </p>
            <p className='join-body'>
              Enroll your child today for an unforgettable basketball experience
              led by our team of dedicated coaches.
            </p>
            <div className='join-actions'>
              <a href='/register' className='btn-primary-glass'>
                Register Now <i className='ti ti-arrow-right' />
              </a>
              <a href='/contact-us' className='btn-ghost-glass'>
                Contact Us
              </a>
            </div>
            <div className='join-contact'>
              <i className='ti ti-mail' />
              <span>bothellselect@proton.me</span>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        /* ── Root & Background ──────────────────────────────────── */
        .team-root {
          min-height: 100vh;
          background: #000;
          position: relative;
          overflow-x: hidden;
          font-family: 'DM Sans', sans-serif;
          color: #fff;
        }

        .team-bg {
          position: fixed; inset: 0;
          background:
            radial-gradient(circle at 15% 40%, rgba(80,110,228,.18) 0%, transparent 55%),
            radial-gradient(circle at 85% 70%, rgba(120,140,255,.12) 0%, transparent 55%);
          pointer-events: none; z-index: 0;
        }

        .team-orb {
          position: fixed; border-radius: 50%;
          filter: blur(90px); pointer-events: none;
          animation: orbFloat 22s ease-in-out infinite; z-index: 0;
        }
        .team-orb-1 { width:420px; height:420px; background:rgba(80,110,228,.18); top:-120px; left:-120px; animation-delay:0s; }
        .team-orb-2 { width:520px; height:520px; background:rgba(120,140,255,.13); bottom:-160px; right:-160px; animation-delay:6s; }
        .team-orb-3 { width:320px; height:320px; background:rgba(80,110,228,.13); top:45%; left:42%; animation-delay:12s; }

        @keyframes orbFloat {
          0%,100% { transform: translate(0,0) rotate(0deg); }
          33%      { transform: translate(28px,-28px) rotate(120deg); }
          66%      { transform: translate(-18px,18px) rotate(240deg); }
        }

        /* ── Wrapper ──────────────────────────────────────────── */
        .team-wrap {
          position: relative; z-index: 1;
          max-width: 1200px; margin: 0 auto;
          padding: 80px 24px 100px;
          display: flex; flex-direction: column; gap: 80px;
        }

        /* ── Scroll reveal ────────────────────────────────────── */
        .tm-section {
          opacity: 0; transform: translateY(36px);
          transition: opacity .7s ease, transform .7s ease;
        }
        .tm-section.vis { opacity: 1; transform: translateY(0); }

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
          line-height: 1.65; max-width: 620px; margin: 0;
        }

        .section-hdr { text-align: center; margin-bottom: 48px; }
        .section-hdr .section-sub { margin: 0 auto; }

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

        /* ── PHILOSOPHY GRID ────────────────────────────────────────── */
        .philosophy-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .philosophy-card {
          background: rgba(255,255,255,.05); backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,.1); border-radius: 28px;
          padding: 32px 24px;
          text-align: center;
          transition: all .25s ease;
          animation: fadeUp .6s ease both;
        }
        .philosophy-card:hover {
          background: rgba(255,255,255,.08);
          border-color: rgba(80,110,228,.35);
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0,0,0,.3);
        }

        .philosophy-icon {
          width: 56px; height: 56px;
          background: rgba(80,110,228,.15);
          border: 1px solid rgba(80,110,228,.25);
          border-radius: 18px;
          display: flex; align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }
        .philosophy-icon i { font-size: 1.6rem; color: #506ee4; }

        .philosophy-card h3 {
          font-size: 1.1rem; font-weight: 700;
          color: #fff; margin: 0 0 12px;
        }

        .philosophy-card p {
          font-size: .85rem;
          color: rgba(255,255,255,.6);
          line-height: 1.6;
          margin: 0;
        }

        /* ── JOIN US ────────────────────────────────────────── */
        .join-card {
          background: rgba(80,110,228,.08); backdrop-filter: blur(20px);
          border: 1px solid rgba(80,110,228,.25); border-radius: 36px;
          padding: 56px 64px;
          text-align: center;
          position: relative;
          overflow: hidden;
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

        .join-body strong {
          color: #506ee4;
        }

        .join-actions {
          display: flex; gap: 14px; justify-content: center;
          flex-wrap: wrap; position: relative; margin: 32px 0 24px;
        }

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

        .join-contact {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 24px;
          padding: 12px 20px;
          background: rgba(255,255,255,.05);
          border-radius: 40px;
          width: fit-content;
          margin: 24px auto 0;
        }

        .join-contact i {
          font-size: 1.1rem;
          color: #506ee4;
        }

        .join-contact span {
          font-size: .85rem;
          color: rgba(255,255,255,.7);
        }

        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* ── Responsive ───────────────────────────────────────── */
        @media (max-width: 968px) {
          .philosophy-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .team-wrap { gap: 56px; padding: 60px 16px 80px; }
          .hero-grid  { grid-template-columns: 1fr; gap: 40px; }
          .hero-img-col { order: -1; }
          .philosophy-grid { grid-template-columns: 1fr; }
          .join-card { padding: 40px 24px; }
        }

        @media (max-width: 480px) {
          .join-actions { flex-direction: column; }
          .btn-primary-glass, .btn-ghost-glass { justify-content: center; }
        }

        @media (prefers-reduced-motion: reduce) {
          .team-orb, .tm-section, .philosophy-card {
            animation: none; transition: none;
          }
          .tm-section { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
};

export default OurTeamPage;
