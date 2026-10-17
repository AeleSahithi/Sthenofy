import { useEffect, useMemo, useState } from 'react';
import {
  createBooking,
  fetchActiveServices,
  fetchBookedIntervals,
  fetchScheduleData,
  getAvailabilitySlots,
  type AvailabilitySlot,
  type ScheduleException,
  type ServiceType,
  type WorkingHours,
} from '@/lib/appointments';
import { createPayUCheckout } from '@/lib/payments';

const inputClass = 'w-full rounded-lg border border-ink-50/10 bg-ink-900 px-4 py-3 text-ink-50 outline-none focus:border-gold-400';
const today = new Date();
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const formatPrice = (service: ServiceType) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: service.currency }).format(service.price);

function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))];
}

export default function AppointmentBooking() {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState(dateKey(today));
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [paymentStatus] = useState(() => new URLSearchParams(window.location.search).get('payment'));

  const service = services.find((item) => item.id === serviceId);
  const days = useMemo(() => monthDays(month), [month]);

  useEffect(() => {
    Promise.all([fetchActiveServices(), fetchScheduleData()])
      .then(([loadedServices, schedule]) => {
        setServices(loadedServices);
        setServiceId(loadedServices[0]?.id || '');
        setWorkingHours(schedule.workingHours);
        setExceptions(schedule.exceptions);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load appointment availability.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!service) {
      setSlots([]);
      return;
    }
    const scheduleSlots = getAvailabilitySlots(selectedDate, service, workingHours, exceptions);
    if (!scheduleSlots.length) {
      setSlots([]);
      setSelectedSlot(null);
      return;
    }
    fetchBookedIntervals(scheduleSlots[0].startsAt, scheduleSlots[scheduleSlots.length - 1].endsAt)
      .then((booked) => {
        const available = getAvailabilitySlots(selectedDate, service, workingHours, exceptions, booked.map((item) => ({
          ...item,
          status: 'confirmed' as const,
          hold_expires_at: null,
        })));
        setSlots(available);
        setSelectedSlot(null);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load booked slots.'));
  }, [selectedDate, service, workingHours, exceptions]);

  useEffect(() => {
    const refresh = window.setInterval(() => {
      if (!service || !slots.length) return;
      void fetchBookedIntervals(slots[0].startsAt, slots[slots.length - 1].endsAt).then((booked) => {
        const available = getAvailabilitySlots(selectedDate, service, workingHours, exceptions, booked.map((item) => ({
          ...item,
          status: 'confirmed' as const,
          hold_expires_at: null,
        })));
        setSlots(available);
        const blocked = new Set(booked.map((item) => item.starts_at));
        if (selectedSlot && blocked.has(selectedSlot.startsAt)) {
          setSelectedSlot(null);
          setError('That slot was just booked by another customer. Please choose another time.');
        }
      }).catch(() => undefined);
    }, 20000);
    return () => window.clearInterval(refresh);
  }, [service, slots, selectedSlot, selectedDate, workingHours, exceptions]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!service || !selectedSlot) {
      setError('Select a service, date, and time slot first.');
      return;
    }
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const data = new FormData(event.currentTarget);
      const booking = await createBooking({
        serviceTypeId: service.id,
        customerName: String(data.get('name') || '').trim(),
        customerEmail: String(data.get('email') || '').trim(),
        customerPhone: String(data.get('phone') || '').trim(),
        notes: String(data.get('notes') || '').trim(),
        startsAt: selectedSlot.startsAt,
      });
      const checkout = await createPayUCheckout(booking);
      const payuForm = document.createElement('form');
      payuForm.method = 'POST';
      payuForm.action = checkout.action;
      payuForm.style.display = 'none';
      Object.entries(checkout.fields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        payuForm.appendChild(input);
      });
      document.body.appendChild(payuForm);
      payuForm.submit();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to reserve this appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-20 bg-ink-900">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="text-center mb-10"><div className="section-label justify-center mb-4"><span>Appointments</span></div><h2 className="font-display text-3xl sm:text-5xl">BOOK YOUR <span className="text-gold-400">FIRST SESSION</span></h2><p className="text-ink-300 mt-4">Choose a live availability slot in Asia/Kolkata and pay securely with PayU.</p></div>
        {paymentStatus === 'success' && <div className="mb-6 rounded-xl border border-green-400/30 bg-green-400/10 p-4 text-center text-green-300">Payment verified. Your appointment is confirmed.</div>}
        {paymentStatus === 'failed' && <div className="mb-6 rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-center text-red-300">Payment was not completed. Your slot has not been confirmed.</div>}
        {loading && <p className="text-center text-ink-300">Loading availability...</p>}
        {!loading && services.length === 0 && <div className="glass rounded-2xl p-8 text-center text-ink-300">No appointment services are configured yet. An administrator must add services and prices in Supabase.</div>}
        {!loading && services.length > 0 && <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8">
          <div className="glass rounded-2xl p-5 sm:p-8">
            <label className="block text-sm text-ink-200 mb-6">Session type<select className={`${inputClass} mt-2`} value={serviceId} onChange={(event) => { setServiceId(event.target.value); setSelectedSlot(null); }}>{services.map((item) => <option key={item.id} value={item.id}>{item.name} · {formatPrice(item)}</option>)}</select></label>
            <div className="flex items-center justify-between mb-5"><button className="btn-outline px-3 py-2" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Previous</button><h3 className="font-display text-xl uppercase">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3><button className="btn-outline px-3 py-2" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Next</button></div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-400 mb-2">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
            <div className="grid grid-cols-7 gap-1">{days.map((day, index) => day ? <button key={dateKey(day)} disabled={dateKey(day) < dateKey(today)} onClick={() => { setSelectedDate(dateKey(day)); setSelectedSlot(null); }} className={`rounded-lg p-3 text-sm ${selectedDate === dateKey(day) ? 'bg-gold-400 text-ink-950' : 'glass text-ink-200 hover:text-gold-400'} disabled:opacity-30`} aria-label={`Select ${dateKey(day)}`}>{day.getDate()}</button> : <span key={`empty-${index}`} />)}</div>
            <div className="mt-7"><h3 className="font-display text-xl mb-3">AVAILABLE TIMES</h3>{slots.length === 0 ? <p className="text-ink-400 text-sm">No available times for this date.</p> : <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{slots.map((slot) => <button key={slot.startsAt} onClick={() => setSelectedSlot(slot)} className={`rounded-lg border px-3 py-2 text-sm ${selectedSlot?.startsAt === slot.startsAt ? 'border-gold-400 bg-gold-400 text-ink-950' : 'border-ink-50/10 text-ink-200 hover:border-gold-400'}`}>{slot.localStart}</button>)}</div>}</div>
          </div>
          <form onSubmit={(event) => void submit(event)} className="glass rounded-2xl p-5 sm:p-8 space-y-4"><h3 className="font-display text-2xl">REGISTRATION & PAYMENT</h3>{service && <p className="text-ink-300 text-sm">{service.name} · {formatPrice(service)} · {selectedSlot ? `${selectedDate} at ${selectedSlot.localStart}` : 'Select a time above'}</p>}<label className="block text-sm text-ink-200">Full name<input className={`${inputClass} mt-2`} name="name" required /></label><label className="block text-sm text-ink-200">Email<input className={`${inputClass} mt-2`} name="email" type="email" required /></label><label className="block text-sm text-ink-200">Phone<input className={`${inputClass} mt-2`} name="phone" required /></label><label className="block text-sm text-ink-200">Notes<textarea className={`${inputClass} mt-2`} name="notes" rows={3} /></label><label className="flex gap-2 text-sm text-ink-300"><input type="checkbox" required /> I agree to the privacy policy and terms.</label><button className="btn-gold w-full" disabled={submitting || !selectedSlot}>{submitting ? 'Opening PayU...' : 'Register & Pay with PayU'}</button>{message && <p className="text-green-400 text-sm">{message}</p>}{error && <p className="text-red-400 text-sm">{error}</p>}</form>
        </div>}
      </div>
    </section>
  );
}
