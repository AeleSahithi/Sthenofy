import { createClient } from '@sanity/client';
import imageUrlBuilder, { type SanityImageSource } from '@sanity/image-url';
import type { PortableTextBlock } from '@portabletext/types';

export interface SanityPost {
  _id: string;
  title: string;
  slug: { current: string };
  category: string;
  excerpt: string;
  coverImage?: SanityImageSource & { alt?: string };
  author: string;
  publishedAt: string;
  readTime: string;
  featured?: boolean;
  body: PortableTextBlock[];
  quote?: string;
  quoteAuthor?: string;
}

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const dataset = import.meta.env.VITE_SANITY_DATASET || 'production';

export const sanityClient = projectId
  ? createClient({
      projectId,
      dataset,
      apiVersion: '2024-01-01',
      useCdn: true,
    })
  : null;

const builder = projectId
  ? imageUrlBuilder({ projectId, dataset })
  : null;

export function sanityImageUrl(source: SanityImageSource | undefined): string | null {
  if (!builder || !source) return null;
  return builder.image(source).auto('format').fit('max').url();
}

export const postsQuery = `*[
  _type == "post" &&
  !(_id in path("drafts.**")) &&
  defined(publishedAt)
] | order(publishedAt desc) {
  _id,
  title,
  slug,
  category,
  excerpt,
  coverImage,
  author,
  publishedAt,
  readTime,
  featured,
  body,
  quote,
  quoteAuthor
}`;
