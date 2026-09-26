import { Check, X, ArrowRight, Crown, Zap, Star } from 'lucide-react';
import { useState } from 'react';
import type { PageId } from '@/components/Navbar';

interface PackagesPageProps {
  onNavigate: (page: PageId) => void;
}

const plans = [
  {
    name: 'Starter',
    price: 999,
    period: '/month',
    icon: Zap,
    tagline: 'Perfect to begin your journey',
    features: [
      { text: 'Full gym floor access', included: true },
      { text: 'Locker room & showers', included: true },
      { text: '2 group classes / week', included: true },
      { text: 'Fitness assessment', included: true },
      { text: 'Personal training sessions', included: false },
      { text: '24/7 gym access', included: false },
      { text: 'Nutrition consultation', included: false },
      { text: 'Guest passes', included: false },
    ],
    highlighted: false,
  },
  {
    name: 'Athlete',
    price: 599,
    period: '/month',
    icon: Star,
    tagline: 'Our most popular membership',
    features: [
      { text: 'Full gym floor access', included: true },
      { text: 'Locker room & showers', included: true },
      { text: 'Unlimited group classes', included: true },
      { text: 'Fitness assessment', included: true },
      { text: '2 PT sessions / month', included: true },
      { text: '24/7 gym access', included: true },
      { text: 'Nutrition consultation', included: false },
      { text: 'Guest passes', included: false },
    ],
    highlighted: true,
  },
  {
    name: 'Elite',
    price: 99,
    period: '/month',
    icon: Crown,
    tagline: 'The ultimate fitness experience',
    features: [
      { text: 'Full gym floor access', included: true },
      { text: 'Locker room & showers', included: true },
      { text: 'Unlimited group classes', included: true },
      { text: 'Quarterly fitness assessment', included: true },
      { text: '4 PT sessions / month', included: true },
      { text: '24/7 gym access', included: true },
      { text: 'Monthly nutrition consultation', included: true },
      { text: '2 guest passes / month', included: true },
    ],
    highlighted: false,
  },
];

const addons = [
  { name: 'Personal Training (1-on-1)', price: '₹4500', desc: '60-minute session with a certified trainer' },
  { name: 'Nutrition Coaching', price: '₹1200', desc: 'Monthly personalized meal plan & check-ins' },
  { name: 'Recovery Session', price: '₹3500', desc: 'Sauna, ice bath, and sports massage combo' },
  { name: 'Body Composition Scan', price: '₹2500', desc: 'InBody analysis with detailed report' },
];

export default function PackagesPage({ onNavigate }: PackagesPageProps) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  return (
    <div className="noise-overlay min-h-screen pt-20">
      {/* Header */}
      <section className="py-12 sm:py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.pexels.com/photos/6389516/pexels-photo-6389516.jpeg?auto=compress&cs=tinysrgb&h=650&w=940" alt="" className="w-full h-full object-cover opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-950 to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 text-center">
          <div className="section-label justify-center mb-4">
            <Crown className="w-4 h-4" />
            <span>Membership Plans</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl tracking-tight mb-6">
            CHOOSE YOUR <span className="text-gold-400">PLAN</span>
          </h1>
          <p className="text-ink-200 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            No hidden fees. No contracts. Cancel anytime. Every plan includes access to our premium facility and community.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 glass rounded-full p-1 mb-4">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-semibold uppercase tracking-wider transition-all ₹{
                billing === 'monthly' ? 'bg-gold-400 text-ink-950' : 'text-ink-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-6 py-2 rounded-full text-sm font-semibold uppercase tracking-wider transition-all ₹{
                billing === 'annual' ? 'bg-gold-400 text-ink-950' : 'text-ink-300'
              }`}
            >
              Annual <span className="text-xs">Save 20%</span>
            </button>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {plans.map((plan, i) => {
              const price = billing === 'annual' ? Math.round(plan.price * 0.8) : plan.price;
              return (
                <div
                  key={i}
                  className={`relative rounded-2xl p-8 card-hover ${
                    plan.highlighted
                      ? 'glass-gold border-2 border-gold-400/40 lg:scale-105 shadow-[0_0_50px_rgba(255,215,0,0.15)]'
                      : 'glass'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-gold-400 text-ink-950 text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ₹{
                    plan.highlighted ? 'bg-gold-400' : 'bg-gold-400/10'
                  }`}>
                    <plan.icon className={`w-7 h-7 ${plan.highlighted ? 'text-ink-950' : 'text-gold-400'}`} />
                  </div>
                  <h3 className="font-display text-3xl uppercase tracking-wide mb-1">{plan.name}</h3>
                  <p className="text-ink-300 text-sm mb-6">{plan.tagline}</p>
                  <div className="flex items-end gap-1 mb-6">
                    <span className="font-display text-5xl text-gold-400">₹{price}</span>
                    <span className="text-ink-400 text-sm mb-2">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feat, j) => (
                      <li key={j} className="flex items-center gap-3 text-sm">
                        {feat.included ? (
                          <Check className="w-4 h-4 text-gold-400 shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-ink-500 shrink-0" />
                        )}
                        <span className={feat.included ? 'text-ink-100' : 'text-ink-500 line-through'}>{feat.text}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => onNavigate('contact')}
                    className={`w-full ${plan.highlighted ? 'btn-gold' : 'btn-outline'}`}
                  >
                    Choose {plan.name}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Add-ons */}
      <section className="py-24 bg-ink-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="section-label justify-center mb-4">
              <Zap className="w-4 h-4" />
              <span>Optional Extras</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight">
              ENHANCE YOUR <span className="text-gold-400">MEMBERSHIP</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {addons.map((addon, i) => (
              <div key={i} className="glass rounded-2xl p-6 card-hover">
                <div className="font-display text-3xl text-gold-400 mb-2">{addon.price}</div>
                <h3 className="font-bold text-ink-50 mb-2">{addon.name}</h3>
                <p className="text-ink-300 text-sm">{addon.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight mb-6">
            NOT SURE WHICH PLAN <span className="text-gold-400">FITS YOU?</span>
          </h2>
          <p className="text-ink-200 mb-8">Book a free consultation and we will help you choose the perfect plan for your goals.</p>
          <button onClick={() => onNavigate('contact')} className="btn-gold">
            Book Free Consultation
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
