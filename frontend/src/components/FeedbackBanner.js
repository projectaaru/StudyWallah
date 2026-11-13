import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/tokens';

export function FeedbackBanner({ type = 'info', message }) {
  if (!message) return null;

  const isError = type === 'error';
  const isSuccess = type === 'success';

  const containerStyle = isError
    ? styles.errorBox
    : isSuccess
      ? styles.successBox
      : styles.infoBox;

  const iconName = isError
    ? 'alert-circle'
    : isSuccess
      ? 'checkmark-circle'
      : 'information-circle';

  const iconColor = isError
    ? COLORS.statusRed
    : isSuccess
      ? COLORS.statusGreen
      : COLORS.accentBlue;

  const textStyle = isError
    ? styles.errorText
    : isSuccess
      ? styles.successText
      : styles.infoText;

  return (
    <View style={[styles.base, containerStyle]}>
      <Ionicons name={iconName} size={17} color={iconColor} />
      <Text style={[styles.text, textStyle]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorBox: {
    backgroundColor: COLORS.statusRedBg,
    borderColor: COLORS.statusRedBorder,
  },
  successBox: {
    backgroundColor: COLORS.statusGreenBg,
    borderColor: COLORS.statusGreenBorder,
  },
  infoBox: {
    backgroundColor: COLORS.accentBlueBg,
    borderColor: '#BFDBFE',
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  errorText: {
    color: COLORS.statusRedDark,
  },
  successText: {
    color: COLORS.statusGreenDark,
  },
  infoText: {
    color: '#1E40AF',
  },
});
