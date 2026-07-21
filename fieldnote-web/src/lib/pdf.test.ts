import { describe, expect, it } from 'vitest';
import { isPdfTooLarge, MAX_PDF_BYTES } from './pdf';

describe('pdf size guard', () => {
  it('rejects files over 250MB', () => {
    expect(isPdfTooLarge(MAX_PDF_BYTES)).toBe(false);
    expect(isPdfTooLarge(MAX_PDF_BYTES + 1)).toBe(true);
  });
});
