import { requireSupabase } from './supabase';

export const APPOINTMENT_TIMEZONE = 'Asia/Kolkata';
// Every appointment, admin block and admin booking is a one-hour block.
export const APPOINTMENT_SLOT_MINUTES = 60;

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

export type BookingStatus = 'hold' | 'confirmed' | 'blocked' | 'cancelled' | 'expired';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Booking {
  id: string;
  service_type_id: string | null;
  user_id: string | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  payment_provider: 'payu' | 'payu_link' | 'manual';
  payment_reference: string | null;
  payment_submitted_at: string | null;
  /** Service price copied by the database when the booking was created. */
  amount: number | null;
  currency: string | null;
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

/** Static PayU payment link. It cannot receive a booking ID or amount from this site. */
export const PAYU_PAYMENT_LINK = 'https://u.payu.in/8rW2Lhb18XZD';
/** How long a customer's reservation is held while they pay via the link. */
export const PAYMENT_HOLD_MINUTES = 60;

export function formatMoney(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: amount % 1 ? 2 : 0 }).format(amount);
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

export type BookedInterval = Pick<Booking, 'starts_at' | 'ends_at'>;

export function overlapsInterval(slot: AvailabilitySlot, interval: BookedInterval): boolean {
  return new Date(interval.starts_at).getTime() < new Date(slot.endsAt).getTime()
    && new Date(interval.ends_at).getTime() > new Date(slot.startsAt).getTime();
}

/** All upcoming one-hour blocks for a date according to working hours and exceptions. */
export function getDaySlots(
  date: string,
  workingHours: WorkingHours[],
  exceptions: ScheduleException[],
): AvailabilitySlot[] {
  const exception = exceptions.find((item) => item.exception_date === date);
  if (exception?.is_closed) return [];
  const dayOfWeek = new Date(`${date}T12:00:00+05:30`).getUTCDay();
  const schedules = exception
    ? [exception]
    : workingHours.filter((item) => item.day_of_week === dayOfWeek);
  const now = Date.now();
  const slotMs = APPOINTMENT_SLOT_MINUTES * 60_000;
  const slots = new Map<string, AvailabilitySlot>();

  for (const schedule of schedules) {
    if (!schedule.start_time || !schedule.end_time) continue;
    let start = istToUtc(date, schedule.start_time);
    const endOfSchedule = istToUtc(date, schedule.end_time);
    while (start.getTime() + slotMs <= endOfSchedule.getTime()) {
      const end = new Date(start.getTime() + slotMs);
      if (start.getTime() > now) {
        slots.set(start.toISOString(), {
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          localStart: localTime(start).slice(0, 5),
          localEnd: localTime(end).slice(0, 5),
        });
      }
      start = end;
    }
  }
  // Overlapping working-hour rows (e.g. two Monday ranges) must not produce duplicate blocks.
  return [...slots.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const { data, error } = await requireSupabase().rpc('create_booking', {
    p_service_type_id: input.serviceTypeId,
    p_customer_name: input.customerName,
    p_customer_email: input.customerEmail,
    p_starts_at: input.startsAt,
    p_customer_phone: input.customerPhone ?? null,
    p_notes: input.notes ?? null,
    p_hold_minutes: input.holdMinutes ?? PAYMENT_HOLD_MINUTES,
  });
  if (error) throw error;
  return data as Booking;
}

/** Records the customer's PayU transaction ID for admin verification; never marks the booking paid. */
export async function submitPaymentReference(bookingId: string, customerEmail: string, reference: string): Promise<void> {
  const { error } = await requireSupabase().rpc('submit_payment_reference', {
    p_booking_id: bookingId,
    p_customer_email: customerEmail,
    p_reference: reference,
  });
  if (error) throw error;
}

/** Admin: all services, including inactive ones (RLS only exposes those to admins). */
export async function fetchAllServices(): Promise<ServiceType[]> {
  const { data, error } = await requireSupabase().from('service_types').select('*').order('name');
  if (error) throw error;
  return (data ?? []) as ServiceType[];
}

export async function fetchBookedIntervals(startsAt: string, endsAt: string): Promise<BookedInterval[]> {
  const { data, error } = await requireSupabase().rpc('get_booked_intervals', {
    p_starts_at: startsAt,
    p_ends_at: endsAt,
  });
  if (error) throw error;
  return (data ?? []) as BookedInterval[];
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

function friendlySlotError(error: { code?: string; message: string }): Error {
  return new Error(error.code === '23P01' ? 'That time overlaps another booking or blocked slot.' : error.message);
}

export async function rescheduleBooking(booking: AdminBooking, startsAt: string): Promise<void> {
  const length = new Date(booking.ends_at).getTime() - new Date(booking.starts_at).getTime();
  const endsAt = new Date(new Date(startsAt).getTime() + length).toISOString();
  const { error } = await requireSupabase().from('bookings').update({ starts_at: startsAt, ends_at: endsAt, updated_at: new Date().toISOString() }).eq('id', booking.id);
  if (error) throw friendlySlotError(error);
}

export type AdminSlotInput =
  | { kind: 'blocked'; startsAt: string; hours: number; reason?: string }
  | {
    kind: 'booking';
    startsAt: string;
    serviceTypeId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    notes?: string;
    paymentStatus: Extract<PaymentStatus, 'pending' | 'paid'>;
  };

/** Admin-only: block time when unavailable, or book a slot on behalf of a customer. */
export async function createAdminSlot(input: AdminSlotInput): Promise<void> {
  const client = requireSupabase();
  // Expired payment holds still occupy the overlap constraint until they are released.
  const { error: expireError } = await client.rpc('expire_stale_holds');
  if (expireError) throw expireError;
  const startsAt = new Date(input.startsAt);
  const hours = input.kind === 'blocked' ? input.hours : 1;
  const endsAt = new Date(startsAt.getTime() + hours * APPOINTMENT_SLOT_MINUTES * 60_000);
  const values = input.kind === 'blocked'
    ? {
      service_type_id: null,
      customer_name: input.reason?.trim() || 'Unavailable',
      customer_email: null,
      status: 'blocked',
      payment_status: 'pending',
    }
    : {
      service_type_id: input.serviceTypeId,
      customer_name: input.customerName.trim(),
      customer_email: input.customerEmail.trim().toLowerCase(),
      customer_phone: input.customerPhone?.trim() || null,
      notes: input.notes?.trim() || null,
      status: 'confirmed',
      payment_status: input.paymentStatus,
    };
  const { error } = await client.from('bookings').insert({
    ...values,
    payment_provider: 'manual',
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
  });
  if (error) throw friendlySlotError(error);
}

/** Admin: confirm a booking after verifying the payment in the PayU dashboard (or receiving cash/UPI). */
export async function markBookingPaid(id: string, reference?: string): Promise<void> {
  const { error } = await requireSupabase().from('bookings').update({
    status: 'confirmed',
    payment_status: 'paid',
    hold_expires_at: null,
    ...(reference?.trim() ? { payment_reference: reference.trim() } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (error) throw friendlySlotError(error);
}

/** Whether a booking currently occupies its time (expired holds do not). */
export function isActiveBooking(booking: Pick<Booking, 'status' | 'hold_expires_at'>): boolean {
  if (booking.status === 'confirmed' || booking.status === 'blocked') return true;
  return booking.status === 'hold' && !!booking.hold_expires_at && new Date(booking.hold_expires_at).getTime() > Date.now();
}

/** Converts an Asia/Kolkata date and HH:MM time to a UTC ISO string. */
export function localDateTimeToIso(date: string, time: string): string {
  return istToUtc(date, time).toISOString();
}

/** YYYY-MM-DD for a calendar cell built from local year/month/day (no UTC shift). */
export function calendarDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
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
