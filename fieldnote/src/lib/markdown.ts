// A small, dependency-free Markdown subset for text/task cards: headings,
// bullet/ordered lists, bold, italic, inline code, and links. Not a full
// CommonMark implementation — Fieldnote cards hold short-form notes, not
// documents, so block quotes, tables, and fenced code blocks are out of
// scope on purpose.

export type InlineSpan =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; href: string };

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3; spans: InlineSpan[] }
  | { type: 'listItem'; ordered: boolean; index?: number; spans: InlineSpan[] }
  | { type: 'paragraph'; spans: InlineSpan[] };

const INLINE_PATTERN =
  /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(_([^_]+)_)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;

export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let lastIndex = 0;
  INLINE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = INLINE_PATTERN.exec(text))) {
    if (match.index > lastIndex) {
      spans.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }
    if (match[1]) spans.push({ type: 'bold', text: match[2] });
    else if (match[3]) spans.push({ type: 'italic', text: match[4] });
    else if (match[5]) spans.push({ type: 'italic', text: match[6] });
    else if (match[7]) spans.push({ type: 'code', text: match[8] });
    else if (match[9]) spans.push({ type: 'link', text: match[10], href: match[11] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    spans.push({ type: 'text', text: text.slice(lastIndex) });
  }
  if (spans.length === 0) spans.push({ type: 'text', text: '' });
  return spans;
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.split('\n');
  const blocks: Block[] = [];
  let orderedIndex = 1;
  let prevWasOrdered = false;

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    if (line.trim() === '') {
      prevWasOrdered = false;
      return;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        type: 'heading',
        level: heading[1].length as 1 | 2 | 3,
        spans: parseInline(heading[2]),
      });
      prevWasOrdered = false;
      return;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      blocks.push({ type: 'listItem', ordered: false, spans: parseInline(bullet[1]) });
      prevWasOrdered = false;
      return;
    }

    const ordered = /^\d+\.\s+(.*)$/.exec(line);
    if (ordered) {
      if (!prevWasOrdered) orderedIndex = 1;
      blocks.push({
        type: 'listItem',
        ordered: true,
        index: orderedIndex,
        spans: parseInline(ordered[1]),
      });
      orderedIndex += 1;
      prevWasOrdered = true;
      return;
    }

    blocks.push({ type: 'paragraph', spans: parseInline(line) });
    prevWasOrdered = false;
  });

  return blocks;
}
