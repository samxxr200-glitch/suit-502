import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { SUITS, SUIT_NAME, SUIT_SYMBOL, isRedSuit } from '../game/deck';
import { AppButton } from './AppButton';
import { colors, radius } from '../theme';

/** Shown after the player taps a Jack: choose the suit that must be followed next. */
export function SuitPicker({ visible, onPick, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Animated.View entering={ZoomIn.springify()} style={styles.sheet}>
          <Text style={styles.title}>Jack is wild</Text>
          <Text style={styles.sub}>Call the next suit</Text>
          <View style={styles.grid}>
            {SUITS.map((s) => (
              <Pressable
                key={s}
                onPress={() => onPick(s)}
                style={({ pressed }) => [styles.suit, pressed && { transform: [{ scale: 0.94 }] }]}
              >
                <Text style={[styles.symbol, { color: isRedSuit(s) ? colors.cardRed : colors.cardBlack }]}>{SUIT_SYMBOL[s]}</Text>
                <Text style={styles.suitName}>{SUIT_NAME[s]}</Text>
              </Pressable>
            ))}
          </View>
          <AppButton title="Cancel" variant="ghost" onPress={onCancel} small />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(5,3,12,0.75)', justifyContent: 'center', padding: 24 },
  sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: 22, borderWidth: 1, borderColor: colors.border },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  sub: { color: colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  suit: {
    width: '48%',
    backgroundColor: colors.cardFace,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  symbol: { fontSize: 38, fontWeight: '700' },
  suitName: { color: colors.cardBlack, fontWeight: '700', marginTop: 2 },
});
