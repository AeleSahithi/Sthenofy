import { useEffect, useState } from 'react';
import {
  cancelBooking,
  createScheduleException,
  createWorkingHours,
  fetchActiveServices,
  fetchAdminBookings,
  fetchScheduleData,
  rescheduleBooking,
  saveServiceType,
  updateWorkingHours,
  type AdminBooking,
  type ServiceType,
  type WorkingHours,
} from '@/lib/appointments';

const inputClass = 'rounded-lg border border-ink-50/10 bg-ink-900 px-3 py-2 text-ink-50 outline-none focus:border-gold-400';
const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function BookingManager() {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [error, setError] = useState('');
  const load = async () => { try { setBookings(await fetchAdminBookings()); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load bookings.'); } };
  useEffect(() => { void load(); }, []);
  return <section className="glass rounded-2xl p-5 sm:p-8"><h2 className="font-display text-3xl mb-6">BOOKINGS</h2>{error && <p className="text-red-400 mb-4">{error}</p>}<div className="space-y-3">{bookings.map((booking) => <div key={booking.id} className="border-b border-ink-50/10 pb-4 flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{booking.customer_name} · {booking.service_types?.name || 'Service'}</p><p className="text-sm text-ink-300">{new Date(booking.starts_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · {booking.customer_email}</p><p className="text-xs text-ink-400">{booking.status} · payment {booking.payment_status}</p></div>{booking.status === 'hold' || booking.status === 'confirmed' ? <div className="flex gap-2"><button className="btn-outline px-3 py-2" onClick={() => { const value = window.prompt('Enter the new start time in ISO format (UTC):', booking.starts_at); if (value) void rescheduleBooking(booking, value).then(load).catch((e) => setError(e instanceof Error ? e.message : 'Unable to reschedule booking.')); }}>Reschedule</button><button className="btn-outline px-3 py-2" onClick={() => { if (window.confirm('Cancel this booking?')) void cancelBooking(booking.id).then(load).catch((e) => setError(e instanceof Error ? e.message : 'Unable to cancel booking.')); }}>Cancel</button></div> : null}</div>)}{bookings.length === 0 && <p className="text-ink-300">No bookings yet.</p>}</div></section>;
}

export function ScheduleManager() {
  const [hours, setHours] = useState<WorkingHours[]>([]);
  const [exceptionDate, setExceptionDate] = useState('');
  const [error, setError] = useState('');
  const load = async () => { try { setHours((await fetchScheduleData()).workingHours); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load schedule.'); } };
  useEffect(() => { void load(); }, []);
  const add = async () => { try { await createWorkingHours({ day_of_week: 1, start_time: '09:00', end_time: '17:00', slot_interval_minutes: 30 }); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to add hours.'); } };
  return <section className="glass rounded-2xl p-5 sm:p-8"><div className="flex justify-between gap-4 mb-6"><h2 className="font-display text-3xl">SCHEDULE</h2><button className="btn-gold px-4 py-2" onClick={() => void add()}>Add hours</button></div>{error && <p className="text-red-400 mb-4">{error}</p>}<div className="space-y-3">{hours.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3"><span className="w-28 text-ink-200">{days[item.day_of_week]}</span><input className={inputClass} type="time" value={item.start_time.slice(0, 5)} onChange={(e) => setHours(hours.map((hour) => hour.id === item.id ? { ...hour, start_time: e.target.value } : hour))} /><span>to</span><input className={inputClass} type="time" value={item.end_time.slice(0, 5)} onChange={(e) => setHours(hours.map((hour) => hour.id === item.id ? { ...hour, end_time: e.target.value } : hour))} /><button className="btn-outline px-3 py-2" onClick={() => { const current = hours.find((hour) => hour.id === item.id); if (current) void updateWorkingHours(item.id, { start_time: current.start_time, end_time: current.end_time }).then(() => setError('')).catch((e) => setError(e instanceof Error ? e.message : 'Unable to save schedule.')); }}>Save</button></div>)}</div><div className="mt-8 border-t border-ink-50/10 pt-6"><h3 className="font-display text-xl mb-3">BLOCK A DATE</h3><div className="flex flex-wrap gap-3"><input className={inputClass} type="date" value={exceptionDate} onChange={(e) => setExceptionDate(e.target.value)} /><button className="btn-outline px-4 py-2" disabled={!exceptionDate} onClick={() => void createScheduleException({ exception_date: exceptionDate, is_closed: true, reason: 'Blocked by admin' }).then(() => setExceptionDate('')).catch((e) => setError(e instanceof Error ? e.message : 'Unable to block date.'))}>Block date</button></div></div></section>;
}

export function ServicesManager() {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [error, setError] = useState('');
  const load = async () => { try { setServices(await fetchActiveServices()); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load services.'); } };
  useEffect(() => { void load(); }, []);
  return <section className="glass rounded-2xl p-5 sm:p-8"><div className="flex justify-between gap-4 mb-6"><h2 className="font-display text-3xl">SERVICES & PRICING</h2><button className="btn-gold px-4 py-2" onClick={() => void saveServiceType({ name: 'New Session', slug: `session-${Date.now()}`, description: 'Configure this service before publishing.', duration_minutes: 60, price: 0, currency: 'INR', is_active: true }).then(load).catch((e) => setError(e instanceof Error ? e.message : 'Unable to add service.'))}>Add service</button></div>{error && <p className="text-red-400 mb-4">{error}</p>}<div className="space-y-3">{services.map((service) => <div key={service.id} className="grid sm:grid-cols-[1fr_140px_120px_auto] gap-3 items-center"><span>{service.name}</span><input className={inputClass} type="number" min="0" value={service.price} onChange={(e) => setServices(services.map((item) => item.id === service.id ? { ...item, price: Number(e.target.value) } : item))} /><span className="text-ink-300">{service.currency} · {service.duration_minutes} min</span><button className="btn-outline px-3 py-2" onClick={() => { const current = services.find((item) => item.id === service.id); if (current) void saveServiceType({ price: current.price }, current.id).then(() => setError('')).catch((e) => setError(e instanceof Error ? e.message : 'Unable to save service.')); }}>Save</button></div>)}</div></section>;
}
