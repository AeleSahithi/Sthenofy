import { X } from 'lucide-react';
import { useState } from 'react';

const whatsappUrl = 'https://wa.me/919346122966?text=Hi%20Sthenofy%2C%20I%20would%20like%20to%20know%20more%20about%20your%20fitness%20programs.';

function WhatsAppIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M20.52 3.48A11.87 11.87 0 0 0 12.04 0C5.5 0 .18 5.32.18 11.87c0 2.09.55 4.13 1.6 5.93L.08 24l6.34-1.66a11.85 11.85 0 0 0 5.62 1.42h.01c6.54 0 11.86-5.32 11.86-11.87 0-3.17-1.23-6.15-3.39-8.41Zm-8.48 18.25h-.01a9.86 9.86 0 0 1-5.03-1.38l-.36-.21-3.76.98 1-3.66-.23-.38a9.88 9.88 0 1 1 8.39 4.65Zm5.42-7.4c-.3-.15-1.77-.87-2.05-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.96 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.67-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.68-1.64-.93-2.25-.25-.59-.5-.51-.68-.52h-.58c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5s1.07 2.9 1.22 3.1c.15.2 2.1 3.2 5.09 4.5.71.31 1.27.49 1.7.63.72.23 1.37.2 1.89.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.12-.28-.2-.58-.35Z" />
    </svg>
  );
}

export default function WhatsAppAssistant() {
  const [isOpen, setIsOpen] = useState(false);

  const openWhatsApp = () => {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
      {isOpen && (
        <div className="w-[min(calc(100vw-2.5rem),20rem)] overflow-hidden rounded-2xl border border-[#25D366]/40 bg-ink-950 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between bg-[#25D366] px-4 py-3 text-black">
            <div className="flex items-center gap-2">
              <WhatsAppIcon />
              <span className="font-semibold">Sthenofy Assistant</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close WhatsApp assistant"
              className="rounded-full p-1 transition-colors hover:bg-black/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-4">
            <p className="text-sm leading-relaxed text-ink-100">
              Hi! Need help choosing a program, finding a slot, or getting started?
            </p>
            <button
              type="button"
              onClick={openWhatsApp}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 text-sm font-bold text-black transition-transform hover:scale-[1.02]"
            >
              <WhatsAppIcon className="h-4 w-4" />
              Continue on WhatsApp
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? 'Close WhatsApp assistant' : 'Open WhatsApp assistant'}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-black shadow-[0_8px_25px_rgba(37,211,102,0.35)] transition-transform hover:scale-105"
      >
        <WhatsAppIcon className="h-7 w-7" />
        {!isOpen && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-ink-950 bg-gold-400" />}
      </button>
    </div>
  );
}
