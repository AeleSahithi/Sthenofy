import type { PageId } from '@/components/Navbar';

/** Public production URL (Hostinger). Update here, in index.html, public/.htaccess, and public/robots.txt + sitemap.xml if the domain changes. */
export const SITE_URL = 'https://sthenofy.com/';

export const CONTACT_PHONE_DISPLAY = '+91 90356 54943';
export const CONTACT_PHONE_TEL = 'tel:+919035654943';
export const SUPPORT_EMAIL = 'support@sthenofy.com';
export const WHATSAPP_NUMBER = '919035654943';

/**
 * HTML `pattern` for phone inputs (browsers anchor it and compile it with the `v` regex flag,
 * so ( ) and - must be escaped inside the class). Accepts e.g. +91 98765 43210, 9876543210.
 */
export const PHONE_PATTERN = String.raw`\+?[0-9][0-9 \-\(\)]{8,16}`;
export const PHONE_TITLE = 'Enter a valid phone number, e.g. +91 98765 43210';

export const whatsappLink = (message: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

const base = import.meta.env.BASE_URL;

const routes: Record<PageId, { path: string; title: string; description: string }> = {
  home: {
    path: '',
    title: 'STHENOFY — Personal Training & Nutrition Coaching',
    description: 'Personalised training, strength, and nutrition coaching in Hyderabad and Bengaluru, online and in person. Book your first session with STHENOFY.',
  },
  services: {
    path: 'services',
    title: 'Services & Appointments — STHENOFY',
    description: 'Nutrition for fat loss, diabetes, PCOD/PCOS, menopause and endurance sports, plus online training. See prices and book a one-hour session online.',
  },
  trainers: {
    path: 'trainers',
    title: 'Our Coaches — STHENOFY',
    description: 'Meet the STHENOFY coaches: strength and conditioning, personal training, and clinical nutrition specialists.',
  },
  gallery: {
    path: 'about',
    title: 'About Us — STHENOFY',
    description: 'Where strength meets science. Learn about the STHENOFY mission, approach, and training spaces in Hyderabad and Bengaluru.',
  },
  blog: {
    path: 'blog',
    title: 'Blog — STHENOFY',
    description: 'Training tips, nutrition guides, and expert insights from the STHENOFY coaches.',
  },
  contact: {
    path: 'contact',
    title: 'Contact — STHENOFY',
    description: 'Get in touch with STHENOFY in Bengaluru or Hyderabad by phone, email, or WhatsApp.',
  },
  privacy: { path: 'privacy', title: 'Privacy Policy — STHENOFY', description: 'How STHENOFY collects and uses information through this website.' },
  terms: { path: 'terms', title: 'Terms of Service — STHENOFY', description: 'Terms for using the STHENOFY website and services.' },
  refund: { path: 'refund', title: 'Refund Policy — STHENOFY', description: 'When refunds are available for STHENOFY training, nutrition, and coaching services.' },
  'not-found': { path: '', title: 'Page Not Found — STHENOFY', description: 'The page you are looking for could not be found.' },
};

// Older or alternative URLs that should still open the right page.
const aliases: Record<string, PageId> = { gallery: 'gallery', 'privacy-policy': 'privacy', 'refund-policy': 'refund' };

export function pathFor(page: PageId): string {
  const path = routes[page].path;
  // Trailing slash is the canonical form; public/.htaccess redirects /services to /services/.
  return path ? `${base}${path}/` : base;
}

/** Real links (crawlable, open in new tab) that navigate in-app on a normal click. */
export function linkProps(page: PageId, onNavigate: (page: PageId) => void, after?: () => void) {
  return {
    href: pathFor(page),
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      onNavigate(page);
      after?.();
    },
  };
}

export function pageFromPath(pathname: string): PageId {
  const relative = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, '');
  const segment = relative.split('/')[0].toLowerCase();
  if (!segment || segment === 'index.html') return 'home';
  const match = (Object.keys(routes) as PageId[]).find((page) => page !== 'home' && page !== 'not-found' && routes[page].path === segment);
  return match ?? aliases[segment] ?? 'not-found';
}

function setMeta(selector: string, attribute: string, value: string) {
  document.head.querySelector(selector)?.setAttribute(attribute, value);
}

/** Per-route title, description, canonical URL, and Open Graph tags. */
export function applyPageMeta(page: PageId) {
  const route = routes[page];
  const url = page === 'not-found' || !route.path ? SITE_URL : `${SITE_URL}${route.path}/`;
  document.title = route.title;
  setMeta('meta[name="description"]', 'content', route.description);
  setMeta('link[rel="canonical"]', 'href', url);
  setMeta('meta[property="og:title"]', 'content', route.title);
  setMeta('meta[property="og:description"]', 'content', route.description);
  setMeta('meta[property="og:url"]', 'content', url);
  setMeta('meta[name="twitter:title"]', 'content', route.title);
  setMeta('meta[name="twitter:description"]', 'content', route.description);
  setMeta('meta[name="robots"]', 'content', page === 'not-found' ? 'noindex, follow' : 'index, follow');
}
