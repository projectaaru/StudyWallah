import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/tokens';

export function StatusIndicator({ status, label, sublabel, size = 'md' }) {
  const isRed = status === 'RED';
  const isLg = size === 'lg';
  const dotColor = isRed ? COLORS.statusRed : COLORS.statusGreen;
  const haloColor = isRed ? 'rgba(220, 38, 38, 0.18)' : 'rgba(22, 163, 74, 0.18)';

  return (
    <View
      style={[
        styles.badge,
        isRed ? styles.badgeRed : styles.badgeGreen,
        isLg && styles.badgeLg,
      ]}
    >
      <View
        style={[
          styles.halo,
          {
            width: isLg ? 38 : 24,
            height: isLg ? 38 : 24,
            borderRadius: isLg ? 19 : 12,
            backgroundColor: haloColor,
          },
        ]}
      >
        <View
          style={[
            styles.dot,
            {
              width: isLg ? 20 : 12,
              height: isLg ? 20 : 12,
              borderRadius: isLg ? 10 : 6,
              backgroundColor: dotColor,
            },
          ]}
        />
      </View>

      <View style={styles.textWrap}>
        <Text
          style={[
            styles.label,
            isRed ? styles.labelRed : styles.labelGreen,
            isLg && styles.labelLg,
          ]}
        >
          {label || (isRed ? 'Pending Acknowledgement' : 'All Acknowledged')}
        </Text>
        {sublabel ? (
          <Text style={[styles.sublabel, isRed ? styles.subRed : styles.subGreen]}>
            {sublabel}
          </Text>
        ) : null}
      </View>

      <Ionicons
        name={isRed ? 'time-outline' : 'checkmark-circle'}
        size={isLg ? 22 : 18}
        color={dotColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  badgeLg: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  badgeRed: {
    backgroundColor: COLORS.statusRedBg,
    borderColor: COLORS.statusRedBorder,
  },
  badgeGreen: {
    backgroundColor: COLORS.statusGreenBg,
    borderColor: COLORS.statusGreenBorder,
  },
  halo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {},
  textWrap: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  labelLg: {
    fontSize: 16,
  },
  labelRed: {
    color: COLORS.statusRedDark,
  },
  labelGreen: {
    color: COLORS.statusGreenDark,
  },
  sublabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  subRed: {
    color: '#B91C1C',
  },
  subGreen: {
    color: '#15803D',
  },
});
