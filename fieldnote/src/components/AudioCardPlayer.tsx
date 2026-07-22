import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../theme';
import { hapticSelection } from '../lib/haptics';

type Props = {
  title: string;
  uri: string;
  coverUri?: string;
};

type AudioModule = {
  createAudioPlayer?: (source: { uri: string }) => {
    play: () => void;
    pause: () => void;
    release?: () => void;
    playing?: boolean;
    addListener?: (event: string, cb: (status: { playing?: boolean; didJustFinish?: boolean }) => void) => { remove: () => void };
  };
  setAudioModeAsync?: (mode: Record<string, unknown>) => Promise<void>;
};

/** Soft-require expo-audio so a missing native module never kills launch. */
function getAudio(): AudioModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-audio') as AudioModule;
  } catch {
    return null;
  }
}

export function AudioCardPlayer({ title, uri }: Props) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = React.useRef<any>(null);
  const subRef = React.useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    return () => {
      try {
        subRef.current?.remove();
        playerRef.current?.pause?.();
        playerRef.current?.release?.();
      } catch {
        // ignore cleanup errors
      }
      subRef.current = null;
      playerRef.current = null;
    };
  }, []);

  const toggle = async () => {
    void hapticSelection();
    const Audio = getAudio();
    if (!Audio?.createAudioPlayer) {
      setError('Audio unavailable on this build');
      return;
    }
    try {
      if (!playerRef.current) {
        await Audio.setAudioModeAsync?.({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
        });
        const player = Audio.createAudioPlayer({ uri });
        playerRef.current = player;
        subRef.current =
          player.addListener?.('playbackStatusUpdate', (status) => {
            if (status.didJustFinish) setPlaying(false);
            if (typeof status.playing === 'boolean') setPlaying(status.playing);
          }) ?? null;
      }
      const player = playerRef.current;
      if (!player) return;
      if (playing) {
        player.pause();
        setPlaying(false);
      } else {
        player.play();
        setPlaying(true);
      }
      setError(null);
    } catch (e) {
      setError(String(e));
      setPlaying(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.play} onPress={() => void toggle()} accessibilityLabel={playing ? 'Pause' : 'Play'}>
        <Ionicons name={playing ? 'pause' : 'play'} size={22} color={colors.cream} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.meta}>{error ?? (playing ? 'Playing' : 'Audio')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 4,
  },
  play: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.clayDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  meta: { color: colors.mutedInk, fontSize: 12, marginTop: 2 },
});
