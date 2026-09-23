import { Dumbbell, Instagram, Facebook, Twitter, Youtube, MapPin, Phone, Mail } from 'lucide-react';
import type { PageId } from './Navbar';

interface FooterProps {
  onNavigate: (page: PageId) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  return (
    <footer className="relative bg-ink-950 border-t border-ink-50/5 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-gold-400/5 blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gold-400 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-ink-950" strokeWidth={2.5} />
              </div>
              <span className="font-display text-2xl tracking-wider">
                STHENO<span className="text-gold-400">FY</span>
              </span>
            </div>
            <p className="text-ink-300 text-sm leading-relaxed mb-6">
              Train beyond limits. A premium fitness studio built for those who refuse to settle.
            </p>
            <div className="flex gap-3">
              {[Instagram, Facebook, Twitter, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-lg glass flex items-center justify-center text-ink-200 hover:text-gold-400 hover:border-gold-400/30 transition-all duration-300"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="font-display text-lg uppercase tracking-wider mb-4 text-ink-50">Explore</h4>
            <ul className="space-y-3">
              {[
                { id: 'home' as PageId, label: 'Home' },
                { id: 'packages' as PageId, label: 'Packages' },
                { id: 'classes' as PageId, label: 'Classes' },
                { id: 'trainers' as PageId, label: 'Trainers' },
                { id: 'gallery' as PageId, label: 'Gallery' },
                { id: 'blog' as PageId, label: 'Blog' },
              ].map((link) => (
                <li key={link.id}>
                  <button
                    onClick={() => onNavigate(link.id)}
                    className="text-ink-300 text-sm hover:text-gold-400 transition-colors duration-300"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display text-lg uppercase tracking-wider mb-4 text-ink-50">Contact</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-ink-300 text-sm">
                <MapPin className="w-4 h-4 text-gold-400 mt-0.5 shrink-0" />
                <span>123 Forge Street, Downtown District, Metro City 10001</span>
              </li>
              <li className="flex items-center gap-3 text-ink-300 text-sm">
                <Phone className="w-4 h-4 text-gold-400 shrink-0" />
                <span>+1 (555) 234-7890</span>
              </li>
              <li className="flex items-center gap-3 text-ink-300 text-sm">
                <Mail className="w-4 h-4 text-gold-400 shrink-0" />
                <span>hello@sthenofy.com</span>
              </li>
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-display text-lg uppercase tracking-wider mb-4 text-ink-50">Hours</h4>
            <ul className="space-y-2 text-ink-300 text-sm">
              <li className="flex justify-between"><span>Mon – Fri</span><span className="text-ink-100">5am – 11pm</span></li>
              <li className="flex justify-between"><span>Saturday</span><span className="text-ink-100">6am – 10pm</span></li>
              <li className="flex justify-between"><span>Sunday</span><span className="text-ink-100">7am – 8pm</span></li>
              <li className="flex justify-between border-t border-ink-50/10 pt-2 mt-2"><span className="text-gold-400 font-semibold">Members</span><span className="text-gold-400 font-semibold">24/7 Access</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-ink-50/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-ink-400 text-xs">
            © {new Date().getFullYear()} STHENOFY. All rights reserved.
          </p>
          <div className="flex gap-6 text-ink-400 text-xs">
            <a href="#" className="hover:text-gold-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gold-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-gold-400 transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
