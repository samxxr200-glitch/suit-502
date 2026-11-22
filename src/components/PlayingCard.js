import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SUIT_SYMBOL, isRedSuit } from '../game/deck';
import { colors } from '../theme';

/** Face-up card. `width` controls the size; height keeps a 1 : 1.42 ratio. */
export function PlayingCard({ card, width = 64, highlighted = false, dimmed = false, onPress, disabled }) {
  const height = width * 1.42;
  const color = isRedSuit(card.suit) ? colors.cardRed : colors.cardBlack;
  const special = ['2', '8', 'J'].includes(card.rank) || card.id === 'AS' || card.id === '7H';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole="button"
      accessibilityLabel={`${card.rank} of ${card.suit}`}
      style={({ pressed }) => [
        styles.card,
        { width, height, borderRadius: width * 0.14 },
        highlighted && styles.highlighted,
        dimmed && styles.dimmed,
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      <View style={styles.corner}>
        <Text style={[styles.rank, { color, fontSize: width * 0.24 }]}>{card.rank}</Text>
        <Text style={[styles.cornerSuit, { color, fontSize: width * 0.2 }]}>{SUIT_SYMBOL[card.suit]}</Text>
      </View>
      <Text style={[styles.center, { color, fontSize: width * 0.5 }]}>{SUIT_SYMBOL[card.suit]}</Text>
      {special && <View style={[styles.specialDot, { backgroundColor: color }]} />}
    </Pressable>
  );
}

/** Face-down card, used for the draw pile and opponents' hands. */
export function CardBack({ width = 64, style }) {
  return (
    <View style={[styles.back, { width, height: width * 1.42, borderRadius: width * 0.14 }, style]}>
      <View style={[styles.backInner, { borderRadius: width * 0.1 }]}>
        <Text style={[styles.backMark, { fontSize: width * 0.3 }]}>502</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardFace,
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E7E1F5',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  highlighted: { borderColor: colors.accent, borderWidth: 3, transform: [{ translateY: -10 }] },
  dimmed: { opacity: 0.55 },
  corner: { position: 'absolute', top: 4, left: 6, alignItems: 'center' },
  rank: { fontWeight: '800', lineHeight: undefined },
  cornerSuit: { marginTop: -4 },
  center: { fontWeight: '700' },
  specialDot: { position: 'absolute', bottom: 6, right: 6, width: 6, height: 6, borderRadius: 3, opacity: 0.6 },
  back: {
    backgroundColor: colors.cardBack,
    padding: 4,
    borderWidth: 2,
    borderColor: colors.cardBackAlt,
    elevation: 4,
  },
  backInner: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  backMark: { color: 'rgba(255,255,255,0.85)', fontWeight: '900', letterSpacing: -1 },
});
