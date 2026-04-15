import { useState } from "react";
import { Plus, Trash2, Eye, Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useNotes, Note } from "@/hooks/useNotes";

const NoteCard = ({
  note,
  onUpdate,
  onDelete,
}: {
  note: Note;
  onUpdate: (id: string, updates: { content?: string; title?: string }) => void;
  onDelete: (id: string) => void;
}) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [preview, setPreview] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const autosave = (updates: { content?: string; title?: string }) => {
    if (timer) clearTimeout(timer);
    setTimer(setTimeout(() => onUpdate(note.id, updates), 800));
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    autosave({ title: value });
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    autosave({ content: value });
  };

  return (
    <div className="group border border-border/60 rounded-sm p-4 space-y-2 bg-card/50 hover:bg-card transition-colors">
      <div className="flex justify-between items-start gap-2">
        <Input
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Başlık..."
          className="border-none bg-transparent p-0 h-auto text-sm font-medium tracking-wide focus-visible:ring-0 placeholder:text-muted-foreground/50"
        />
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setPreview(!preview)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title={preview ? "Düzenle" : "Önizleme"}
          >
            {preview ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <span className="text-[10px] text-muted-foreground/60">
        {new Date(note.created_at).toLocaleDateString("tr-TR")}
      </span>

      {preview ? (
        <div className="prose prose-sm prose-stone dark:prose-invert max-w-none min-h-[120px] text-sm font-light leading-relaxed">
          <ReactMarkdown>{content || "*Boş not*"}</ReactMarkdown>
        </div>
      ) : (
        <Textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="Markdown destekli not yazın..."
          className="min-h-[120px] bg-transparent border-none resize-none p-0 focus-visible:ring-0 text-sm font-light"
        />
      )}
    </div>
  );
};

const NotesView = ({ projectId }: { projectId: string }) => {
  const { notes, loading, createNote, updateNote, deleteNote } = useNotes(projectId);

  if (loading) return <div className="text-center text-muted-foreground text-sm py-12">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg tracking-wide">ノート — Notlar</h2>
        <Button variant="ghost" size="sm" onClick={() => createNote()} className="text-xs tracking-wide">
          <Plus className="h-3.5 w-3.5 mr-1" /> Yeni Not
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <p className="mb-1">空 — Boş</p>
          <p className="text-xs">İlk notunuzu oluşturun</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onUpdate={updateNote} onDelete={deleteNote} />
          ))}
        </div>
      )}
    </div>
  );
};

export default NotesView;
