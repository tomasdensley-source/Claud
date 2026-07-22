import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { ModalShell } from './panels/ModalShell';
import { colors, radii } from '../theme';
import { hapticSelection } from '../lib/haptics';

const SEEN_KEY = 'fieldnote.whatsNew.1.6.2';

const TIPS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'hand-left-outline',
    title: 'One-finger pan',
    body: 'Drag empty space to move the board — like a map. Pinch to zoom.',
  },
  {
    icon: 'resize-outline',
    title: 'Move the toolbar',
    body: 'Grab the dotted grip at the top of the left rail and snap it to either edge.',
  },
  {
    icon: 'create-outline',
    title: 'Double-tap for a note',
    body: 'Double-tap empty canvas to drop a Markdown note where your finger is.',
  },
  {
    icon: 'git-commit-outline',
    title: 'Water-flow tasks',
    body: 'Hold a task 3 seconds to complete. Open dependencies glow with a flowing stroke.',
  },
];

type Props = {
  /** Force show (e.g. from More → What’s new). */
  force?: boolean;
  onCloseForce?: () => void;
};

/** One-time 1.6.1 primer so upgrades are feelable on first open. */
export function WhatsNewSheet({ force = false, onCloseForce }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (force) {
      setVisible(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const seen = await AsyncStorage.getItem(SEEN_KEY);
        if (!cancelled && seen !== '1') setVisible(true);
      } catch {
        if (!cancelled) setVisible(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [force]);

  const dismiss = () => {
    void hapticSelection();
    setVisible(false);
    void AsyncStorage.setItem(SEEN_KEY, '1').catch(() => undefined);
    onCloseForce?.();
  };

  return (
    <ModalShell
      visible={visible}
      onClose={dismiss}
      eyebrow="FIELDNOTE 1.6.2"
      title="Try these on the board"
      subtitle="Finish Line build — pan, resize, water-flow tasks, and a toolbar you can move."
      icon="sparkles-outline"
      wide
    >
      <View style={styles.list}>
        {TIPS.map((tip) => (
          <View key={tip.title} style={styles.row}>
            <View style={styles.iconWrap}>
              <Ionicons name={tip.icon} size={20} color={colors.clayDeep} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{tip.title}</Text>
              <Text style={styles.body}>{tip.body}</Text>
            </View>
          </View>
        ))}
      </View>
      <Pressable style={styles.cta} onPress={dismiss} accessibilityLabel="Got it">
        <Text style={styles.ctaText}>Got it — open the board</Text>
      </Pressable>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(203,125,70,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  body: {
    color: colors.mutedInk,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  cta: {
    backgroundColor: colors.walnut,
    borderRadius: radii.control,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: {
    color: colors.cream,
    fontWeight: '700',
    fontSize: 15,
  },
});
