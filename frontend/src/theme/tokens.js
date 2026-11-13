import { Platform } from 'react-native';

export const COLORS = {
  bgCanvas: '#F8FAFC',
  bgCard: '#FFFFFF',
  bgSubtle: '#F1F5F9',
  bgMuted: '#E2E8F0',

  borderLight: '#E2E8F0',
  borderMedium: '#CBD5E1',

  inkPrimary: '#0F172A',
  inkSecondary: '#475569',
  inkMuted: '#64748B',
  inkSubtle: '#94A3B8',

  brandDark: '#0F172A',
  brandStudy: '#0F172A',
  brandWallah: '#2563EB',
  brandOrange: '#EA580C',
  brandOrangeBg: '#FFF7ED',
  accentBlue: '#2563EB',
  accentBlueBg: '#EFF6FF',
  accentTeal: '#0D9488',
  accentTealBg: '#F0FDFA',
  accentGreen: '#15803D',
  accentGreenBg: '#F0FDF4',
  accentAmber: '#B45309',
  accentAmberBg: '#FFFBEB',
  accentPurple: '#7C3AED',
  accentPurpleBg: '#F5F3FF',

  statusRed: '#DC2626',
  statusRedDark: '#991B1B',
  statusRedBg: '#FEF2F2',
  statusRedBorder: '#FECACA',

  statusGreen: '#16A34A',
  statusGreenDark: '#166534',
  statusGreenBg: '#F0FDF4',
  statusGreenBorder: '#BBF7D0',
};

export const SHADOWS = {
  sm: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
    },
    android: {
      elevation: 3,
    },
    default: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
  }),
};
