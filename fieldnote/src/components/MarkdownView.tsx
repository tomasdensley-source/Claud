import React, { useMemo } from 'react';
import { Linking, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { colors } from '../theme';

type Block =
  | { kind: 'h'; level: 1 | 2 | 3; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'hr' };

type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'bold'; text: string }
  | { kind: 'italic'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'link'; text: string; href: string };

/** True when source looks like Markdown worth rendering. */
export function looksLikeMarkdown(source: string): boolean {
  const s = source.trim();
  if (!s) return false;
  return /(^|\n)#{1,3}\s|(^|\n)([-*+]|\d+\.)\s|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|(^|\n)>\s|(^|\n)---\s*$|\[.+\]\(.+\)/.test(
    s,
  );
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      blocks.push({ kind: 'hr' });
      i += 1;
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push({
        kind: 'h',
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2],
      });
      i += 1;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      const parts: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        parts.push(lines[i].trim().replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ kind: 'quote', text: parts.join(' ') });
      continue;
    }

    if (/^```/.test(trimmed)) {
      const parts: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        parts.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ kind: 'code', text: parts.join('\n') });
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
        i += 1;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }

    const parts: string[] = [trimmed];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,3}\s|[-*+]\s|\d+\.\s|>\s|```|---+)/.test(lines[i].trim())
    ) {
      parts.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ kind: 'p', text: parts.join(' ') });
  }

  return blocks;
}

function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  // Portable regex without lookbehind for Hermes:
  const simple =
    /\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/g;
  while ((match = simple.exec(text))) {
    if (match.index > last) {
      out.push({ kind: 'text', text: text.slice(last, match.index) });
    }
    if (match[1] != null || match[2] != null) {
      out.push({ kind: 'bold', text: match[1] ?? match[2] });
    } else if (match[3] != null || match[4] != null) {
      out.push({ kind: 'italic', text: match[3] ?? match[4] });
    } else if (match[5] != null) {
      out.push({ kind: 'code', text: match[5] });
    } else if (match[6] != null && match[7] != null) {
      out.push({ kind: 'link', text: match[6], href: match[7] });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  if (out.length === 0) out.push({ kind: 'text', text });
  return out;
}

function InlineText({
  text,
  baseStyle,
}: {
  text: string;
  baseStyle: TextStyle;
}) {
  const parts = useMemo(() => parseInline(text), [text]);
  return (
    <Text style={baseStyle}>
      {parts.map((part, idx) => {
        if (part.kind === 'bold') {
          return (
            <Text key={idx} style={styles.bold}>
              {part.text}
            </Text>
          );
        }
        if (part.kind === 'italic') {
          return (
            <Text key={idx} style={styles.italic}>
              {part.text}
            </Text>
          );
        }
        if (part.kind === 'code') {
          return (
            <Text key={idx} style={styles.inlineCode}>
              {part.text}
            </Text>
          );
        }
        if (part.kind === 'link') {
          return (
            <Text
              key={idx}
              style={styles.link}
              onPress={() => {
                void Linking.openURL(part.href).catch(() => undefined);
              }}
            >
              {part.text}
            </Text>
          );
        }
        return <Text key={idx}>{part.text}</Text>;
      })}
    </Text>
  );
}

interface Props {
  source: string;
  color?: string;
  fontSize?: number;
}

/** Renders a useful subset of Markdown for Fieldnote text cards. */
export function MarkdownView({ source, color = colors.ink, fontSize = 16 }: Props) {
  const blocks = useMemo(() => parseBlocks(source || ''), [source]);
  const base: TextStyle = { color, fontSize, lineHeight: fontSize * 1.45 };

  if (blocks.length === 0) {
    return <Text style={[base, styles.placeholder]}>Write something...</Text>;
  }

  return (
    <View style={styles.root}>
      {blocks.map((block, i) => {
        if (block.kind === 'hr') {
          return <View key={i} style={styles.hr} />;
        }
        if (block.kind === 'h') {
          const size =
            block.level === 1 ? fontSize * 1.55 : block.level === 2 ? fontSize * 1.3 : fontSize * 1.12;
          return (
            <InlineText
              key={i}
              text={block.text}
              baseStyle={{
                ...base,
                fontSize: size,
                lineHeight: size * 1.25,
                fontWeight: '700',
                marginBottom: 6,
                marginTop: i === 0 ? 0 : 4,
              }}
            />
          );
        }
        if (block.kind === 'quote') {
          return (
            <View key={i} style={styles.quote}>
              <InlineText
                text={block.text}
                baseStyle={{ ...base, color: colors.mutedInk, fontStyle: 'italic' }}
              />
            </View>
          );
        }
        if (block.kind === 'code') {
          return (
            <View key={i} style={styles.codeBlock}>
              <Text style={[styles.codeText, { fontSize: fontSize * 0.92 }]}>{block.text}</Text>
            </View>
          );
        }
        if (block.kind === 'ul' || block.kind === 'ol') {
          return (
            <View key={i} style={styles.list}>
              {block.items.map((item, j) => (
                <View key={j} style={styles.listRow}>
                  <Text style={[base, styles.bullet]}>
                    {block.kind === 'ol' ? `${j + 1}.` : '•'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <InlineText text={item} baseStyle={base} />
                  </View>
                </View>
              ))}
            </View>
          );
        }
        return <InlineText key={i} text={block.text} baseStyle={{ ...base, marginBottom: 8 }} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexShrink: 1,
  },
  placeholder: {
    color: colors.mutedInk,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  inlineCode: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(52,38,29,0.08)',
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  link: {
    color: colors.clayDeep,
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  hr: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(52,38,29,0.28)',
    marginVertical: 10,
  },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.clayDeep,
    paddingLeft: 10,
    marginBottom: 8,
  },
  codeBlock: {
    backgroundColor: 'rgba(36,28,23,0.92)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  codeText: {
    color: colors.cream,
    fontFamily: 'monospace',
  },
  list: {
    gap: 4,
    marginBottom: 8,
  },
  listRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    minWidth: 18,
    fontWeight: '700',
  },
});
