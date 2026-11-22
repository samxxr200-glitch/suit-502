// Home screen: title + entry points to a new game, history and rules.
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { PlayingCard } from '../components/PlayingCard';
import { AppButton } from '../components/AppButton';
import { colors } from '../theme';

const HERO = [
  { id: '7H', rank: '7', suit: 'H' },
  { id: 'AS', rank: 'A', suit: 'S' },
  { id: 'JD', rank: 'J', suit: 'D' },
];

export default function HomeScreen() {
  const router = useRouter();
  const float = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(withSequence(withTiming(1, { duration: 1600 }), withTiming(0, { duration: 1600 })), -1);
  }, [float]);

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -8 * float.value }] }));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <Animated.View style={[styles.fan, floatStyle]}>
          {HERO.map((c, i) => (
            <Animated.View
              key={c.id}
              entering={FadeInDown.delay(150 * i).springify()}
              style={{ transform: [{ rotate: `${(i - 1) * 14}deg` }, { translateY: i === 1 ? -10 : 0 }], marginHorizontal: -12 }}
            >
              <PlayingCard card={c} width={86} />
            </Animated.View>
          ))}
        </Animated.View>

        <Animated.Text entering={FadeInDown.delay(450)} style={styles.title}>
          SUIT <Text style={{ color: colors.accent }}>502</Text>
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(550)} style={styles.tagline}>
          Shed your cards. Dodge the penalties.{'\n'}Stay under 502.
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInDown.delay(650)} style={styles.menu}>
        <AppButton title="New game" onPress={() => router.push('/setup')} />
        <AppButton title="Score history" variant="secondary" onPress={() => router.push('/history')} style={styles.gap} />
        <AppButton title="How to play" variant="ghost" onPress={() => router.push('/rules')} style={styles.gap} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, padding: 24 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fan: { flexDirection: 'row', marginBottom: 36 },
  title: { color: colors.text, fontSize: 44, fontWeight: '900', letterSpacing: 2 },
  tagline: { color: colors.textMuted, fontSize: 15, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  menu: { paddingBottom: 12 },
  gap: { marginTop: 12 },
});
