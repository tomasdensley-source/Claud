import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GoGame, BLACK, WHITE, ScoreResult } from './src/game/GoGame';
import GoBoard from './src/components/GoBoard';
import { theme } from './src/theme';

const SIZES = [9, 13, 19] as const;
const KOMI = 6.5;

export default function App() {
  // The game instance is mutable and persists across renders.
  const gameRef = useRef(new GoGame(19, KOMI));
  const game = gameRef.current;

  // A monotonically increasing counter forces re-render after mutations.
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const [status, setStatus] = useState('Black to play. Tap an intersection.');
  const [finalScore, setFinalScore] = useState<ScoreResult | null>(null);

  const { width, height } = useWindowDimensions();
  const boardPx = useMemo(() => {
    const horizontal = Math.min(width - 24, 520);
    const vertical = height * 0.62;
    return Math.max(260, Math.floor(Math.min(horizontal, vertical)));
  }, [width, height]);

  const handlePlay = useCallback(
    (x: number, y: number) => {
      if (finalScore) return;
      const res = game.playMove(x, y);
      if (!res.ok) {
        setStatus(res.reason ?? 'Illegal move.');
        return;
      }
      const captured = res.captured ?? 0;
      const justMoved = game.toMove === BLACK ? 'White' : 'Black';
      setStatus(
        captured > 0
          ? `${justMoved} captured ${captured} stone${captured > 1 ? 's' : ''}.`
          : `${game.toMove === BLACK ? 'Black' : 'White'} to play.`
      );
      bump();
    },
    [game, bump, finalScore]
  );

  const handlePass = useCallback(() => {
    if (finalScore) return;
    const res = game.pass();
    if (!res.ok) {
      setStatus(res.reason ?? 'Cannot pass.');
      return;
    }
    if (res.gameOver) {
      const s = game.score();
      setFinalScore(s);
      setStatus(
        s.winner === 'Draw'
          ? 'Two passes — the game is a draw.'
          : `Two passes — ${s.winner} wins.`
      );
    } else {
      setStatus(`${game.toMove === BLACK ? 'Black' : 'White'} to play (opponent passed).`);
    }
    bump();
  }, [game, bump, finalScore]);

  const handleUndo = useCallback(() => {
    const res = game.undo();
    if (!res.ok) {
      setStatus(res.reason ?? 'Nothing to undo.');
      return;
    }
    setFinalScore(null);
    setStatus(`${game.toMove === BLACK ? 'Black' : 'White'} to play.`);
    bump();
  }, [game, bump]);

  const handleScore = useCallback(() => {
    const s = game.score();
    setFinalScore(s);
    setStatus(
      s.winner === 'Draw'
        ? `Estimated score — draw (${s.black} : ${s.white}).`
        : `Estimated score — ${s.winner} leads.`
    );
    bump();
  }, [game, bump]);

  const newGame = useCallback(
    (size: number) => {
      game.reset(size, KOMI);
      setFinalScore(null);
      setStatus('New game — Black to play.');
      bump();
    },
    [game, bump]
  );

  const live = useMemo(() => game.score(), [version]); // recompute each move
  void version; // GoBoard reads cells directly; version triggers re-render

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Go</Text>
          <Text style={styles.subtitle}>圍棋 · 囲碁 · 바둑</Text>

          {/* Turn + score header */}
          <View style={styles.headerRow}>
            <PlayerBadge
              label="Black"
              active={game.toMove === BLACK && !finalScore}
              captures={game.captures[BLACK]}
              score={finalScore ? finalScore.black : live.black}
              dark
            />
            <PlayerBadge
              label="White"
              active={game.toMove === WHITE && !finalScore}
              captures={game.captures[WHITE]}
              score={finalScore ? finalScore.white : live.white}
            />
          </View>

          <View style={styles.boardCenter}>
            <GoBoard game={game} size={boardPx} version={version} onPlay={handlePlay} />
          </View>

          <Text style={styles.status}>{status}</Text>

          {finalScore && (
            <View style={styles.resultCard}>
              <Text style={styles.resultTitle}>
                {finalScore.winner === 'Draw' ? 'Draw' : `${finalScore.winner} wins`}
              </Text>
              <Text style={styles.resultLine}>
                Black {finalScore.black} (territory {finalScore.territory.black})
              </Text>
              <Text style={styles.resultLine}>
                White {finalScore.white} (territory {finalScore.territory.white} + komi {game.komi})
              </Text>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.buttonRow}>
            <Btn label="Pass" onPress={handlePass} />
            <Btn label="Undo" onPress={handleUndo} disabled={!game.canUndo()} />
          </View>
          <View style={styles.buttonRow}>
            <Btn label="Count Score" onPress={handleScore} variant="accent" />
          </View>

          {/* Board size selector */}
          <Text style={styles.sectionLabel}>New game</Text>
          <View style={styles.buttonRow}>
            {SIZES.map((s) => (
              <Btn
                key={s}
                label={`${s}×${s}`}
                onPress={() => newGame(s)}
                variant={s === game.size ? 'accent' : 'default'}
              />
            ))}
          </View>

          <View style={styles.rules}>
            <Text style={styles.rulesTitle}>How to play</Text>
            <Text style={styles.rulesText}>
              • Black and White alternate placing stones on empty intersections; Black first.{'\n'}
              • A group with no empty adjacent points (liberties) is captured and removed.{'\n'}
              • Suicide and repeating a previous whole-board position (ko) are illegal.{'\n'}
              • Two passes end the game. Area scoring counts your stones plus the empty
              points you fully surround, and White adds {KOMI} komi.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function PlayerBadge({
  label,
  active,
  captures,
  score,
  dark,
}: {
  label: string;
  active: boolean;
  captures: number;
  score: number;
  dark?: boolean;
}) {
  return (
    <View style={[styles.badge, active && styles.badgeActive]}>
      <View style={styles.badgeHead}>
        <View
          style={[
            styles.dot,
            { backgroundColor: dark ? theme.colors.black : theme.colors.white },
          ]}
        />
        <Text style={styles.badgeLabel}>{label}</Text>
      </View>
      <Text style={styles.badgeScore}>{score}</Text>
      <Text style={styles.badgeCaptures}>captures {captures}</Text>
    </View>
  );
}

function Btn({
  label,
  onPress,
  variant = 'default',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'default' | 'accent' | 'danger';
  disabled?: boolean;
}) {
  const bg =
    variant === 'accent'
      ? theme.colors.accent
      : variant === 'danger'
      ? theme.colors.danger
      : theme.colors.panelAlt;
  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: bg }, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={styles.btnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  scroll: { padding: 12, alignItems: 'stretch' },
  title: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    color: theme.colors.textDim,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  headerRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  badge: {
    flex: 1,
    backgroundColor: theme.colors.panel,
    borderRadius: 12,
    padding: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  badgeActive: { borderColor: theme.colors.accent },
  badgeHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0006',
  },
  badgeLabel: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
  badgeScore: { color: theme.colors.text, fontSize: 26, fontWeight: '800', marginTop: 4 },
  badgeCaptures: { color: theme.colors.textDim, fontSize: 12 },
  boardCenter: { alignItems: 'center', marginVertical: 6 },
  status: {
    color: theme.colors.textDim,
    textAlign: 'center',
    fontSize: 14,
    marginVertical: 8,
    minHeight: 20,
  },
  resultCard: {
    backgroundColor: theme.colors.panel,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: theme.colors.accent,
  },
  resultTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  resultLine: { color: theme.colors.textDim, fontSize: 14, textAlign: 'center' },
  buttonRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  sectionLabel: {
    color: theme.colors.textDim,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 2,
  },
  rules: {
    backgroundColor: theme.colors.panel,
    borderRadius: 12,
    padding: 14,
    marginTop: 6,
    marginBottom: Platform.OS === 'web' ? 40 : 12,
  },
  rulesTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  rulesText: { color: theme.colors.textDim, fontSize: 13, lineHeight: 20 },
});
