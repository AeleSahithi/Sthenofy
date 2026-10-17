import { useEffect, useState } from 'react';
import { FileText, LogOut, Dumbbell, Plus, Trash2, Edit3, Eye, EyeOff } from 'lucide-react';
import {
  deleteBlogPost,
  fetchAdminPosts,
  getBlogImageUrl,
  saveBlogPost,
  updateBlogPostStatus,
  uploadBlogImage,
  type BlogPost,
  type BlogStatus,
} from '@/lib/blog';
import { requireSupabase } from '@/lib/supabase';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { BookingManager, ScheduleManager, ServicesManager } from '@/components/admin/AppointmentAdminSections';

const emptyContent = { type: 'doc', content: [{ type: 'paragraph' }] };
const inputClass = 'w-full rounded-lg border border-ink-50/10 bg-ink-900 px-4 py-3 text-ink-50 outline-none focus:border-gold-400';

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function makeEmptyPost(): BlogPost {
  return {
    id: '', title: '', slug: '', excerpt: '', content: emptyContent, cover_image_path: null,
    cover_image_url: null, cover_image_alt: '', author: '', published_at: null, read_time: '5 min',
    category: 'Strength', status: 'draft', seo_title: null, seo_description: null,
    created_at: '', updated_at: '',
  };
}

export default function AdminDashboardPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | BlogStatus>('all');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'blog' | 'bookings' | 'schedule' | 'services'>('blog');

  const load = async () => {
    setError('');
    try {
      setPosts(await fetchAdminPosts());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load posts.');
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!editing) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [editing]);

  const logout = async () => {
    await requireSupabase().auth.signOut();
    window.location.assign('/admin');
  };

  const save = async (event: React.FormEvent<HTMLFormElement>, requestedStatus: BlogStatus) => {
    event.preventDefault();
    if (!editing || saving) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const data = new FormData(event.currentTarget);
      const status = requestedStatus;
      const input = {
        title: String(data.get('title') || '').trim(),
        slug: slugify(String(data.get('slug') || '')),
        excerpt: String(data.get('excerpt') || '').trim(),
        author: String(data.get('author') || '').trim(),
        read_time: String(data.get('read_time') || '').trim(),
        category: String(data.get('category') || ''),
        status,
        published_at: status === 'published' ? new Date().toISOString() : null,
        cover_image_path: editing.cover_image_path,
        cover_image_alt: String(data.get('cover_image_alt') || '').trim(),
        content: editing.content,
        seo_title: String(data.get('seo_title') || '').trim() || null,
        seo_description: String(data.get('seo_description') || '').trim() || null,
      };
      await saveBlogPost(input, editing.id || undefined);
      setMessage(status === 'published' ? 'Post published successfully.' : 'Draft saved successfully.');
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save post.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (post: BlogPost, status: BlogStatus) => {
    setError('');
    setMessage('');
    try {
      await updateBlogPostStatus(post.id, status);
      setMessage(status === 'published' ? 'Post published successfully.' : 'Post unpublished successfully.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to update post status.');
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Delete this post permanently?')) return;
    setError('');
    try {
      await deleteBlogPost(id);
      setMessage('Post deleted successfully.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to delete post.');
    }
  };

  const insertImage = async (file: File) => {
    const path = await uploadBlogImage(file);
    return getBlogImageUrl(path) || path;
  };

  if (editing) return (
    <main className="min-h-screen bg-ink-950 pt-10 px-5 sm:px-8 pb-16">
      <div className="max-w-5xl mx-auto">
        <button className="text-ink-300 hover:text-gold-400 mb-6" onClick={() => setEditing(null)}>← Back to posts</button>
        <form onSubmit={(event) => void save(event, ((event.currentTarget.elements.namedItem('publish-status') as HTMLInputElement)?.value || 'draft') as BlogStatus)} className="space-y-6">
          <input type="hidden" name="publish-status" value="draft" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-display text-4xl">BLOG <span className="text-gold-400">EDITOR</span></h1>
            <div className="flex flex-wrap gap-3">
              <button className="btn-outline" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Draft'}</button>
              <button className="btn-gold" type="button" disabled={saving} onClick={(event) => {
                const form = (event.currentTarget as HTMLButtonElement).form;
                if (form) {
                  const statusInput = form.elements.namedItem('publish-status') as HTMLInputElement | null;
                  if (statusInput) statusInput.value = 'published';
                  form.requestSubmit();
                }
              }}>Publish</button>
            </div>
          </div>
          {error && <p className="text-red-400">{error}</p>}
          <div className="grid lg:grid-cols-2 gap-6">
            <label className="text-sm text-ink-200">Title<input className={inputClass} name="title" defaultValue={editing.title} required onChange={(e) => { if (!editing.slug) setEditing({ ...editing, slug: slugify(e.target.value) }); }} /></label>
            <label className="text-sm text-ink-200">URL slug<input className={inputClass} name="slug" defaultValue={editing.slug} required /></label>
            <label className="text-sm text-ink-200 lg:col-span-2">Excerpt<textarea className={inputClass} name="excerpt" defaultValue={editing.excerpt} rows={3} required /></label>
            <label className="text-sm text-ink-200">Author<input className={inputClass} name="author" defaultValue={editing.author} required /></label>
            <label className="text-sm text-ink-200">Category<select className={inputClass} name="category" defaultValue={editing.category}>{['Strength', 'Cardio', 'Recovery', 'Nutrition', 'Mobility', 'Mindset', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="text-sm text-ink-200">Read time<input className={inputClass} name="read_time" defaultValue={editing.read_time} required /></label>
            <label className="text-sm text-ink-200">Cover image<input className={inputClass} type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const path = await uploadBlogImage(file); setEditing({ ...editing, cover_image_path: path, cover_image_alt: file.name }); } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed.'); } } }} />{editing.cover_image_path && <img src={getBlogImageUrl(editing.cover_image_path) || ''} alt={editing.cover_image_alt || 'Cover preview'} className="mt-3 aspect-video w-full max-w-sm rounded-lg object-cover" />}</label>
            <label className="text-sm text-ink-200">Cover image alt text<input className={inputClass} name="cover_image_alt" defaultValue={editing.cover_image_alt || ''} /></label>
            <label className="text-sm text-ink-200 lg:col-span-2">SEO title<input className={inputClass} name="seo_title" defaultValue={editing.seo_title || ''} /></label>
            <label className="text-sm text-ink-200 lg:col-span-2">SEO description<textarea className={inputClass} name="seo_description" defaultValue={editing.seo_description || ''} rows={2} /></label>
          </div>
          <div><h2 className="font-display text-2xl mb-3">ARTICLE CONTENT</h2><RichTextEditor value={editing.content} onChange={(content) => setEditing({ ...editing, content })} onImageUpload={insertImage} /></div>
        </form>
      </div>
    </main>
  );

  const visiblePosts = posts.filter((post) =>
    (statusFilter === 'all' || post.status === statusFilter) &&
    post.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <main className="min-h-screen bg-ink-950 pt-8 px-5 sm:px-8 pb-16">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div><div className="section-label mb-2"><Dumbbell className="w-4 h-4" /><span>Private workspace</span></div><h1 className="font-display text-4xl sm:text-6xl">STHENOFY <span className="text-gold-400">ADMIN</span></h1></div>
          <button onClick={() => void logout()} className="btn-outline"><LogOut className="w-4 h-4" /> Logout</button>
        </header>
        <nav className="flex flex-wrap gap-3 mb-8">
          <button onClick={() => setActiveSection('blog')} className={`glass rounded-xl p-4 flex items-center gap-3 hover:border-gold-400 ${activeSection === 'blog' ? 'border-gold-400' : ''}`}><FileText className="w-5 h-5 text-gold-400" /><span className="text-sm">Blog Manager</span></button>
          <button onClick={() => setEditing(makeEmptyPost())} className="glass rounded-xl p-4 flex items-center gap-3 hover:border-gold-400"><Plus className="w-5 h-5 text-gold-400" /><span className="text-sm">New Post</span></button>
          <button onClick={() => setActiveSection('bookings')} className={`glass rounded-xl p-4 flex items-center gap-3 hover:border-gold-400 ${activeSection === 'bookings' ? 'border-gold-400' : ''}`}><span className="text-sm">Bookings</span></button>
          <button onClick={() => setActiveSection('schedule')} className={`glass rounded-xl p-4 flex items-center gap-3 hover:border-gold-400 ${activeSection === 'schedule' ? 'border-gold-400' : ''}`}><span className="text-sm">Schedule</span></button>
          <button onClick={() => setActiveSection('services')} className={`glass rounded-xl p-4 flex items-center gap-3 hover:border-gold-400 ${activeSection === 'services' ? 'border-gold-400' : ''}`}><span className="text-sm">Services & Pricing</span></button>
        </nav>
        {message && <p className="mb-4 text-green-400">{message}</p>}
        {error && <p className="mb-4 text-red-400">{error}</p>}
        {activeSection === 'bookings' ? <BookingManager /> : activeSection === 'schedule' ? <ScheduleManager /> : activeSection === 'services' ? <ServicesManager /> : <section className="glass rounded-2xl p-5 sm:p-8">
            <div className="flex flex-wrap gap-3 mb-6"><input className={`${inputClass} max-w-sm`} placeholder="Search posts..." value={search} onChange={(e) => setSearch(e.target.value)} /><select className={`${inputClass} max-w-xs`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}><option value="all">All statuses</option><option value="draft">Drafts</option><option value="published">Published</option><option value="unpublished">Unpublished</option></select></div>
            <div className="space-y-3">{visiblePosts.map((post) => <div key={post.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-50/10 py-4"><div><h2 className="font-display text-xl">{post.title}</h2><p className="text-ink-400 text-sm">{post.category} · {post.status}</p></div><div className="flex gap-2"><button title="Edit post" className="btn-outline px-3 py-2" onClick={() => setEditing(post)}><Edit3 className="w-4 h-4" /></button>{post.status === 'published' ? <button title="Unpublish post" className="btn-outline px-3 py-2" onClick={() => void changeStatus(post, 'unpublished')}><EyeOff className="w-4 h-4" /></button> : <button title="Publish post" className="btn-outline px-3 py-2" onClick={() => void changeStatus(post, 'published')}><Eye className="w-4 h-4" /></button>}<button title="Delete post" className="btn-outline px-3 py-2 hover:border-red-500 hover:text-red-500" onClick={() => void remove(post.id)}><Trash2 className="w-4 h-4" /></button></div></div>)}{visiblePosts.length === 0 && <p className="text-ink-300 py-8 text-center">No posts found.</p>}</div>
        </section>}
      </div>
    </main>
  );
}
