import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// ⚠️ TEMPORARY DIAGNOSTIC — not part of the real app.
//
// The bare-screen build proved the native shell is fine and the launch crash
// comes from app JS. This mounts the startup layers one at a time, on demand,
// so a single build can identify which layer is fatal instead of spending one
// ~16-minute build per suspect. Each stage is loaded lazily via require() at
// tap time — a stage's imports don't even execute until it's selected, so a
// module-level crash is attributed to the right stage.

type Stage = {
  key: string;
  label: string;
  detail: string;
  render: () => React.ReactNode;
};

const STAGES: Stage[] = [
  {
    key: 'gh',
    label: '1 · Gesture handler',
    detail: 'GestureHandlerRootView only',
    render: () => {
      const { GestureHandlerRootView } = require('react-native-gesture-handler');
      return (
        <GestureHandlerRootView style={styles.stageFill}>
          <StageOk name="GestureHandlerRootView" />
        </GestureHandlerRootView>
      );
    },
  },
  {
    key: 'safearea',
    label: '2 · Safe area',
    detail: '+ SafeAreaProvider',
    render: () => {
      const { GestureHandlerRootView } = require('react-native-gesture-handler');
      const { SafeAreaProvider } = require('react-native-safe-area-context');
      return (
        <GestureHandlerRootView style={styles.stageFill}>
          <SafeAreaProvider>
            <StageOk name="SafeAreaProvider" />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      );
    },
  },
  {
    key: 'reanimated',
    label: '3 · Reanimated',
    detail: 'A shared value + animated style (worklets)',
    render: () => {
      const ReanimatedProbe = require('./ReanimatedProbe').ReanimatedProbe;
      return <ReanimatedProbe />;
    },
  },
  {
    key: 'svg',
    label: '4 · SVG',
    detail: 'react-native-svg render',
    render: () => {
      const Svg = require('react-native-svg').default;
      const { Circle } = require('react-native-svg');
      return (
        <View style={styles.stageFill}>
          <Svg width={120} height={120}>
            <Circle cx={60} cy={60} r={50} fill="#e9b27f" />
          </Svg>
          <StageOk name="react-native-svg" />
        </View>
      );
    },
  },
  {
    key: 'store',
    label: '5 · Board store',
    detail: '+ BoardProvider (AsyncStorage hydration)',
    render: () => {
      const { GestureHandlerRootView } = require('react-native-gesture-handler');
      const { SafeAreaProvider } = require('react-native-safe-area-context');
      const { BoardProvider } = require('../store/BoardContext');
      return (
        <GestureHandlerRootView style={styles.stageFill}>
          <SafeAreaProvider>
            <BoardProvider>
              <StageOk name="BoardProvider" />
            </BoardProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      );
    },
  },
  {
    key: 'full',
    label: '6 · Full app',
    detail: 'The real Fieldnote app',
    render: () => {
      const RealApp = require('../../App').default;
      return <RealApp />;
    },
  },
];

function StageOk({ name }: { name: string }) {
  return (
    <View style={styles.okWrap}>
      <Text style={styles.okTitle}>{name} mounted OK</Text>
      <Text style={styles.okBody}>This layer is not the crash. Go back and try the next one.</Text>
    </View>
  );
}

export function StagedDiagnostic() {
  const [active, setActive] = useState<Stage | null>(null);

  if (active) {
    return (
      <View style={styles.stageRoot}>
        <View style={styles.stageContent}>{active.render()}</View>
        <Pressable style={styles.back} onPress={() => setActive(null)}>
          <Text style={styles.backText}>← Back to stage list</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Fieldnote — staged diagnostic</Text>
      <Text style={styles.intro}>
        Tap each one in order. Whichever one closes the app is the culprit — tell me its number.
        If a stage shows a green “mounted OK”, come back and try the next.
      </Text>
      {STAGES.map((s) => (
        <Pressable key={s.key} style={styles.card} onPress={() => setActive(s)}>
          <Text style={styles.cardLabel}>{s.label}</Text>
          <Text style={styles.cardDetail}>{s.detail}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#2a1c14' },
  content: { padding: 22, paddingTop: 64, gap: 12 },
  title: { color: '#ffd9a8', fontSize: 22, fontWeight: '800' },
  intro: { color: '#e8c9a6', fontSize: 14, lineHeight: 20, marginBottom: 6 },
  card: {
    backgroundColor: '#3b2a1e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#5a4231',
  },
  cardLabel: { color: '#ffd9a8', fontSize: 17, fontWeight: '700' },
  cardDetail: { color: '#c8ab92', fontSize: 13, marginTop: 3 },
  stageRoot: { flex: 1, backgroundColor: '#2a1c14' },
  stageContent: { flex: 1 },
  stageFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  okWrap: { padding: 24, alignItems: 'center', gap: 8 },
  okTitle: { color: '#9fe6a0', fontSize: 19, fontWeight: '800', textAlign: 'center' },
  okBody: { color: '#e8c9a6', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  back: {
    padding: 18,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#5a4231',
  },
  backText: { color: '#f0a35a', fontSize: 15, fontWeight: '700' },
});
