import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS, SHADOWS } from '../theme/tokens';

export function Card({ children, style, elevated = true }) {
  return <View style={[styles.card, elevated && SHADOWS.sm, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 16,
  },
});
