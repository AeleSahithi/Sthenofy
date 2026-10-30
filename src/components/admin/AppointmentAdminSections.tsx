import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  calendarDateKey,
  cancelBooking,
  createAdminSlot,
  createScheduleException,
  createWorkingHours,
  fetchActiveServices,
  fetchAdminBookings,
  fetchAllServices,
  fetchScheduleData,
  formatMoney,
  getDaySlots,
  getLocalAppointmentDate,
  isActiveBooking,
  localDateTimeToIso,
  markBookingPaid,
  overlapsInterval,
  rescheduleBooking,
  saveServiceType,
  updateWorkingHours,
  type AdminBooking,
  type ScheduleException,
  type ServiceType,
  type WorkingHours,
} from '@/lib/appointments';
import { PHONE_PATTERN, PHONE_TITLE } from '@/lib/site';

const inputClass = 'rounded-lg border border-ink-50/10 bg-ink-900 px-3 py-2 text-ink-50 outline-none focus:border-gold-400';
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const istTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
const istDateTime = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });

function monthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  return [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))];
}

function bookingPrice(booking: AdminBooking) {
  return booking.amount != null ? ` · ${formatMoney(Number(booking.amount), booking.currency || 'INR')}` : '';
}

function describeBooking(booking: AdminBooking) {
  if (booking.status === 'blocked') return { tone: 'border-red-400/40 bg-red-400/10 text-red-800', label: 'Blocked', detail: booking.customer_name };
  const who = `${booking.customer_name} · ${booking.service_types?.name || 'Service'}${bookingPrice(booking)}`;
  if (booking.status === 'hold') return {
    tone: 'border-yellow-400/40 bg-yellow-400/10 text-yellow-800',
    label: booking.payment_submitted_at ? 'Customer says paid · verify in PayU' : 'Awaiting payment',
    detail: `${who} · held until ${booking.hold_expires_at ? istDateTime(booking.hold_expires_at) : '—'}`,
  };
  if (booking.status === 'expired') return { tone: 'border-ink-50/20 bg-ink-50/5 text-ink-200', label: 'Reservation expired · customer submitted payment', detail: who };
  const paid = booking.payment_status === 'paid';
  return {
    tone: paid ? 'border-green-400/40 bg-green-400/10 text-green-800' : 'border-gold-400/40 bg-gold-400/10 text-gold-800',
    label: paid ? 'Booked · Paid' : 'Booked · Payment pending',
    detail: who,
  };
}

type Draft = { kind: 'blocked' | 'booking'; startsAt: string };

export function BookingManager() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [selectedDate, setSelectedDate] = useState(() => getLocalAppointmentDate(new Date()));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [customTime, setCustomTime] = useState('09:00');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadBookings = useCallback(async () => { setBookings(await fetchAdminBookings()); }, []);
  const fail = (fallback: string) => (e: unknown) => setError(e instanceof Error ? e.message : fallback);

  useEffect(() => {
    Promise.all([loadBookings(), fetchActiveServices(), fetchScheduleData()])
      .then(([, loadedServices, schedule]) => {
        setServices(loadedServices);
        setWorkingHours(schedule.workingHours);
        setExceptions(schedule.exceptions);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Unable to load bookings.'));
    // New customer payments appear without reloading the page.
    const refresh = window.setInterval(() => { void loadBookings().catch(() => undefined); }, 30000);
    return () => window.clearInterval(refresh);
  }, [loadBookings]);

  const active = useMemo(() => bookings.filter(isActiveBooking), [bookings]);
  const byDate = useMemo(() => {
    const map = new Map<string, AdminBooking[]>();
    for (const booking of active) {
      const key = getLocalAppointmentDate(new Date(booking.starts_at));
      map.set(key, [...(map.get(key) ?? []), booking]);
    }
    return map;
  }, [active]);
  const daySlots = useMemo(() => getDaySlots(selectedDate, workingHours, exceptions), [selectedDate, workingHours, exceptions]);
  const dayEntries = byDate.get(selectedDate) ?? [];
  const offGridEntries = dayEntries.filter((booking) => !daySlots.some((slot) => overlapsInterval(slot, booking)));
  const upcoming = active.filter((booking) => new Date(booking.ends_at).getTime() > Date.now());
  // Customers who reported a PayU payment but whose reservation lapsed before it was verified.
  const lapsedPaid = bookings.filter((booking) => booking.status === 'expired' && booking.payment_submitted_at && booking.payment_status === 'pending' && new Date(booking.starts_at).getTime() > Date.now());
  const closedException = exceptions.find((item) => item.exception_date === selectedDate && item.is_closed);

  const run = async (action: () => Promise<void>, success: string, fallback: string) => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await action();
      await loadBookings();
      setMessage(success);
      setDraft(null);
    } catch (e) {
      fail(fallback)(e);
    } finally {
      setSaving(false);
    }
  };

  const cancel = (booking: AdminBooking) => {
    const verb = booking.status === 'blocked' ? 'Unblock this time' : 'Cancel this booking';
    if (window.confirm(`${verb}? ${booking.status === 'confirmed' && booking.payment_status === 'paid' ? 'Refunds must be issued from the PayU dashboard.' : ''}`)) {
      void run(() => cancelBooking(booking.id).then(() => undefined), booking.status === 'blocked' ? 'Slot unblocked.' : 'Booking cancelled.', 'Unable to cancel booking.');
    }
  };

  const reschedule = (booking: AdminBooking) => {
    const current = `${getLocalAppointmentDate(new Date(booking.starts_at))} ${istTime(booking.starts_at)}`;
    const value = window.prompt('New start (India time) as YYYY-MM-DD HH:MM', current);
    const match = value?.trim().match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/);
    if (!value) return;
    if (!match) { setError('Use the format YYYY-MM-DD HH:MM, for example 2026-11-02 10:00.'); return; }
    void run(() => rescheduleBooking(booking, localDateTimeToIso(match[1], match[2])), 'Booking rescheduled.', 'Unable to reschedule booking.');
  };

  const submitDraft = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft) return;
    const data = new FormData(event.currentTarget);
    if (draft.kind === 'blocked') {
      void run(() => createAdminSlot({
        kind: 'blocked',
        startsAt: draft.startsAt,
        hours: Number(data.get('hours') || 1),
        reason: String(data.get('reason') || ''),
      }), 'Time blocked. Customers now see it as booked.', 'Unable to block this time.');
      return;
    }
    void run(() => createAdminSlot({
      kind: 'booking',
      startsAt: draft.startsAt,
      serviceTypeId: String(data.get('service') || ''),
      customerName: String(data.get('name') || ''),
      customerEmail: String(data.get('email') || ''),
      customerPhone: String(data.get('phone') || ''),
      notes: String(data.get('notes') || ''),
      paymentStatus: data.get('paid') ? 'paid' : 'pending',
    }), 'Booking created.', 'Unable to create booking.');
  };

  const confirmPayment = (booking: AdminBooking) => {
    const amount = booking.amount != null ? formatMoney(Number(booking.amount), booking.currency || 'INR') : 'the session price';
    const reference = window.prompt(`Confirm only after checking PayU (or receiving cash/UPI) for ${amount} from ${booking.customer_name}.\n\nPayU transaction ID / payment reference:`, booking.payment_reference || '');
    if (reference === null) return;
    void run(() => markBookingPaid(booking.id, reference), 'Payment confirmed. The appointment is booked.', 'Unable to confirm payment.');
  };

  const entryActions = (booking: AdminBooking) => <div className="flex flex-wrap gap-2">
    {booking.status !== 'blocked' && booking.payment_status !== 'paid' && <button className="btn-outline px-3 py-1.5 text-xs" disabled={saving} onClick={() => confirmPayment(booking)}>Confirm payment</button>}
    {booking.status !== 'blocked' && booking.status !== 'expired' && <button className="btn-outline px-3 py-1.5 text-xs" disabled={saving} onClick={() => reschedule(booking)}>Reschedule</button>}
    {booking.status !== 'expired' && <button className="btn-outline px-3 py-1.5 text-xs hover:border-red-500 hover:text-red-600" disabled={saving} onClick={() => cancel(booking)}>{booking.status === 'blocked' ? 'Unblock' : 'Cancel'}</button>}
  </div>;

  const entryRow = (booking: AdminBooking, time: string) => {
    const info = describeBooking(booking);
    return <div key={`${booking.id}-${time}`} className={`rounded-xl border p-3 flex flex-wrap items-center justify-between gap-3 ${info.tone}`}>
      <div><p className="text-sm font-semibold">{time} · {info.label}</p><p className="text-xs opacity-80">{info.detail}{booking.customer_email ? ` · ${booking.customer_email}` : ''}{booking.customer_phone ? ` · ${booking.customer_phone}` : ''}</p>{booking.payment_reference && <p className="text-xs opacity-80 mt-1">Payment ref: {booking.payment_reference}</p>}{booking.notes &&<p className="text-xs opacity-70 mt-1">Note: {booking.notes}</p>}</div>
      {entryActions(booking)}
    </div>;
  };

  return <section className="glass rounded-2xl p-5 sm:p-8 space-y-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-3xl">BOOKINGS CALENDAR</h2><button className="btn-outline px-3 py-2 text-sm" onClick={() => void loadBookings().then(() => setMessage('Refreshed.')).catch(fail('Unable to load bookings.'))}>Refresh</button></div>
    {message && <p className="text-green-700">{message}</p>}
    {error && <p className="text-red-600">{error}</p>}
    <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8">
      <div>
        <div className="flex items-center justify-between mb-4"><button className="btn-outline px-3 py-2" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Prev</button><h3 className="font-display text-xl uppercase">{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h3><button className="btn-outline px-3 py-2" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Next</button></div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-400 mb-2">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">{monthDays(month).map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />;
          const key = calendarDateKey(day);
          const entries = byDate.get(key) ?? [];
          const customerCount = entries.filter((item) => item.status !== 'blocked').length;
          const hasBlock = entries.some((item) => item.status === 'blocked');
          return <button key={key} onClick={() => { setSelectedDate(key); setDraft(null); }} className={`rounded-lg p-2 text-sm min-h-[52px] flex flex-col items-center gap-1 ${selectedDate === key ? 'bg-gold-400 text-ink-950' : 'glass text-ink-200 hover:text-gold-400'}`}>
            <span>{day.getDate()}</span>
            <span className="flex gap-1 text-[10px] leading-none">{customerCount > 0 && <span className={`rounded px-1 ${selectedDate === key ? 'bg-ink-950 text-gold-400' : 'bg-green-400/20 text-green-800'}`}>{customerCount}</span>}{hasBlock && <span className="h-2 w-2 rounded-full bg-red-400" />}</span>
          </button>;
        })}</div>
        <div className="flex flex-wrap gap-4 text-xs text-ink-400 mt-3"><span className="flex items-center gap-1"><span className="rounded bg-green-400/20 px-1 text-green-800">2</span> customer bookings</span><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> has blocked time</span></div>
      </div>

      <div>
        <h3 className="font-display text-xl mb-1">{new Date(`${selectedDate}T12:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' })}</h3>
        <p className="text-xs text-ink-400 mb-4">One-hour blocks from your working hours (India time). Blocked and booked slots are hidden from customers.</p>
        {closedException && <p className="mb-3 text-sm text-red-600">This whole date is blocked ({closedException.reason || 'closed'}).</p>}
        <div className="space-y-2">
          {daySlots.map((slot) => {
            const occupant = dayEntries.find((booking) => overlapsInterval(slot, booking));
            const time = `${slot.localStart} – ${slot.localEnd}`;
            if (occupant) return entryRow(occupant, time);
            return <div key={slot.startsAt} className="rounded-xl border border-ink-50/10 p-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-200">{time} · <span className="text-ink-400">Free</span></p>
              <div className="flex gap-2"><button className="btn-outline px-3 py-1.5 text-xs" onClick={() => setDraft({ kind: 'blocked', startsAt: slot.startsAt })}>Block</button><button className="btn-gold px-3 py-1.5 text-xs" onClick={() => setDraft({ kind: 'booking', startsAt: slot.startsAt })}>Book for customer</button></div>
            </div>;
          })}
          {daySlots.length === 0 && !closedException && <p className="text-sm text-ink-400">No upcoming working-hour blocks on this date.</p>}
          {offGridEntries.map((booking) => entryRow(booking, `${istTime(booking.starts_at)} – ${istTime(booking.ends_at)}`))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink-50/10 pt-4 text-sm"><span className="text-ink-300">Custom time:</span><input className={inputClass} type="time" step={1800} value={customTime} onChange={(e) => setCustomTime(e.target.value)} /><button className="btn-outline px-3 py-1.5 text-xs" disabled={!customTime} onClick={() => setDraft({ kind: 'blocked', startsAt: localDateTimeToIso(selectedDate, customTime) })}>Block</button><button className="btn-outline px-3 py-1.5 text-xs" disabled={!customTime} onClick={() => setDraft({ kind: 'booking', startsAt: localDateTimeToIso(selectedDate, customTime) })}>Book</button></div>

        {draft && <form onSubmit={submitDraft} className="mt-5 rounded-xl border border-gold-400/40 p-4 space-y-3">
          <p className="font-semibold">{draft.kind === 'blocked' ? 'Block time' : 'Book for a customer'} · {istDateTime(draft.startsAt)}</p>
          {draft.kind === 'blocked' ? <div className="flex flex-wrap gap-3">
            <input className={`${inputClass} flex-1 min-w-[180px]`} name="reason" placeholder="Reason (only you see this)" />
            <select className={inputClass} name="hours" defaultValue="1">{[1, 2, 3, 4, 5, 6, 8, 10, 12].map((hours) => <option key={hours} value={hours}>{hours} hour{hours > 1 ? 's' : ''}</option>)}</select>
          </div> : <div className="grid sm:grid-cols-2 gap-3">
            <select className={`${inputClass} sm:col-span-2`} name="service" required>{services.map((item) => <option key={item.id} value={item.id}>{item.name} — {formatMoney(Number(item.price), item.currency)}</option>)}</select>
            <input className={inputClass} name="name" placeholder="Customer name" required />
            <input className={inputClass} name="email" type="email" placeholder="Customer email" required />
            <input className={inputClass} name="phone" type="tel" pattern={PHONE_PATTERN} title={PHONE_TITLE} placeholder="Phone" />
            <input className={inputClass} name="notes" placeholder="Notes" />
            <label className="flex items-center gap-2 text-sm text-ink-300 sm:col-span-2"><input type="checkbox" name="paid" /> Customer already paid (cash / UPI / other)</label>
          </div>}
          <div className="flex gap-2"><button className="btn-gold px-4 py-2" disabled={saving}>{saving ? 'Saving...' : draft.kind === 'blocked' ? 'Block time' : 'Create booking'}</button><button type="button" className="btn-outline px-4 py-2" onClick={() => setDraft(null)}>Close</button></div>
        </form>}
      </div>
    </div>

    {lapsedPaid.length > 0 && <div className="border-t border-ink-50/10 pt-6">
      <h3 className="font-display text-xl mb-1">NEEDS PAYMENT CHECK</h3>
      <p className="text-xs text-ink-400 mb-3">These customers submitted a PayU reference but their reservation expired before it was verified. Confirm if the payment is in PayU and the slot is still free.</p>
      <div className="space-y-2">{lapsedPaid.map((booking) => entryRow(booking, istDateTime(booking.starts_at)))}</div>
    </div>}

    <div className="border-t border-ink-50/10 pt-6">
      <h3 className="font-display text-xl mb-3">ALL UPCOMING</h3>
      <div className="space-y-2">{upcoming.map((booking) => entryRow(booking, istDateTime(booking.starts_at)))}{upcoming.length === 0 && <p className="text-ink-300 text-sm">No upcoming bookings or blocked time.</p>}</div>
    </div>
  </section>;
}

export function ScheduleManager() {
  const [hours, setHours] = useState<WorkingHours[]>([]);
  const [exceptionDate, setExceptionDate] = useState('');
  const [error, setError] = useState('');
  const load = async () => { try { setHours((await fetchScheduleData()).workingHours); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load schedule.'); } };
  useEffect(() => { void load(); }, []);
  const add = async () => { try { await createWorkingHours({ day_of_week: 1, start_time: '09:00', end_time: '17:00', slot_interval_minutes: 60 }); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to add hours.'); } };
  return <section className="glass rounded-2xl p-5 sm:p-8"><div className="flex justify-between gap-4 mb-6"><h2 className="font-display text-3xl">SCHEDULE</h2><button className="btn-gold px-4 py-2" onClick={() => void add()}>Add hours</button></div>{error && <p className="text-red-600 mb-4">{error}</p>}<div className="space-y-3">{hours.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3"><span className="w-28 text-ink-200">{days[item.day_of_week]}</span><input className={inputClass} type="time" value={item.start_time.slice(0, 5)} onChange={(e) => setHours(hours.map((hour) => hour.id === item.id ? { ...hour, start_time: e.target.value } : hour))} /><span>to</span><input className={inputClass} type="time" value={item.end_time.slice(0, 5)} onChange={(e) => setHours(hours.map((hour) => hour.id === item.id ? { ...hour, end_time: e.target.value } : hour))} /><button className="btn-outline px-3 py-2" onClick={() => { const current = hours.find((hour) => hour.id === item.id); if (current) void updateWorkingHours(item.id, { start_time: current.start_time, end_time: current.end_time }).then(() => setError('')).catch((e) => setError(e instanceof Error ? e.message : 'Unable to save schedule.')); }}>Save</button></div>)}</div><div className="mt-8 border-t border-ink-50/10 pt-6"><h3 className="font-display text-xl mb-3">BLOCK A DATE</h3><div className="flex flex-wrap gap-3"><input className={inputClass} type="date" value={exceptionDate} onChange={(e) => setExceptionDate(e.target.value)} /><button className="btn-outline px-4 py-2" disabled={!exceptionDate} onClick={() => void createScheduleException({ exception_date: exceptionDate, is_closed: true, reason: 'Blocked by admin' }).then(() => setExceptionDate('')).catch((e) => setError(e instanceof Error ? e.message : 'Unable to block date.'))}>Block date</button></div></div></section>;
}

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function ServicesManager() {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savingId, setSavingId] = useState('');
  const load = async () => { try { setServices(await fetchAllServices()); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load services.'); } };
  useEffect(() => { void load(); }, []);

  const edit = (id: string, values: Partial<ServiceType>) => setServices(services.map((item) => item.id === id ? { ...item, ...values } : item));

  const save = async (service: ServiceType) => {
    const price = Number(service.price);
    if (!service.name.trim()) { setError('Service name is required.'); return; }
    if (!Number.isFinite(price) || price <= 0) { setError(`Enter a price above 0 for ${service.name}.`); return; }
    setSavingId(service.id);
    setError('');
    setMessage('');
    try {
      await saveServiceType({ name: service.name.trim(), description: service.description, price, is_active: service.is_active }, service.id);
      setMessage(`${service.name.trim()} saved at ${formatMoney(price, service.currency)}. The Services page updates automatically.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save service.');
    } finally {
      setSavingId('');
    }
  };

  const add = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const price = Number(data.get('price'));
    if (!name || !Number.isFinite(price) || price <= 0) { setError('Enter a service name and a price above 0.'); return; }
    setError('');
    setMessage('');
    try {
      await saveServiceType({ name, slug: `${slugify(name)}-${Date.now().toString(36)}`, description: String(data.get('description') || '').trim() || null, duration_minutes: 60, price, currency: 'INR', is_active: true });
      form.reset();
      setMessage(`${name} added.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to add service.');
    }
  };

  return <section className="glass rounded-2xl p-5 sm:p-8">
    <h2 className="font-display text-3xl mb-2">SERVICES & PRICING</h2>
    <p className="text-sm text-ink-400 mb-6">Prices are stored in Supabase and shown on the Services page. New bookings save the price at the time of booking.</p>
    {message && <p className="text-green-700 mb-4">{message}</p>}
    {error && <p className="text-red-600 mb-4">{error}</p>}
    <div className="space-y-3">
      <div className="hidden sm:grid sm:grid-cols-[1fr_150px_110px_auto] gap-3 text-xs uppercase tracking-wider text-ink-400"><span>Service</span><span>Price (₹)</span><span>Visible</span><span /></div>
      {services.map((service) => <div key={service.id} className="grid sm:grid-cols-[1fr_150px_110px_auto] gap-3 items-center border-b border-ink-50/10 pb-3 sm:border-0 sm:pb-0">
        <input className={inputClass} value={service.name} onChange={(e) => edit(service.id, { name: e.target.value })} aria-label="Service name" />
        <input className={inputClass} type="number" min="1" step="1" value={service.price} onChange={(e) => edit(service.id, { price: Number(e.target.value) })} aria-label={`${service.name} price`} />
        <label className="flex items-center gap-2 text-sm text-ink-300"><input type="checkbox" checked={service.is_active} onChange={(e) => edit(service.id, { is_active: e.target.checked })} /> {service.is_active ? 'Active' : 'Hidden'}</label>
        <button className="btn-outline px-3 py-2" disabled={savingId === service.id} onClick={() => void save(service)}>{savingId === service.id ? 'Saving...' : 'Save'}</button>
      </div>)}
      {services.length === 0 && <p className="text-ink-300">No services yet.</p>}
    </div>
    <form onSubmit={(event) => void add(event)} className="mt-8 border-t border-ink-50/10 pt-6 grid sm:grid-cols-[1fr_150px_auto] gap-3">
      <h3 className="font-display text-xl sm:col-span-3">ADD A SERVICE</h3>
      <input className={inputClass} name="name" placeholder="Service name" required />
      <input className={inputClass} name="price" type="number" min="1" step="1" placeholder="Price (₹)" required />
      <button className="btn-gold px-4 py-2">Add service</button>
      <input className={`${inputClass} sm:col-span-3`} name="description" placeholder="Short description (optional)" />
    </form>
  </section>;
}
