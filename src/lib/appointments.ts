import { requireSupabase } from './supabase';

export const APPOINTMENT_TIMEZONE = 'Asia/Kolkata';

export interface ServiceType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkingHours {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_interval_minutes: number;
  is_active: boolean;
}

export interface ScheduleException {
  id: string;
  exception_date: string;
  is_closed: boolean;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  created_at: string;
}

export type BookingStatus = 'hold' | 'confirmed' | 'cancelled' | 'expired';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Booking {
  id: string;
  service_type_id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_reference: string | null;
  hold_expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminBooking extends Booking {
  service_types?: Pick<ServiceType, 'name' | 'price' | 'currency' | 'duration_minutes'> | null;
}

export interface AvailabilitySlot {
  startsAt: string;
  endsAt: string;
  localStart: string;
  localEnd: string;
}

export interface CreateBookingInput {
  serviceTypeId: string;
  customerName: string;
  customerEmail: string;
  startsAt: string;
  customerPhone?: string;
  notes?: string;
  holdMinutes?: number;
}

export async function fetchActiveServices(): Promise<ServiceType[]> {
  const { data, error } = await requireSupabase()
    .from('service_types')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return (data ?? []) as ServiceType[];
}

export async function fetchScheduleData(): Promise<{
  workingHours: WorkingHours[];
  exceptions: ScheduleException[];
}> {
  const client = requireSupabase();
  const [hours, exceptions] = await Promise.all([
    client.from('working_hours').select('*').eq('is_active', true).order('day_of_week').order('start_time'),
    client.from('schedule_exceptions').select('*').order('exception_date'),
  ]);
  if (hours.error) throw hours.error;
  if (exceptions.error) throw exceptions.error;
  return {
    workingHours: (hours.data ?? []) as WorkingHours[],
    exceptions: (exceptions.data ?? []) as ScheduleException[],
  };
}

function istToUtc(date: string, time: string): Date {
  const [hour, minute, second = '0'] = time.split(':');
  return new Date(Date.UTC(
    Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)),
    Number(hour) - 5, Number(minute) - 30, Number(second),
  ));
}

function localDateFromDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APPOINTMENT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function localTime(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: APPOINTMENT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

export function getAvailabilitySlots(
  date: string,
  service: Pick<ServiceType, 'duration_minutes'>,
  workingHours: WorkingHours[],
  exceptions: ScheduleException[],
  existingBookings: Pick<Booking, 'starts_at' | 'ends_at' | 'status' | 'hold_expires_at'>[] = [],
): AvailabilitySlot[] {
  const exception = exceptions.find((item) => item.exception_date === date);
  if (exception?.is_closed) return [];
  const dayOfWeek = new Date(`${date}T12:00:00+05:30`).getUTCDay();
  const schedules = exception
    ? [{ ...exception, slot_interval_minutes: 30 }]
    : workingHours.filter((item) => item.day_of_week === dayOfWeek);
  const now = Date.now();
  const slots: AvailabilitySlot[] = [];

  for (const schedule of schedules) {
    if (!schedule.start_time || !schedule.end_time) continue;
    const interval = 'slot_interval_minutes' in schedule
      ? schedule.slot_interval_minutes
      : 30;
    let start = istToUtc(date, schedule.start_time);
    const endOfSchedule = istToUtc(date, schedule.end_time);
    while (start.getTime() + service.duration_minutes * 60_000 <= endOfSchedule.getTime()) {
      const end = new Date(start.getTime() + service.duration_minutes * 60_000);
      const blocked = existingBookings.some((booking) => {
        if (booking.status === 'cancelled' || booking.status === 'expired') return false;
        if (booking.status === 'hold' && booking.hold_expires_at && new Date(booking.hold_expires_at).getTime() <= now) return false;
        return new Date(booking.starts_at).getTime() < end.getTime()
          && new Date(booking.ends_at).getTime() > start.getTime();
      });
      if (start.getTime() > now && !blocked) {
        slots.push({
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          localStart: localTime(start),
          localEnd: localTime(end),
        });
      }
      start = new Date(start.getTime() + interval * 60_000);
    }
  }
  return slots;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const { data, error } = await requireSupabase().rpc('create_booking', {
    p_service_type_id: input.serviceTypeId,
    p_customer_name: input.customerName,
    p_customer_email: input.customerEmail,
    p_starts_at: input.startsAt,
    p_customer_phone: input.customerPhone ?? null,
    p_notes: input.notes ?? null,
    p_hold_minutes: input.holdMinutes ?? 15,
  });
  if (error) throw error;
  return data as Booking;
}

export async function fetchBookedIntervals(startsAt: string, endsAt: string): Promise<Pick<Booking, 'starts_at' | 'ends_at'>[]> {
  const { data, error } = await requireSupabase().rpc('get_booked_intervals', {
    p_starts_at: startsAt,
    p_ends_at: endsAt,
  });
  if (error) throw error;
  return (data ?? []) as Pick<Booking, 'starts_at' | 'ends_at'>[];
}

export async function cancelBooking(id: string, customerEmail?: string): Promise<Booking> {
  const { data, error } = await requireSupabase().rpc('cancel_booking', {
    p_booking_id: id,
    p_customer_email: customerEmail ?? null,
  });
  if (error) throw error;
  return data as Booking;
}

export async function fetchAdminBookings(): Promise<AdminBooking[]> {
  const { data, error } = await requireSupabase().from('bookings').select('*, service_types(name, price, currency, duration_minutes)').order('starts_at');
  if (error) throw error;
  return (data ?? []) as AdminBooking[];
}

export async function rescheduleBooking(booking: AdminBooking, startsAt: string): Promise<void> {
  if (!booking.service_types?.duration_minutes) throw new Error('Booking service duration is unavailable.');
  const endsAt = new Date(new Date(startsAt).getTime() + booking.service_types.duration_minutes * 60_000).toISOString();
  const { error } = await requireSupabase().from('bookings').update({ starts_at: startsAt, ends_at: endsAt, updated_at: new Date().toISOString() }).eq('id', booking.id);
  if (error) throw error;
}

export async function updateWorkingHours(id: string, values: Partial<WorkingHours>): Promise<void> {
  const { error } = await requireSupabase().from('working_hours').update(values).eq('id', id);
  if (error) throw error;
}

export async function createWorkingHours(values: Pick<WorkingHours, 'day_of_week' | 'start_time' | 'end_time' | 'slot_interval_minutes'>): Promise<void> {
  const { error } = await requireSupabase().from('working_hours').insert(values);
  if (error) throw error;
}

export async function createScheduleException(values: Pick<ScheduleException, 'exception_date' | 'is_closed' | 'reason'>): Promise<void> {
  const { error } = await requireSupabase().from('schedule_exceptions').insert(values);
  if (error) throw error;
}

export async function saveServiceType(values: Partial<ServiceType>, id?: string): Promise<void> {
  const query = id
    ? requireSupabase().from('service_types').update({ ...values, updated_at: new Date().toISOString() }).eq('id', id)
    : requireSupabase().from('service_types').insert(values);
  const { error } = await query;
  if (error) throw error;
}

export function getLocalAppointmentDate(date: Date): string {
  return localDateFromDate(date);
}
