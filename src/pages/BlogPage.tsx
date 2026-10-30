import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Calendar, Clock, Flame, User } from 'lucide-react';
import RichTextViewer from '@/components/admin/RichTextViewer';
import { fetchPublishedPosts, getBlogImageUrl, type BlogPost } from '@/lib/blog';

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) : '';
}

function postPath(slug: string) {
  return `${import.meta.env.BASE_URL}blog/${slug}`;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedSlug, setSelectedSlug] = useState(() => window.location.pathname.split('/blog/')[1] || null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const loadPosts = useCallback(async () => {
    try { setPosts(await fetchPublishedPosts()); setStatus('ready'); }
    catch (error) { console.error('Unable to load published blog posts.', error); setStatus('error'); }
  }, []);
  useEffect(() => { void loadPosts(); }, [loadPosts]);
  useEffect(() => {
    const onPopState = () => setSelectedSlug(window.location.pathname.split('/blog/')[1] || null);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const openPost = (slug: string) => { window.history.pushState({}, '', postPath(slug)); setSelectedSlug(slug); window.scrollTo(0, 0); };
  const closePost = () => { window.history.pushState({}, '', `${import.meta.env.BASE_URL}blog/`); setSelectedSlug(null); };
  const selectedPost = posts.find((post) => post.slug === selectedSlug);
  const categories = useMemo(() => ['All', ...Array.from(new Set(posts.map((post) => post.category)))], [posts]);
  const filteredPosts = activeCategory === 'All' ? posts : posts.filter((post) => post.category === activeCategory);
  const featuredPost = posts.find((post) => post.status === 'published');

  if (selectedPost) return (
    <div className="noise-overlay min-h-screen pt-20">
      <article className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 py-12 sm:py-16">
        <button onClick={closePost} className="text-ink-300 hover:text-gold-400 text-sm uppercase tracking-wider flex items-center gap-2 mb-8"><ArrowRight className="w-4 h-4 rotate-180" /> Back to Blog</button>
        <div className="section-label mb-4"><Flame className="w-4 h-4" /><span>{selectedPost.category}</span></div>
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight mb-6">{selectedPost.title}</h1>
        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-ink-400 text-sm mb-8 pb-8 border-b border-ink-50/10"><span className="flex items-center gap-2"><User className="w-4 h-4 text-gold-400" />{selectedPost.author}</span><span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gold-400" />{formatDate(selectedPost.published_at)}</span><span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gold-400" />{selectedPost.read_time} read</span></div>
        {getBlogImageUrl(selectedPost.cover_image_path) && <img src={getBlogImageUrl(selectedPost.cover_image_path) || ''} alt={selectedPost.cover_image_alt || selectedPost.title} className="w-full rounded-2xl mb-8 object-cover max-h-96" />}
        <p className="text-lg sm:text-xl text-ink-100 font-light mb-8">{selectedPost.excerpt}</p>
        <RichTextViewer content={selectedPost.content} />
        <button onClick={closePost} className="btn-outline mt-12">Back to All Articles</button>
      </article>
    </div>
  );

  return (
    <div className="noise-overlay min-h-screen pt-20">
      <section className="py-12 sm:py-16 lg:py-20 text-center"><div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8"><div className="section-label justify-center mb-4"><Flame className="w-4 h-4" /><span>The STHENOFY Blog</span></div><h1 className="font-display text-4xl sm:text-5xl md:text-7xl tracking-tight mb-4">KNOWLEDGE IS <span className="text-gold-400">POWER</span></h1><p className="text-ink-200 text-base sm:text-lg max-w-2xl mx-auto">Training tips, nutrition guides, and expert insights from our coaches. Learn the science behind your sweat.</p></div></section>
      {status === 'loading' && <p className="text-center text-ink-300 pb-24">Loading the latest articles...</p>}
      {status === 'error' && <div className="max-w-xl mx-auto px-5 pb-24 text-center glass rounded-2xl p-8"><h2 className="font-display text-2xl text-gold-400 mb-3">BLOG UNAVAILABLE</h2><p className="text-ink-300 mb-5">We could not load the latest articles right now.</p><button className="btn-outline" onClick={() => void loadPosts()}>Try Again</button></div>}
      {status === 'ready' && posts.length === 0 && <p className="text-center text-ink-300 pb-24">New articles coming soon.</p>}
      {status === 'ready' && posts.length > 0 && <>
        {featuredPost && <section className="pb-12"><div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8"><button className="group relative rounded-2xl overflow-hidden cursor-pointer w-full text-left" onClick={() => openPost(featuredPost.slug)}><div className="grid md:grid-cols-2"><div className="aspect-video md:aspect-auto md:h-full relative overflow-hidden">{getBlogImageUrl(featuredPost.cover_image_path) && <img src={getBlogImageUrl(featuredPost.cover_image_path) || ''} alt={featuredPost.cover_image_alt || featuredPost.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />}</div><div className="glass p-8 md:p-12"><span className="text-gold-400 text-xs uppercase tracking-wider">Featured · {featuredPost.category}</span><h2 className="font-display text-3xl md:text-4xl tracking-tight my-4">{featuredPost.title}</h2><p className="text-ink-300 leading-relaxed mb-6">{featuredPost.excerpt}</p><span className="text-gold-400 font-semibold uppercase tracking-wider text-sm flex items-center gap-2">Read Article <ArrowRight className="w-4 h-4" /></span></div></div></button></div></section>}
        <section className="pb-8"><div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 flex flex-wrap gap-2 justify-center">{categories.map((category) => <button key={category} onClick={() => setActiveCategory(category)} className={`px-4 sm:px-5 py-2 rounded-full text-sm font-semibold uppercase tracking-wider ${activeCategory === category ? 'bg-gold-400 text-ink-950' : 'glass text-ink-300 hover:text-gold-400'}`}>{category}</button>)}</div></section>
        <section className="pb-24"><div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">{filteredPosts.map((post) => <button key={post.id} onClick={() => openPost(post.slug)} className="card-hover group glass rounded-2xl overflow-hidden cursor-pointer text-left"><div className="aspect-video relative overflow-hidden">{getBlogImageUrl(post.cover_image_path) && <img src={getBlogImageUrl(post.cover_image_path) || ''} alt={post.cover_image_alt || post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />}<span className="absolute top-3 left-3 glass-gold rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-400">{post.category}</span></div><div className="p-6"><h3 className="font-display text-xl uppercase tracking-wide mb-3 group-hover:text-gold-400">{post.title}</h3><p className="text-ink-300 text-sm leading-relaxed mb-4 line-clamp-2">{post.excerpt}</p><div className="flex items-center gap-3 text-ink-400 text-xs"><span>{post.author}</span><span>•</span><span>{formatDate(post.published_at)}</span></div></div></button>)}</div></section>
      </>}
    </div>
  );
}
