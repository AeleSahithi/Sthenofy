import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import {
  calendarDateKey,
  commonPrice,
  fetchActiveServices,
  fetchBookedIntervals,
  fetchBookingStatus,
  fetchLiveBusy,
  fetchScheduleData,
  formatMoney,
  getDaySlots,
  getLocalAppointmentDate,
  overlapsInterval,
  QUESTIONNAIRE_URL_PATTERN,
  startCheckout,
  submitToPayU,
  type AvailabilitySlot,
  type BookedInterval,
  type BookingStatusInfo,
  type ScheduleException,
  type ServiceType,
  type WorkingHours,
} from '@/lib/appointments';
import { PHONE_PATTERN, PHONE_TITLE } from '@/lib/site';

const inputClass = 'w-full rounded-lg border border-ink-50/10 bg-ink-900 px-4 py-3 text-ink-50 outline-none focus:border-gold-400';
const today = new Date();
const todayKey = getLocalAppointmentDate(today);
const formatPrice = (service: ServiceType) => formatMoney(Number(service.price), service.currency);
const istWhen = (startsAt: string, endsAt: string) => {
  const day = new Date(startsAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' });
  const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
  return `${day}, ${time(startsAt)} – ${time(endsAt)} IST`;
};

/** Turns technical failures into messages a customer can act on. */
function friendlyError(reason: unknown, fallback: string): string {
  const message = reason instanceof Error ? reason.message : typeof reason === 'object' && reason && 'message' in reason ? String(reason.message) : '';
  if (!message) return fallback;
  if (/failed to fetch|networkerror|load failed/i.test(message)) return 'We could not reach our booking system. Check your internet connection and try again.';
  if (/supabase is not configured/i.test(message)) return 'Online booking is temporarily unavailable. Please contact us on WhatsApp to book.';
  return message;
}

function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))];
}

/** Finds the service a Services-page card refers to (e.g. "pcod" -> "Nutrition for PCOD/PCOS"). */
function findService(services: ServiceType[], keyword: string | null | undefined) {
  const wanted = keyword?.toLowerCase().trim();
  if (!wanted) return undefined;
  return services.find((item) => item.id === keyword || item.slug === wanted || item.name.toLowerCase().includes(wanted));
}

/** The ?payment=...&booking=... that payu-payment adds when PayU sends the customer back. */
function readPaymentReturn() {
  const params = new URLSearchParams(window.location.search);
  const payment = params.get('payment');
  const booking = params.get('booking');
  return payment ? { payment, booking } : null;
}

function clearPaymentReturn() {
  const url = new URL(window.location.href);
  url.searchParams.delete('payment');
  url.searchParams.delete('booking');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

const POLL_MS = 3000;
const POLL_LIMIT_MS = 90_000;
const REDIRECT_SECONDS = 5;

/** After PayU: waits for the server to verify the payment and confirm the booking, then opens the questionnaire. */
function PaymentResult({ payment, bookingId, onDone }: { payment: string; bookingId: string | null; onDone: () => void }) {
  const failed = payment === 'failed' || payment === 'invalid' || !bookingId;
  const [info, setInfo] = useState<BookingStatusInfo | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS);
  const started = useRef(Date.now());

  const confirmed = info?.status === 'confirmed' && info.payment_status === 'paid';
  const paid = info?.payment_status === 'paid';
  const form = info?.questionnaire_url && QUESTIONNAIRE_URL_PATTERN.test(info.questionnaire_url) ? info.questionnaire_url : null;

  useEffect(() => {
    if (failed || confirmed || timedOut) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await fetchBookingStatus(bookingId!);
        if (!cancelled) setInfo(next);
      } catch { /* keep polling */ }
      if (!cancelled && Date.now() - started.current > POLL_LIMIT_MS) setTimedOut(true);
    };
    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [bookingId, failed, confirmed, timedOut]);

  // Only after the booking is confirmed (payment verified on the server and both calendars updated).
  useEffect(() => {
    if (!confirmed || !form) return;
    if (countdown <= 0) { window.location.assign(form); return; }
    const tick = window.setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(tick);
  }, [confirmed, form, countdown]);

  const box = 'glass rounded-2xl p-6 sm:p-10 max-w-2xl mx-auto text-center space-y-4';
  const anotherButton = <button type="button" className="btn-outline" onClick={onDone}>Book another session</button>;

  if (failed || info?.payment_status === 'failed') return <div className={box} role="status">
    <XCircle className="w-12 h-12 mx-auto text-red-500" aria-hidden="true" />
    <h3 className="font-display text-2xl">PAYMENT NOT COMPLETED</h3>
    <p className="text-ink-300">The payment was cancelled or did not go through, so no money was taken for this booking and the slot has been released. You can choose a time and try again.</p>
    <button type="button" className="btn-gold" onClick={onDone}>Try again</button>
  </div>;

  if (confirmed) return <div className={box} role="status">
    <CheckCircle2 className="w-12 h-12 mx-auto text-green-600" aria-hidden="true" />
    <h3 className="font-display text-2xl">BOOKING CONFIRMED</h3>
    {info && <p className="text-ink-200"><b>{info.service_name}</b><br />{istWhen(info.starts_at, info.ends_at)}</p>}
    <p className="text-ink-300 text-sm">Your confirmation email with the meeting link and calendar invitation is on its way.</p>
    {form ? <>
      <p className="text-ink-200">Next, tell us about yourself in the {info?.service_name} questionnaire. Opening it in <b className="text-gold-500 tabular-nums">{countdown}</b>s…</p>
      <a href={form} className="btn-gold inline-flex">Open questionnaire now</a>
    </> : anotherButton}
  </div>;

  if (paid && (info?.needs_attention || timedOut)) return <div className={box} role="status">
    <CheckCircle2 className="w-12 h-12 mx-auto text-green-600" aria-hidden="true" />
    <h3 className="font-display text-2xl">PAYMENT RECEIVED</h3>
    <p className="text-ink-300">{info?.needs_attention
      ? 'We received your payment. Our team needs to finalise this booking and will contact you shortly by email or WhatsApp.'
      : 'We received your payment and are adding the session to our calendar. Your confirmation email will arrive shortly.'}</p>
    {form && <a href={form} className="btn-gold inline-flex">Fill in your questionnaire</a>}
  </div>;

  if (timedOut) return <div className={box} role="status">
    <Loader2 className="w-12 h-12 mx-auto text-gold-500" aria-hidden="true" />
    <h3 className="font-display text-2xl">CHECKING YOUR PAYMENT</h3>
    <p className="text-ink-300">PayU has not confirmed this payment yet. If money was taken, we will email your confirmation as soon as PayU confirms it. If you need help, message us on WhatsApp with booking reference <b>{bookingId!.slice(0, 8).toUpperCase()}</b>.</p>
    {anotherButton}
  </div>;

  return <div className={box} role="status" aria-live="polite">
    <Loader2 className="w-12 h-12 mx-auto text-gold-500 animate-spin" aria-hidden="true" />
    <h3 className="font-display text-2xl">{paid ? 'PAYMENT VERIFIED' : 'VERIFYING YOUR PAYMENT'}</h3>
    <p className="text-ink-300">{paid ? 'Adding your session to our calendar and confirming your booking…' : 'Checking your payment with PayU. Please keep this page open.'}</p>
  </div>;
}

export default function AppointmentBooking({ requestedService }: { requestedService?: { keyword: string; nonce: number } }) {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [storedBusy, setStoredBusy] = useState<BookedInterval[]>([]);
  const [liveBusy, setLiveBusy] = useState<BookedInterval[]>([]);
  const [checkingTimes, setCheckingTimes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [paymentReturn, setPaymentReturn] = useState(readPaymentReturn);

  const service = services.find((item) => item.id === serviceId);
  const fee = useMemo(() => commonPrice(services), [services]);
  const lowestPrice = useMemo(() => services.reduce<ServiceType | null>((low, item) => (!low || Number(item.price) < Number(low.price) ? item : low), null), [services]);
  const days = useMemo(() => monthDays(month), [month]);
  const slots = useMemo(() => getDaySlots(selectedDate, workingHours, exceptions), [selectedDate, workingHours, exceptions]);
  const isBooked = useCallback((slot: AvailabilitySlot) => [...storedBusy, ...liveBusy].some((item) => overlapsInterval(slot, item)), [storedBusy, liveBusy]);

  useEffect(() => {
    Promise.all([fetchActiveServices(), fetchScheduleData()])
      .then(([loadedServices, schedule]) => {
        setServices(loadedServices);
        // A deep link such as /services/?service=diabetes preselects that service.
        const linked = findService(loadedServices, new URLSearchParams(window.location.search).get('service'));
        if (linked) setServiceId(linked.id);
        setWorkingHours(schedule.workingHours);
        setExceptions(schedule.exceptions);
      })
      .catch((reason) => setError(friendlyError(reason, 'Unable to load appointment availability. Please refresh the page.')))
      .finally(() => setLoading(false));
  }, []);

  // Returning from PayU: show the result section (the app renders after the browser's #anchor jump).
  useEffect(() => {
    if (readPaymentReturn()) window.setTimeout(() => document.getElementById('appointment-booking')?.scrollIntoView({ block: 'start' }), 50);
  }, []);

  // "Get Started" on a Services-page card selects that service here.
  useEffect(() => {
    const match = findService(services, requestedService?.keyword);
    if (match) setServiceId(match.id);
  }, [requestedService, services]);

  /** Bookings and synced busy times from the database, plus a live check of both Google Calendars. */
  const refreshBooked = useCallback(async (live = false) => {
    if (!slots.length) {
      setStoredBusy([]);
      setLiveBusy([]);
      return;
    }
    const from = slots[0].startsAt;
    const to = slots[slots.length - 1].endsAt;
    const [stored, fresh] = await Promise.all([fetchBookedIntervals(from, to), live ? fetchLiveBusy(from, to) : Promise.resolve(null)]);
    setStoredBusy(stored);
    if (fresh) setLiveBusy(fresh);
  }, [slots]);

  useEffect(() => {
    setSelectedSlot(null);
    setCheckingTimes(true);
    refreshBooked(true)
      .catch((reason) => setError(friendlyError(reason, 'Unable to load booked slots. Please refresh the page.')))
      .finally(() => setCheckingTimes(false));
    // Keep slots and prices in sync with other customers' bookings and admin changes.
    const refresh = window.setInterval(() => {
      void refreshBooked().catch(() => undefined);
      void fetchActiveServices().then(setServices).catch(() => undefined);
    }, 20000);
    return () => window.clearInterval(refresh);
  }, [refreshBooked]);

  useEffect(() => {
    if (selectedSlot && isBooked(selectedSlot)) {
      setSelectedSlot(null);
      setError('That slot was just booked. Please choose another time.');
    }
  }, [selectedSlot, isBooked]);

  // Coming back from PayU with the browser's Back button restores this page from cache.
  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      setSubmitting(false);
      void refreshBooked(true).catch(() => undefined);
    };
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, [refreshBooked]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!service) { setError('Choose the service you want to book.'); return; }
    if (!selectedSlot) { setError('Choose a date and time for your consultation.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const data = new FormData(event.currentTarget);
      // The server re-checks both calendars, holds the slot and signs the PayU payment for the database price.
      const checkout = await startCheckout({
        serviceTypeId: service.id,
        name: String(data.get('name') || '').trim(),
        email: String(data.get('email') || '').trim(),
        phone: String(data.get('phone') || '').trim(),
        notes: String(data.get('notes') || '').trim(),
        startsAt: selectedSlot.startsAt,
      });
      submitToPayU(checkout.action, checkout.fields); // leaves the page; submitting stays true
    } catch (reason) {
      await refreshBooked(true).catch(() => undefined);
      setError(friendlyError(reason, 'Unable to start the payment. Please try again.'));
      setSubmitting(false);
    }
  };

  const finishPayment = () => {
    clearPaymentReturn();
    setPaymentReturn(null);
    setSelectedSlot(null);
    setError('');
    void refreshBooked(true).catch(() => undefined);
  };

  const stepLabel = (n: number, text: string) => <h3 className="flex items-center gap-3 font-display text-xl sm:text-2xl"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-400 text-sm font-bold text-ink-950">{n}</span>{text}</h3>;

  return (
    <section id="appointment-booking" className="py-20 bg-ink-900 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="section-label justify-center mb-4"><span>Appointments</span></div>
          <h2 className="font-display text-3xl sm:text-5xl">BOOK YOUR <span className="text-gold-400">CONSULTATION</span></h2>
          {(fee || lowestPrice) && <div className="mt-6 inline-flex flex-col items-center rounded-2xl border-2 border-gold-400 bg-gold-400/10 px-8 py-4">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-300">{fee ? 'Consultation fee' : 'Consultations from'}</span>
            <span className="font-display text-4xl sm:text-5xl text-ink-50">{fee ? formatMoney(fee.amount, fee.currency) : formatPrice(lowestPrice!)}</span>
            <span className="text-xs text-ink-400">One-hour online session · secure payment via PayU</span>
          </div>}
          <p className="text-ink-300 mt-5 max-w-2xl mx-auto">Choose your service, pick a time that suits you, and pay securely. Your booking is confirmed the moment your payment is verified.</p>
        </div>

        {paymentReturn ? <PaymentResult payment={paymentReturn.payment} bookingId={paymentReturn.booking} onDone={finishPayment} /> : <>
          {loading && <p className="text-center text-ink-300">Loading availability...</p>}
          {!loading && services.length === 0 && <div className="glass rounded-2xl p-8 text-center text-ink-300">{error || 'No appointment services are configured yet. An administrator must add services and prices in Supabase.'}</div>}
          {!loading && services.length > 0 && <form onSubmit={(event) => void submit(event)} className="space-y-8">
            <fieldset className="glass rounded-2xl p-5 sm:p-8">
              <legend className="sr-only">Choose your service</legend>
              {stepLabel(1, 'CHOOSE YOUR SERVICE')}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" role="radiogroup">
                {services.map((item) => {
                  const selected = item.id === serviceId;
                  return <label key={item.id} className={`relative flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-all focus-within:ring-2 focus-within:ring-gold-400 focus-within:ring-offset-2 ${selected ? 'border-gold-400 bg-gold-400/15 shadow-[0_6px_20px_rgba(255,204,0,0.25)]' : 'border-ink-50/10 hover:border-gold-400/60'}`}>
                    <input type="radio" name="service" value={item.id} checked={selected} onChange={() => { setServiceId(item.id); setError(''); }} className="sr-only" required />
                    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-gold-400 bg-gold-400 text-ink-950' : 'border-ink-50/30'}`} aria-hidden="true">{selected && <Check className="h-4 w-4" strokeWidth={3} />}</span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink-50 leading-snug">{item.name}</span>
                      {item.description && <span className="mt-1 block text-xs text-ink-400 leading-relaxed">{item.description}</span>}
                      {!fee && <span className="mt-1 block text-sm font-bold text-ink-50">{formatPrice(item)}</span>}
                    </span>
                  </label>;
                })}
              </div>
            </fieldset>

            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
              <div className="glass rounded-2xl p-5 sm:p-8">
                {stepLabel(2, 'PICK A DATE & TIME')}
                <div className="mt-5 flex items-center justify-between mb-5"><button type="button" className="btn-outline px-3 py-2" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Previous</button><h4 className="font-display text-xl uppercase">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h4><button type="button" className="btn-outline px-3 py-2" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Next</button></div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-400 mb-2">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
                <div className="grid grid-cols-7 gap-1">{days.map((day, index) => day ? <button type="button" key={calendarDateKey(day)} disabled={calendarDateKey(day) < todayKey} onClick={() => setSelectedDate(calendarDateKey(day))} className={`rounded-lg p-2 sm:p-3 text-sm ${selectedDate === calendarDateKey(day) ? 'bg-gold-400 text-ink-950' : 'glass text-ink-200 hover:text-gold-400'} disabled:opacity-30`} aria-label={`Select ${calendarDateKey(day)}`} aria-pressed={selectedDate === calendarDateKey(day)}>{day.getDate()}</button> : <span key={`empty-${index}`} />)}</div>
                <div className="mt-7">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><h4 className="font-display text-xl">AVAILABLE TIMES</h4><div className="flex gap-3 text-xs text-ink-400"><span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-ink-50/20" /> Available</span><span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-ink-50/10" /> Booked</span></div></div>
                  {checkingTimes && <p className="mb-2 flex items-center gap-2 text-xs text-ink-400"><Loader2 className="h-3 w-3 animate-spin" /> Checking live availability…</p>}
                  {slots.length === 0 ? <p className="text-ink-400 text-sm">No available times for this date.</p> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{slots.map((slot) => {
                    const taken = isBooked(slot);
                    return <button type="button" key={slot.startsAt} disabled={taken || submitting} onClick={() => { setSelectedSlot(slot); setError(''); }} aria-pressed={selectedSlot?.startsAt === slot.startsAt} className={`rounded-lg border px-3 py-2 text-sm ${taken ? 'border-transparent bg-ink-50/5 text-ink-500 line-through cursor-not-allowed' : selectedSlot?.startsAt === slot.startsAt ? 'border-gold-400 bg-gold-400 text-ink-950' : 'border-ink-50/10 text-ink-200 hover:border-gold-400'}`}>{slot.localStart} – {slot.localEnd}{taken && <span className="block text-[10px] no-underline">Booked</span>}</button>;
                  })}</div>}
                </div>
              </div>

              <div className="glass rounded-2xl p-5 sm:p-8 space-y-4">
                {stepLabel(3, 'YOUR DETAILS & PAYMENT')}
                <div className="rounded-lg border border-gold-400/30 bg-gold-400/10 p-4 text-sm space-y-1">
                  <p><span className="text-ink-300">Service:</span> <b className="text-ink-50">{service?.name ?? 'Choose a service above'}</b></p>
                  <p><span className="text-ink-300">Time:</span> <b className="text-ink-50">{selectedSlot ? istWhen(selectedSlot.startsAt, selectedSlot.endsAt) : 'Pick a time'}</b></p>
                  {service && <p><span className="text-ink-300">Amount:</span> <b className="text-ink-50">{formatPrice(service)}</b></p>}
                </div>
                <label className="block text-sm text-ink-200">Full name<input className={`${inputClass} mt-2`} name="name" autoComplete="name" maxLength={100} required /></label>
                <label className="block text-sm text-ink-200">Email<input className={`${inputClass} mt-2`} name="email" type="email" autoComplete="email" maxLength={254} required /></label>
                <label className="block text-sm text-ink-200">Phone<input className={`${inputClass} mt-2`} name="phone" type="tel" inputMode="tel" autoComplete="tel" pattern={PHONE_PATTERN} title={PHONE_TITLE} placeholder="+91 98765 43210" required /></label>
                <label className="block text-sm text-ink-200">Notes (optional)<textarea className={`${inputClass} mt-2`} name="notes" rows={3} maxLength={1000} /></label>
                <label className="flex gap-2 text-sm text-ink-300"><input type="checkbox" required /> I agree to the privacy policy and terms.</label>
                <button className="btn-gold w-full" disabled={submitting}>{submitting ? 'Taking you to PayU…' : service ? `Pay ${formatPrice(service)} & Book` : 'Pay & Book'}</button>
                {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
                <p className="text-xs text-ink-400">You'll pay on PayU's secure page. The slot is held for 10 minutes while you pay, and your booking is confirmed only after PayU confirms the payment to us.</p>
              </div>
            </div>
          </form>}
        </>}
      </div>
    </section>
  );
}
