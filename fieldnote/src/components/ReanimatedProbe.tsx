import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

// ⚠️ TEMPORARY DIAGNOSTIC — exercises the exact Reanimated surface the real
// canvas uses (shared value + animated style + worklet-driven timing) in
// isolation, so a native worklets crash shows up here rather than being
// hidden behind the rest of the app.
export function ReanimatedProbe() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: 600 });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + progress.value * 0.65,
    transform: [{ scale: 0.8 + progress.value * 0.2 }],
  }));

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.box, animatedStyle]} />
      <Text style={styles.title}>Reanimated mounted OK</Text>
      <Text style={styles.body}>
        If the square faded/scaled in, worklets run fine. This layer is not the crash.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  box: { width: 90, height: 90, borderRadius: 18, backgroundColor: '#edb64a' },
  title: { color: '#9fe6a0', fontSize: 19, fontWeight: '800', textAlign: 'center' },
  body: { color: '#e8c9a6', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
