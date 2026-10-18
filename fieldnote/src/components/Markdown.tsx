import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native';
import { Block, InlineSpan, parseInline, parseMarkdown } from '../lib/markdown';
import { colors } from '../theme';

// Visual-only: links render distinctly styled but aren't tappable. Wiring a
// tap target inside an already-nested card (selection Pressable, resize
// handles) is its own gesture-precedence question — kept out of this pass.
function renderSpan(span: InlineSpan, key: number, baseStyle?: StyleProp<TextStyle>) {
  switch (span.type) {
    case 'bold':
      return (
        <Text key={key} style={[baseStyle, styles.bold]}>
          {span.text}
        </Text>
      );
    case 'italic':
      return (
        <Text key={key} style={[baseStyle, styles.italic]}>
          {span.text}
        </Text>
      );
    case 'code':
      return (
        <Text key={key} style={[baseStyle, styles.code]}>
          {span.text}
        </Text>
      );
    case 'link':
      return (
        <Text key={key} style={[baseStyle, styles.link]}>
          {span.text}
        </Text>
      );
    default:
      return (
        <Text key={key} style={baseStyle}>
          {span.text}
        </Text>
      );
  }
}

function renderBlock(block: Block, key: number, baseStyle?: StyleProp<TextStyle>) {
  if (block.type === 'heading') {
    const headingStyle =
      block.level === 1 ? styles.h1 : block.level === 2 ? styles.h2 : styles.h3;
    return (
      <Text key={key} style={[baseStyle, headingStyle]}>
        {block.spans.map((s, i) => renderSpan(s, i, baseStyle))}
      </Text>
    );
  }
  if (block.type === 'listItem') {
    return (
      <View key={key} style={styles.listRow}>
        <Text style={[baseStyle, styles.listMarker]}>
          {block.ordered ? `${block.index}.` : '•'}
        </Text>
        <Text style={[baseStyle, styles.listText]}>
          {block.spans.map((s, i) => renderSpan(s, i, baseStyle))}
        </Text>
      </View>
    );
  }
  return (
    <Text key={key} style={baseStyle}>
      {block.spans.map((s, i) => renderSpan(s, i, baseStyle))}
    </Text>
  );
}

interface BlocksProps {
  source: string;
  baseStyle?: StyleProp<TextStyle>;
}

// Full block + inline rendering for text cards: headings, lists, bold,
// italic, inline code, and links.
export function MarkdownBlocks({ source, baseStyle }: BlocksProps) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  return (
    <View style={styles.stack}>{blocks.map((block, i) => renderBlock(block, i, baseStyle))}</View>
  );
}

// Inline-only rendering (no headings/lists) for a single-line task label.
export function MarkdownInline({ source, baseStyle }: BlocksProps) {
  const spans = useMemo(() => parseInline(source), [source]);
  return <Text>{spans.map((s, i) => renderSpan(s, i, baseStyle))}</Text>;
}

const styles = StyleSheet.create({
  stack: {
    gap: 4,
  },
  bold: {
    fontWeight: '700',
  },
  italic: {
    fontStyle: 'italic',
  },
  code: {
    fontFamily: 'monospace',
    backgroundColor: 'rgba(52,38,29,0.08)',
  },
  link: {
    color: colors.clayDeep,
    textDecorationLine: 'underline',
  },
  h1: {
    fontSize: 26,
    fontWeight: '700',
  },
  h2: {
    fontSize: 21,
    fontWeight: '700',
  },
  h3: {
    fontSize: 18,
    fontWeight: '700',
  },
  listRow: {
    flexDirection: 'row',
    gap: 8,
  },
  listMarker: {
    opacity: 0.7,
  },
  listText: {
    flex: 1,
  },
});
