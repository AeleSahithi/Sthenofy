import { Clock, User, Flame, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import type { PageId } from '@/components/Navbar';

interface ClassesPageProps {
  onNavigate: (page: PageId) => void;
}

const classCategories = ['All', 'Strength', 'Cardio', 'Mind & Body', 'Combat'];

const classes = [
  { name: 'Power Lifting', category: 'Strength', desc: 'Build raw strength with squats, deadlifts, and bench press.', duration: '60 min', level: 'Intermediate', capacity: 12, img: 'https://images.pexels.com/photos/896058/pexels-photo-896058.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', schedule: 'Mon, Wed, Fri — 6:00pm' },
  { name: 'HIIT Inferno', category: 'Cardio', desc: 'High-intensity intervals that torch calories and build endurance.', duration: '45 min', level: 'All Levels', capacity: 20, img: 'https://images.pexels.com/photos/4761352/pexels-photo-4761352.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', schedule: 'Tue, Thu — 7:00am & 6:00pm' },
  { name: 'Spin Cycle', category: 'Cardio', desc: 'Heart-pumping indoor cycling with music-driven intervals.', duration: '45 min', level: 'All Levels', capacity: 25, img: 'https://images.pexels.com/photos/6388450/pexels-photo-6388450.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', schedule: 'Mon — Fri — 6:00am' },
  { name: 'Vinyasa Flow', category: 'Mind & Body', desc: 'Dynamic yoga linking breath to movement for flexibility and calm.', duration: '60 min', level: 'All Levels', capacity: 15, img: 'https://images.pexels.com/photos/3984353/pexels-photo-3984353.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', schedule: 'Tue, Thu, Sat — 8:00am' },
  { name: 'Boxing Fundamentals', category: 'Combat', desc: 'Learn proper technique while building power and agility.', duration: '60 min', level: 'Beginner', capacity: 16, img: 'https://images.pexels.com/photos/4754144/pexels-photo-4754144.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', schedule: 'Mon, Wed — 7:00pm' },
  { name: 'Olympic Lifting', category: 'Strength', desc: 'Master the snatch and clean & jerk with expert coaching.', duration: '75 min', level: 'Advanced', capacity: 8, img: 'https://images.pexels.com/photos/19722863/pexels-photo-19722863.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', schedule: 'Tue, Thu — 6:00pm' },
  { name: 'Pilates Core', category: 'Mind & Body', desc: 'Strengthen your core and improve posture with controlled movements.', duration: '50 min', level: 'All Levels', capacity: 18, img: 'https://images.pexels.com/photos/25596885/pexels-photo-25596885.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', schedule: 'Mon, Wed, Fri — 9:00am' },
  { name: 'Muay Thai', category: 'Combat', desc: 'The art of eight limbs. Build striking power and conditioning.', duration: '60 min', level: 'Intermediate', capacity: 14, img: 'https://images.pexels.com/photos/6390227/pexels-photo-6390227.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', schedule: 'Tue, Thu, Sat — 7:00pm' },
];

const weeklySchedule = [
  { day: 'Monday', classes: ['Power Lifting — 6:00pm', 'Spin Cycle — 6:00am', 'Pilates Core — 9:00am', 'Boxing — 7:00pm'] },
  { day: 'Tuesday', classes: ['HIIT Inferno — 7:00am & 6:00pm', 'Vinyasa Flow — 8:00am', 'Olympic Lifting — 6:00pm', 'Muay Thai — 7:00pm'] },
  { day: 'Wednesday', classes: ['Power Lifting — 6:00pm', 'Spin Cycle — 6:00am', 'Pilates Core — 9:00am', 'Boxing — 7:00pm'] },
  { day: 'Thursday', classes: ['HIIT Inferno — 7:00am & 6:00pm', 'Vinyasa Flow — 8:00am', 'Olympic Lifting — 6:00pm', 'Muay Thai — 7:00pm'] },
  { day: 'Friday', classes: ['Power Lifting — 6:00pm', 'Spin Cycle — 6:00am', 'Pilates Core — 9:00am'] },
  { day: 'Saturday', classes: ['Vinyasa Flow — 8:00am', 'Muay Thai — 7:00pm'] },
  { day: 'Sunday', classes: ['Open Gym — All Day'] },
];

export default function ClassesPage({ onNavigate }: ClassesPageProps) {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredClasses = activeCategory === 'All'
    ? classes
    : classes.filter((c) => c.category === activeCategory);

  return (
    <div className="noise-overlay min-h-screen pt-20">
      {/* Header */}
      <section className="py-12 sm:py-16 lg:py-20 text-center">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="section-label justify-center mb-4">
            <Flame className="w-4 h-4" />
            <span>Group Classes</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl tracking-tight mb-4">
            FIND YOUR <span className="text-gold-400">TRIBE</span>
          </h1>
          <p className="text-ink-200 text-base sm:text-lg max-w-2xl mx-auto">
            Over 50 classes every week. From strength to yoga, combat to cardio — there is a class for every goal and every level.
          </p>
        </div>
      </section>

      {/* Filter */}
      <section className="pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {classCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-semibold uppercase tracking-wider transition-all ${
                  activeCategory === cat
                    ? 'bg-gold-400 text-ink-950'
                    : 'glass text-ink-300 hover:text-gold-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Classes grid */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredClasses.map((cls, i) => (
              <div key={i} className="card-hover group glass rounded-2xl overflow-hidden">
                <div className="aspect-video relative overflow-hidden">
                  <img src={cls.img} alt={cls.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="glass-gold rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-400">{cls.category}</span>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <span className="glass rounded-full px-3 py-1 text-xs text-ink-100">{cls.level}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-2xl uppercase tracking-wide mb-2 group-hover:text-gold-400 transition-colors">{cls.name}</h3>
                  <p className="text-ink-300 text-sm leading-relaxed mb-4">{cls.desc}</p>
                  <div className="flex items-center gap-4 text-ink-400 text-xs mb-4">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gold-400" /> {cls.duration}</span>
                    <span className="flex items-center gap-1"><User className="w-3 h-3 text-gold-400" /> Max {cls.capacity}</span>
                  </div>
                  <div className="text-ink-300 text-xs border-t border-ink-50/10 pt-3 mb-4">{cls.schedule}</div>
                  <button onClick={() => onNavigate('packages')} className="w-full btn-outline text-xs py-3">
                    Book a Class
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Weekly schedule */}
      <section className="py-24 bg-ink-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="section-label justify-center mb-4">
              <Clock className="w-4 h-4" />
              <span>Weekly Schedule</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight">
              PLAN YOUR <span className="text-gold-400">WEEK</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {weeklySchedule.map((day, i) => (
              <div key={i} className="glass rounded-xl p-5">
                <h3 className="font-display text-lg uppercase tracking-wide text-gold-400 mb-4 pb-3 border-b border-ink-50/10">{day.day}</h3>
                <ul className="space-y-2">
                  {day.classes.map((cls, j) => (
                    <li key={j} className="text-ink-300 text-sm flex items-start gap-2">
                      <span className="text-gold-400 mt-0.5">▪</span>
                      <span>{cls}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight mb-6">
            READY TO <span className="text-gold-400">MOVE?</span>
          </h2>
          <p className="text-ink-200 mb-8">Your first class is on us. Pick a plan and start training today.</p>
          <button onClick={() => onNavigate('packages')} className="btn-gold">
            View Membership Plans
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
