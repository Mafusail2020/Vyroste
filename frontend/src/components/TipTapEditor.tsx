import { useRef } from 'react'
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { toast } from 'react-hot-toast'
import api from '../lib/api'

interface Props {
  initialContent: JSONContent | null
  onChange: (doc: JSONContent) => void
}

// Remount (via `key`) when switching articles so the editor re-seeds content.
export default function TipTapEditor({ initialContent, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Placeholder.configure({ placeholder: 'Почніть писати статтю…' }),
    ],
    content: initialContent && 'type' in initialContent ? initialContent : '',
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: { class: 'prose-article min-h-[320px] focus:outline-none px-4 py-3' },
    },
  })

  if (!editor) return null

  async function uploadImage(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    try {
      const r = await api.post<{ url: string }>('/api/knowledge/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      editor!.chain().focus().setImage({ src: r.data.url }).run()
    } catch {
      toast.error('Не вдалось завантажити зображення')
    }
  }

  const Btn = ({ on, active, children, label }: { on: () => void; active?: boolean; children: React.ReactNode; label: string }) => (
    <button
      type="button"
      title={label}
      onClick={on}
      className={`px-2.5 py-1 rounded text-sm font-semibold transition-colors ${
        active ? 'bg-forest text-white' : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="border-2 border-gray-200 rounded-xl overflow-hidden focus-within:border-forest transition-colors">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-100 bg-gray-50">
        <Btn label="Жирний" on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}><b>B</b></Btn>
        <Btn label="Курсив" on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}><i>I</i></Btn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <Btn label="Заголовок 2" on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>H2</Btn>
        <Btn label="Заголовок 3" on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>H3</Btn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <Btn label="Список" on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>• List</Btn>
        <Btn label="Нумерований" on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>1.</Btn>
        <Btn label="Цитата" on={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')}>❝</Btn>
        <span className="w-px h-5 bg-gray-200 mx-1" />
        <Btn label="Зображення" on={() => fileRef.current?.click()}>🖼️</Btn>
        <input
          ref={fileRef} type="file" accept="image/*" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = '' }}
        />
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
