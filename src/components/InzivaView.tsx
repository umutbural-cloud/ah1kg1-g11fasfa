import { useEffect, useRef, useState } from "react";

/**
 * İnziva — local-only, ephemeral writing space.
 * Hiçbir veri sunucuya gönderilmez veya kalıcı saklanmaz.
 * Bir paragraf (\n\n veya \n) tamamlandıktan 10 saniye sonra otomatik silinir.
 */

const TIMEOUT_MS = 10_000;

const InzivaView = () => {
  const [text, setText] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  // Map of paragraph signature -> timeout id
  const timersRef = useRef<Map<string, number>>(new Map());

  // Detect "completed" paragraphs (followed by \n) and schedule deletion.
  useEffect(() => {
    // Split into segments: completed paragraphs end with \n
    // We treat a paragraph as "completed" if the text after it contains a newline boundary.
    const lines = text.split("\n");
    // The last entry is the active (in-progress) paragraph; everything before is "committed".
    const completed = lines.slice(0, -1);

    // Cancel timers for paragraphs that no longer exist
    const stillPresent = new Set(completed.map((p, i) => `${i}:${p}`));
    timersRef.current.forEach((tid, key) => {
      if (!stillPresent.has(key)) {
        clearTimeout(tid);
        timersRef.current.delete(key);
      }
    });

    completed.forEach((para, idx) => {
      const key = `${idx}:${para}`;
      if (timersRef.current.has(key)) return;
      // Skip empty lines (already empty) — still schedule to collapse
      const tid = window.setTimeout(() => {
        setText((prev) => {
          const cur = prev.split("\n");
          if (cur[idx] !== para) return prev; // changed meanwhile
          // Remove this paragraph and the following newline
          const next = [...cur.slice(0, idx), ...cur.slice(idx + 1)];
          return next.join("\n");
        });
        timersRef.current.delete(key);
      }, TIMEOUT_MS);
      timersRef.current.set(key, tid);
    });

    return () => {
      // cleanup happens on unmount in separate effect
    };
  }, [text]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((tid) => clearTimeout(tid));
      timersRef.current.clear();
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto w-full space-y-4">
      <div>
        <h2 className="text-lg tracking-wide font-light">隠 — İnziva</h2>
        <p className="text-[11px] text-muted-foreground/70 font-light leading-relaxed mt-1">
          Buraya yazdıklarınız hiçbir yere kaydedilmez. Bitirdiğiniz her paragraf 10 saniye sonra sessizce kaybolur. Sayfayı kapattığınızda hepsi gider.
        </p>
      </div>

      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Sadece yaz..."
        spellCheck={false}
        autoFocus
        className="w-full min-h-[60vh] bg-transparent border-none outline-none resize-none text-base font-light leading-relaxed tracking-wide placeholder:text-muted-foreground/40 focus:ring-0 p-0"
      />

      <div className="text-[10px] text-muted-foreground/50 font-light tracking-widest text-center pt-4">
        無 — kayıt yok
      </div>
    </div>
  );
};

export default InzivaView;
