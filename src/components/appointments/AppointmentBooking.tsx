import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  calendarDateKey,
  createBooking,
  fetchActiveServices,
  fetchBookedIntervals,
  fetchScheduleData,
  formatMoney,
  getDaySlots,
  getLocalAppointmentDate,
  overlapsInterval,
  PAYU_PAYMENT_LINK,
  submitPaymentReference,
  type AvailabilitySlot,
  type BookedInterval,
  type Booking,
  type ScheduleException,
  type ServiceType,
  type WorkingHours,
} from '@/lib/appointments';
import { PHONE_PATTERN, PHONE_TITLE } from '@/lib/site';

const inputClass = 'w-full rounded-lg border border-ink-50/10 bg-ink-900 px-4 py-3 text-ink-50 outline-none focus:border-gold-400';
const today = new Date();
const todayKey = getLocalAppointmentDate(today);
const formatPrice = (service: ServiceType) => formatMoney(Number(service.price), service.currency);
const istTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

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

interface Reservation {
  booking: Booking;
  slot: AvailabilitySlot;
  serviceName: string;
}

export default function AppointmentBooking() {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [booked, setBooked] = useState<BookedInterval[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [referenceSent, setReferenceSent] = useState(false);

  const service = services.find((item) => item.id === serviceId);
  const days = useMemo(() => monthDays(month), [month]);
  const slots = useMemo(() => getDaySlots(selectedDate, workingHours, exceptions), [selectedDate, workingHours, exceptions]);
  const isBooked = useCallback((slot: AvailabilitySlot) => booked.some((item) => overlapsInterval(slot, item)), [booked]);

  useEffect(() => {
    Promise.all([fetchActiveServices(), fetchScheduleData()])
      .then(([loadedServices, schedule]) => {
        setServices(loadedServices);
        setServiceId(loadedServices[0]?.id || '');
        setWorkingHours(schedule.workingHours);
        setExceptions(schedule.exceptions);
      })
      .catch((reason) => setError(friendlyError(reason, 'Unable to load appointment availability. Please refresh the page.')))
      .finally(() => setLoading(false));
  }, []);

  const refreshBooked = useCallback(async () => {
    if (!slots.length) {
      setBooked([]);
      return;
    }
    setBooked(await fetchBookedIntervals(slots[0].startsAt, slots[slots.length - 1].endsAt));
  }, [slots]);

  useEffect(() => {
    setSelectedSlot(null);
    refreshBooked().catch((reason) => setError(friendlyError(reason, 'Unable to load booked slots. Please refresh the page.')));
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

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!service || !selectedSlot) {
      setError('Select a service, date, and time slot first.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const data = new FormData(event.currentTarget);
      // Holds the slot while the customer pays; the price is set by the database, not this request.
      const booking = await createBooking({
        serviceTypeId: service.id,
        customerName: String(data.get('name') || '').trim(),
        customerEmail: String(data.get('email') || '').trim(),
        customerPhone: String(data.get('phone') || '').trim(),
        notes: String(data.get('notes') || '').trim(),
        startsAt: selectedSlot.startsAt,
      });
      setReservation({ booking, slot: selectedSlot, serviceName: service.name });
      setReferenceSent(false);
      await refreshBooked().catch(() => undefined);
    } catch (reason) {
      await refreshBooked().catch(() => undefined);
      setError(`Unable to reserve the selected slot: ${friendlyError(reason, 'Please try again.')}`);
    } finally {
      setSubmitting(false);
    }
  };

  const sendReference = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reservation?.booking.customer_email || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const reference = String(new FormData(event.currentTarget).get('reference') || '');
      await submitPaymentReference(reservation.booking.id, reservation.booking.customer_email, reference);
      setReferenceSent(true);
    } catch (reason) {
      setError(friendlyError(reason, 'Unable to send the payment reference.'));
    } finally {
      setSubmitting(false);
    }
  };

  const startOver = () => {
    setReservation(null);
    setSelectedSlot(null);
    setError('');
  };

  const bookingAmount = reservation?.booking.amount != null
    ? formatMoney(Number(reservation.booking.amount), reservation.booking.currency || 'INR')
    : null;

  return (
    <section id="appointment-booking" className="py-20 bg-ink-900 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-10"><div className="section-label justify-center mb-4"><span>Appointments</span></div><h2 className="font-display text-3xl sm:text-5xl">BOOK YOUR <span className="text-gold-400">FIRST SESSION</span></h2><p className="text-ink-300 mt-4">Select a convenient one-hour slot and book your appointment securely online.</p></div>
        {loading && <p className="text-center text-ink-300">Loading availability...</p>}
        {!loading && services.length === 0 && <div className="glass rounded-2xl p-8 text-center text-ink-300">No appointment services are configured yet. An administrator must add services and prices in Supabase.</div>}
        {!loading && services.length > 0 && <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
          <div className="glass rounded-2xl p-5 sm:p-8">
            <label className="block text-sm text-ink-200 mb-6">Session type<select className={`${inputClass} mt-2`} value={serviceId} disabled={!!reservation} onChange={(event) => { setServiceId(event.target.value); setSelectedSlot(null); }}>{services.map((item) => <option key={item.id} value={item.id}>{item.name} — {formatPrice(item)}</option>)}</select></label>
            <div className="flex items-center justify-between mb-5"><button className="btn-outline px-3 py-2" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Previous</button><h3 className="font-display text-xl uppercase">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3><button className="btn-outline px-3 py-2" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Next</button></div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-400 mb-2">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="grid grid-cols-7 gap-1">{days.map((day, index) => day ? <button key={calendarDateKey(day)} disabled={calendarDateKey(day) < todayKey || !!reservation} onClick={() => setSelectedDate(calendarDateKey(day))} className={`rounded-lg p-3 text-sm ${selectedDate === calendarDateKey(day) ? 'bg-gold-400 text-ink-950' : 'glass text-ink-200 hover:text-gold-400'} disabled:opacity-30`} aria-label={`Select ${calendarDateKey(day)}`}>{day.getDate()}</button> : <span key={`empty-${index}`} />)}</div>
            <div className="mt-7">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3"><h3 className="font-display text-xl">AVAILABLE TIMES</h3><div className="flex gap-3 text-xs text-ink-400"><span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-ink-50/20" /> Available</span><span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-ink-50/10" /> Booked</span></div></div>
              {slots.length === 0 ? <p className="text-ink-400 text-sm">No available times for this date.</p> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{slots.map((slot) => {
                const taken = isBooked(slot) && reservation?.slot.startsAt !== slot.startsAt;
                return <button key={slot.startsAt} disabled={taken || !!reservation} onClick={() => setSelectedSlot(slot)} className={`rounded-lg border px-3 py-2 text-sm ${taken ? 'border-transparent bg-ink-50/5 text-ink-500 line-through cursor-not-allowed' : (reservation?.slot.startsAt ?? selectedSlot?.startsAt) === slot.startsAt ? 'border-gold-400 bg-gold-400 text-ink-950' : 'border-ink-50/10 text-ink-200 hover:border-gold-400'}`}>{slot.localStart} – {slot.localEnd}{taken && <span className="block text-[10px] no-underline">Booked</span>}</button>;
              })}</div>}
            </div>
          </div>
          {reservation ? <div className="glass rounded-2xl p-5 sm:p-8 space-y-4">
            <h3 className="font-display text-2xl">COMPLETE YOUR PAYMENT</h3>
            <div className="rounded-lg border border-gold-400/30 bg-gold-400/10 p-4 text-sm text-ink-50 space-y-1">
              <p><span className="text-ink-300">Service:</span> {reservation.serviceName}</p>
              <p><span className="text-ink-300">Time:</span> {getLocalAppointmentDate(new Date(reservation.slot.startsAt))}, {reservation.slot.localStart} – {reservation.slot.localEnd}</p>
              {bookingAmount && <p><span className="text-ink-300">Amount to pay:</span> <span className="font-semibold">{bookingAmount}</span></p>}
              <p><span className="text-ink-300">Booking reference:</span> {reservation.booking.id.slice(0, 8).toUpperCase()}</p>
              {reservation.booking.hold_expires_at && <p><span className="text-ink-300">Slot held until:</span> {istTime(reservation.booking.hold_expires_at)}</p>}
            </div>
            <ol className="list-decimal pl-5 text-sm text-ink-300 space-y-1">
              <li>Click <b>Pay Now</b> and pay {bookingAmount ? <b>{bookingAmount}</b> : 'the session amount'} on PayU.</li>
              <li>Use the same email ({reservation.booking.customer_email}) and phone on PayU so we can match your payment.</li>
              <li>Come back here and enter your PayU transaction ID.</li>
            </ol>
            <a href={PAYU_PAYMENT_LINK} target="_blank" rel="noopener noreferrer" className="btn-gold w-full text-center">Pay Now</a>
            {referenceSent
              ? <p className="rounded-lg border border-green-400/30 bg-green-50 p-3 text-sm text-green-800">Thank you! We received your payment reference. Your appointment will be confirmed once we verify the payment with PayU.</p>
              : <form onSubmit={(event) => void sendReference(event)} className="space-y-2 border-t border-ink-50/10 pt-4">
                <label className="block text-sm text-ink-200">PayU transaction ID (after paying)<input className={`${inputClass} mt-2`} name="reference" maxLength={100} autoComplete="off" required /></label>
                <button className="btn-outline w-full" disabled={submitting}>{submitting ? 'Sending...' : 'I have paid — submit reference'}</button>
              </form>}
            <p className="text-xs text-ink-400">Your appointment is confirmed only after we verify the payment; we'll then email your confirmation and meeting link. Unpaid reservations are released automatically.</p>
            <button type="button" className="text-sm text-ink-300 hover:text-gold-400" onClick={startOver}>← Book another slot</button>
            {error && <p className="text-red-600 text-sm">{error}</p>}
          </div>
          : <form onSubmit={(event) => void submit(event)} className="glass rounded-2xl p-5 sm:p-8 space-y-4"><h3 className="font-display text-2xl">REGISTRATION & PAYMENT</h3>{service && <p className="text-ink-300 text-sm">{service.name} · <span className="text-gold-400 font-semibold">{formatPrice(service)}</span> · {selectedSlot ? `${selectedDate}, ${selectedSlot.localStart} – ${selectedSlot.localEnd}` : 'Select a time above'}</p>}<label className="block text-sm text-ink-200">Full name<input className={`${inputClass} mt-2`} name="name" autoComplete="name" maxLength={100} required /></label><label className="block text-sm text-ink-200">Email<input className={`${inputClass} mt-2`} name="email" type="email" autoComplete="email" maxLength={254} required /></label><label className="block text-sm text-ink-200">Phone<input className={`${inputClass} mt-2`} name="phone" type="tel" inputMode="tel" autoComplete="tel" pattern={PHONE_PATTERN} title={PHONE_TITLE} placeholder="+91 98765 43210" required /></label><label className="block text-sm text-ink-200">Notes<textarea className={`${inputClass} mt-2`} name="notes" rows={3} maxLength={1000} /></label><label className="flex gap-2 text-sm text-ink-300"><input type="checkbox" required /> I agree to the privacy policy and terms.</label><button className="btn-gold w-full" disabled={submitting || !selectedSlot}>{submitting ? 'Reserving...' : 'Reserve Slot & Continue to Payment'}</button>{error && <p className="text-red-600 text-sm">{error}</p>}</form>}
        </div>}
      </div>
    </section>
  );
}
