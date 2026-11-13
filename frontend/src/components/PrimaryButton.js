import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/tokens';

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'dark',
  icon = null,
  style,
}) {
  const isDisabled = disabled || loading;

  const variantStyle =
    variant === 'outline'
      ? styles.outline
      : variant === 'green'
        ? styles.green
        : variant === 'red'
          ? styles.red
          : styles.dark;

  const isOutline = variant === 'outline';
  const contentColor = isOutline ? COLORS.inkPrimary : '#FFFFFF';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
      style={[styles.base, variantStyle, isDisabled && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={contentColor} />
      ) : (
        <View style={styles.inner}>
          {icon ? <Ionicons name={icon} size={18} color={contentColor} /> : null}
          <Text style={[styles.text, { color: contentColor }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dark: {
    backgroundColor: COLORS.brandDark,
  },
  green: {
    backgroundColor: COLORS.accentGreen,
  },
  red: {
    backgroundColor: COLORS.statusRed,
  },
  outline: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  disabled: {
    opacity: 0.55,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
