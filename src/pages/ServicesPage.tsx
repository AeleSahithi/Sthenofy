import { Flame, MessageCircle, MapPin } from 'lucide-react';
import { useState } from 'react';
import type { PageId } from '@/components/Navbar';
import AppointmentBooking from '@/components/appointments/AppointmentBooking';

import fatLossImg from '@/assets/Services/nutrition for fat loss.png';
import menopauseImg from '@/assets/Services/pre and peri menopause.png';
import onlineTrainingImg from '@/assets/Services/online training program.png';
import Endurancesportsnutrition from '@/assets/Services/Endurance Sports Nutrition.png';
import NutritionforDiabetes from '@/assets/Services/Nutrition for Diabetes.png';
import NutritionforPCOD from '@/assets/Services/Nutrition for PCOD PCOS.png';


interface ClassesPageProps {
  onNavigate: (page: PageId) => void;
}

const serviceViews = ['All', 'Offline Services'] as const;
const whatsappNumber = '919346122966';

const classes = [
  { name: 'Endurance Sports Nutrition', category: 'Performance', desc: 'Personalized nutrition to fuel endurance training, support recovery, and improve performance.', img: Endurancesportsnutrition },
  { name: 'Nutrition for Diabetes', category: 'Health', desc: 'Practical nutrition guidance to support blood sugar management and healthier everyday habits.',  img: NutritionforDiabetes },
  { name: 'Nutrition for PCOD/PCOS', category: 'Balance', desc: 'Personalized  plans to support hormonal health, healthier eating habits, and overall well-being.',  img: NutritionforPCOD },
  { name: 'Nutrition for Fat Loss', category: 'Weight Management', desc: 'Fat-loss nutrition coaching focused on balanced eating, sustainable weight management, and long-term progress. ',  img: fatLossImg },
  { name: 'Pre-Peri & Menopause', category: 'Wellness', desc: 'Nutrition and lifestyle support tailored to changing needs through perimenopause and menopause with expert guidance.', img: menopauseImg },
  { name: 'Online Training Program', category: 'Strength', desc: 'Online personal training with customized workout plans and ongoing coaching to help you reach your fitness goals from anywhere.', img: onlineTrainingImg },
];

export default function ClassesPage({ onNavigate }: ClassesPageProps) {
  const [activeView, setActiveView] = useState<(typeof serviceViews)[number]>('All');
  const whatsappLink = (location: string) =>
    `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi Sthenofy, I am interested in offline training in ${location}. Please share the available timings and details.`)}`;

  return (
    <div className="noise-overlay min-h-screen pt-20">
      {/* Header */}
      <section className="py-12 sm:py-16 lg:py-20 text-center">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="section-label justify-center mb-4">
            <Flame className="w-4 h-4" />
            <span>Training & Nutrition</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl tracking-tight mb-4">
            FIND YOUR <span className="text-gold-400">NEXT LEVEL</span>
          </h1>
          <p className="text-ink-200 text-base sm:text-lg max-w-2xl mx-auto">
            Every goal needs the right approach. Discover tailored training and nutrition programs built around your body, your needs, and your ambitions.
          </p>
        </div>
      </section>

      {/* Filter */}
      <section className="pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {serviceViews.map((view) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-5 py-2 rounded-full text-sm font-semibold uppercase tracking-wider transition-all ${
                activeView === view
                    ? 'bg-gold-400 text-ink-950'
                    : 'glass text-ink-300 hover:text-gold-400'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Services and offline training */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {activeView === 'All' ? <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {classes.map((cls, i) => (
              <div key={i} className="card-hover group glass rounded-2xl overflow-hidden">
                <div className="aspect-video relative overflow-hidden">
                  <img src={cls.img} alt={cls.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-850 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="glass-gold rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-400">{cls.category}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-2xl uppercase tracking-wide mb-2 group-hover:text-gold-400 transition-colors">{cls.name}</h3>
                  <p className="text-ink-300 text-sm leading-relaxed mb-4">{cls.desc}</p>
                  <button onClick={() => onNavigate('packages')} className="w-full btn-outline text-xs py-3">
                    GET STARTED 
                  </button>
                </div>
              </div>
            ))}
          </div> : <div className="rounded-3xl border border-gold-400/30 bg-black p-6 sm:p-10 lg:p-12">
            <div className="max-w-3xl mx-auto text-center mb-10">
              <div className="section-label justify-center mb-4"><MapPin className="w-4 h-4" /><span>In-person coaching</span></div>
              <h2 className="font-display text-3xl sm:text-5xl tracking-tight mb-4 text-white">READY FOR <span className="text-gold-400">OFFLINE TRAINING?</span></h2>
              <p className="text-gray-300 leading-relaxed">Train in person with Sthenofy coaches in Hyderabad or Bangalore. Message us on WhatsApp and we will help you find the right location, timing, and program.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
              {['Hyderabad', 'Bangalore'].map((location) => (
                <div key={location} className="rounded-2xl border border-gold-400/20 bg-white p-6 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold-400 text-ink-950"><MapPin className="h-6 w-6" /></div>
                  <h3 className="font-display text-2xl text-black uppercase tracking-wide mb-5">{location}</h3>
                  <a href={whatsappLink(location)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25D366] px-5 py-3 text-sm font-bold text-black transition-transform hover:scale-105"><MessageCircle className="h-4 w-4" /> Chat on WhatsApp</a>
                </div>
              ))}
            </div>
          </div>}
        </div>
      </section>

      <AppointmentBooking />
    </div>
  );
}
