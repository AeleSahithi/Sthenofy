import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Navbar, { type PageId } from '@/components/Navbar';
import Footer from '@/components/Footer';
import HomePage from '@/pages/HomePage';
import TrainersPage from '@/pages/TrainersPage';
import GalleryPage from '@/pages/GalleryPage';
import ContactPage from '@/pages/ContactPage';
import ServicesPage from '@/pages/ServicesPage';
import LegalPage from '@/pages/LegalPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { openedFromPasswordEmail, supabase } from '@/lib/supabase';
import { applyPageMeta, pageFromPath, pathFor } from '@/lib/site';
import WhatsAppAssistant from '@/components/WhatsAppAssistant';

// Loaded on demand: they pull in the rich-text editor, which most visitors never need.
const BlogPage = lazy(() => import('@/pages/BlogPage'));
const AdminLoginPage = lazy(() => import('@/pages/AdminLoginPage'));
const AdminSetPasswordPage = lazy(() => import('@/pages/AdminLoginPage').then((module) => ({ default: module.AdminSetPasswordPage })));
const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage'));

const pageFallback = <div className="min-h-screen pt-20 flex items-center justify-center text-ink-300">Loading...</div>;

function AdminRoute() {
  const [state, setState] = useState<'loading' | 'login' | 'set-password' | 'dashboard' | 'denied'>('loading');
  const [email, setEmail] = useState('');
  // Invite and password-reset links sign the person in; they must choose a password before continuing.
  const needsPassword = useRef(openedFromPasswordEmail);
  const recheck = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    document.title = 'Admin — STHENOFY';
    document.head.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, nofollow');
    const client = supabase;
    if (!client) { setState('denied'); return; }
    let mounted = true;
    const checkAccess = async () => {
      const { data } = await client.auth.getSession();
      if (!data.session) {
        if (mounted) setState('login');
        return;
      }
      if (mounted) setEmail(data.session.user.email ?? '');
      if (needsPassword.current) {
        if (mounted) setState('set-password');
        return;
      }
      const { data: admin, error } = await client
        .from('admin_users')
        .select('user_id')
        .eq('user_id', data.session.user.id)
        .maybeSingle();
      if (mounted) setState(admin && !error ? 'dashboard' : 'denied');
    };
    recheck.current = checkAccess;
    void checkAccess();
    const { data: listener } = client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') needsPassword.current = true;
      void checkAccess();
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  const signOut = async () => {
    await supabase?.auth.signOut();
    setState('login');
  };

  if (state === 'loading') return <main className="min-h-screen bg-ink-950 flex items-center justify-center text-ink-300">Checking access...</main>;
  if (state === 'login') return <Suspense fallback={pageFallback}><AdminLoginPage /></Suspense>;
  if (state === 'set-password') return <Suspense fallback={pageFallback}><AdminSetPasswordPage email={email} onDone={() => { needsPassword.current = false; void recheck.current(); }} /></Suspense>;
  if (state === 'denied') return <main className="min-h-screen bg-ink-950 flex items-center justify-center px-5 text-center"><div><h1 className="font-display text-4xl text-gold-400 mb-3">ACCESS UNAVAILABLE</h1><p className="text-ink-300">{email ? <><b>{email}</b> is signed in but has not been given admin access yet. Ask the site owner to authorise this account.</> : 'Configure Supabase and authorise this account as an administrator.'}</p>{email && <button className="btn-outline mt-6" onClick={() => void signOut()}>Sign out</button>}</div></main>;
  return <Suspense fallback={pageFallback}><AdminDashboardPage /></Suspense>;
}

export default function App() {
  const [page, setPage] = useState<PageId>(() => pageFromPath(window.location.pathname));
  const isAdminRoute = /\/admin(\/|$)/.test(window.location.pathname);

  // Every page has a real URL, so links can be shared, refreshed, and opened directly.
  const handleNavigate = useCallback((newPage: PageId) => {
    const target = pathFor(newPage);
    if (window.location.pathname !== target) window.history.pushState({}, '', target);
    // Lets pages that read the URL (e.g. an open blog post) react, and keeps one code path with Back/Forward.
    window.dispatchEvent(new PopStateEvent('popstate'));
    setPage(newPage);
  }, []);

  useEffect(() => {
    const onPopState = () => setPage(pageFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!isAdminRoute) applyPageMeta(page);
  }, [page, isAdminRoute]);

  const renderPage = () => {
    switch (page) {
      case 'home': return <HomePage onNavigate={handleNavigate} />;
      case 'services': return <ServicesPage />;
      case 'trainers': return <TrainersPage />;
      case 'gallery': return <GalleryPage />;
      case 'blog': return <BlogPage />;
      case 'contact': return <ContactPage />;
      case 'privacy': return <LegalPage type="privacy" />;
      case 'terms': return <LegalPage type="terms" />;
      case 'refund': return <LegalPage type="refund" />;
      default: return <NotFoundPage onNavigate={handleNavigate} />;
    }
  };

  if (isAdminRoute) return <AdminRoute />;

  return (
    <div className="min-h-screen bg-ink-950 text-ink-50 overflow-x-hidden">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:bg-gold-400 focus:px-4 focus:py-2 focus:text-black">Skip to content</a>
      <Navbar currentPage={page} onNavigate={handleNavigate} />
      <main id="main-content"><Suspense fallback={pageFallback}>{renderPage()}</Suspense></main>
      <Footer onNavigate={handleNavigate} />
      <WhatsAppAssistant />
    </div>
  );
}
