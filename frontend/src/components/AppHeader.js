import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/tokens';

export function AppHeader({ subtitle, onLogout, rightBadge }) {
  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <View style={styles.logoBox}>
          <Ionicons name="school" size={20} color={COLORS.accentBlue} />
          <View style={styles.logoAccentDot} />
        </View>
        <View style={styles.brandMeta}>
          <View style={styles.titleRow}>
            <Text style={styles.brandTitle}>
              <Text style={styles.brandStudy}>Study</Text>
              <Text style={styles.brandWallah}>Wallah</Text>
            </Text>
            <View style={styles.verifiedPill}>
              <Ionicons name="checkmark-circle" size={12} color={COLORS.accentBlue} />
              <Text style={styles.verifiedText}>NEET UG</Text>
            </View>
          </View>
          {subtitle ? (
            <View style={styles.subtitleRow}>
              <Ionicons name="sparkles-outline" size={11} color={COLORS.brandOrange} />
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {onLogout ? (
        <TouchableOpacity onPress={onLogout} style={styles.logoutBtn} activeOpacity={0.75}>
          <Ionicons name="log-out-outline" size={15} color={COLORS.statusRed} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      ) : rightBadge ? (
        rightBadge
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.accentBlueBg,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoAccentDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.brandOrange,
    borderWidth: 1.5,
    borderColor: COLORS.bgCard,
  },
  brandMeta: {
    gap: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandStudy: {
    color: COLORS.accentBlue,
    fontWeight: '900',
  },
  brandWallah: {
    color: COLORS.brandOrange,
    fontWeight: '900',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.accentBlueBg,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.accentBlue,
    letterSpacing: 0.4,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.inkMuted,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    backgroundColor: COLORS.bgCard,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.inkPrimary,
  },
});
