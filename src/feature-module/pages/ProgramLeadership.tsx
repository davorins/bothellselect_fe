import React, { useEffect, useRef, useState } from 'react';
import ImageWithBasePath from '../../core/common/imageWithBasePath';

const ProgramLeadership = () => {
  const [visibleSections, setVisibleSections] = useState<Set<string>>(
    new Set(),
  );
  const [expandedLeader, setExpandedLeader] = useState<string | null>(null);
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

  const toggleExpand = (leaderId: string) => {
    setExpandedLeader(expandedLeader === leaderId ? null : leaderId);
  };

  return (
    <div className='leadership-root'>
      {/* Background */}
      <div className='leadership-bg' />
      <div className='leadership-orb leadership-orb-1' />
      <div className='leadership-orb leadership-orb-2' />
      <div className='leadership-orb leadership-orb-3' />

      <div className='leadership-wrap'>
        {/* ── HERO ──────────────────────────────────────── */}
        <section
          className={`ld-section ld-hero ${isVisible('hero') ? 'vis' : ''}`}
          data-section='hero'
          ref={setRef('hero')}
        >
          <div className='hero-grid'>
            <div className='hero-text'>
              <div className='hero-eyebrow'>
                <span className='eyebrow-dot' />
                Program Leadership
              </div>
              <h1 className='hero-title'>
                Meet the Leaders
                <br />
                <span className='hero-accent'>Behind Bothell Select</span>
              </h1>
              <p className='hero-lead'>
                Our leadership team brings decades of professional and
                collegiate experience to develop the next generation of
                basketball players.
              </p>
            </div>

            <div className='hero-img-col'>
              <div className='hero-img-glass'>
                <div className='hero-glow' />
                <ImageWithBasePath
                  src='assets/img/program-leadership.jpg'
                  alt='Program Leadership'
                  className='hero-img'
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── ZLATKO SAVOVIC ───────────────────────────────────── */}
        <section
          className={`ld-section ld-leader ${isVisible('leader1') ? 'vis' : ''}`}
          data-section='leader1'
          ref={setRef('leader1')}
        >
          <div className='leader-card'>
            <div className='leader-header'>
              <div className='leader-image-placeholder'>
                {/* Image container - replace with actual image later */}
                <div className='leader-image-inner'>
                  <ImageWithBasePath
                    src='assets/img/zo.png'
                    alt='Zlatko (Zo) Savovic'
                  />
                </div>
              </div>
              <div className='leader-title-section'>
                <div className='section-tag'>President</div>
                <h2 className='leader-name'>Zlatko (Zo) Savovic</h2>
                <div className='leader-title-line'>President & Founder</div>
              </div>
            </div>

            <div
              className={`leader-content ${expandedLeader === 'zlatko' ? 'expanded' : ''}`}
            >
              {/* <div className='leader-stats-grid'>
                <div className='stat-item'>
                  <div className='stat-value'>14.6</div>
                  <div className='stat-label'>Points/Game (College)</div>
                </div>
                <div className='stat-item'>
                  <div className='stat-value'>4.1</div>
                  <div className='stat-label'>Assists/Game</div>
                </div>
                <div className='stat-item'>
                  <div className='stat-value'>4.1</div>
                  <div className='stat-label'>Rebounds/Game</div>
                </div>
              </div> */}

              <div className='leader-bio-full'>
                <p>
                  <strong>Education & College Career</strong>
                  <br />
                  Zlatko's basketball career started in Belgrade, Serbia, in
                  1993 where he played for Beovuk. Over the next four years he
                  learned Yugoslavian basketball style, structure, and
                  fundamentals. Former Yugoslavia is a famous, successful, and
                  proud nation producing some of the World's greatest basketball
                  players like Nikola Jokic, Luka Doncic, Vlade Divac, Drazen
                  Petrovic, and many others.
                </p>
                <p>
                  In 1997 his family moved to the United States where he
                  continued basketball at Everett High School in Everett,
                  Washington State. Following his Senior Year in 1999 Zlatko was
                  awarded WESCO Player of the Year Award and was nominated to
                  the Washington State All Star Team alongside former NBA player
                  and current NBA analyst Jamal Crawford.
                </p>
                <p>
                  He was also awarded a Scholarship to Lehigh University, a
                  Patriot League Division I school. His Senior Year at Lehigh
                  University he averaged 14.6 points/game, 4.1 rebounds/game and
                  4.1 assists/game and was nominated to All-Patriot League First
                  Team for the 2002-03 season. He earned a bachelor's degree in
                  Mechanical Engineering from Lehigh University.
                </p>
                <p>
                  <strong>Basketball Career</strong>
                  <br />
                  Playing at the High School level, Division I level, and
                  professionally in Europe, has reinforced his knowledge and
                  deep understanding of systems, player development, and mental
                  demands that are required from basketball players today. He
                  also understands the importance of education and its emphasis
                  on overall development of young athletes.
                </p>
                <p>
                  His coaching philosophy emphasizes fundamentals,
                  accountability, confidence, and character building, thus
                  ensuring that every athlete is prepared not just for the next
                  level of basketball, but for life beyond the game! Above all,
                  Zlatko's passion lies in helping young players grow, learn,
                  and to believe in their potential. His programs are built on
                  respect for the game, the teammates, the coaching staff, and
                  genuine commitment to each child's journey.
                </p>
              </div>

              <div className='leader-quote'>
                <i className='ti ti-quote' />
                <p>
                  "My coaching philosophy emphasizes fundamentals,
                  accountability, confidence, and character building — ensuring
                  that every athlete is prepared not just for the next level of
                  basketball, but for life beyond the game!"
                </p>
                <cite>— Zlatko Savovic</cite>
              </div>
            </div>

            <button
              className='expand-btn'
              onClick={() => toggleExpand('zlatko')}
            >
              {expandedLeader === 'zlatko' ? (
                <>
                  Show Less <i className='ti ti-chevron-up' />
                </>
              ) : (
                <>
                  Read Full Bio <i className='ti ti-chevron-down' />
                </>
              )}
            </button>
          </div>
        </section>

        {/* ── ARMEND KAHRIMANOVIC ───────────────────────────────── */}
        <section
          className={`ld-section ld-leader ${isVisible('leader2') ? 'vis' : ''}`}
          data-section='leader2'
          ref={setRef('leader2')}
        >
          <div className='leader-card'>
            <div className='leader-header'>
              <div className='leader-image-placeholder'>
                {/* Image container - replace with actual image later */}
                <div className='leader-image-inner'>
                  <ImageWithBasePath
                    src='assets/img/ak.png'
                    alt='Armend Kahrimanovic'
                  />
                </div>
              </div>
              <div className='leader-title-section'>
                <div className='section-tag'>Vice President</div>
                <h2 className='leader-name'>Armend Kahrimanovic</h2>
                <div className='leader-title-line'>
                  Vice President & Head Coach
                </div>
              </div>
            </div>

            <div
              className={`leader-content ${expandedLeader === 'armend' ? 'expanded' : ''}`}
            >
              <div className='leader-bio-full'>
                <p>
                  Armend Kahrimanovic is the Vice President and the Head Coach
                  of Partizan AAU Basketball. He is dedicated to developing
                  young athletes through high-level skill training, discipline,
                  and a strong basketball culture built around fundamentals,
                  competitiveness, and love for the game.
                </p>
                <p>
                  <strong>Background & Playing Career</strong>
                  <br />
                  Originally from Bosnia and Herzegovina, Armend grew up in the
                  European basketball system that is known for demanding
                  practices, strong fundamentals, and a team-oriented
                  philosophy. Growing up in the former Yugoslavia, he trained
                  daily in a system that emphasized skill development,
                  basketball IQ, and understanding the game at a deep level.
                  Those early years shaped his work ethic and passion for
                  basketball.
                </p>
                <p>
                  Armend continued his basketball journey in the United States
                  where he played NCAA Division I basketball at the University
                  of Idaho. Competing at the highest level of college basketball
                  allowed him to gain valuable experience against elite
                  competition and further expand his understanding of the game.
                </p>
                <p>
                  Following his collegiate career, Armend continued playing
                  professionally in Europe, competing for several teams across
                  the continent, including clubs in Greece and the Balkans.
                  Playing internationally allowed him to experience different
                  basketball systems, coaching philosophies, and styles of play,
                  which continue to influence the way he teaches the game today.
                </p>
                <p>
                  <strong>Coaching Philosophy</strong>
                  <br />
                  Today, Armend brings his international experience and
                  knowledge to youth basketball through Partizan AAU. His
                  coaching philosophy blends the structured fundamentals of
                  European basketball with the athleticism and competitiveness
                  of the American game.
                </p>
                <p>
                  For Armend, it is extremely important that young players
                  develop creativity on the court. He believes players must have
                  the freedom to play instinctively, make decisions, and express
                  their game naturally. At the same time, he demands discipline,
                  effort, and accountability. Players are expected to compete
                  hard, play with energy, and hustle on every possession.
                </p>
                <p>
                  Through Partizan AAU, Armend is committed to helping players
                  grow not only as basketball athletes but also as individuals.
                  His goal is to develop confident, skilled, and intelligent
                  players who understand the game and carry strong work habits
                  both on and off the court.
                </p>
              </div>

              <div className='leader-philosophy'>
                <h4>Core Coaching Principles</h4>
                <ul>
                  <li>
                    Blends European fundamentals with American athleticism
                  </li>
                  <li>Encourages creativity and instinctive play</li>
                  <li>Demands discipline, effort, and accountability</li>
                  <li>Develops confident, skilled, intelligent players</li>
                  <li>Players must have freedom to play instinctively</li>
                  <li>Hustle on every possession is non-negotiable</li>
                </ul>
              </div>

              <div className='leader-quote'>
                <i className='ti ti-quote' />
                <p>
                  "Players must have the freedom to play instinctively, make
                  decisions, and express their game naturally. At the same time,
                  I demand discipline, effort, and accountability."
                </p>
                <cite>— Armend Kahrimanovic</cite>
              </div>
            </div>

            <button
              className='expand-btn'
              onClick={() => toggleExpand('armend')}
            >
              {expandedLeader === 'armend' ? (
                <>
                  Show Less <i className='ti ti-chevron-up' />
                </>
              ) : (
                <>
                  Read Full Bio <i className='ti ti-chevron-down' />
                </>
              )}
            </button>
          </div>
        </section>

        {/* ── VALUES ────────────────────────────────────────── */}
        <section
          className={`ld-section ld-values ${isVisible('values') ? 'vis' : ''}`}
          data-section='values'
          ref={setRef('values')}
        >
          <div className='section-hdr'>
            <div className='section-tag'>Our Philosophy</div>
            <h2 className='section-title'>
              Building Champions On & Off the Court
            </h2>
            <p className='section-sub'>
              We believe in developing not just skilled athletes, but
              well-rounded individuals.
            </p>
          </div>
          <div className='values-grid'>
            <div className='value-card'>
              <div className='value-icon'>
                <i className='ti ti-heart-handshake' />
              </div>
              <h3>Character First</h3>
              <p>
                Building integrity, respect, and leadership skills that last a
                lifetime.
              </p>
            </div>
            <div className='value-card'>
              <div className='value-icon'>
                <i className='ti ti-brain' />
              </div>
              <h3>Basketball IQ</h3>
              <p>
                Teaching the mental game — reading defenses, making smart
                decisions.
              </p>
            </div>
            <div className='value-card'>
              <div className='value-icon'>
                <i className='ti ti-trending-up' />
              </div>
              <h3>Continuous Growth</h3>
              <p>
                Every player has a path to improve, regardless of starting
                level.
              </p>
            </div>
            <div className='value-card'>
              <div className='value-icon'>
                <i className='ti ti-users' />
              </div>
              <h3>Team Unity</h3>
              <p>
                Creating a supportive environment where everyone lifts each
                other up.
              </p>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        /* ── Root & Background ──────────────────────────────────── */
        .leadership-root {
          min-height: 100vh;
          background: #000;
          position: relative;
          overflow-x: hidden;
          font-family: 'DM Sans', sans-serif;
          color: #fff;
        }

        .leadership-bg {
          position: fixed; inset: 0;
          background:
            radial-gradient(circle at 15% 40%, rgba(80,110,228,.18) 0%, transparent 55%),
            radial-gradient(circle at 85% 70%, rgba(120,140,255,.12) 0%, transparent 55%);
          pointer-events: none; z-index: 0;
        }

        .leadership-orb {
          position: fixed; border-radius: 50%;
          filter: blur(90px); pointer-events: none;
          animation: orbFloat 22s ease-in-out infinite; z-index: 0;
        }
        .leadership-orb-1 { width:420px; height:420px; background:rgba(80,110,228,.18); top:-120px; left:-120px; animation-delay:0s; }
        .leadership-orb-2 { width:520px; height:520px; background:rgba(120,140,255,.13); bottom:-160px; right:-160px; animation-delay:6s; }
        .leadership-orb-3 { width:320px; height:320px; background:rgba(80,110,228,.13); top:45%; left:42%; animation-delay:12s; }

        @keyframes orbFloat {
          0%,100% { transform: translate(0,0) rotate(0deg); }
          33%      { transform: translate(28px,-28px) rotate(120deg); }
          66%      { transform: translate(-18px,18px) rotate(240deg); }
        }

        /* ── Wrapper ──────────────────────────────────────────── */
        .leadership-wrap {
          position: relative; z-index: 1;
          max-width: 1200px; margin: 0 auto;
          padding: 80px 24px 100px;
          display: flex; flex-direction: column; gap: 80px;
        }

        /* ── Scroll reveal ────────────────────────────────────── */
        .ld-section {
          opacity: 0; transform: translateY(36px);
          transition: opacity .7s ease, transform .7s ease;
        }
        .ld-section.vis { opacity: 1; transform: translateY(0); }

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

        /* ── LEADER CARDS ────────────────────────────────────────── */
        .leader-card {
          background: rgba(255,255,255,.05); backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,.1); border-radius: 36px;
          padding: 48px;
          box-shadow: 0 8px 40px rgba(0,0,0,.3);
          transition: all .3s ease;
        }
        .leader-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 48px rgba(0,0,0,.4);
          border-color: rgba(80,110,228,.3);
        }

        .leader-header {
          display: flex;
          gap: 32px;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }

        /* Image placeholder container - replace with actual image */
        .leader-image-placeholder {
          width: 120px;
          height: 120px;
          background: rgba(80,110,228,.15);
          border-radius: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(80,110,228,.3);
          overflow: hidden;
          flex-shrink: 0;
        }

        .leader-image-inner {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .leader-image-inner i {
          font-size: 60px;
          color: rgba(80,110,228,.5);
        }

        /* When actual image is added, use this */
        .leader-image-placeholder img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .leader-title-section {
          flex: 1;
        }

        .leader-name {
          font-size: clamp(1.6rem, 2.5vw, 2.2rem);
          font-weight: 800; letter-spacing: -.025em;
          margin: 0 0 8px;
          background: linear-gradient(135deg, #fff, #506ee4);
          -webkit-background-clip: text; background-clip: text; color: transparent;
        }

        .leader-title-line {
          font-size: .9rem; font-weight: 600;
          color: #506ee4; margin-bottom: 0;
          letter-spacing: .05em;
        }

        /* Collapsible content */
        .leader-content {
          max-height: 300px;
          overflow: hidden;
          transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          margin-bottom: 20px;
        }

        .leader-content.expanded {
          max-height: 3000px;
        }

        .leader-stats-grid {
          display: flex;
          gap: 24px;
          justify-content: center;
          margin-bottom: 32px;
          padding: 20px;
          background: rgba(80,110,228,.08);
          border-radius: 24px;
        }

        .stat-item {
          text-align: center;
          flex: 1;
        }

        .stat-value {
          font-size: 1.8rem;
          font-weight: 800;
          background: linear-gradient(135deg, #fff, #506ee4);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          line-height: 1;
        }

        .stat-label {
          font-size: .7rem;
          font-weight: 600;
          color: rgba(255,255,255,.5);
          text-transform: uppercase;
          letter-spacing: .05em;
          margin-top: 4px;
        }

        .leader-bio-full p {
          font-size: .95rem;
          line-height: 1.7;
          color: rgba(255,255,255,.75);
          margin-bottom: 16px;
        }

        .leader-bio-full strong {
          color: #506ee4;
          font-weight: 600;
        }

        .leader-philosophy {
          background: rgba(80,110,228,.08);
          padding: 24px;
          border-radius: 24px;
          margin: 20px 0;
        }

        .leader-philosophy h4 {
          font-size: 1rem;
          font-weight: 700;
          color: #506ee4;
          margin: 0 0 16px;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .leader-philosophy ul {
          margin: 0;
          padding-left: 20px;
        }

        .leader-philosophy li {
          font-size: .9rem;
          color: rgba(255,255,255,.7);
          line-height: 1.6;
          margin-bottom: 8px;
        }

        .leader-quote {
          margin-top: 24px;
          padding: 24px 32px;
          background: rgba(80,110,228,.06);
          border-radius: 24px;
          border-left: 3px solid #506ee4;
          text-align: center;
        }

        .leader-quote i {
          font-size: 2rem;
          color: rgba(80,110,228,.4);
          margin-bottom: 12px;
          display: inline-block;
        }

        .leader-quote p {
          font-size: 1rem;
          line-height: 1.65;
          color: rgba(255,255,255,.8);
          font-style: italic;
          margin: 0 0 12px;
        }

        .leader-quote cite {
          display: block;
          font-size: .8rem;
          font-style: normal;
          color: #506ee4;
          font-weight: 600;
        }

        .expand-btn {
          width: 100%;
          padding: 12px;
          background: rgba(80,110,228,.15);
          border: 1px solid rgba(80,110,228,.25);
          border-radius: 40px;
          color: #506ee4;
          font-size: .9rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all .2s ease;
          font-family: 'DM Sans', sans-serif;
        }

        .expand-btn:hover {
          background: rgba(80,110,228,.25);
          transform: translateY(-2px);
        }

        /* ── VALUES GRID ────────────────────────────────────────── */
        .values-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .value-card {
          background: rgba(255,255,255,.05); backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,.1); border-radius: 28px;
          padding: 36px 28px;
          text-align: center;
          transition: all .25s ease;
          animation: fadeUp .6s ease both;
        }
        .value-card:hover {
          background: rgba(255,255,255,.08);
          border-color: rgba(80,110,228,.35);
          transform: translateY(-4px);
          box-shadow: 0 12px 32px rgba(0,0,0,.3);
        }

        .value-icon {
          width: 56px; height: 56px;
          background: rgba(80,110,228,.15);
          border: 1px solid rgba(80,110,228,.25);
          border-radius: 18px;
          display: flex; align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }
        .value-icon i { font-size: 1.6rem; color: #506ee4; }

        .value-card h3 {
          font-size: 1.1rem; font-weight: 700;
          color: #fff; margin: 0 0 12px;
        }

        .value-card p {
          font-size: .85rem;
          color: rgba(255,255,255,.6);
          line-height: 1.6;
          margin: 0;
        }

        @keyframes fadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }

        /* ── Responsive ───────────────────────────────────────── */
        @media (max-width: 968px) {
          .leader-stats-grid {
            flex-direction: column;
            gap: 16px;
          }
          .values-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .leadership-wrap { gap: 56px; padding: 60px 16px 80px; }
          .hero-grid  { grid-template-columns: 1fr; gap: 40px; }
          .hero-img-col { order: -1; }
          .leader-card { padding: 32px 24px; }
          .leader-header {
            flex-direction: column;
            text-align: center;
          }
          .values-grid { grid-template-columns: 1fr; }
          .leader-stats-grid {
            flex-direction: column;
          }
        }

        @media (max-width: 480px) {
          .leader-quote {
            padding: 20px;
          }
          .leader-quote p {
            font-size: .9rem;
          }
          .value-card {
            padding: 28px 20px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .leadership-orb, .ld-section, .leader-card, .value-card, .leader-content {
            animation: none; transition: none;
          }
          .ld-section { opacity: 1; transform: none; }
          .leader-content {
            max-height: none;
          }
          .expand-btn {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default ProgramLeadership;
