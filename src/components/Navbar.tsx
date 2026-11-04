import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import sthenofyLogo from '@/assets/sthenofy-logo-black.png';
import { linkProps } from '@/lib/site';

export type PageId = 'home' | 'services' | 'trainers' | 'gallery' | 'blog' | 'contact' | 'privacy' | 'terms' | 'refund' | 'not-found';

interface NavbarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

const navItems: { id: PageId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'services', label: 'Services' },
  { id: 'trainers', label: 'Team' },
  { id: 'gallery', label: 'About Us' },
  { id: 'blog', label: 'Blog' },
  { id: 'contact', label: 'Contact' },
];

export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const handleBookingNavigation = () => {
    onNavigate('services');
    setMobileOpen(false);
    window.setTimeout(() => {
      document.getElementById('appointment-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false); };
    if (mobileOpen) window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileOpen]);

  return (
    <>
      {/* Floating frosted-glass bar with a soft white-to-gold sheen and a gold hairline */}
      <header className="fixed inset-x-0 top-0 z-[60] px-3 pt-3 sm:px-5 lg:px-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl border border-white/70 bg-gradient-to-r from-white/[0.97] via-white/95 to-gold-100/95 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl backdrop-saturate-150">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
        <nav className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6">
          {/*  Logo */}
          <a
          {...linkProps('home', onNavigate, () => setMobileOpen(false))}
          className="flex items-center shrink-0 z-[70] relative group"
          aria-label="Sthenofy Home"
          >
          <img
           src={sthenofyLogo}
           alt="Sthenofy"
           className="h-12 sm:h-14 w-32 sm:w-40 object-contain transition-transform duration-300 group-hover:scale-105"
          />
       </a>

          {/* Desktop nav */}
          <ul className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <a
                  {...linkProps(item.id, onNavigate)}
                  aria-current={currentPage === item.id ? 'page' : undefined}
                  className={`inline-block px-3 xl:px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-all duration-300 relative group ${
                    currentPage === item.id ? 'text-gold-500' : 'text-black hover:text-gold-500'
                  }`}
                >
                  {item.label}
                  <span
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-gold-400 transition-all duration-300 ${
                      currentPage === item.id ? 'w-8' : 'w-0 group-hover:w-8'
                    }`}
                  />
                </a>
              </li>
            ))}
          </ul>

          <div className="hidden lg:block">
            <button onClick={handleBookingNavigation} className="btn-gold text-xs px-6 py-3">
              Join Now
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden w-10 h-10 flex items-center justify-center text-black z-[70] relative"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <div
        id="mobile-menu"
        aria-hidden={!mobileOpen}
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-500 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-black/20" onClick={() => setMobileOpen(false)} />
        {/* Top padding keeps the first link clear of the floating header; scrolls on short screens instead of clipping. */}
        <nav className="relative h-full overflow-y-auto bg-gradient-to-b from-white via-white to-gold-50 px-6 pt-28 pb-12 text-black">
          <div className="flex min-h-full flex-col items-center justify-center gap-5 sm:gap-6">
          {navItems.map((item, i) => (
            <a
              key={item.id}
              {...linkProps(item.id, onNavigate, () => setMobileOpen(false))}
              tabIndex={mobileOpen ? 0 : -1}
              aria-current={currentPage === item.id ? 'page' : undefined}
              className={`font-display text-3xl sm:text-4xl tracking-wider transition-all duration-500 py-2 ${
                currentPage === item.id ? 'text-gold-500' : 'text-black'
              }`}
              style={{
                opacity: mobileOpen ? 1 : 0,
                transform: mobileOpen ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: `${i * 60}ms`,
              }}
            >
              {item.label}
            </a>
          ))}
          <button onClick={handleBookingNavigation} tabIndex={mobileOpen ? 0 : -1} className="btn-gold mt-4">
            Join Now
          </button>
          </div>
        </nav>
      </div>
    </>
  );
}
