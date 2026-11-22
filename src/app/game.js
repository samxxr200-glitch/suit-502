// The table: opponents on top, draw/discard piles in the middle, your hand at the bottom.
// Game state lives in useReducer (src/game/engine.js); bots move via a timed effect.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { createGame, gameReducer, topCard } from '../game/engine';
import { chooseMove, playOutGame } from '../game/ai';
import { canPlayCard, handPoints, whyNotPlayable, ELIMINATION_SCORE } from '../game/rules';
import { RANKS, SUITS, SUIT_NAME, SUIT_SYMBOL, isRedSuit } from '../game/deck';
import { buildResult, saveGameResult } from '../services/historyService';
import { PlayingCard, CardBack } from '../components/PlayingCard';
import { OpponentSeat } from '../components/OpponentSeat';
import { SuitPicker } from '../components/SuitPicker';
import { RoundSummary } from '../components/RoundSummary';
import { AppButton } from '../components/AppButton';
import { colors, radius } from '../theme';

const BOT_DELAY_MS = 900;
const BOT_DELAY_FAST_MS = 300; // when you're eliminated and just watching

const sortHand = (hand) =>
  [...hand].sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank));

function initGame(params) {
  const botCount = Math.min(5, Math.max(1, parseInt(params.bots, 10) || 3));
  const humanName = (typeof params.name === 'string' && params.name.trim()) || 'You';
  return createGame({ humanName, botCount });
}

// Wraps the engine reducer with one screen-only action: once you're eliminated,
// FAST_FORWARD lets the bots finish the game instantly.
function screenReducer(state, action) {
  if (action.type === 'FAST_FORWARD') {
    if (!state.players[0].eliminated || state.phase === 'gameOver') return state;
    const from = state.phase === 'roundOver' ? gameReducer(state, { type: 'NEXT_ROUND' }) : state;
    return playOutGame(from);
  }
  return gameReducer(state, action);
}

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { width } = useWindowDimensions();

  const [state, dispatch] = useReducer(screenReducer, params, initGame);
  const [jackToPlay, setJackToPlay] = useState(null);
  const [hint, setHint] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const savedForGame = useRef(false);
  const shake = useSharedValue(0);

  const me = state.players[0];
  const top = topCard(state);
  const myTurn = state.phase === 'playing' && state.current === 0 && !me.eliminated;
  const hand = useMemo(() => sortHand(me.hand), [me.hand]);

  // ---- bots take their turns ----
  useEffect(() => {
    if (state.phase !== 'playing') return;
    const current = state.players[state.current];
    if (current.isHuman && !current.eliminated) return;
    const t = setTimeout(() => dispatch(chooseMove(state, state.current)), me.eliminated ? BOT_DELAY_FAST_MS : BOT_DELAY_MS);
    return () => clearTimeout(t);
  }, [state, me.eliminated]);

  // ---- save the result once when the game ends (bonus: Firebase history) ----
  useEffect(() => {
    if (state.phase !== 'gameOver' || savedForGame.current) return;
    savedForGame.current = true;
    setSaveStatus('saving');
    saveGameResult(buildResult(state))
      .then(setSaveStatus)
      .catch(() => setSaveStatus('failed'));
  }, [state]);

  // ---- clear the hint after a moment ----
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 2600);
    return () => clearTimeout(t);
  }, [hint]);

  // ---- confirm before leaving a game in progress ----
  const confirmQuit = useCallback(() => {
    if (state.phase === 'gameOver') {
      router.replace('/');
      return;
    }
    Alert.alert('Leave game?', 'Your progress in this game will be lost.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => router.replace('/') },
    ]);
  }, [router, state.phase]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmQuit();
      return true;
    });
    return () => sub.remove();
  }, [confirmQuit]);

  // ---- player actions ----
  const rejectWith = (message) => {
    setHint(message);
    shake.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const onCardPress = (card) => {
    if (!myTurn) return rejectWith(me.eliminated ? 'You are out of this game.' : 'Wait for your turn.');
    if (!canPlayCard(card, top, state.activeSuit, state.pending)) {
      return rejectWith(whyNotPlayable(card, top, state.activeSuit, state.pending, SUIT_NAME));
    }
    if (card.rank === 'J' && !state.pending) return setJackToPlay(card);
    dispatch({ type: 'PLAY', player: 0, cardId: card.id });
  };

  const onPickSuit = (suit) => {
    if (jackToPlay) dispatch({ type: 'PLAY', player: 0, cardId: jackToPlay.id, suit });
    setJackToPlay(null);
  };

  const onDraw = () => {
    if (!myTurn) return rejectWith('Wait for your turn.');
    dispatch({ type: state.pending?.type === 'skip' ? 'ACCEPT_SKIP' : 'DRAW', player: 0 });
  };

  const restart = () => {
    savedForGame.current = false;
    setSaveStatus(null);
    setJackToPlay(null);
    dispatch({ type: 'RESTART' });
  };

  // ---- layout maths for the hand ----
  const cardW = Math.max(52, Math.min(76, width / 6));
  const available = width - 32;
  const overlap =
    hand.length > 1 ? Math.min(cardW * 0.62, Math.max(0, (hand.length * cardW - available) / (hand.length - 1))) : 0;

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const actionLabel = !myTurn
    ? me.eliminated ? 'Eliminated' : `${state.players[state.current]?.name ?? ''}'s turn`
    : state.pending?.type === 'skip'
      ? 'Accept skip'
      : state.pending
        ? `Take +${state.pending.amount}`
        : 'Draw card';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={confirmQuit} hitSlop={12}>
          <Text style={styles.topLink}>✕ Quit</Text>
        </Pressable>
        <Text style={styles.round}>Round {state.round}</Text>
        <Pressable onPress={() => router.push('/rules')} hitSlop={12}>
          <Text style={styles.topLink}>Rules</Text>
        </Pressable>
      </View>

      {/* opponents */}
      <View style={styles.opponents}>
        {state.players.slice(1).map((p, i) => (
          <OpponentSeat key={p.id} player={p} isTurn={state.phase === 'playing' && state.current === i + 1} />
        ))}
      </View>

      {/* table */}
      <View style={styles.table}>
        <View style={styles.piles}>
          <Pressable onPress={onDraw} disabled={!myTurn || state.pending?.type === 'skip'} style={styles.pile}>
            <CardBack width={cardW * 1.1} />
            <Text style={styles.pileLabel}>{state.drawPile.length} left</Text>
          </Pressable>

          <View style={styles.pile}>
            <Animated.View key={top.id + state.discardPile.length} entering={ZoomIn.duration(250)}>
              <PlayingCard card={top} width={cardW * 1.1} />
            </Animated.View>
            <View style={styles.suitChip}>
              <Text style={styles.pileLabel}>Suit </Text>
              <Text style={[styles.suitSymbol, { color: isRedSuit(state.activeSuit) ? colors.cardRed : colors.text }]}>
                {SUIT_SYMBOL[state.activeSuit]}
              </Text>
            </View>
          </View>
        </View>

        {state.pending && (
          <Animated.View entering={ZoomIn} style={styles.pendingBanner}>
            <Text style={styles.pendingText}>
              {state.pending.type === 'skip'
                ? `⏭  Skip on ${state.players[state.current].name}`
                : `⚠  +${state.pending.amount} on ${state.players[state.current].name}`}
            </Text>
          </Animated.View>
        )}

        <Animated.Text key={state.lastEvent?.at} entering={FadeIn} style={styles.message} numberOfLines={2}>
          {state.message}
        </Animated.Text>
      </View>

      {/* your area */}
      <View style={[styles.myArea, myTurn && styles.myAreaActive]}>
        <View style={styles.myHeader}>
          <View>
            <Text style={styles.myName}>{me.name}</Text>
            <Text style={styles.myStats}>
              Score {me.score}/{ELIMINATION_SCORE} · Hand {handPoints(me.hand)} pts
            </Text>
          </View>
          <AppButton
            small
            title={actionLabel}
            onPress={onDraw}
            disabled={!myTurn}
            variant={myTurn ? 'primary' : 'secondary'}
          />
        </View>

        {hint && (
          <Animated.Text entering={FadeInDown} style={styles.hint}>
            {hint}
          </Animated.Text>
        )}

        <Animated.View style={shakeStyle}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.handRow}>
            {me.eliminated ? (
              <Text style={styles.outText}>You reached {ELIMINATION_SCORE}. The bots will play it out.</Text>
            ) : (
              hand.map((card, i) => {
                const playable = myTurn && canPlayCard(card, top, state.activeSuit, state.pending);
                return (
                  <Animated.View key={card.id} entering={FadeInDown.delay(i * 25)} style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: i }}>
                    <PlayingCard card={card} width={cardW} highlighted={playable} dimmed={myTurn && !playable} onPress={() => onCardPress(card)} />
                  </Animated.View>
                );
              })
            )}
          </ScrollView>
        </Animated.View>
      </View>

      <SuitPicker visible={!!jackToPlay} onPick={onPickSuit} onCancel={() => setJackToPlay(null)} />
      <RoundSummary
        state={state}
        saveStatus={saveStatus}
        onNext={() => dispatch({ type: 'NEXT_ROUND' })}
        onRestart={restart}
        onHome={() => router.replace('/')}
        onFastForward={() => dispatch({ type: 'FAST_FORWARD' })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  topLink: { color: colors.accent, fontWeight: '700', fontSize: 15 },
  round: { color: colors.text, fontWeight: '800', fontSize: 16 },
  opponents: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 8 },
  table: {
    flex: 1,
    margin: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  piles: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center' },
  pile: { alignItems: 'center', marginHorizontal: 18 },
  pileLabel: { color: colors.textMuted, fontSize: 12, marginTop: 8, fontWeight: '600' },
  suitChip: { flexDirection: 'row', alignItems: 'center' },
  suitSymbol: { fontSize: 20, marginTop: 4, fontWeight: '700' },
  pendingBanner: {
    marginTop: 14,
    backgroundColor: colors.accentDark,
    borderColor: colors.accent,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pendingText: { color: colors.accent, fontWeight: '800' },
  message: { color: colors.text, textAlign: 'center', marginTop: 14, fontSize: 14, minHeight: 36 },
  myArea: {
    backgroundColor: colors.bgDeep,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: 14,
    paddingBottom: 8,
    borderTopWidth: 2,
    borderColor: colors.border,
  },
  myAreaActive: { borderColor: colors.accent },
  myHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  myName: { color: colors.text, fontWeight: '800', fontSize: 16 },
  myStats: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  hint: { color: colors.danger, paddingHorizontal: 16, marginTop: 8, fontSize: 13 },
  handRow: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 8, alignItems: 'flex-end' },
  outText: { color: colors.textMuted, paddingVertical: 30 },
});
