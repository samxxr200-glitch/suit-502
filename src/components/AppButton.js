import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from '../theme';

/** Shared button. variant: 'primary' | 'secondary' | 'ghost' | 'danger' */
export function AppButton({ title, onPress, variant = 'primary', disabled, style, small }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.base,
        small && styles.small,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.text, small && styles.smallText, variant === 'primary' && styles.primaryText]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 15,
    paddingHorizontal: 22,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { paddingVertical: 10, paddingHorizontal: 16 },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  text: { color: colors.text, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  smallText: { fontSize: 14 },
  primaryText: { color: colors.bgDeep },
});
