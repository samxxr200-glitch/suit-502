import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

/** Simple custom header: back button, title, optional right-hand element. */
export function ScreenHeader({ title, onBack, backLabel = '‹ Back', right }) {
  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {onBack && (
          <Pressable onPress={onBack} hitSlop={12}>
            <Text style={styles.back}>{backLabel}</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={[styles.side, { alignItems: 'flex-end' }]}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  side: { width: 80 },
  back: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  title: { flex: 1, textAlign: 'center', color: colors.text, fontSize: 17, fontWeight: '800' },
});
