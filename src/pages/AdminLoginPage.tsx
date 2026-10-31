import { FormEvent, useEffect, useState } from 'react';
import { KeyRound, LogIn } from 'lucide-react';
import { requireSupabase } from '@/lib/supabase';

const fieldClass = 'mt-2 w-full rounded-lg border border-ink-50/10 bg-ink-900 px-4 py-3 text-ink-50 outline-none focus:border-gold-400';

/** Shown after opening an invite or password-reset email: the signed-in user chooses their password. */
export function AdminSetPasswordPage({ email, onDone }: { email: string; onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = 'Set Password | Sthenofy';
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (password.length < 8) { setMessage('Use at least 8 characters.'); return; }
    if (password !== confirm) { setMessage('The two passwords do not match.'); return; }
    setSaving(true);
    setMessage('');
    try {
      const { error } = await requireSupabase().auth.updateUser({ password });
      if (error) throw error;
      onDone();
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';
      setMessage(/expired|invalid|session/i.test(reason)
        ? 'This link has expired. Ask for a new invite, or use "Forgot password?" on the login page.'
        : reason || 'Unable to save the password. Please try again.');
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-ink-950 flex items-center justify-center px-5">
      <form onSubmit={(event) => void submit(event)} className="w-full max-w-md glass rounded-2xl p-6 sm:p-8">
        <div className="section-label mb-4"><KeyRound className="w-4 h-4" /><span>Private access</span></div>
        <h1 className="font-display text-4xl tracking-tight mb-2">SET YOUR <span className="text-gold-400">PASSWORD</span></h1>
        <p className="text-ink-300 text-sm mb-8">{email ? <>Choose a password for <b>{email}</b>. You will use it to sign in at /admin.</> : 'Choose a password for your admin account.'}</p>
        <div className="space-y-4">
          <label className="block text-sm text-ink-200">New password<input className={fieldClass} type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          <label className="block text-sm text-ink-200">Confirm password<input className={fieldClass} type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></label>
        </div>
        {message && <p role="alert" className="mt-4 text-sm text-red-500">{message}</p>}
        <button className="btn-gold w-full mt-6" disabled={saving}>{saving ? 'Saving...' : 'Save password & continue'}</button>
      </form>
    </main>
  );
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    document.title = 'Admin Login | Sthenofy';
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { error } = await requireSupabase().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      window.location.assign(`${import.meta.env.BASE_URL}admin`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : '';
      if (reason.toLowerCase().includes('invalid login credentials')) {
        setMessage('Supabase rejected this email/password. Confirm that this user exists in Authentication → Users for the project configured in this build, then reset the password if needed.');
      } else if (reason.toLowerCase().includes('email not confirmed')) {
        setMessage('This account email is not confirmed. Confirm it in Supabase Authentication → Users, or disable email confirmation for this private admin project.');
      } else {
        setMessage(reason || 'Unable to sign in. Check the Supabase configuration and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setMessage('Enter your admin email first, then choose reset password.');
      return;
    }
    setLoading(true);
    setMessage('');
    setResetSent(false);
    try {
      const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}admin`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to send a password reset email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-ink-950 flex items-center justify-center px-5">
      <form onSubmit={submit} className="w-full max-w-md glass rounded-2xl p-6 sm:p-8">
        <div className="section-label mb-4"><LogIn className="w-4 h-4" /><span>Private access</span></div>
        <h1 className="font-display text-4xl tracking-tight mb-2">STHENOFY <span className="text-gold-400">ADMIN</span></h1>
        <p className="text-ink-300 text-sm mb-8">Sign in with an authorised team account.</p>
        <div className="space-y-4">
          <label className="block text-sm text-ink-200">Email<input className="mt-2 w-full rounded-lg border border-ink-50/10 bg-ink-900 px-4 py-3 text-ink-50 outline-none focus:border-gold-400" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label className="block text-sm text-ink-200">Password<input className="mt-2 w-full rounded-lg border border-ink-50/10 bg-ink-900 px-4 py-3 text-ink-50 outline-none focus:border-gold-400" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        </div>
        {message && <p role="alert" className="mt-4 text-sm text-red-500">{message}</p>}
        {resetSent && <p role="status" className="mt-4 text-sm text-green-400">If this email belongs to an account in the configured Supabase project, a password reset link has been sent.</p>}
        <button className="btn-gold w-full mt-6" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
        <button type="button" className="w-full mt-4 text-sm text-ink-300 hover:text-gold-400" onClick={() => void resetPassword()} disabled={loading}>Forgot password?</button>
      </form>
    </main>
  );
}
