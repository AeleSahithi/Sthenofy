import { useEffect, useState } from 'react';
import Navbar, { type PageId } from '@/components/Navbar';
import Footer from '@/components/Footer';
import HomePage from '@/pages/HomePage';
import PackagesPage from '@/pages/PackagesPage';
import ClassesPage from '@/pages/ClassesPage';
import TrainersPage from '@/pages/TrainersPage';
import GalleryPage from '@/pages/GalleryPage';
import BlogPage from '@/pages/BlogPage';
import ContactPage from '@/pages/ContactPage';

export default function App() {
  const [page, setPage] = useState<PageId>('home');

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
      case 'classes': return <ClassesPage onNavigate={handleNavigate} />;
      case 'trainers': return <TrainersPage onNavigate={handleNavigate} />;
      case 'gallery': return <GalleryPage />;
      case 'blog': return <BlogPage />;
      case 'contact': return <ContactPage />;
      default: return <HomePage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 text-ink-50 overflow-x-hidden">
      <Navbar currentPage={page} onNavigate={handleNavigate} />
      <main>{renderPage()}</main>
      <Footer onNavigate={handleNavigate} />
    </div>
  );
}
