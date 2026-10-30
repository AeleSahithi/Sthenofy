import { ArrowRight, Compass } from 'lucide-react';
import type { PageId } from '@/components/Navbar';

interface NotFoundPageProps {
  onNavigate: (page: PageId) => void;
}

export default function NotFoundPage({ onNavigate }: NotFoundPageProps) {
  return (
    <div className="noise-overlay min-h-screen pt-20">
      <section className="py-20 sm:py-28 lg:py-32 text-center">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="section-label justify-center mb-4">
            <Compass className="w-4 h-4" />
            <span>Error 404</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl tracking-tight mb-4">
            PAGE NOT <span className="text-gold-400">FOUND</span>
          </h1>
          <p className="text-ink-200 text-base sm:text-lg max-w-xl mx-auto mb-8">
            The page you are looking for has moved or does not exist. Let&apos;s get you back on track.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button onClick={() => onNavigate('home')} className="btn-gold">
              Back to Home
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => onNavigate('services')} className="btn-outline-gold">
              View Services
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
