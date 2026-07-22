import assert from 'node:assert/strict';
import { test } from 'node:test';

// Lightweight inline copy of parse helpers — import from built module via relative path after tsc.
// For the project test runner we compile MarkdownView is React; test the pure helpers here.

function looksLikeMarkdown(source: string): boolean {
  const s = source.trim();
  if (!s) return false;
  return /(^|\n)#{1,3}\s|(^|\n)([-*+]|\d+\.)\s|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|(^|\n)>\s|(^|\n)---\s*$|\[.+\]\(.+\)/.test(
    s,
  );
}

test('detects headings and lists as markdown', () => {
  assert.equal(looksLikeMarkdown('# Hello'), true);
  assert.equal(looksLikeMarkdown('- one\n- two'), true);
  assert.equal(looksLikeMarkdown('plain sentence'), false);
  assert.equal(looksLikeMarkdown('Keep it **useful**.'), true);
});
