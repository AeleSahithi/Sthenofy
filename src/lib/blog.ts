import { requireSupabase, supabase } from './supabase';

export type BlogStatus = 'draft' | 'published' | 'unpublished';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: Record<string, unknown>;
  cover_image_path: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  author: string;
  published_at: string | null;
  read_time: string;
  category: string;
  status: BlogStatus;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

export type BlogPostInput = Omit<
  BlogPost,
  'id' | 'created_at' | 'updated_at' | 'cover_image_url'
> & {
  cover_image_url?: string | null;
};

export async function fetchPublishedPosts(): Promise<BlogPost[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchAdminPosts(): Promise<BlogPost[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('blog_posts')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function saveBlogPost(
  input: Partial<BlogPostInput>,
  id?: string,
): Promise<BlogPost> {
  const client = requireSupabase();
  if (!input.title?.trim() || !input.slug?.trim() || !input.excerpt?.trim() || !input.author?.trim()) {
    throw new Error('Title, slug, excerpt, and author are required.');
  }
  if (input.status && !['draft', 'published', 'unpublished'].includes(input.status)) {
    throw new Error('Invalid blog post status.');
  }
  const payload = {
    ...input,
    slug: input.slug.trim(),
    updated_at: new Date().toISOString(),
    published_at: input.status === 'published'
      ? input.published_at || new Date().toISOString()
      : null,
  };
  const query = id
    ? client.from('blog_posts').update(payload).eq('id', id).select().single()
    : client.from('blog_posts').insert(payload).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function updateBlogPostStatus(id: string, status: BlogStatus): Promise<BlogPost> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('blog_posts')
    .update({
      status,
      published_at: status === 'published' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBlogPost(id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('blog_posts').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadBlogImage(file: File): Promise<string> {
  const client = requireSupabase();
  if (!file.type.startsWith('image/')) throw new Error('Only image files are allowed.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Images must be smaller than 10 MB.');
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from('blog-media').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export function getBlogImageUrl(path: string | null): string | null {
  if (!path || !supabase) return null;
  return supabase.storage.from('blog-media').getPublicUrl(path).data.publicUrl;
}
