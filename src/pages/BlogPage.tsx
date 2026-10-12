import { useCallback, useEffect, useMemo, useState } from 'react';
import { PortableText } from '@portabletext/react';
import type { PortableTextComponents } from '@portabletext/react';
import { ArrowRight, Calendar, Clock, Flame, User } from 'lucide-react';
import { sanityClient, sanityImageUrl, postsQuery, type SanityPost } from '@/lib/sanity';

const portableTextComponents: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p>{children}</p>,
    h2: ({ children }) => <h2 className="font-display text-2xl sm:text-3xl text-ink-100">{children}</h2>,
    h3: ({ children }) => <h3 className="font-display text-xl sm:text-2xl text-ink-100">{children}</h3>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-gold-400 pl-6 italic text-lg sm:text-xl text-ink-100">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => <ul className="list-disc pl-6 space-y-2">{children}</ul>,
    number: ({ children }) => <ol className="list-decimal pl-6 space-y-2">{children}</ol>,
  },
  marks: {
    link: ({ children, value }) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-gold-400 underline underline-offset-2"
      >
        {children}
      </a>
    ),
  },
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

function PostImage({ post, className }: { post: SanityPost; className: string }) {
  const imageUrl = sanityImageUrl(post.coverImage);
  if (!imageUrl) {
    return <div className={`${className} bg-ink-800`} aria-hidden="true" />;
  }
  return (
    <img
      src={imageUrl}
      alt={post.coverImage?.alt || post.title}
      className={className}
    />
  );
}

export default function BlogPage() {
  const [posts, setPosts] = useState<SanityPost[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  const loadPosts = useCallback(async () => {
    if (!sanityClient) {
      setStatus('error');
      return;
    }

    try {
      const result = await sanityClient.fetch<SanityPost[]>(postsQuery);
      setPosts(result);
      setStatus('ready');
    } catch (error) {
      console.error('Unable to load published blog posts from Sanity.', error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (selectedPostId === null) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedPostId(null);
    };
    window.addEventListener('keydown', handleKey);
    window.scrollTo(0, 0);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedPostId]);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(posts.map((post) => post.category).filter(Boolean)))],
    [posts],
  );
  const filteredPosts = activeCategory === 'All'
    ? posts
    : posts.filter((post) => post.category === activeCategory);
  const featuredPost = posts.find((post) => post.featured);
  const selectedPost = posts.find((post) => post._id === selectedPostId);

  if (selectedPost) {
    return (
      <div className="noise-overlay min-h-screen pt-20">
        <article className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 py-12 sm:py-16">
          <button
            onClick={() => setSelectedPostId(null)}
            className="text-ink-300 hover:text-gold-400 text-sm uppercase tracking-wider flex items-center gap-2 mb-8 transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" /> Back to Blog
          </button>
          <div className="section-label mb-4">
            <Flame className="w-4 h-4" />
            <span>{selectedPost.category}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl tracking-tight mb-6">{selectedPost.title}</h1>
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-ink-400 text-sm mb-8 pb-8 border-b border-ink-50/10">
            <span className="flex items-center gap-2"><User className="w-4 h-4 text-gold-400" /> {selectedPost.author}</span>
            <span className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gold-400" /> {formatDate(selectedPost.publishedAt)}</span>
            <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-gold-400" /> {selectedPost.readTime} read</span>
          </div>
          <PostImage post={selectedPost} className="w-full rounded-2xl mb-8 object-cover max-h-96" />
          <div className="max-w-none space-y-6 text-ink-200 leading-relaxed text-base sm:text-lg">
            <p className="text-lg sm:text-xl text-ink-100 font-light">{selectedPost.excerpt}</p>
            <PortableText value={selectedPost.body || []} components={portableTextComponents} />
            {selectedPost.quote && (
              <blockquote className="border-l-4 border-gold-400 pl-6 italic text-lg sm:text-xl text-ink-100">
                “{selectedPost.quote}” — {selectedPost.quoteAuthor || selectedPost.author}
              </blockquote>
            )}
          </div>
          <div className="mt-12 pt-8 border-t border-ink-50/10">
            <button onClick={() => setSelectedPostId(null)} className="btn-outline">
              Back to All Articles
            </button>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="noise-overlay min-h-screen pt-20">
      <section className="py-12 sm:py-16 lg:py-20 text-center">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="section-label justify-center mb-4">
            <Flame className="w-4 h-4" />
            <span>The STHENOFY Blog</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl tracking-tight mb-4">
            KNOWLEDGE IS <span className="text-gold-400">POWER</span>
          </h1>
          <p className="text-ink-200 text-base sm:text-lg max-w-2xl mx-auto">
            Training tips, nutrition guides, and expert insights from our coaches. Learn the science behind your sweat.
          </p>
        </div>
      </section>

      {status === 'loading' && (
        <section className="pb-24">
          <div className="max-w-2xl mx-auto px-5 text-center text-ink-300">Loading the latest articles...</div>
        </section>
      )}

      {status === 'error' && (
        <section className="pb-24">
          <div className="max-w-2xl mx-auto px-5 text-center glass rounded-2xl p-8">
            <h2 className="font-display text-2xl text-gold-400 mb-3">BLOG UNAVAILABLE</h2>
            <p className="text-ink-300 mb-5">
              We could not load the latest articles right now. Please try again shortly.
            </p>
            <button onClick={() => void loadPosts()} className="btn-outline">Try Again</button>
          </div>
        </section>
      )}

      {status === 'ready' && posts.length === 0 && (
        <section className="pb-24">
          <div className="max-w-2xl mx-auto px-5 text-center glass rounded-2xl p-8">
            <h2 className="font-display text-2xl text-gold-400 mb-3">NEW ARTICLES COMING SOON</h2>
            <p className="text-ink-300">Our team is preparing fresh training, nutrition, and recovery insights.</p>
          </div>
        </section>
      )}

      {status === 'ready' && posts.length > 0 && (
        <>
          {featuredPost && (
            <section className="pb-12">
              <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
                <button
                  className="group relative rounded-2xl overflow-hidden cursor-pointer w-full text-left"
                  onClick={() => setSelectedPostId(featuredPost._id)}
                >
                  <div className="grid md:grid-cols-2">
                    <div className="aspect-video md:aspect-auto md:h-full relative overflow-hidden">
                      <PostImage post={featuredPost} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    </div>
                    <div className="glass p-8 md:p-12 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="glass-gold rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-400">Featured</span>
                        <span className="text-ink-400 text-sm">{featuredPost.category}</span>
                      </div>
                      <h2 className="font-display text-3xl md:text-4xl tracking-tight mb-4 group-hover:text-gold-400 transition-colors">{featuredPost.title}</h2>
                      <p className="text-ink-300 leading-relaxed mb-6">{featuredPost.excerpt}</p>
                      <div className="flex flex-wrap items-center gap-3 text-ink-400 text-sm mb-6">
                        <span>{featuredPost.author}</span><span>•</span><span>{formatDate(featuredPost.publishedAt)}</span><span>•</span><span>{featuredPost.readTime} read</span>
                      </div>
                      <span className="text-gold-400 font-semibold uppercase tracking-wider text-sm flex items-center gap-2 group-hover:gap-4 transition-all">Read Article <ArrowRight className="w-4 h-4" /></span>
                    </div>
                  </div>
                </button>
              </div>
            </section>
          )}

          <section className="pb-8">
            <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
              <div className="flex flex-wrap gap-2 justify-center">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`px-4 sm:px-5 py-2 rounded-full text-sm font-semibold uppercase tracking-wider transition-all ${activeCategory === category ? 'bg-gold-400 text-ink-950' : 'glass text-ink-300 hover:text-gold-400 hover:border-gold-400/20'}`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="pb-24">
            <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
              {filteredPosts.length === 0 ? (
                <div className="text-center text-ink-300 py-12">No articles found in this category yet.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredPosts.map((post) => (
                    <button
                      key={post._id}
                      className="card-hover group glass rounded-2xl overflow-hidden cursor-pointer text-left"
                      onClick={() => setSelectedPostId(post._id)}
                    >
                      <div className="aspect-video relative overflow-hidden">
                        <PostImage post={post} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute top-3 left-3">
                          <span className="glass-gold rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-400">{post.category}</span>
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="font-display text-xl uppercase tracking-wide mb-3 group-hover:text-gold-400 transition-colors">{post.title}</h3>
                        <p className="text-ink-300 text-sm leading-relaxed mb-4 line-clamp-2">{post.excerpt}</p>
                        <div className="flex items-center gap-3 text-ink-400 text-xs">
                          <span className="flex items-center gap-1"><User className="w-3 h-3 text-gold-400" /> {post.author}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gold-400" /> {post.readTime}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
