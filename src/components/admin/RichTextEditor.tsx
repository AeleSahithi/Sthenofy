import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';

interface RichTextEditorProps {
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  onImageUpload: (file: File) => Promise<string>;
}

const buttonClass = 'px-2 py-1 text-xs border border-ink-50/10 rounded hover:border-gold-400 hover:text-gold-400 transition-colors';

export default function RichTextEditor({ value, onChange, onImageUpload }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Link.configure({ openOnClick: false }),
      Image.configure({ allowBase64: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value,
    onUpdate: ({ editor: nextEditor }) => onChange(nextEditor.getJSON() as Record<string, unknown>),
    editorProps: {
      attributes: {
        class: 'min-h-[320px] p-4 focus:outline-none prose prose-neutral max-w-none',
      },
    },
  });

  if (!editor) return <div className="min-h-[320px] glass rounded-xl animate-pulse" />;

  const addLink = () => {
    const href = window.prompt('Enter the link URL');
    if (href) editor.chain().focus().setLink({ href }).run();
  };

  const addImage = async (file: File) => {
    try {
      const src = await onImageUpload(file);
      editor.chain().focus().setImage({ src, alt: file.name }).run();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Image upload failed.');
    }
  };

  return (
    <div className="glass rounded-xl overflow-hidden border border-ink-50/10">
      <div className="flex flex-wrap gap-2 p-3 border-b border-ink-50/10">
        <button type="button" className={buttonClass} onClick={() => editor.chain().focus().toggleBold().run()}>Bold</button>
        <button type="button" className={buttonClass} onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</button>
        <button type="button" className={buttonClass} onClick={() => editor.chain().focus().toggleUnderline().run()}>Underline</button>
        <button type="button" className={buttonClass} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" className={buttonClass} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        <button type="button" className={buttonClass} onClick={() => editor.chain().focus().setParagraph().run()}>Paragraph</button>
        <button type="button" className={buttonClass} onClick={() => editor.chain().focus().toggleBulletList().run()}>Bullets</button>
        <button type="button" className={buttonClass} onClick={() => editor.chain().focus().toggleOrderedList().run()}>Numbered</button>
        <button type="button" className={buttonClass} onClick={() => editor.chain().focus().toggleBlockquote().run()}>Quote</button>
        <button type="button" className={buttonClass} onClick={() => editor.chain().focus().setTextAlign('left').run()}>Left</button>
        <button type="button" className={buttonClass} onClick={() => editor.chain().focus().setTextAlign('center').run()}>Center</button>
        <button type="button" className={buttonClass} onClick={() => editor.chain().focus().setTextAlign('right').run()}>Right</button>
        <button type="button" className={buttonClass} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>Clear format</button>
        <select className={`${buttonClass} bg-transparent`} aria-label="Font size" defaultValue="" onChange={(event) => {
          if (event.target.value) editor.chain().focus().setMark('textStyle', { fontSize: event.target.value }).run();
        }}>
          <option value="">Font size</option><option value="14px">Small</option><option value="18px">Medium</option><option value="24px">Large</option><option value="32px">Extra large</option>
        </select>
        <button type="button" className={buttonClass} onClick={addLink}>Link</button>
        <button type="button" className={buttonClass} onClick={() => editor.chain().focus().undo().run()}>Undo</button>
        <button type="button" className={buttonClass} onClick={() => editor.chain().focus().redo().run()}>Redo</button>
        <label className={`${buttonClass} cursor-pointer`}>
          Image
          <input type="file" accept="image/*" className="sr-only" onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void addImage(file);
            event.target.value = '';
          }} />
        </label>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
