import { useState, useRef, useEffect } from 'react';
import { MapPin, Phone, Mail, Clock, Send, Check } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', interest: 'General Inquiry', message: '' });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSubmitted(true);
    timeoutRef.current = setTimeout(() => {
      setSubmitted(false);
      setForm({ name: '', email: '', phone: '', interest: 'General Inquiry', message: '' });
    }, 4000);
  };

  const inputClass = 'w-full bg-ink-900 border border-ink-50/10 rounded-xl px-4 py-3 text-ink-50 placeholder-ink-400 focus:border-gold-400 focus:outline-none transition-colors';

  return (
    <div className="noise-overlay min-h-screen pt-20">
      {/* Header */}
      <section className="py-12 sm:py-16 lg:py-20 text-center">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="section-label justify-center mb-4">
            <Mail className="w-4 h-4" />
            <span>Get in Touch</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl tracking-tight mb-4">
            LET'S <span className="text-gold-400">TALK</span>
          </h1>
          <p className="text-ink-200 text-base sm:text-lg max-w-2xl mx-auto">
            Questions about membership, classes, or personal training? We are here to help you start.
          </p>
        </div>
      </section>

      {/* Contact info + form */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
            {/* Info cards */}
            <div className="lg:col-span-2 space-y-4">
              {[
                { icon: MapPin, title: 'Visit Us', value: '123 Forge Street\nDowntown District\nMetro City 10001' },
                { icon: Phone, title: 'Call Us', value: '+1 (555) 234-7890' },
                { icon: Mail, title: 'Email Us', value: 'hello@sthenofy.com' },
                { icon: Clock, title: 'Open Hours', value: 'Mon–Fri: 5am – 11pm\nSaturday: 6am – 10pm\nSunday: 7am – 8pm\nMembers: 24/7 Access' },
              ].map((item, i) => (
                <div key={i} className="glass rounded-2xl p-6 flex items-start gap-4 card-hover">
                  <div className="w-12 h-12 rounded-xl bg-gold-400/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-6 h-6 text-gold-400" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg uppercase tracking-wide mb-1">{item.title}</h3>
                    <p className="text-ink-300 text-sm whitespace-pre-line leading-relaxed">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="lg:col-span-3">
              <form onSubmit={handleSubmit} className="glass rounded-2xl p-5 sm:p-8 space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="name" className="block text-ink-200 text-sm font-semibold uppercase tracking-wider mb-2">Name</label>
                    <input
                      id="name"
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={inputClass}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-ink-200 text-sm font-semibold uppercase tracking-wider mb-2">Email</label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={inputClass}
                      placeholder="john@email.com"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="phone" className="block text-ink-200 text-sm font-semibold uppercase tracking-wider mb-2">Phone</label>
                    <input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={inputClass}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div>
                    <label htmlFor="interest" className="block text-ink-200 text-sm font-semibold uppercase tracking-wider mb-2">Interest</label>
                    <select
                      id="interest"
                      value={form.interest}
                      onChange={(e) => setForm({ ...form, interest: e.target.value })}
                      className={inputClass}
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Membership">Membership</option>
                      <option value="Personal Training">Personal Training</option>
                      <option value="Group Classes">Group Classes</option>
                      <option value="Nutrition Coaching">Nutrition Coaching</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="message" className="block text-ink-200 text-sm font-semibold uppercase tracking-wider mb-2">Message</label>
                  <textarea
                    id="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className={`${inputClass} resize-none`}
                    placeholder="Tell us about your fitness goals..."
                  />
                </div>
                <div aria-live="polite" role="status">
                  <button
                    type="submit"
                    disabled={submitted}
                    className={`w-full ${submitted ? 'bg-green-500 text-ink-950' : 'btn-gold'} flex items-center justify-center gap-2`}
                  >
                    {submitted ? (
                      <>
                        <Check className="w-5 h-5" /> Message Sent!
                      </>
                    ) : (
                      <>
                        Send Message <Send className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Map placeholder */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="glass rounded-2xl overflow-hidden h-96 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-ink-800 via-ink-900 to-ink-950" />
            <div className="relative text-center">
              <MapPin className="w-12 h-12 text-gold-400 mx-auto mb-4" />
              <h3 className="font-display text-2xl uppercase tracking-wide mb-2">123 Forge Street</h3>
              <p className="text-ink-300">Downtown District, Metro City 10001</p>
              <p className="text-ink-400 text-sm mt-2">Free parking for all members</p>
            </div>
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'linear-gradient(rgba(255,215,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,0.3) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />
          </div>
        </div>
      </section>
    </div>
  );
}
