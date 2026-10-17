import { useMemo } from 'react';
import { generateHTML, type JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import DOMPurify from 'dompurify';

export default function RichTextViewer({ content }: { content: Record<string, unknown> }) {
  const html = useMemo(() => {
    try {
      const generated = generateHTML(content as JSONContent, [
        StarterKit,
        Underline,
        TextStyle,
        Link.configure({ openOnClick: true }),
        Image.configure({ allowBase64: false }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ]);
      return DOMPurify.sanitize(generated, { USE_PROFILES: { html: true } });
    } catch {
      return '<p>Article content is unavailable.</p>';
    }
  }, [content]);
  return <div className="prose prose-neutral max-w-none text-ink-200 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
}
