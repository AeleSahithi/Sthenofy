import { useEffect, useState } from 'react';
import { Menu, X, Dumbbell } from 'lucide-react';

export type PageId = 'home' | 'packages' | 'classes' | 'trainers' | 'gallery' | 'blog' | 'contact';

interface NavbarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

const navItems: { id: PageId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'packages', label: 'Packages' },
  { id: 'classes', label: 'Classes' },
  { id: 'trainers', label: 'Trainers' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'blog', label: 'Blog' },
  { id: 'contact', label: 'Contact' },
];

export default function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleNav = (page: PageId) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-500 ${
          scrolled ? 'bg-ink-950/90 backdrop-blur-lg border-b border-ink-50/5' : 'bg-ink-950/40 backdrop-blur-sm'
        }`}
      >
        <nav className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <button
            onClick={() => handleNav('home')}
            className="flex items-center gap-2 group shrink-0 z-[70] relative"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gold-400 flex items-center justify-center group-hover:rotate-12 transition-transform duration-300">
              <Dumbbell className="w-5 h-5 sm:w-6 sm:h-6 text-ink-950" strokeWidth={2.5} />
            </div>
            <span className="font-display text-xl sm:text-2xl tracking-wider">
              STHENO<span className="text-gold-400">FY</span>
            </span>
          </button>

          {/* Desktop nav */}
          <ul className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleNav(item.id)}
                  className={`px-4 py-2 text-sm font-semibold uppercase tracking-wider transition-all duration-300 relative group ${
                    currentPage === item.id ? 'text-gold-400' : 'text-ink-100 hover:text-gold-400'
                  }`}
                >
                  {item.label}
                  <span
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-gold-400 transition-all duration-300 ${
                      currentPage === item.id ? 'w-8' : 'w-0 group-hover:w-8'
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>

          <div className="hidden lg:block">
            <button onClick={() => handleNav('packages')} className="btn-gold text-xs px-6 py-3">
              Join Now
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden w-10 h-10 flex items-center justify-center text-ink-50 z-[70] relative"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>
      </header>

      {/* Mobile menu overlay */}
      <div
        className={`fixed inset-0 z-50 lg:hidden transition-all duration-500 ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="absolute inset-0 bg-ink-950/98 backdrop-blur-xl" onClick={() => setMobileOpen(false)} />
        <nav className="relative flex flex-col items-center justify-center h-full gap-5 sm:gap-6 px-6 pb-20">
          {/* Close button at top for easy reach */}
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-5 right-5 w-11 h-11 flex items-center justify-center text-ink-50 hover:text-gold-400 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
          {navItems.map((item, i) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`font-display text-3xl sm:text-4xl tracking-wider transition-all duration-500 py-2 ${
                currentPage === item.id ? 'text-gold-400' : 'text-ink-100'
              }`}
              style={{
                opacity: mobileOpen ? 1 : 0,
                transform: mobileOpen ? 'translateY(0)' : 'translateY(20px)',
                transitionDelay: `${i * 60}ms`,
              }}
            >
              {item.label}
            </button>
          ))}
          <button onClick={() => handleNav('packages')} className="btn-gold mt-4">
            Join Now
          </button>
        </nav>
      </div>
    </>
  );
}
