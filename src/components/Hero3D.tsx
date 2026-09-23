import { useEffect, useRef, useState } from 'react';

/**
 * 3D animated barbell / weight plate component built with pure CSS 3D transforms.
 * Features a rotating barbell with weight plates, orbiting fitness icons,
 * and a pulsing energy ring — all driven by pointer movement for interactivity.
 * Uses a scale wrapper so the entire scene shrinks on small screens.
 * Rotation is driven via direct DOM ref writes (not React state) for performance.
 */
export default function Hero3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const autoRotateRef = useRef(true);
  const angleRef = useRef(0);

  useEffect(() => {
    let raf = 0;

    const animate = () => {
      if (autoRotateRef.current && sceneRef.current) {
        angleRef.current += 0.3;
        const angle = angleRef.current % 360;
        sceneRef.current.style.transform = `rotateX(-15deg) rotateY(${angle}deg)`;
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.offsetWidth;
      if (w < 380) setScale(0.55);
      else if (w < 480) setScale(0.7);
      else if (w < 640) setScale(0.8);
      else if (w < 768) setScale(0.9);
      else setScale(1);
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current || !sceneRef.current) return;
    autoRotateRef.current = false;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / rect.width;
    const dy = (e.clientY - cy) / rect.height;
    const ry = dx * 60;
    const rx = -15 - dy * 30;
    sceneRef.current.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
  };

  const handlePointerLeave = () => {
    autoRotateRef.current = true;
    angleRef.current = 0;
  };

  return (
    <div
      ref={containerRef}
      className="perspective-2000 relative flex items-center justify-center w-full min-h-[320px] sm:min-h-[380px] md:min-h-[480px] cursor-grab active:cursor-grabbing overflow-hidden select-none"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* Glow background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-60 h-60 sm:w-72 md:w-96 md:h-96 bg-gold-400/20 rounded-full blur-[80px] animate-pulse" />
      </div>

      {/* Pulsing rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-36 h-36 sm:w-44 md:w-64 md:h-64 border border-gold-400/30 rounded-full animate-pulse-ring" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-36 h-36 sm:w-44 md:w-64 md:h-64 border border-gold-400/20 rounded-full animate-pulse-ring" style={{ animationDelay: '1s' }} />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-36 h-36 sm:w-44 md:w-64 md:h-64 border border-gold-400/10 rounded-full animate-pulse-ring" style={{ animationDelay: '2s' }} />
      </div>

      {/* 3D Scene — scaled wrapper */}
      <div
        className="relative"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          width: '360px',
          height: '360px',
        }}
      >
        <div
          ref={sceneRef}
          className="preserve-3d relative w-full h-full"
          style={{
            transform: 'rotateX(-15deg) rotateY(0deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Central barbell */}
          <div className="preserve-3d relative w-full h-full" style={{ transformStyle: 'preserve-3d' }}>
            {/* Bar */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-ink-300 via-ink-100 to-ink-300"
              style={{
                width: '320px',
                height: '14px',
                transform: 'translateZ(0px)',
                boxShadow: '0 0 20px rgba(255,215,0,0.15), inset 0 -3px 6px rgba(0,0,0,0.4)',
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-30">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div key={i} className="w-1 h-3 bg-ink-950 rounded-full" />
                ))}
              </div>
            </div>

            {/* Left weight plate stack */}
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                transform: 'translate(-180px, -50px) translateZ(20px)',
                transformStyle: 'preserve-3d',
              }}
            >
              <div
                className="rounded-full border-4 border-ink-600 flex items-center justify-center"
                style={{
                  width: '100px',
                  height: '100px',
                  background: 'radial-gradient(circle at 30% 30%, #1c1c1c, #0a0a0a)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.6), inset 0 0 20px rgba(255,215,0,0.1)',
                }}
              >
                <div className="w-12 h-12 rounded-full border-2 border-gold-400/40 flex items-center justify-center">
                  <span className="font-display text-gold-400 text-xl">45</span>
                </div>
              </div>
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-ink-500"
                style={{
                  width: '78px',
                  height: '78px',
                  background: 'radial-gradient(circle at 30% 30%, #2e2e2e, #121212)',
                  transform: 'translate(-50%, -50%) translateZ(-10px)',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                }}
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold-400/30"
                style={{
                  width: '56px',
                  height: '56px',
                  background: 'radial-gradient(circle at 30% 30%, #ffd700, #d49d00)',
                  transform: 'translate(-50%, -50%) translateZ(-20px)',
                  boxShadow: '0 6px 15px rgba(255,215,0,0.3)',
                }}
              />
            </div>

            {/* Right weight plate stack */}
            <div
              className="absolute left-1/2 top-1/2"
              style={{
                transform: 'translate(80px, -50px) translateZ(20px)',
                transformStyle: 'preserve-3d',
              }}
            >
              <div
                className="rounded-full border-4 border-ink-600 flex items-center justify-center"
                style={{
                  width: '100px',
                  height: '100px',
                  background: 'radial-gradient(circle at 30% 30%, #1c1c1c, #0a0a0a)',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.6), inset 0 0 20px rgba(255,215,0,0.1)',
                }}
              >
                <div className="w-12 h-12 rounded-full border-2 border-gold-400/40 flex items-center justify-center">
                  <span className="font-display text-gold-400 text-xl">45</span>
                </div>
              </div>
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-ink-500"
                style={{
                  width: '78px',
                  height: '78px',
                  background: 'radial-gradient(circle at 30% 30%, #2e2e2e, #121212)',
                  transform: 'translate(-50%, -50%) translateZ(-10px)',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
                }}
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold-400/30"
                style={{
                  width: '56px',
                  height: '56px',
                  background: 'radial-gradient(circle at 30% 30%, #ffd700, #d49d00)',
                  transform: 'translate(-50%, -50%) translateZ(-20px)',
                  boxShadow: '0 6px 15px rgba(255,215,0,0.3)',
                }}
              />
            </div>

            {/* Collar clips */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-gold-400"
              style={{ width: '10px', height: '20px', transform: 'translate(-70px, 0) translateZ(5px)', boxShadow: '0 0 10px rgba(255,215,0,0.5)' }}
            />
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-gold-400"
              style={{ width: '10px', height: '20px', transform: 'translate(60px, 0) translateZ(5px)', boxShadow: '0 0 10px rgba(255,215,0,0.5)' }}
            />
          </div>

          {/* Orbiting elements */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transformStyle: 'preserve-3d', animation: 'spin 20s linear infinite' }}
          >
            <div
              className="absolute w-14 h-14 rounded-xl glass-gold flex items-center justify-center text-gold-400 text-2xl font-display"
              style={{ transform: 'translateY(-160px) translateZ(40px)' }}
            >
              ⚡
            </div>
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transformStyle: 'preserve-3d', animation: 'spinReverse 25s linear infinite' }}
          >
            <div
              className="absolute w-12 h-12 rounded-full glass flex items-center justify-center text-ink-50 text-xl font-display"
              style={{ transform: 'translateY(160px) translateZ(40px)' }}
            >
              ♥
            </div>
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transformStyle: 'preserve-3d', animation: 'spin 18s linear infinite' }}
          >
            <div
              className="absolute w-10 h-10 rounded-lg glass-gold flex items-center justify-center text-gold-400 text-lg font-display"
              style={{ transform: 'translateX(170px) translateZ(30px)' }}
            >
              🔥
            </div>
          </div>
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ transformStyle: 'preserve-3d', animation: 'spinReverse 22s linear infinite' }}
          >
            <div
              className="absolute w-10 h-10 rounded-lg glass flex items-center justify-center text-ink-50 text-lg font-display"
              style={{ transform: 'translateX(-170px) translateZ(30px)' }}
            >
              💪
            </div>
          </div>

          {/* Base shadow */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-400/10 blur-2xl"
            style={{ width: '300px', height: '40px', transform: 'translateZ(-80px)' }}
          />
        </div>
      </div>

      {/* Floating stat badges — hidden on very small screens */}
      <div className="absolute top-6 left-3 sm:left-6 md:left-8 glass rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 animate-float pointer-events-none">
        <div className="text-gold-400 font-display text-lg sm:text-2xl">500+</div>
        <div className="text-ink-300 text-[10px] sm:text-xs uppercase tracking-wider">Members</div>
      </div>
      <div className="absolute bottom-6 right-3 sm:right-6 md:right-8 glass-gold rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2 sm:py-3 animate-float-delayed pointer-events-none">
        <div className="text-gold-400 font-display text-lg sm:text-2xl">24/7</div>
        <div className="text-ink-300 text-[10px] sm:text-xs uppercase tracking-wider">Access</div>
      </div>
      <div className="hidden sm:block absolute top-1/2 right-6 md:right-12 glass rounded-2xl px-4 py-3 animate-float pointer-events-none" style={{ animationDelay: '1s' }}>
        <div className="text-gold-400 font-display text-2xl">15+</div>
        <div className="text-ink-300 text-xs uppercase tracking-wider">Trainers</div>
      </div>
    </div>
  );
}
