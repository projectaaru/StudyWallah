import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { COLORS, SHADOWS } from '../theme/tokens';

export function LoadingView({ message = 'Loading...' }) {
  return (
    <View style={styles.container}>
      <View style={styles.logoCard}>
        <Text style={styles.logoText}>S</Text>
      </View>
      <ActivityIndicator size="small" color={COLORS.inkPrimary} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgCanvas,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  logoCard: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.bgCard,
    borderWidth: 2,
    borderColor: COLORS.inkPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.inkPrimary,
  },
  text: {
    fontSize: 14,
    color: COLORS.inkSecondary,
    fontWeight: '600',
  },
});
