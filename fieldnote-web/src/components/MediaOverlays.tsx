import { useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play, Save, Search, X } from 'lucide-react';
import { useFieldnote } from '../store/useFieldnote';
import type { AudioObject, MarkdownObject, PdfObject } from '../types';
import { resolveMediaSrc } from '../lib/blobs';
import { cancelPdfJobs } from '../lib/pdf';

type MarkdownSection = {
  heading: string;
  start: number;
  end: number;
};

export function MediaOverlays() {
  return (
    <>
      <ReadOnlyBanner />
      <PdfReader />
      <MarkdownEditor />
      <AudioPlayer />
    </>
  );
}

export function ReadOnlyBanner() {
  const readOnly = useFieldnote((s) => s.readOnly);
  if (!readOnly) return null;

  return (
    <div className="fixed left-1/2 top-[max(10px,var(--safe-top))] z-[70] -translate-x-1/2 rounded-full bg-[var(--walnut)] px-4 py-2 text-sm font-bold text-[var(--cream)] shadow-xl">
      This board is open in another tab — view only
    </div>
  );
}

export function PdfReader() {
  const pdfReader = useFieldnote((s) => s.pdfReader);
  const objects = useFieldnote((s) => s.objects);
  const setPdfReader = useFieldnote((s) => s.setPdfReader);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('Loading PDF...');
  const loadingTaskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);
  const id = pdfReader?.id ?? null;
  const pdf = objects.find((obj): obj is PdfObject => obj.id === id && obj.type === 'pdf');

  useEffect(() => {
    if (!pdf) {
      setSrc(null);
      setDoc(null);
      setPage(1);
      return;
    }

    let cancelled = false;
    setStatus('Loading PDF...');
    void resolveMediaSrc(pdf.src).then((resolved) => {
      if (!cancelled) setSrc(resolved);
    });

    return () => {
      cancelled = true;
    };
  }, [pdf]);

  useEffect(() => {
    if (!src || !id) return;

    let cancelled = false;
    setDoc(null);
    setPage(1);
    setStatus('Loading PDF...');

    void (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
        if (cancelled) return;
        const loadingTask = pdfjs.getDocument({ url: src });
        loadingTaskRef.current = loadingTask;
        const loaded = await loadingTask.promise;
        if (cancelled) return;
        setDoc(loaded);
        setStatus('');
      } catch {
        if (!cancelled) setStatus('Unable to load this PDF.');
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      void loadingTaskRef.current?.destroy().catch(() => undefined);
      loadingTaskRef.current = null;
      cancelPdfJobs(id);
    };
  }, [src, id]);

  useEffect(() => {
    if (!doc || !canvasRef.current || !id) return;

    let cancelled = false;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    setStatus('Rendering page...');
    renderTaskRef.current?.cancel();
    void (async () => {
      try {
        const pdfPage = await doc.getPage(page);
        if (cancelled) return;
        const viewport = pdfPage.getViewport({ scale: 1 });
        const maxWidth = Math.min(window.innerWidth - 32, 980);
        const maxHeight = Math.max(280, window.innerHeight - 180);
        const scale = Math.min(maxWidth / viewport.width, maxHeight / viewport.height, 2);
        const scaled = pdfPage.getViewport({ scale });
        canvas.width = Math.floor(scaled.width);
        canvas.height = Math.floor(scaled.height);
        renderTaskRef.current = pdfPage.render({ canvas, canvasContext: context, viewport: scaled });
        await renderTaskRef.current.promise;
        if (!cancelled) setStatus('');
      } catch {
        if (!cancelled) setStatus('Unable to render this page.');
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      cancelPdfJobs(id);
    };
  }, [doc, page, id]);

  const close = () => {
    if (id) cancelPdfJobs(id);
    setPdfReader(null);
  };

  return (
    <AnimatePresence>
      {pdf && (
        <motion.div
          className="fixed inset-0 z-[80] flex flex-col bg-[var(--paper)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <header className="flex min-h-16 items-center gap-3 bg-[var(--walnut)] px-4 py-3 text-[var(--cream)]">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold tracking-[0.08em] text-white/60">PDF READER</div>
              <h2 className="truncate text-lg font-bold">{pdf.name}</h2>
            </div>
            <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl" onClick={close}>
              <X size={20} />
            </button>
          </header>
          <div className="flex flex-1 flex-col items-center overflow-auto bg-[var(--cream)] p-4">
            <div className="mb-3 flex items-center gap-2 rounded-2xl bg-[var(--walnut)] px-2 py-1 text-[var(--cream)] shadow-xl">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-xl disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={20} />
              </button>
              <span className="min-w-28 text-center text-sm font-bold">
                Page {page} / {doc?.numPages ?? pdf.pageCount ?? '-'}
              </span>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-xl disabled:opacity-40"
                disabled={!doc || page >= doc.numPages}
                onClick={() => setPage((p) => Math.min(doc?.numPages ?? p, p + 1))}
              >
                <ChevronRight size={20} />
              </button>
            </div>
            {status && <div className="mb-3 rounded-full bg-[var(--paper-strong)] px-3 py-2 text-sm">{status}</div>}
            <canvas ref={canvasRef} className="max-w-full rounded-xl bg-white shadow-2xl" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function MarkdownEditor() {
  const markdownEditorId = useFieldnote((s) => s.markdownEditorId);
  const objects = useFieldnote((s) => s.objects);
  const saveMarkdown = useFieldnote((s) => s.saveMarkdown);
  const closeMarkdown = useFieldnote((s) => s.closeMarkdown);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const markdown = objects.find(
    (obj): obj is MarkdownObject => obj.id === markdownEditorId && obj.type === 'markdown',
  );
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (markdown) setDraft(markdown.content);
  }, [markdown]);

  const sections = useMemo(() => parseMarkdownSections(draft), [draft]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((section) => section.heading.toLowerCase().includes(q));
  }, [query, sections]);

  const jumpTo = (section: MarkdownSection) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(section.start, section.start);
    textarea.scrollTop = Math.max(0, (section.start / Math.max(draft.length, 1)) * textarea.scrollHeight - 80);
  };

  return (
    <AnimatePresence>
      {markdown && (
        <motion.div
          className="fixed inset-0 z-[75] flex items-end justify-center bg-black/40 p-3 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="dialog"
            aria-modal
            className="flex h-[min(88vh,760px)] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] bg-[var(--paper)] shadow-2xl"
            initial={{ y: 24, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 18, scale: 0.98 }}
          >
            <header className="flex items-center gap-3 bg-[var(--walnut)] px-4 py-3 text-[var(--cream)]">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold tracking-[0.08em] text-white/60">MARKDOWN</div>
                <h2 className="truncate text-lg font-bold">{markdown.name}</h2>
              </div>
              <button
                type="button"
                className="flex min-h-11 items-center gap-2 rounded-xl bg-[var(--clay-deep)] px-3 font-bold"
                onClick={() => saveMarkdown(markdown.id, draft)}
              >
                <Save size={16} />
                Save
              </button>
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl" onClick={closeMarkdown}>
                <X size={18} />
              </button>
            </header>
            <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
              <aside className="max-h-44 border-b border-black/5 bg-[var(--paper-strong)] p-3 sm:max-h-none sm:w-64 sm:border-b-0 sm:border-r">
                <label className="mb-2 flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2">
                  <Search size={15} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                    placeholder="Filter sections"
                  />
                </label>
                <div className="flex gap-2 overflow-x-auto sm:block sm:overflow-y-auto">
                  {filtered.map((section) => (
                    <button
                      key={`${section.heading}-${section.start}`}
                      type="button"
                      className="mb-2 min-h-10 shrink-0 rounded-xl bg-[var(--paper)] px-3 py-2 text-left text-sm font-semibold sm:block sm:w-full"
                      onClick={() => jumpTo(section)}
                    >
                      {section.heading}
                    </button>
                  ))}
                </div>
              </aside>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="min-h-0 flex-1 resize-none bg-[var(--cream)] p-4 font-mono text-sm leading-6 text-[var(--ink)] outline-none"
                spellCheck
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AudioPlayer() {
  const audioPlayerId = useFieldnote((s) => s.audioPlayerId);
  const objects = useFieldnote((s) => s.objects);
  const closeAudio = useFieldnote((s) => s.closeAudio);
  const audio = objects.find((obj): obj is AudioObject => obj.id === audioPlayerId && obj.type === 'audio');
  const audioRef = useRef<HTMLAudioElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!audio) {
      setSrc(null);
      return;
    }
    let cancelled = false;
    void resolveMediaSrc(audio.src).then((resolved) => {
      if (!cancelled) setSrc(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [audio]);

  if (!audio) return null;

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  return (
    <motion.div
      className="fixed bottom-[max(14px,var(--safe-bottom))] left-1/2 z-[70] w-[min(720px,calc(100vw-24px))] -translate-x-1/2 rounded-[22px] border border-white/15 bg-[var(--walnut)] p-3 text-[var(--cream)] shadow-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <audio
        ref={audioRef}
        src={src ?? undefined}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onEnded={() => setPlaying(false)}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--clay-deep)]"
          onClick={toggle}
        >
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold">{audio.name}</div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={Math.min(time, duration || time)}
            onChange={(e) => {
              const next = Number(e.target.value);
              setTime(next);
              if (audioRef.current) audioRef.current.currentTime = next;
            }}
            className="w-full accent-[var(--clay-deep)]"
          />
          <div className="text-[11px] text-white/60">
            {formatTime(time)} / {formatTime(duration)}
          </div>
        </div>
        <button type="button" className="flex h-11 w-11 items-center justify-center rounded-xl" onClick={closeAudio}>
          <X size={18} />
        </button>
      </div>
    </motion.div>
  );
}

function parseMarkdownSections(content: string): MarkdownSection[] {
  const matches = [...content.matchAll(/^##\s+(.+)$/gm)];
  if (!matches.length) return [{ heading: 'Document', start: 0, end: content.length }];

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    return {
      heading: match[1].trim() || 'Untitled section',
      start,
      end: matches[index + 1]?.index ?? content.length,
    };
  });
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
