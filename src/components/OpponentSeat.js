import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, cancelAnimation } from 'react-native-reanimated';
import { CardBack } from './PlayingCard';
import { ELIMINATION_SCORE } from '../game/rules';
import { colors, radius } from '../theme';

/** One computer opponent: name, card count, score bar towards 502, and a glow while it's their turn. */
export function OpponentSeat({ player, isTurn }) {
  const glow = useSharedValue(0);

  useEffect(() => {
    if (isTurn) {
      glow.value = withRepeat(withTiming(1, { duration: 700 }), -1, true);
    } else {
      cancelAnimation(glow);
      glow.value = withTiming(0, { duration: 200 });
    }
  }, [isTurn, glow]);

  const glowStyle = useAnimatedStyle(() => ({
    borderColor: isTurn ? `rgba(255,181,71,${0.4 + glow.value * 0.6})` : colors.border,
    transform: [{ scale: 1 + glow.value * 0.03 }],
  }));

  const pct = Math.min(1, player.score / ELIMINATION_SCORE);
  const shown = Math.min(player.hand.length, 5);

  return (
    <Animated.View style={[styles.seat, glowStyle, player.eliminated && styles.out]}>
      <View style={styles.row}>
        <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
        {isTurn && <Text style={styles.thinking}>…</Text>}
      </View>
      {player.eliminated ? (
        <Text style={styles.outText}>OUT</Text>
      ) : (
        <View style={styles.fan}>
          {Array.from({ length: shown }).map((_, i) => (
            <CardBack key={i} width={18} style={{ marginLeft: i === 0 ? 0 : -10 }} />
          ))}
          <Text style={styles.count}>×{player.hand.length}</Text>
        </View>
      )}
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: pct > 0.8 ? colors.danger : colors.teal }]} />
      </View>
      <Text style={styles.score}>{player.score} / {ELIMINATION_SCORE}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  seat: {
    width: 104,
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    margin: 4,
  },
  out: { opacity: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { color: colors.text, fontWeight: '700', fontSize: 13, flexShrink: 1 },
  thinking: { color: colors.accent, fontWeight: '900' },
  fan: { flexDirection: 'row', alignItems: 'center', marginVertical: 6, height: 26 },
  count: { color: colors.textMuted, marginLeft: 6, fontSize: 12, fontWeight: '600' },
  outText: { color: colors.danger, fontWeight: '900', marginVertical: 6, height: 26, textAlignVertical: 'center' },
  bar: { height: 4, borderRadius: 2, backgroundColor: colors.bgDeep, overflow: 'hidden' },
  barFill: { height: 4 },
  score: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
});
