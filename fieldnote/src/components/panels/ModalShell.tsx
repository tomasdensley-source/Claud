import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '../../theme';

interface Props {
  visible: boolean;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  /** center = classic modal; edge = bottom sheet (default). */
  variant?: 'center' | 'edge';
}

export function ModalShell({
  visible,
  title,
  subtitle,
  eyebrow,
  icon = 'sparkles-outline',
  onClose,
  children,
  wide,
  variant = 'edge',
}: Props) {
  const edge = variant === 'edge';
  return (
    <Modal
      visible={visible}
      transparent
      animationType={edge ? 'slide' : 'fade'}
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, edge ? styles.backdropEdge : styles.backdropCenter]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.card,
            edge ? styles.cardEdge : styles.cardCenter,
            wide && styles.wide,
            shadows.control,
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name={icon} size={18} color={colors.cream} />
              <View style={{ flex: 1 }}>
                {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.close} accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={colors.cream} />
            </Pressable>
          </View>
          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  backdropCenter: {
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 16,
  },
  backdropEdge: {
    backgroundColor: 'rgba(28,22,18,0.22)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: colors.paper,
    overflow: 'hidden',
    width: '100%',
  },
  cardCenter: {
    borderRadius: radii.modal,
    maxHeight: '88%',
    alignSelf: 'center',
    maxWidth: 520,
  },
  cardEdge: {
    borderTopLeftRadius: radii.modal,
    borderTopRightRadius: radii.modal,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    maxHeight: '88%',
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
  wide: {
    maxWidth: 640,
  },
  header: {
    backgroundColor: colors.walnut,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  eyebrow: {
    color: 'rgba(255,250,240,0.65)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  title: {
    color: colors.cream,
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: 'rgba(255,250,240,0.72)',
    fontSize: 13,
    marginTop: 2,
  },
  close: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    maxHeight: 520,
  },
  bodyContent: {
    padding: 16,
    gap: 14,
  },
});
