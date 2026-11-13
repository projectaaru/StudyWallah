import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/tokens';

export function SectionHeader({ icon, title, badgeText, rightElement }) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        {icon ? (
          <View style={styles.iconBox}>
            <Ionicons name={icon} size={15} color={COLORS.inkPrimary} />
          </View>
        ) : null}
        <Text style={styles.title}>{title}</Text>
      </View>

      {rightElement ? (
        rightElement
      ) : badgeText ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.inkPrimary,
    letterSpacing: -0.2,
  },
  badge: {
    backgroundColor: COLORS.bgSubtle,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.inkSecondary,
  },
});
