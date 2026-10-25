
import { Instagram, Linkedin, Youtube, MapPin, Phone, Mail } from 'lucide-react';
import sthenofyLogo from '@/assets/sthenofy-logo-text-black.png';
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
            <div className="mb-6">
  <img
    src={sthenofyLogo}
    alt="Sthenofy"
    className="w-40 sm:w-48 h-auto object-contain"
  />
</div>

            <p className="text-ink-300 text-sm leading-relaxed mb-6">
              Train smarter with personalized fitness programs, strength training,
              and evidence-based nutrition built for lasting progress.
            </p>

            {/* Social Media Icons */}
            <div className="flex gap-3">
              <a
                href="https://www.linkedin.com/company/sthenofy/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Sthenofy on LinkedIn"
                className="w-10 h-10 rounded-lg glass flex items-center justify-center text-ink-200 hover:text-gold-500 hover:border-gold-500/30 transition-all duration-300"
              >
                <Linkedin className="w-4 h-4" />
              </a>

              <a
                href="https://www.instagram.com/sthenofy/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Sthenofy on Instagram"
                className="w-10 h-10 rounded-lg glass flex items-center justify-center text-ink-200 hover:text-gold-500 hover:border-gold-500/30 transition-all duration-300"
              >
                <Instagram className="w-4 h-4" />
              </a>

              <a
                href="https://www.youtube.com/@Sthenofy"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Sthenofy on YouTube"
                className="w-10 h-10 rounded-lg glass flex items-center justify-center text-ink-200 hover:text-gold-500 hover:border-gold-500/30 transition-all duration-300"
              >
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display text-lg uppercase tracking-wider mb-4 text-ink-50">
              Explore
            </h4>

            <ul className="space-y-3">
              {[
                { id: 'home' as PageId, label: 'Home' },
                { id: 'services' as PageId, label: 'Services' },
                { id: 'trainers' as PageId, label: 'Trainers' },
                { id: 'gallery' as PageId, label: 'About Us' },
                { id: 'blog' as PageId, label: 'Blog' },
                { id: 'contact' as PageId, label: 'Contact' },
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
            <h4 className="font-display text-lg uppercase tracking-wider mb-4 text-ink-50">
              Contact
            </h4>

            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-ink-300 text-sm">
                <MapPin className="w-4 h-4 text-gold-400 mt-0.5 shrink-0" />
                <span>
                  H. No: 162, 8th cross, 29th Main, MCHS Colony, BTM 2nd stage,
                  Bengaluru, 560076.1
                </span>
              </li>

              <li className="flex items-start gap-3 text-ink-300 text-sm">
                <MapPin className="w-4 h-4 text-gold-400 mt-0.5 shrink-0" />
                <span>
                  Plot no 28/1, sy no 167, Krishnapuram colony, Mailardevpally,
                  Hyderabad - 500005
                </span>
              </li>

              <li className="flex items-center gap-3 text-ink-300 text-sm">
                <Phone className="w-4 h-4 text-gold-400 shrink-0" />
                <span>+91 90356 54943</span>
              </li>

              <li className="flex items-center gap-3 text-ink-300 text-sm">
                <Mail className="w-4 h-4 text-gold-400 shrink-0" />
                <a
                  href="mailto:support@sthenofy.com"
                  className="hover:text-gold-400 transition-colors"
                >
                  support@sthenofy.com
                </a>
              </li>
            </ul>
          </div>

          {/* Why Sthenofy */}
          <div>
            <h4 className="font-display text-lg uppercase tracking-wider mb-4 text-ink-50">
              Why Sthenofy
            </h4>

            <ul className="space-y-2 text-ink-300 text-sm">
              <li>Personalised Training</li>
              <li>Flexible Coaching</li>
              <li>Goal Oriented Programs</li>
              <li>Evidence Based Nutrition</li>
              <li className="border-t border-ink-50/10 pt-2 mt-2 text-gold-400 font-semibold">
                Your Fitness, Your Pace
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright and Policies */}
        <div className="mt-12 pt-8 border-t border-ink-50/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-ink-400 text-xs">
            © {new Date().getFullYear()} STHENOFY. All rights reserved.
          </p>

          <div className="flex flex-wrap justify-center gap-6 text-ink-400 text-xs">
            <button
              onClick={() => onNavigate('privacy')}
              className="hover:text-gold-400 transition-colors"
            >
              Privacy Policy
            </button>

            <button
              onClick={() => onNavigate('terms')}
              className="hover:text-gold-400 transition-colors"
            >
              Terms of Service
            </button>

            <button
              onClick={() => onNavigate('refund')}
              className="hover:text-gold-400 transition-colors"
            >
              Refund Policy
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
