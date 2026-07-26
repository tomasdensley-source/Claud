import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

// Deliberately built from plain React Native primitives only — no reanimated,
// no svg, no context — so the fallback can render even if one of those is the
// thing that crashed. Turns a JS render/lifecycle crash (which would otherwise
// force-close the app) into an on-screen, screenshot-able error report.
interface State {
  error: Error | null;
  info: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Also goes to logcat (`adb logcat`) for anyone who can capture it.
    console.error('Fieldnote crashed:', error, info.componentStack);
    this.setState({ error, info });
  }

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Fieldnote hit an error</Text>
          <Text style={styles.hint}>
            Screenshot this whole screen and send it — it says exactly what broke.
          </Text>
          <Text style={styles.label}>{error.name || 'Error'}</Text>
          <Text style={styles.message}>{error.message || String(error)}</Text>
          {error.stack ? (
            <>
              <Text style={styles.label}>Stack</Text>
              <Text style={styles.mono}>{error.stack}</Text>
            </>
          ) : null}
          {info?.componentStack ? (
            <>
              <Text style={styles.label}>Component stack</Text>
              <Text style={styles.mono}>{info.componentStack}</Text>
            </>
          ) : null}
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#2a1c14',
  },
  content: {
    padding: 20,
    paddingTop: 60,
    gap: 10,
  },
  title: {
    color: '#ffd9a8',
    fontSize: 22,
    fontWeight: '800',
  },
  hint: {
    color: '#e8c9a6',
    fontSize: 14,
    marginBottom: 8,
  },
  label: {
    color: '#f0a35a',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  message: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  mono: {
    color: '#d8c4b4',
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
});
