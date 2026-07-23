// ⚠️ TEMPORARY DIAGNOSTIC BUILD — not the real app.
// Bare screen with zero app code, no providers, no reanimated/gesture-handler/
// context, to isolate whether the launch crash is in the native build itself
// or in the app's JavaScript. The real App.tsx is restored right after this
// diagnostic (backed up in the session scratchpad and in git history).
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Fieldnote — diagnostic build</Text>
      <Text style={styles.body}>
        If you can read this, the native build works and the crash is in the app
        code (something to isolate next). If this screen also crashes, the crash
        is in the native build/config itself.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#2a1c14',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 16,
  },
  title: {
    color: '#ffd9a8',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: '#e8c9a6',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
