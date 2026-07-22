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

/** Soft-require expo-av so launch never dies if native module is missing. */
function getAudio(): typeof import('expo-av') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-av') as typeof import('expo-av');
  } catch {
    return null;
  }
}

export function AudioCardPlayer({ title, uri }: Props) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const soundRef = React.useRef<any>(null);

  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync?.().catch(() => undefined);
      soundRef.current = null;
    };
  }, []);

  const toggle = async () => {
    void hapticSelection();
    const AV = getAudio();
    if (!AV?.Audio) {
      setError('Audio unavailable on this build');
      return;
    }
    try {
      if (!soundRef.current) {
        await AV.Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
        const { sound } = await AV.Audio.Sound.createAsync({ uri });
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status: { isLoaded?: boolean; didJustFinish?: boolean; isPlaying?: boolean }) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) setPlaying(false);
          if (typeof status.isPlaying === 'boolean') setPlaying(status.isPlaying);
        });
      }
      const sound = soundRef.current;
      if (!sound) return;
      if (playing) {
        await sound.pauseAsync();
        setPlaying(false);
      } else {
        await sound.playAsync();
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
