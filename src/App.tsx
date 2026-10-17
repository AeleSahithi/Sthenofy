import { useEffect, useState } from 'react';
import Navbar, { type PageId } from '@/components/Navbar';
import Footer from '@/components/Footer';
import HomePage from '@/pages/HomePage';
import PackagesPage from '@/pages/PackagesPage';
import TrainersPage from '@/pages/TrainersPage';
import GalleryPage from '@/pages/GalleryPage';
import BlogPage from '@/pages/BlogPage';
import ContactPage from '@/pages/ContactPage';
import ServicesPage from '@/pages/ServicesPage';
import LegalPage from '@/pages/LegalPage';
import AdminLoginPage from '@/pages/AdminLoginPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import { supabase } from '@/lib/supabase';
import WhatsAppAssistant from '@/components/WhatsAppAssistant';

function AdminRoute() {
  const [state, setState] = useState<'loading' | 'login' | 'dashboard' | 'denied'>('loading');

  useEffect(() => {
    const client = supabase;
    if (!client) { setState('denied'); return; }
    let mounted = true;
    const checkAccess = async () => {
      const { data } = await client.auth.getSession();
      if (!data.session) {
        if (mounted) setState('login');
        return;
      }
      const { data: admin, error } = await client
        .from('admin_users')
        .select('user_id')
        .eq('user_id', data.session.user.id)
        .maybeSingle();
      if (mounted) setState(admin && !error ? 'dashboard' : 'denied');
    };
    void checkAccess();
    const { data: listener } = client.auth.onAuthStateChange(() => { void checkAccess(); });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  if (state === 'loading') return <main className="min-h-screen bg-ink-950 flex items-center justify-center text-ink-300">Checking access...</main>;
  if (state === 'login') return <AdminLoginPage />;
  if (state === 'denied') return <main className="min-h-screen bg-ink-950 flex items-center justify-center px-5 text-center"><div><h1 className="font-display text-4xl text-gold-400 mb-3">ACCESS UNAVAILABLE</h1><p className="text-ink-300">Configure Supabase and authorize this account as an administrator.</p></div></main>;
  return <AdminDashboardPage />;
}

export default function App() {
  const [page, setPage] = useState<PageId>(() => {
    const path = window.location.pathname;
    if (path.includes('/blog')) return 'blog';
    if (path.includes('/services')) return 'services';
    if (path.includes('/privacy')) return 'privacy';
    if (path.includes('/terms')) return 'terms';
    if (path.includes('/refund')) return 'refund';
    return 'home';
  });
  const isAdminRoute = window.location.pathname.includes('/admin');

  const handleNavigate = (newPage: PageId) => {
    setPage(newPage);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  const renderPage = () => {
    switch (page) {
      case 'home': return <HomePage onNavigate={handleNavigate} />;
      case 'packages': return <PackagesPage onNavigate={handleNavigate} />;
      case 'services': return <ServicesPage onNavigate={handleNavigate} />;
      case 'trainers': return <TrainersPage />;
      case 'gallery': return <GalleryPage />;
      case 'blog': return <BlogPage />;
      case 'contact': return <ContactPage />;
      case 'privacy': return <LegalPage type="privacy" />;
      case 'terms': return <LegalPage type="terms" />;
      case 'refund': return <LegalPage type="refund" />;
      default: return <HomePage onNavigate={handleNavigate} />;
    }
  };

  if (isAdminRoute) return <AdminRoute />;

  return (
    <div className="min-h-screen bg-ink-950 text-ink-50 overflow-x-hidden">
      <Navbar currentPage={page} onNavigate={handleNavigate} />
      <main>{renderPage()}</main>
      <Footer onNavigate={handleNavigate} />
      <WhatsAppAssistant />
    </div>
  );
}
