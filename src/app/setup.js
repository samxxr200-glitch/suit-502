// Game setup: player name + number of computer opponents (502 supports 2–6 players).
import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppButton } from '../components/AppButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors, radius } from '../theme';

const MAX_NAME = 12;

export default function SetupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [bots, setBots] = useState(3);

  // Allow letters, numbers and spaces only; collapse repeated spaces.
  const onChangeName = (text) => setName(text.replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s{2,}/g, ' ').slice(0, MAX_NAME));

  const start = () => {
    Keyboard.dismiss();
    const finalName = name.trim() || 'You';
    router.replace({ pathname: '/game', params: { name: finalName, bots: String(bots) } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="New game" onBack={() => router.back()} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.body}>
            <Animated.View entering={FadeInDown}>
              <Text style={styles.label}>Your name</Text>
              <TextInput
                value={name}
                onChangeText={onChangeName}
                placeholder="You"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                maxLength={MAX_NAME}
                returnKeyType="done"
                autoCorrect={false}
              />
              <Text style={styles.hint}>{name.length}/{MAX_NAME}</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(100)}>
              <Text style={styles.label}>Computer opponents</Text>
              <View style={styles.chips}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => setBots(n)} style={[styles.chip, bots === n && styles.chipOn]}>
                    <Text style={[styles.chipText, bots === n && styles.chipTextOn]}>{n}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.hint}>{bots + 1} players at the table · 7 cards each</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200)} style={styles.summary}>
              <Text style={styles.summaryTitle}>Goal</Text>
              <Text style={styles.summaryText}>
                Empty your hand to win rounds. Cards left in your hand are added to your score. Reach 502 and you're out.
                The last player standing wins.
              </Text>
            </Animated.View>

            <View style={{ flex: 1 }} />
            <AppButton title="Deal cards" onPress={start} />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, padding: 20 },
  label: { color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  chips: { flexDirection: 'row', justifyContent: 'space-between' },
  chip: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: '800', fontSize: 17 },
  chipTextOn: { color: colors.bgDeep },
  summary: { marginTop: 24, backgroundColor: colors.surface, borderRadius: radius.md, padding: 16 },
  summaryTitle: { color: colors.accent, fontWeight: '800', marginBottom: 6 },
  summaryText: { color: colors.textMuted, lineHeight: 20 },
});
