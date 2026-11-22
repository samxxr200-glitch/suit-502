// Quick in-app rules reference (opened from Home or during a game).
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius } from '../theme';

const SECTIONS = [
  {
    title: 'Your turn',
    lines: [
      'Play one card that matches the top card by suit or by value.',
      'Or draw one card from the pile. Drawing ends your turn.',
    ],
  },
  {
    title: 'Special cards',
    lines: [
      '2: next player draws 2 unless they play a 2. Stacks: 2 → 4 → 6 → 8.',
      'A♠: next player draws 5 unless they play any Ace, which passes the 5 on. It never grows.',
      '8: next player is skipped unless they play an 8, which passes the skip on.',
      'Jack: wild. Play it on anything and call the next suit.',
      '7♥: wild. Play it and you win the round instantly.',
    ],
  },
  {
    title: 'Scoring (cards left in hand)',
    lines: [
      '7♥ and A♠: 100 each',
      '2, 8, Jack: 30 each',
      'A♥, A♦, A♣: 20 each',
      '10, Q, K: 10 each',
      '3–6, 9 and other 7s: 5 each',
      'The round winner scores 0.',
    ],
  },
  {
    title: 'Winning',
    lines: [
      'A round ends when someone plays their last card or plays the 7♥.',
      'After each round, anyone at 502 or more is eliminated. The round winner is always safe that round.',
      'The last player under 502 wins. If everyone crosses 502 in the same round, the lowest total wins.',
    ],
  },
];

export default function RulesScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="How to play" onBack={() => router.back()} backLabel="Close" />
      <ScrollView contentContainerStyle={styles.body}>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.card}>
            <Text style={styles.title}>{s.title}</Text>
            {s.lines.map((l) => (
              <Text key={l} style={styles.line}>•  {l}</Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, marginBottom: 12 },
  title: { color: colors.accent, fontWeight: '800', fontSize: 16, marginBottom: 8 },
  line: { color: colors.text, lineHeight: 21, marginBottom: 4 },
});
