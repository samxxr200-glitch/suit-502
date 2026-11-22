import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { AppButton } from './AppButton';
import { ELIMINATION_SCORE } from '../game/rules';
import { colors, radius } from '../theme';

const REASON = {
  out: 'went out',
  seven: 'played the 7♥',
  stalemate: 'had the lowest hand when the deck ran dry',
};

/**
 * End-of-round results, and the final standings when the game is over.
 * Props: state (game state), saveStatus, onNext, onRestart, onHome, onFastForward
 */
export function RoundSummary({ state, saveStatus, onNext, onRestart, onHome, onFastForward }) {
  const visible = state.phase === 'roundOver' || state.phase === 'gameOver';
  if (!visible || !state.roundResult) return null;

  const { roundResult, players } = state;
  const gameOver = state.phase === 'gameOver';
  const winner = players[roundResult.winnerIndex];
  const champion = gameOver ? players[state.championIndex] : null;
  const humanOut = players[0].eliminated;
  const youWon = gameOver && state.championIndex === 0;

  const standings = [...players]
    .map((p, i) => ({ ...p, idx: i, last: roundResult.results[i] }))
    .sort((a, b) => (a.eliminated === b.eliminated ? a.score - b.score : a.eliminated ? 1 : -1));

  return (
    <Modal visible transparent animationType="fade" onRequestClose={gameOver ? onHome : onNext}>
      <View style={styles.backdrop}>
        <Animated.View entering={ZoomIn.springify()} style={styles.sheet}>
          {gameOver ? (
            <>
              <Text style={[styles.badge, { color: youWon ? colors.teal : colors.danger }]}>
                {youWon ? 'VICTORY' : 'GAME OVER'}
              </Text>
              <Text style={styles.title}>{youWon ? 'You outlasted everyone!' : `${champion.name} wins the game`}</Text>
              <Text style={styles.sub}>After {state.round} round{state.round === 1 ? '' : 's'}</Text>
            </>
          ) : (
            <>
              <Text style={styles.badge}>ROUND {state.round}</Text>
              <Text style={styles.title}>{roundResult.winnerIndex === 0 ? 'You won the round!' : `${winner.name} won the round`}</Text>
              <Text style={styles.sub}>{winner.name} {REASON[roundResult.reason]}</Text>
            </>
          )}

          <ScrollView style={{ maxHeight: 300 }}>
            {standings.map((p, n) => {
              const justOut = roundResult.newlyEliminated.includes(p.id);
              return (
                <Animated.View key={p.id} entering={FadeInDown.delay(80 * n)} style={[styles.row, p.isHuman && styles.meRow]}>
                  <Text style={styles.pos}>{p.eliminated ? '✕' : n + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{p.name}{p.isHuman ? ' (you)' : ''}</Text>
                    {justOut && <Text style={styles.outTag}>Eliminated: reached {ELIMINATION_SCORE}</Text>}
                  </View>
                  {p.last.wasActive && (
                    <Text style={[styles.delta, p.last.points === 0 && { color: colors.teal }]}>+{p.last.points}</Text>
                  )}
                  <Text style={[styles.total, p.eliminated && { color: colors.danger }]}>{p.score}</Text>
                </Animated.View>
              );
            })}
          </ScrollView>

          {gameOver && saveStatus && (
            <Text style={styles.save}>
              {saveStatus === 'saving' ? 'Saving to history…' : saveStatus === 'firebase' ? '✓ Saved to cloud history' : saveStatus === 'local' ? '✓ Saved to history on this device' : '⚠ Could not save history'}
            </Text>
          )}

          <View style={styles.actions}>
            {gameOver ? (
              <>
                <AppButton title="Play again" onPress={onRestart} />
                <AppButton title="Main menu" variant="secondary" onPress={onHome} style={{ marginTop: 10 }} />
              </>
            ) : (
              <>
                <AppButton title={humanOut ? 'Watch next round' : 'Next round'} onPress={onNext} />
                {humanOut && (
                  <AppButton title="Skip to final result" variant="secondary" onPress={onFastForward} style={{ marginTop: 10 }} />
                )}
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,3,12,0.8)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 22, borderWidth: 1, borderColor: colors.border },
  badge: { color: colors.accent, fontWeight: '900', letterSpacing: 3, textAlign: 'center', fontSize: 12 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 6 },
  sub: { color: colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    marginBottom: 6,
  },
  meRow: { borderWidth: 1, borderColor: colors.accent },
  pos: { color: colors.textMuted, width: 22, fontWeight: '800' },
  name: { color: colors.text, fontWeight: '700' },
  outTag: { color: colors.danger, fontSize: 11, marginTop: 2 },
  delta: { color: colors.textMuted, marginRight: 12, fontWeight: '600' },
  total: { color: colors.text, fontWeight: '900', minWidth: 40, textAlign: 'right' },
  save: { color: colors.textMuted, textAlign: 'center', marginTop: 10, fontSize: 12 },
  actions: { marginTop: 16 },
});
