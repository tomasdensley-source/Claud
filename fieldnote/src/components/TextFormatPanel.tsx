import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useBoard } from '../store/BoardContext';
import { colors, radii, shadows } from '../theme';
import { hapticSelection } from '../lib/haptics';

/**
 * Compact top-right text formatting panel (blueprint).
 * Progressive disclosure — only when a text/task/mindmap is selected.
 */
export function TextFormatPanel() {
  const { currentBoard, selectedIds, updateItems, applyColorToSelected } = useBoard();
  const selected = currentBoard.items.filter((it) => selectedIds.includes(it.id));
  const editable = selected.filter(
    (it) => it.type === 'text' || it.type === 'task' || it.type === 'mindmap',
  );
  if (editable.length === 0) return null;

  const primary = editable[0];
  const fontSize = primary.type === 'text' ? primary.fontSize : 16;
  const weight = primary.type === 'text' ? primary.fontWeight ?? '400' : '600';
  const mixedSize =
    editable.some((it) => it.type === 'text' && it.fontSize !== fontSize) ||
    editable.some((it) => it.type !== 'text');

  const bumpSize = (delta: number) => {
    void hapticSelection();
    updateItems((items) =>
      items.map((it) => {
        if (!selectedIds.includes(it.id) || it.type !== 'text') return it;
        return { ...it, fontSize: Math.max(12, Math.min(72, it.fontSize + delta)) };
      }),
    );
  };

  const toggleBold = () => {
    void hapticSelection();
    updateItems((items) =>
      items.map((it) => {
        if (!selectedIds.includes(it.id) || it.type !== 'text') return it;
        const next = it.fontWeight === '700' ? '400' : '700';
        return { ...it, fontWeight: next };
      }),
    );
  };

  const setRole = (role: 'title' | 'body' | 'note') => {
    void hapticSelection();
    updateItems((items) =>
      items.map((it) => {
        if (!selectedIds.includes(it.id) || it.type !== 'text') return it;
        const size = role === 'title' ? 36 : role === 'body' ? 22 : 18;
        return { ...it, role, fontSize: size, fontWeight: role === 'title' ? '600' : it.fontWeight };
      }),
    );
  };

  const wrapMarkdown = (prefix: string, suffix = prefix) => {
    void hapticSelection();
    updateItems((items) =>
      items.map((it) => {
        if (!selectedIds.includes(it.id)) return it;
        if (it.type !== 'text' && it.type !== 'task' && it.type !== 'mindmap') return it;
        const text = it.text ?? '';
        const next = `${prefix}${text}${suffix}`;
        if (it.type === 'text') return { ...it, text: next, markdown: true };
        return { ...it, text: next };
      }),
    );
  };

  const prefixLines = (marker: string) => {
    void hapticSelection();
    updateItems((items) =>
      items.map((it) => {
        if (!selectedIds.includes(it.id)) return it;
        if (it.type !== 'text' && it.type !== 'task') return it;
        const text = (it.text ?? '')
          .split('\n')
          .map((line) => (line.trim() ? `${marker}${line}` : line))
          .join('\n');
        if (it.type === 'text') return { ...it, text, markdown: true };
        return { ...it, text };
      }),
    );
  };

  return (
    <View style={[styles.wrap, shadows.control]} pointerEvents="box-none">
      <Text style={styles.label}>Format{editable.length > 1 ? ` · ${editable.length}` : ''}</Text>
      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={() => bumpSize(-2)} accessibilityLabel="Smaller text">
          <Text style={styles.btnText}>A−</Text>
        </Pressable>
        <Text style={styles.meta}>{mixedSize ? '—' : fontSize}</Text>
        <Pressable style={styles.btn} onPress={() => bumpSize(2)} accessibilityLabel="Larger text">
          <Text style={styles.btnText}>A+</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, weight === '700' && styles.btnActive]}
          onPress={toggleBold}
          accessibilityLabel="Bold"
        >
          <Text style={[styles.btnText, { fontWeight: '800' }]}>B</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => wrapMarkdown('**')} accessibilityLabel="Markdown bold">
          <Text style={styles.btnText}>** </Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => wrapMarkdown('_')} accessibilityLabel="Markdown italic">
          <Text style={[styles.btnText, { fontStyle: 'italic' }]}>I</Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        {(['title', 'body', 'note'] as const).map((role) => (
          <Pressable key={role} style={styles.chip} onPress={() => setRole(role)}>
            <Text style={styles.chipText}>{role}</Text>
          </Pressable>
        ))}
        <Pressable style={styles.chip} onPress={() => prefixLines('- ')} accessibilityLabel="Bullet list">
          <Text style={styles.chipText}>List</Text>
        </Pressable>
        <Pressable style={styles.chip} onPress={() => prefixLines('- [ ] ')} accessibilityLabel="Checklist">
          <Text style={styles.chipText}>Todo</Text>
        </Pressable>
        <Pressable
          style={styles.chip}
          onPress={() => {
            void hapticSelection();
            applyColorToSelected(colors.ink, 'body');
          }}
          accessibilityLabel="Ink body color"
        >
          <Ionicons name="color-fill-outline" size={14} color={colors.cream} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 58,
    right: 12,
    zIndex: 45,
    backgroundColor: colors.walnut,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 8,
    gap: 6,
    maxWidth: 260,
  },
  label: {
    color: 'rgba(255,248,233,0.65)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  btn: {
    minWidth: 34,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
  },
  btnActive: {
    backgroundColor: 'rgba(196,120,66,0.55)',
  },
  btnText: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 13,
  },
  meta: {
    color: colors.cream,
    fontWeight: '600',
    fontSize: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  chip: {
    paddingHorizontal: 8,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipText: {
    color: colors.cream,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
