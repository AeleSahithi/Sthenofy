import { Award } from 'lucide-react';

import bharathImg from '@/assets/Trainers/Bharath Namadari.webp';
import vamshiImg from '@/assets/Trainers/Vamshi Krishna Nandimalla.webp';
import akshataImg from '@/assets/Trainers/Akshata Chavan.webp';

const trainers = [
  {
    name: 'Vamshi Krishna Nandimalla',
    specialty: 'Strength & Conditioning',
    certs: [
      'Strength and Conditioning Coach',
      'CSCS',
      'Personal Trainer for Special Population',
    ],
    img: vamshiImg,
  },
    {
    name: 'Bharath Namadari',
    specialty: 'Personal Training & Performance',
    certs: [
      'Diploma in Personal Training',
      'Personal Trainer for Special Population',
      'Human Performance Nutritionist',
    ],
    img: bharathImg,
  },
  {
    name: 'Akshata Chavan',
    specialty: 'Clinical Nutrition',
    certs: [
      'Clinical Nutritionist',
      'Registered Dietician',
    ],
    img: akshataImg,
  },
];

export default function TrainersPage() {
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
            Meet the team behind your fitness journey, with specialized
            knowledge in personal training, strength and conditioning,
            and clinical nutrition.
          </p>
        </div>
      </section>

      {/* Trainers Grid */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {trainers.map((trainer) => (
              <article
                key={trainer.name}
                className="card-hover group glass rounded-2xl overflow-hidden"
              >
                {/* Coach Photo */}
                <div className="aspect-[3/4] relative overflow-hidden">
                  <img
                    src={trainer.img}
                    alt={trainer.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                    <h2 className="font-display text-2xl uppercase tracking-wide mb-2 text-white group-hover:text-gold-400 transition-colors">
                      {trainer.name}
                    </h2>

                    <p className="text-gold-400 text-sm font-semibold uppercase tracking-wider mb-4">
                      {trainer.specialty}
                    </p>

                    <div className="border-t border-gold-400/30 pt-4">
                      

                      <div className="flex flex-wrap gap-2">
                        {trainer.certs.map((cert) => (
                          <span
                            key={cert}
                              className="rounded-full bg-gray-200 border border-gray-300 px-3 py-1.5 text-xs text-black leading-relaxed"
                          >
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
