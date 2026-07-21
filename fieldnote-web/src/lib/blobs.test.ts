import { describe, expect, it } from 'vitest';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  isBlobRef,
  parseBlobRef,
  toBlobRef,
} from './blobs';

describe('blob refs', () => {
  it('round-trips blobref ids', () => {
    expect(toBlobRef('abc')).toBe('blobref:abc');
    expect(isBlobRef('blobref:abc')).toBe(true);
    expect(parseBlobRef('blobref:abc')).toBe('abc');
    expect(parseBlobRef('https://example.com')).toBeNull();
  });

  it('round-trips base64 array buffers', () => {
    const bytes = new Uint8Array([1, 2, 3, 250, 255]).buffer;
    const b64 = arrayBufferToBase64(bytes);
    const back = new Uint8Array(base64ToArrayBuffer(b64));
    expect([...back]).toEqual([1, 2, 3, 250, 255]);
  });
});
