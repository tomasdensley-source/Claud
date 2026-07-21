import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

type StoredBlob = { id: string; data: ArrayBuffer; mime: string };

interface FieldnoteBlobDB extends DBSchema {
  boards: { key: string; value: unknown };
  files: { key: string; value: unknown };
  blobs: { key: string; value: StoredBlob };
}

const DB_NAME = 'fieldnote-v1';
const DB_VERSION = 1;
const BLOB_REF_PREFIX = 'blobref:';
const DEFAULT_MIME = 'application/octet-stream';

let dbPromise: Promise<IDBPDatabase<FieldnoteBlobDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<FieldnoteBlobDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains('boards')) {
          database.createObjectStore('boards', { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains('files')) {
          database.createObjectStore('files', { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains('blobs')) {
          database.createObjectStore('blobs', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

function randomBlobId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `blob-${crypto.randomUUID()}`;
  }
  return `blob-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const blobUrlCache: Map<string, string> = new Map();

export async function putBlob(id: string, data: ArrayBuffer, mime: string) {
  const database = await db();
  await database.put('blobs', { id, data, mime: mime || DEFAULT_MIME });
}

export async function getBlob(id: string): Promise<StoredBlob | undefined> {
  const database = await db();
  return database.get('blobs', id);
}

export async function deleteBlob(id: string) {
  const database = await db();
  await database.delete('blobs', id);
  revokeBlobUrl(id);
}

export async function resolveBlobUrl(id: string): Promise<string | null> {
  const cached = blobUrlCache.get(id);
  if (cached) return cached;

  const stored = await getBlob(id);
  if (!stored) return null;

  const url = URL.createObjectURL(new Blob([stored.data], { type: stored.mime }));
  blobUrlCache.set(id, url);
  return url;
}

export function revokeBlobUrl(id: string) {
  const url = blobUrlCache.get(id);
  if (!url) return;

  URL.revokeObjectURL(url);
  blobUrlCache.delete(id);
}

export async function storeFileAsBlob(
  file: File,
): Promise<{ id: string; url: string; mime: string; size: number; name: string }> {
  const id = randomBlobId();
  const data = await file.arrayBuffer();
  const mime = file.type || DEFAULT_MIME;

  await putBlob(id, data, mime);

  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  blobUrlCache.set(id, url);

  return { id, url, mime, size: file.size, name: file.name };
}

export function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
}

export function isBlobRef(src: string): boolean {
  return src.startsWith(BLOB_REF_PREFIX);
}

export function toBlobRef(id: string): string {
  return `${BLOB_REF_PREFIX}${id}`;
}

export function parseBlobRef(src: string): string | null {
  if (!isBlobRef(src)) return null;

  const id = src.slice(BLOB_REF_PREFIX.length);
  return id ? id : null;
}

export async function resolveMediaSrc(src: string): Promise<string> {
  const id = parseBlobRef(src);
  if (!id) return src;

  return (await resolveBlobUrl(id)) ?? src;
}
