import { useState } from 'react';

/**
 * Looping, muted treadmill footage for the home hero. Fills the hero on
 * mobile (dimmed behind the text) and the right side on desktop, fading
 * into black. Visitors who prefer reduced motion get the still poster.
 * Footage: Tima Miroshnichenko via Pexels (free licence), graded mono.
 */
export default function HeroVideo() {
  const [reduceMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const base = import.meta.env.BASE_URL;
  const mediaClass = 'h-full w-full object-cover object-[center_45%]';

  return (
    <div className="absolute inset-0 lg:left-auto lg:right-[4%] lg:w-[min(45%,62vh)]" aria-hidden="true">
      {reduceMotion ? (
        <img src={`${base}hero/treadmill-run-poster.jpg`} alt="" className={mediaClass} />
      ) : (
        <video
          className={mediaClass}
          src={`${base}hero/treadmill-run.mp4`}
          poster={`${base}hero/treadmill-run-poster.jpg`}
          autoPlay
          muted
          loop
          playsInline
        />
      )}
      {/* Mobile: dim the whole frame so the text reads. Desktop: fade into the black left side. */}
      <div className="absolute inset-0 bg-black/65 lg:bg-transparent lg:bg-gradient-to-r lg:from-black lg:via-transparent lg:via-40% lg:to-transparent" />
      <div className="absolute inset-y-0 right-0 hidden w-1/4 bg-gradient-to-l from-black to-transparent lg:block" />
      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black to-transparent" />
      <div className="absolute inset-x-0 top-0 h-1/6 bg-gradient-to-b from-black to-transparent" />
    </div>
  );
}
