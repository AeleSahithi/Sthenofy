-- Supabase grants EXECUTE on new functions to anon/authenticated directly, so
-- "revoke ... from public" in the previous migration did not remove it.
-- Internal helpers should only be callable by signed-in users (or not at all).
revoke execute on function public.expire_stale_holds() from anon;
revoke execute on function public.set_booking_amount() from anon, authenticated;
