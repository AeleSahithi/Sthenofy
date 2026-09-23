import { useState, useEffect, useCallback } from 'react';
import { X, ZoomIn, ChevronLeft, ChevronRight } from 'lucide-react';

const galleryImages = [
  { url: 'https://images.pexels.com/photos/17956264/pexels-photo-17956264.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', alt: 'Athlete in starting position', span: 'lg:row-span-2 lg:col-span-2' },
  { url: 'https://images.pexels.com/photos/6388450/pexels-photo-6388450.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', alt: 'Stationary bike workout', span: '' },
  { url: 'https://images.pexels.com/photos/4761352/pexels-photo-4761352.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', alt: 'Jump rope training', span: '' },
  { url: 'https://images.pexels.com/photos/896058/pexels-photo-896058.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', alt: 'Barbell lifting', span: 'lg:col-span-2' },
  { url: 'https://images.pexels.com/photos/19722863/pexels-photo-19722863.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', alt: 'Heavy barbell lift', span: '' },
  { url: 'https://images.pexels.com/photos/6389893/pexels-photo-6389893.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', alt: 'Dumbbell ready position', span: '' },
  { url: 'https://images.pexels.com/photos/38453215/pexels-photo-38453215.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', alt: 'Strength training machine', span: 'lg:col-span-2' },
  { url: 'https://images.pexels.com/photos/31028213/pexels-photo-31028213.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', alt: 'Leg exercises machine', span: '' },
  { url: 'https://images.pexels.com/photos/4754144/pexels-photo-4754144.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', alt: 'Female boxer resting', span: '' },
  { url: 'https://images.pexels.com/photos/6390227/pexels-photo-6390227.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', alt: 'Push-up training', span: '' },
  { url: 'https://images.pexels.com/photos/5327543/pexels-photo-5327543.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', alt: 'Treadmill workout', span: '' },
  { url: 'https://images.pexels.com/photos/32695898/pexels-photo-32695898.jpeg?auto=compress&cs=tinysrgb&h=650&w=940', alt: 'Athletes resting', span: 'lg:col-span-2' },
];

export default function GalleryPage() {
  const [lightbox, setLightbox] = useState<number | null>(null);

  const closeLightbox = useCallback(() => setLightbox(null), []);
  const nextImage = useCallback(() => {
    setLightbox((prev) => (prev === null ? prev : (prev + 1) % galleryImages.length));
  }, []);
  const prevImage = useCallback(() => {
    setLightbox((prev) => (prev === null ? prev : (prev - 1 + galleryImages.length) % galleryImages.length));
  }, []);

  useEffect(() => {
    if (lightbox === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, closeLightbox, nextImage, prevImage]);

  return (
    <div className="noise-overlay min-h-screen pt-20">
      {/* Header */}
      <section className="py-12 sm:py-16 lg:py-20 text-center">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="section-label justify-center mb-4">
            <ZoomIn className="w-4 h-4" />
            <span>Inside STHENOFY</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl tracking-tight mb-4">
            THE <span className="text-gold-400">FORGE</span>
          </h1>
          <p className="text-ink-200 text-base sm:text-lg max-w-2xl mx-auto">
            Step inside our world. Every corner is designed to push you further than you thought possible.
          </p>
        </div>
      </section>

      {/* Gallery grid */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 auto-rows-[140px] sm:auto-rows-[200px] lg:auto-rows-[250px]">
            {galleryImages.map((img, i) => (
              <button
                key={i}
                className={`group relative overflow-hidden rounded-xl cursor-pointer ${img.span}`}
                onClick={() => setLightbox(i)}
                aria-label={`Open image: ${img.alt}`}
              >
                <img
                  src={img.url}
                  alt={img.alt}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-ink-950/0 group-hover:bg-ink-950/40 transition-all duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
                    <div className="w-12 h-12 rounded-full glass-gold flex items-center justify-center">
                      <ZoomIn className="w-5 h-5 text-gold-400" />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-[60] bg-ink-950/95 backdrop-blur-xl flex items-center justify-center p-6"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
        >
          <button
            className="absolute top-6 right-6 w-12 h-12 rounded-full glass flex items-center justify-center text-ink-50 hover:text-gold-400 transition-colors z-10"
            onClick={closeLightbox}
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <button
            className="absolute left-4 sm:left-8 w-12 h-12 rounded-full glass flex items-center justify-center text-ink-50 hover:text-gold-400 transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <img
            src={galleryImages[lightbox].url}
            alt={galleryImages[lightbox].alt}
            className="max-w-full max-h-[80vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-4 sm:right-8 w-12 h-12 rounded-full glass flex items-center justify-center text-ink-50 hover:text-gold-400 transition-colors z-10"
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass rounded-full px-4 py-2 text-ink-200 text-sm">
            {lightbox + 1} / {galleryImages.length}
          </div>
        </div>
      )}
    </div>
  );
}
