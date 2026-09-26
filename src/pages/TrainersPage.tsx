import { Instagram, Twitter, Award, Star } from 'lucide-react';
import type { PageId } from '@/components/Navbar';

interface TrainersPageProps {
  onNavigate: (page: PageId) => void;
}

const trainers = [
  { name: 'Bharath Namadari', specialty: 'Head Strength Coach', exp: '12 years', certs: ['NSCA-CSCS', 'USAW Level 2'], bio: 'Former national powerlifting champion. Marcus has coached over 300 competitive lifters and specializes in raw strength development.', img: 'https://images.pexels.com/photos/13211450/pexels-photo-13211450.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
  { name: 'Bharath Namadari', specialty: 'Yoga & Mobility', exp: '8 years', certs: ['RYT-500', 'FRC Mobility Specialist'], bio: 'Doctor of Physical Therapy turned yoga instructor. Sarah blends clinical knowledge with mindful movement for lasting results.', img: 'https://images.pexels.com/photos/31245340/pexels-photo-31245340.jpeg?auto=compress&cs=tinysrgb&h=650&w=940' },
];

export default function TrainersPage({ onNavigate }: TrainersPageProps) {
  return (
    <div className="noise-overlay min-h-screen pt-20">
      {/* Header */}
      <section className="py-12 sm:py-16 lg:py-20 text-center">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="section-label justify-center mb-4">
            <Award className="w-4 h-4" />
            <span>Meet the Team</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl tracking-tight mb-4">
            THE <span className="text-gold-400">COACHES</span>
          </h1>
          <p className="text-ink-200 text-base sm:text-lg max-w-2xl mx-auto">
            Certified, experienced, and relentless. Our trainers are the heart of STHENOFY — here to guide every rep, every set, every step.
          </p>
        </div>
      </section>

      {/* Trainers grid */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {trainers.map((trainer, i) => (
              <div key={i} className="card-hover group glass rounded-2xl overflow-hidden">
                <div className="aspect-[3/4] relative overflow-hidden">
                  <img src={trainer.img} alt={trainer.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="font-display text-2xl uppercase tracking-wide mb-1 group-hover:text-gold-400 transition-colors">{trainer.name}</h3>
                    <p className="text-gold-400 text-sm font-semibold uppercase tracking-wider mb-3">{trainer.specialty}</p>
                    <div className="flex items-center gap-3 text-ink-300 text-xs mb-3">
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 text-gold-400" /> {trainer.exp}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {trainer.certs.map((cert, j) => (
                        <span key={j} className="glass rounded-full px-2.5 py-0.5 text-xs text-ink-200">{cert}</span>
                      ))}
                    </div>
                    <p className="text-ink-300 text-sm leading-relaxed mb-4 line-clamp-3">{trainer.bio}</p>
                    <div className="flex gap-2">
                      <a href="#" className="w-8 h-8 rounded-lg glass flex items-center justify-center text-ink-200 hover:text-gold-400 transition-colors">
                        <Instagram className="w-4 h-4" />
                      </a>
                      <a href="#" className="w-8 h-8 rounded-lg glass flex items-center justify-center text-ink-200 hover:text-gold-400 transition-colors">
                        <Twitter className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-ink-900 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight mb-6">
            TRAIN WITH THE <span className="text-gold-400">BEST</span>
          </h2>
          <p className="text-ink-200 mb-8">Book a 1-on-1 session with any of our coaches and accelerate your progress.</p>
          <button onClick={() => onNavigate('packages')} className="btn-gold">
            Book a Trainer
          </button>
        </div>
      </section>
    </div>
  );
}
