/** PDF helpers — soft, no native PDF module required. */

export function isPdfAsset(name?: string | null, mimeType?: string | null): boolean {
  const mime = (mimeType ?? '').toLowerCase();
  if (mime.includes('pdf')) return true;
  return /\.pdf$/i.test(name ?? '');
}

/** Rough page estimate when metadata is missing (keeps cover UI honest). */
export function estimatePdfPages(sizeBytes?: number | null): number {
  if (!sizeBytes || sizeBytes <= 0) return 1;
  // ~45KB/page average for text-ish PDFs; clamp to a readable range.
  return Math.max(1, Math.min(240, Math.round(sizeBytes / 45000)));
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
