import type { PDFDocumentLoadingTask, RenderTask } from 'pdfjs-dist';

export const MAX_PDF_BYTES = 250 * 1024 * 1024;

type PdfCoverResult = {
  coverDataUrl: string;
  pageCount: number;
};

type PdfSource = string | ArrayBuffer | Blob;
type PdfDocumentData = { data: ArrayBuffer } | { url: string };

const coverCache = new Map<PdfSource, Map<number, PdfCoverResult>>();
const activePdfJobs = new Map<string, AbortController>();

let pdfJobSeq = 0;

export function isPdfTooLarge(size: number): boolean {
  return size > MAX_PDF_BYTES;
}

export function cancelPdfJobs(jobId?: string): void {
  if (jobId) {
    const controller = activePdfJobs.get(jobId);
    controller?.abort();
    activePdfJobs.delete(jobId);
    return;
  }

  activePdfJobs.forEach((controller) => controller.abort());
  activePdfJobs.clear();
}

export async function generatePdfCover(
  src: PdfSource,
  opts: { jobId?: string; maxEdge?: number } = {},
): Promise<PdfCoverResult | null> {
  const maxEdge = Math.max(1, opts.maxEdge ?? 512);

  if (src instanceof Blob && isPdfTooLarge(src.size)) return null;
  if (src instanceof ArrayBuffer && isPdfTooLarge(src.byteLength)) return null;

  const cached = coverCache.get(src)?.get(maxEdge);
  if (cached) return cached;

  const jobId = opts.jobId ?? `pdf-${++pdfJobSeq}`;
  const controller = new AbortController();
  cancelPdfJobs(jobId);
  activePdfJobs.set(jobId, controller);

  const { signal } = controller;
  let loadingTask: PDFDocumentLoadingTask | null = null;
  let renderTask: RenderTask | null = null;
  const abortRender = () => {
    renderTask?.cancel();
    destroyLoadingTask(loadingTask);
  };
  signal.addEventListener('abort', abortRender);

  try {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

    if (signal.aborted) return null;

    const data = await pdfData(src, signal);
    if (signal.aborted) return null;

    loadingTask = pdfjs.getDocument(data);
    const doc = await loadingTask.promise;

    if (signal.aborted) return null;

    const page = await doc.getPage(1);
    if (signal.aborted) return null;

    const viewportAtScaleOne = page.getViewport({ scale: 1 });
    const scale = Math.min(1, maxEdge / Math.max(viewportAtScaleOne.width, viewportAtScaleOne.height));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) return null;

    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));

    renderTask = page.render({ canvas, canvasContext, viewport });
    await renderTask.promise;

    if (signal.aborted) return null;

    const result = {
      coverDataUrl: canvas.toDataURL('image/jpeg', 0.72),
      pageCount: doc.numPages,
    };
    setCachedCover(src, maxEdge, result);
    return result;
  } catch {
    return null;
  } finally {
    signal.removeEventListener('abort', abortRender);
    if (activePdfJobs.get(jobId) === controller) activePdfJobs.delete(jobId);
    destroyLoadingTask(loadingTask);
  }
}

async function pdfData(src: PdfSource, signal: AbortSignal): Promise<PdfDocumentData> {
  if (typeof src === 'string') return { url: src };
  if (src instanceof ArrayBuffer) return { data: src.slice(0) };

  const data = await src.arrayBuffer();
  if (signal.aborted) throw new DOMException('PDF job cancelled', 'AbortError');
  if (isPdfTooLarge(data.byteLength)) throw new Error('PDF is too large');
  return { data };
}

function setCachedCover(src: PdfSource, maxEdge: number, result: PdfCoverResult): void {
  const bySize = coverCache.get(src) ?? new Map<number, PdfCoverResult>();
  bySize.set(maxEdge, result);
  coverCache.set(src, bySize);
}

function destroyLoadingTask(loadingTask: PDFDocumentLoadingTask | null): void {
  void loadingTask?.destroy().catch(() => undefined);
}
