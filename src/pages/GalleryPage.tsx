import { useState, useEffect, useCallback } from 'react';
import { X, ZoomIn, ChevronLeft, ChevronRight, HeartPulse, Target, Sparkles, Trophy } from 'lucide-react';

const galleryAssets = import.meta.glob('@/assets/Gallery/*.{png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const galleryImages = Object.entries(galleryAssets)
  .sort(([first], [second]) => first.localeCompare(second))
  .map(([path, url]) => ({
    url,
    alt: `STHENOFY gallery image ${path.split(/[\\/]/).pop()?.split('.')[0] || ''}`,
  }));

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
    <div className="noise-overlay min-h-screen pt-20 bg-ink-950">
      {/* Small spacer below navbar */}
<section className="relative h-4 sm:h-6 bg-ink-950">
  <div className="absolute left-1/2 top-0 h-40 w-72 -translate-x-1/2 rounded-full bg-gold-400/10 blur-[100px]" />
</section>

      {/* About */}
      <section className="pb-16 sm:pb-20 lg:pb-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-gold-400/30 bg-black px-5 py-10 sm:px-10 sm:py-14 lg:px-20 lg:py-16 text-center shadow-[0_0_70px_rgba(250,204,21,0.08)]">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gold-400 to-transparent" />
            <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gold-400/15 blur-3xl" />
            <div className="absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-gold-400/10 blur-3xl" />
            <div className="relative max-w-4xl mx-auto">
              <div className="section-label justify-center mb-5">
                <ZoomIn className="w-4 h-4" />
                <span>About STHENOFY</span>
              </div>
              <h2 className="font-display text-white text-3xl sm:text-4xl md:text-6xl tracking-tight mb-6">
                WHERE HEALTH BECOMES <span className="text-gold-400">A LIFESTYLE</span>
              </h2>
              <p className="text-white text-base sm:text-lg leading-relaxed mb-5">
                Welcome to STHENOFY, where strength meets science and fitness becomes a lifestyle. Based in Hyderabad and Bangalore, we combine personalized training, evidence-based practices, and ongoing coaching to help you work towards your health and fitness goals.
              </p>
              <p className="text-gray-400 leading-relaxed max-w-3xl mx-auto">
                No two bodies or journeys are identical. That is why our approach brings together progressive exercise science with specialized nutrition for PCOD/PCOS, diabetes, and endurance performance — helping you move with purpose and fuel your potential.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Sthenofy */}
      <section className="pb-16 sm:pb-20 lg:pb-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {[
              {
                label: 'Why choose us',
                title: 'Expertise with empathy',
                text: 'Our dieticians and trainers bring certified skill, practical education, and genuine care to every stage of your journey — from first steps to peak performance.',
                icon: HeartPulse,
              },
              {
                label: 'Our mission',
                title: 'Progress made personal',
                text: 'To combine personalized training, evidence-based nutrition, and consistent coaching to help individuals build strength, improve health, and achieve lasting progress.',
                icon: Target,
              },
              {
                label: 'Our vision',
                title: 'A healthier community',
                text: 'To make fitness and nutrition more accessible, helping people build healthier habits and make well-being a sustainable part of everyday life.',
                icon: Sparkles,
              },
              {
                label: 'Our goal',
                title: 'Your strongest version',
                text: 'To become a trusted partner in every fitness journey through tailored programs, expert guidance, and support that extends beyond each session.',
                icon: Trophy,
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
              <article key={item.label} className="group relative overflow-hidden rounded-2xl p-6 sm:p-7 border border-gold-400/20 bg-ink-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-gold-400 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_14px_35px_rgba(0,0,0,0.45)]">
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold-400/15 transition-transform duration-500 group-hover:scale-150" />
                <div className="absolute bottom-0 left-0 h-1 w-0 bg-gold-400 transition-all duration-500 group-hover:w-full" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-7">
                    <div className="w-11 h-11 rounded-xl bg-gold-400 border border-gold-300 flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                      <Icon className="w-5 h-5 text-ink-950" />
                    </div>
                    <span className="font-display text-3xl text-gold-400/20">0{index + 1}</span>
                  </div>
                  <span className="text-gold-400 text-[11px] font-semibold uppercase tracking-[0.2em]">{item.label}</span>
                  <h3 className="font-display text-black text-2xl sm:text-[1.7rem] mt-3 mb-3 leading-tight group-hover:text-gold-300 transition-colors">{item.title}</h3>
                  <p className="text-ink-100 leading-relaxed text-sm">{item.text}</p>
                </div>
              </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Gallery introduction */}
      <section className="border-t border-gold-400/20 bg-black py-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="section-label mb-3"><ZoomIn className="w-4 h-4" /><span>Inside STHENOFY</span></div>
            <h2 className="font-display text-white text-3xl sm:text-5xl tracking-tight">THE <span className="text-gold-400">SPACE</span> IN MOTION</h2>
          </div>
          <p className="text-gray-400 max-w-md text-sm sm:text-base leading-relaxed">A closer look at the energy, focus, and everyday work behind every transformation.</p>
        </div>
      </section>

      {/* Gallery grid */}
      <section className="bg-black pb-24">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] auto-rows-[clamp(150px,18vw,260px)] gap-2 sm:gap-3 lg:gap-4">
            {galleryImages.map((img, i) => (
              <button
                key={i}
                className="group relative min-h-0 w-full overflow-hidden rounded-xl cursor-pointer"
                onClick={() => setLightbox(i)}
                aria-label={`Open image: ${img.alt}`}
              >
                <img
                  src={img.url}
                  alt={img.alt}
                  className="block w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
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
