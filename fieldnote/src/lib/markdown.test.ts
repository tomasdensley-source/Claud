import assert from 'node:assert/strict';
import test from 'node:test';
import { parseInline, parseMarkdown } from './markdown';

test('parseInline passes plain text through unchanged', () => {
  assert.deepEqual(parseInline('just words'), [{ type: 'text', text: 'just words' }]);
});

test('parseInline finds bold, italic, code, and links', () => {
  const spans = parseInline('a **bold** b *it* c _also it_ d `code` e [link](https://x.test)');
  assert.deepEqual(spans, [
    { type: 'text', text: 'a ' },
    { type: 'bold', text: 'bold' },
    { type: 'text', text: ' b ' },
    { type: 'italic', text: 'it' },
    { type: 'text', text: ' c ' },
    { type: 'italic', text: 'also it' },
    { type: 'text', text: ' d ' },
    { type: 'code', text: 'code' },
    { type: 'text', text: ' e ' },
    { type: 'link', text: 'link', href: 'https://x.test' },
  ]);
});

test('parseMarkdown recognizes headings level 1-3', () => {
  const blocks = parseMarkdown('# One\n## Two\n### Three');
  assert.equal(blocks.length, 3);
  assert.deepEqual(
    blocks.map((b) => (b.type === 'heading' ? b.level : null)),
    [1, 2, 3],
  );
});

test('parseMarkdown recognizes bullet lists', () => {
  const blocks = parseMarkdown('- first\n* second');
  assert.equal(blocks.length, 2);
  blocks.forEach((b) => assert.equal(b.type === 'listItem' && !b.ordered, true));
});

test('parseMarkdown auto-numbers ordered lists by position', () => {
  const blocks = parseMarkdown('5. first\n7. second\n9. third');
  const indices = blocks.map((b) => (b.type === 'listItem' ? b.index : null));
  assert.deepEqual(indices, [1, 2, 3]);
});

test('parseMarkdown restarts ordered-list numbering after a non-list line', () => {
  const blocks = parseMarkdown('1. a\n2. b\n\nplain\n\n1. c');
  const orderedIndices = blocks
    .filter((b) => b.type === 'listItem')
    .map((b) => (b.type === 'listItem' ? b.index : null));
  assert.deepEqual(orderedIndices, [1, 2, 1]);
});

test('parseMarkdown treats plain lines as paragraphs', () => {
  const blocks = parseMarkdown('hello\n\nworld');
  assert.equal(blocks.length, 2);
  assert.ok(blocks.every((b) => b.type === 'paragraph'));
});

test('parseMarkdown handles an empty string', () => {
  assert.deepEqual(parseMarkdown(''), []);
});
