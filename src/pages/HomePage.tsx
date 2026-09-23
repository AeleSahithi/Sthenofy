import { useEffect, useRef, useState } from 'react';
import {
  Dumbbell, Heart, Flame, Users, Clock, Award, ArrowRight, ChevronRight, Zap, Target, TrendingUp,
} from 'lucide-react';
import Hero3D from '@/components/Hero3D';
import type { PageId } from '@/components/Navbar';

interface HomePageProps {
  onNavigate: (page: PageId) => void;
}

const features = [
  { icon: Dumbbell, title: 'World-Class Equipment', desc: 'Over 200 machines from premium brands, maintained daily for peak performance.' },
  { icon: Users, title: 'Expert Trainers', desc: '15+ certified coaches ready to build a program tailored to your body and goals.' },
  { icon: Clock, title: '24/7 Member Access', desc: 'Train on your schedule. Full gym access around the clock for all premium members.' },
  { icon: Heart, title: 'Group Classes', desc: 'From HIIT to yoga, over 50 weekly classes designed for every fitness level.' },
];

const stats = [
  { value: 500, suffix: '+', label: 'Active Members' },
  { value: 15, suffix: '+', label: 'Expert Trainers' },
  { value: 50, suffix: '+', label: 'Weekly Classes' },
  { value: 7, suffix: 'y', label: 'Years Strong' },
];

const testimonials = [
  { name: 'Marcus T.', role: 'Member since 2021', text: 'Lost 40 pounds in 6 months. The trainers actually care and the community pushes you every single day.', img: 'https://images.pexels.com/photos/13885345/pexels-photo-13885345.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  { name: 'Sarah K.', role: 'Member since 2022', text: 'Best gym I have ever joined. The classes are incredible and the equipment is always in perfect condition.', img: 'https://images.pexels.com/photos/31245340/pexels-photo-31245340.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  { name: 'James L.', role: 'Member since 2020', text: 'The 24/7 access changed everything for me. I can train at 4am before work and never wait for equipment.', img: 'https://images.pexels.com/photos/13211450/pexels-photo-13211450.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
];

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
  return (
    <div className="noise-overlay">
      {/* HERO */}
      <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.pexels.com/photos/17956264/pexels-photo-17956264.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
            alt=""
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/90 to-ink-950/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-transparent to-ink-950/60" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 w-full grid lg:grid-cols-2 gap-8 items-center py-8">
          {/* Left content */}
          <div className="space-y-5 sm:space-y-6 animate-fade-up">
            <div className="section-label">
              <Zap className="w-4 h-4" />
              <span>Premium Fitness Studio</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight">
              TRAIN<br />
              BEYOND<br />
              <span className="text-gold-400">LIMITS</span>
            </h1>
            <p className="text-ink-200 text-base sm:text-lg md:text-xl max-w-md leading-relaxed">
              STHENOFY is not just a gym. It is a forge where ordinary bodies become extraordinary. World-class equipment, elite coaching, relentless community.
            </p>
            <div className="flex flex-wrap gap-3 sm:gap-4 pt-2">
              <button onClick={() => onNavigate('packages')} className="btn-gold text-xs sm:text-sm">
                Start Training
                <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => onNavigate('classes')} className="btn-outline text-xs sm:text-sm">
                View Classes
              </button>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 pt-2 sm:pt-4">
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

          {/* Right: 3D component */}
          <div className="relative w-full">
            <Hero3D />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-ink-400 animate-bounce hidden sm:flex">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <ChevronRight className="w-4 h-4 rotate-90" />
        </div>
      </section>

      {/* MARQUEE */}
      <section className="border-y border-ink-50/5 bg-ink-900 py-4 sm:py-6 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {Array.from({ length: 2 }).map((_, dup) => (
            <div key={dup} className="flex items-center gap-8 sm:gap-12 px-4 sm:px-6">
              {['STRENGTH', 'DISCIPLINE', 'POWER', 'ENDURANCE', 'COMMUNITY', 'RESULTS'].map((word, i) => (
                <span key={`${dup}-${i}`} className="flex items-center gap-8 sm:gap-12">
                  <span className="font-display text-2xl sm:text-3xl md:text-4xl text-ink-50/10 tracking-widest">{word}</span>
                  <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-gold-400/30" />
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
      <section className="py-16 sm:py-24 bg-ink-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gold-400/5 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <Counter value={stat.value} suffix={stat.suffix} />
                <div className="mt-2 text-ink-300 text-xs sm:text-sm uppercase tracking-wider">{stat.label}</div>
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
            <button onClick={() => onNavigate('classes')} className="text-gold-400 font-semibold uppercase tracking-wider text-sm flex items-center gap-2 hover:gap-4 transition-all">
              All Classes <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { title: 'Strength & Power', desc: 'Build raw muscle and explosive power with compound lifts and progressive overload.', img: 'https://images.pexels.com/photos/896058/pexels-photo-896058.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', tag: 'Most Popular' },
              { title: 'HIIT & Cardio', desc: 'Torch calories and build endurance with high-intensity interval training circuits.', img: 'https://images.pexels.com/photos/4761352/pexels-photo-4761352.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', tag: 'High Energy' },
              { title: 'Mind & Mobility', desc: 'Recover, stretch, and build flexibility with yoga and mobility-focused sessions.', img: 'https://images.pexels.com/photos/3984353/pexels-photo-3984353.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', tag: 'Recovery' },
            ].map((program, i) => (
              <button key={i} className="card-hover group relative overflow-hidden rounded-2xl cursor-pointer text-left" onClick={() => onNavigate('classes')}>
                <div className="aspect-[3/4] relative">
                  <img src={program.img} alt={program.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="glass-gold rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-400">{program.tag}</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                    <h3 className="font-display text-xl sm:text-2xl uppercase tracking-wide mb-2 group-hover:text-gold-400 transition-colors">{program.title}</h3>
                    <p className="text-ink-300 text-sm leading-relaxed mb-4">{program.desc}</p>
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
              REAL PEOPLE, <span className="text-gold-400">REAL RESULTS</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="glass rounded-2xl p-6 sm:p-8 card-hover">
                <div className="flex items-center gap-4 mb-6">
                  <img src={t.img} alt={t.name} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-gold-400/30" />
                  <div>
                    <div className="font-bold text-ink-50">{t.name}</div>
                    <div className="text-ink-400 text-xs">{t.role}</div>
                  </div>
                </div>
                <p className="text-ink-200 leading-relaxed italic">"{t.text}"</p>
                <div className="flex gap-1 mt-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <span key={j} className="text-gold-400 text-sm">★</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.pexels.com/photos/19722863/pexels-photo-19722863.jpeg?auto=compress&cs=tinysrgb&h=650&w=940" alt="" className="w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0 bg-ink-950/80" />
        </div>
        <div className="relative max-w-4xl mx-auto px-5 sm:px-6 text-center">
          <Award className="w-10 h-10 sm:w-12 sm:h-12 text-gold-400 mx-auto mb-6" />
          <h2 className="font-display text-3xl sm:text-4xl md:text-6xl lg:text-7xl tracking-tight mb-6">
            YOUR TRANSFORMATION<br /><span className="text-gold-400">STARTS TODAY</span>
          </h2>
          <p className="text-ink-200 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            Join 500+ members who decided to stop waiting. First session is free. No contracts, no pressure — just results.
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
            <button onClick={() => onNavigate('packages')} className="btn-gold text-xs sm:text-sm">
              Claim Free Session
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => onNavigate('contact')} className="btn-outline text-xs sm:text-sm">
              Contact Us
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
