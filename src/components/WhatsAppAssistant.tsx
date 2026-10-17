import { MessageCircle, Send, X } from 'lucide-react';
import { useState } from 'react';

const whatsappUrl = 'https://wa.me/919346122966?text=Hi%20Sthenofy%2C%20I%20would%20like%20to%20know%20more%20about%20your%20fitness%20programs.';

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
              <MessageCircle className="h-5 w-5" />
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
              <Send className="h-4 w-4" />
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
        <MessageCircle className="h-7 w-7" />
        {!isOpen && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-ink-950 bg-gold-400" />}
      </button>
    </div>
  );
}
