import { useEffect, useRef, useState } from 'react';
import {
  Dumbbell, Heart, Flame, Users, Apple, Award, ArrowRight, Zap, Target, TrendingUp, Instagram,
} from 'lucide-react';
import ctaBackground from '@/assets/Gallery/vlcsnap-2025-07-20-12h21m46s983.webp';
import type { PageId } from '@/components/Navbar';
import HeroVideo from '@/components/HeroVideo';

interface HomePageProps {
  onNavigate: (page: PageId) => void;
}

const features = [
  { icon: Dumbbell, title: 'PERSONALIZED TRAINING', desc: 'Goal-specific training designed around your fitness level, body, lifestyle, and progress—not a one-size-fits-all workout.' },
  { icon: Users, title: 'EXPERT COACHING', desc: 'Work with experienced coaches who help you train with better technique, structure, progression, and accountability.' },
  { icon: Apple, title: 'PERFORMANCE NUTRITION', desc: 'Evidence-based nutrition guidance designed to support strength, endurance, body composition, metabolic health, and performance.' },
  { icon: Heart, title: 'PROGRESS THAT LASTS', desc: 'Whether you\'re training online or working with a coach in person, your program evolves with your progress and goals.' },
];

const stats = [
  { value: 500, suffix: '+', label: 'Active Members' },
  { value: 2, suffix: '+', label: 'Expert Trainers' },
  { value: 10, suffix: '+', label: 'Weekly Classes' },
  { value: 4, suffix: '+', label: 'Years Strong' },
];

interface ReelTestimonial {
  name: string;
  subtitle?: string;
  instagramUrl: string;
}

const reelTestimonials: ReelTestimonial[] = [
  { name: 'REAL PEOPLE. REAL PROGRESS', subtitle: 'Every step counts.', instagramUrl: 'https://www.instagram.com/reel/Dd0_6-mzR8q/' },
  { name: 'THE JOURNEY TO STRONGER', subtitle: 'Built with consistency.', instagramUrl: 'https://www.instagram.com/reel/DZRkPLaR1Nc/' },
  { name: 'FITNESS IN ACTION', subtitle: 'Strength beyond limits.', instagramUrl: 'https://www.instagram.com/reel/DU5jpDck9au/' },
  { name: 'TRAIN WITH PURPOSE', subtitle: 'Move with purpose.', instagramUrl: 'https://www.instagram.com/reel/DSU-eSMka2T/' },
  { name: 'BUILT, NOT GIVEN', subtitle: 'Dedication over excuses.', instagramUrl: 'https://www.instagram.com/reel/DTsiTJ6EVp6/' },
  { name: 'THE STHENOFY EXPERIENCE', subtitle: 'Stronger habits. Better results.', instagramUrl: 'https://www.instagram.com/reel/DP3v8qyEl0A/' },
];

function getInstagramReelId(url: string): string {
  return url.match(/\/reel\/([^/?]+)/)?.[1] || '';
}

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          const duration = 2000;
          const steps = 60;
          const inc = value / steps;
          let current = 0;
          const interval = setInterval(() => {
            current += inc;
            if (current >= value) {
              setCount(value);
              clearInterval(interval);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="font-display text-4xl sm:text-5xl md:text-6xl text-gold-400">
      {count}{suffix}
    </div>
  );
}

export default function HomePage({ onNavigate }: HomePageProps) {
  const [isTestimonialsPaused, setIsTestimonialsPaused] = useState(false);
  const testimonialLoop = [...reelTestimonials, ...reelTestimonials];

  const goToBooking = () => {
    onNavigate('services');
    window.setTimeout(() => {
      document.getElementById('appointment-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  return (
    <div className="noise-overlay">
      {/* HERO */}
      <section className="relative flex min-h-[640px] items-center overflow-hidden bg-black pt-16 sm:min-h-[760px] sm:pt-20 lg:min-h-screen">
        <HeroVideo />

        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-12 sm:px-6 sm:py-16 lg:px-8">
          {/* Left content */}
          <div className="max-w-2xl animate-fade-up space-y-5 sm:space-y-6">
            <div className="section-label">
              <Zap className="w-4 h-4" />
              <span>Personal training and nutrition</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight  text-white">
              TRAIN<br />
              WITH<br />
              <span className="text-gold-400">PURPOSE</span>
            </h1>
            <p className="relative z-10 max-w-md text-base leading-relaxed text-white sm:text-lg md:text-xl">
              Personalized training, strength, and nutrition coaching in Hyderabad and Bangalore - built around your individual goals. 
            </p>
            <div className="relative z-10 flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap sm:gap-4 sm:pt-2">
              <button onClick={goToBooking} className="btn-gold w-full px-5 py-3 text-xs sm:w-auto sm:text-sm">
                Start your journey
                <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => onNavigate('services')} className="btn-outline-gold w-full px-5 py-3 text-xs sm:w-auto sm:text-sm">
                View Services
              </button>
            </div>
            <div className="relative z-10 flex items-center gap-4 pt-2 sm:gap-6 sm:pt-4">
              <div className="flex -space-x-3">
                {[13211450, 31245340, 13885345, 20649585].map((id, i) => (
                  <img
                    key={i}
                    src={`https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&h=80&w=80`}
                    alt=""
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-ink-950 object-cover"
                  />
                ))}
              </div>
              <div className="text-sm">
                <div className="text-gold-400 font-bold">500+ Members</div>
                <div className="text-ink-300 text-xs">Already training with us</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <section className="border-y border-ink-50/5 bg-ink-900 py-4 sm:py-6 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {Array.from({ length: 2 }).map((_, dup) => (
            <div key={dup} className="flex items-center gap-8 sm:gap-12 px-4 sm:px-6">
              {['STRENGTH', 'CONFIDENCE', ' PERFORMANCE', 'DISCIPLINE', 'ENDURANCE'].map((word, i) => (
                <span key={`${dup}-${i}`} className="flex items-center gap-8 sm:gap-12">
                  <span className="font-display text-2xl sm:text-3xl md:text-4xl text-ink-50/20 tracking-widest">{word}</span>
                  <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-gold-500/30" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-16 sm:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="section-label justify-center mb-4">
              <Target className="w-4 h-4" />
              <span>Why STHENOFY</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-6xl tracking-tight">
              BUILT FOR <span className="text-gold-400">SERIOUS</span> RESULTS
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="card-hover glass rounded-2xl p-6 sm:p-8 group hover:border-gold-400/20"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gold-400/10 flex items-center justify-center mb-4 sm:mb-6 group-hover:bg-gold-400 group-hover:scale-110 transition-all duration-300">
                  <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-gold-400 group-hover:text-ink-950 transition-colors duration-300" />
                </div>
                <h3 className="font-display text-lg sm:text-xl uppercase tracking-wide mb-2 sm:mb-3">{feature.title}</h3>
                <p className="text-ink-300 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 sm:py-24 bg-black relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <Counter value={stat.value} suffix={stat.suffix} />
                <div className="mt-2 text-white text-xs sm:text-sm uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROGRAMS PREVIEW */}
      <section className="py-16 sm:py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-4">
            <div>
              <div className="section-label mb-4">
                <Flame className="w-4 h-4" />
                <span>Training Programs</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl md:text-6xl tracking-tight">
                FIND YOUR <span className="text-gold-400">FIGHT</span>
              </h2>
            </div>
            <button onClick={() => onNavigate('services')} className="text-gold-400 font-semibold uppercase tracking-wider text-sm flex items-center gap-2 hover:gap-4 transition-all">
              All Services <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { title: 'Endurance Sports Nutrition', desc: 'Fuel your performance, improve stamina, and recover faster with personalized nutrition.', img: 'https://images.pexels.com/photos/896058/pexels-photo-896058.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', tag: 'Most Popular' },
              { title: 'Nutrition for Diabetes', desc: 'Manage blood sugar levels and build healthier eating habits with balanced nutrition.', img: 'https://images.pexels.com/photos/4761352/pexels-photo-4761352.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', tag: 'Health First' },
              { title: 'Online Training Program', desc: 'Train from anywhere with customized workout plans and expert guidance.', img: 'https://images.pexels.com/photos/13849063/pexels-photo-13849063.jpeg', tag: 'Train Anywhere' },
            ].map((program, i) => (
              <button key={i} className="card-hover group relative overflow-hidden rounded-2xl cursor-pointer text-left" onClick={() => onNavigate('services')}>
                <div className="aspect-[3/4] relative">
                  <img src={program.img} alt={program.title} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="glass-gold rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-400">{program.tag}</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                    <h3 className="font-display text-xl sm:text-2xl uppercase tracking-wide text-white mb-2 group-hover:text-gold-400 transition-colors">{program.title}</h3>
                    <p className="text-ink-600 text-sm leading-relaxed mb-4">{program.desc}</p>
                    <span className="text-gold-400 text-sm font-semibold uppercase tracking-wider flex items-center gap-2 group-hover:gap-4 transition-all">
                      Explore <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-16 sm:py-24 bg-ink-900">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="section-label justify-center mb-4">
              <TrendingUp className="w-4 h-4" />
              <span>Member Stories</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-6xl tracking-tight">
              REAL STORIES, <span className="text-gold-400">REAL PROGRESS</span>
            </h2>
          </div>

          <div
            className={`testimonials-scroll overflow-x-auto pb-6 ${isTestimonialsPaused ? 'is-paused' : ''}`}
            onMouseEnter={() => setIsTestimonialsPaused(true)}
            onMouseLeave={() => setIsTestimonialsPaused(false)}
            onTouchStart={() => setIsTestimonialsPaused(true)}
            onTouchEnd={() => setIsTestimonialsPaused(false)}
          >
            <div className="testimonials-track flex w-max gap-4 sm:gap-6">
              {testimonialLoop.map((testimonial, index) => {
                const reelId = getInstagramReelId(testimonial.instagramUrl);
                return (
                  <article
                    key={`${testimonial.name}-${index}`}
                    className="glass rounded-2xl p-4 sm:p-5 card-hover w-[calc(100vw-2.5rem)] sm:w-[min(520px,70vw)] lg:w-[min(430px,32vw)] flex-shrink-0"
                  >
                    <div className="mb-4">
                      <h3 className="font-display text-xl sm:text-2xl uppercase tracking-wide text-ink-50">
                        {testimonial.name}
                      </h3>
                      {testimonial.subtitle && (
                        <p className="text-ink-400 text-xs sm:text-sm mt-1">{testimonial.subtitle}</p>
                      )}
                    </div>
                    <div className="relative aspect-[9/16] max-h-[480px] overflow-hidden rounded-xl border border-ink-50/10 bg-ink-900">
                      {reelId ? (
                        <iframe
                          src={`https://www.instagram.com/reel/${reelId}/embed/?hidecaption=true`}
                          title={`${testimonial.name} Instagram Reel`}
                          loading="lazy"
                          allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                          className="pointer-events-none absolute inset-0 h-full w-full"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center p-6 text-center text-sm text-ink-400">
                          Instagram Reel preview unavailable.
                        </div>
                      )}
                      {reelId && (
                        <a
                          href={testimonial.instagramUrl}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${testimonial.name} on Instagram`}
                          className="absolute inset-0 z-10"
                        >
                          <span className="sr-only">Open this Instagram Reel</span>
                        </a>
                      )}
                      <div className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-xs font-semibold text-white">
                        <Instagram className="h-4 w-4 text-pink-400" />
                        Watch on Instagram
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={ctaBackground} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover grayscale opacity-45" />
          <div className="absolute inset-0 bg-black/75" />
        </div>
        <div className="relative max-w-4xl mx-auto px-5 sm:px-6 text-center">
          <Award className="w-10 h-10 sm:w-12 sm:h-12 text-gold-500 mx-auto mb-6" />
          <h2 className="font-display text-3xl text-white sm:text-4xl md:text-6xl lg:text-7xl tracking-tight mb-6">
            YOUR TRANSFORMATION<br /><span className="text-gold-500">STARTS TODAY</span>
          </h2>
          <p className="text-white text-base sm:text-lg max-w-2xl mx-auto mb-8">
            Join 500+ members who decided to stop waiting. No contracts, no pressure — just results.
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
            <button onClick={goToBooking} className="btn-gold text-xs sm:text-sm">
              Make Appointment
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => onNavigate('contact')} className="btn-outline-gold text-xs sm:text-sm">
              Contact Us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
