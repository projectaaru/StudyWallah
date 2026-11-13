import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../components/AppHeader';
import { Card } from '../components/Card';
import { FeedbackBanner } from '../components/FeedbackBanner';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/tokens';

function LabeledInput({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoCorrect = true,
  inputStyle,
  rightAction = null,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? COLORS.inkPrimary : COLORS.inkSubtle}
            style={styles.inputIcon}
          />
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.inkSubtle}
          style={[styles.input, inputStyle]}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightAction}
      </View>
    </View>
  );
}

export function AuthScreen({ onPreviewHome, initialMode = 'secret', onModeChange }) {
  const { login, registerFreedom, joinSecret } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'secret' | 'login' | 'freedom'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (initialMode && initialMode !== mode) {
      setMode(initialMode);
      setError('');
    }
  }, [initialMode]);

  const handleSubmit = async () => {
    setError('');
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (mode !== 'login' && trimmedName.length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (mode === 'secret' && invitationCode.trim().length < 6) {
      setError('Please enter your batch invitation code.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login({ email: trimmedEmail, password });
      } else if (mode === 'freedom') {
        await registerFreedom({ name: trimmedName, email: trimmedEmail, password });
      } else {
        await joinSecret({
          name: trimmedName,
          email: trimmedEmail,
          password,
          invitationCode: invitationCode.trim(),
        });
      }
    } catch (err) {
      setError(err?.message || 'Unable to continue. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    if (typeof onModeChange === 'function') {
      onModeChange(nextMode);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader subtitle="NEET Study & Revision Portal" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Academic Hero Strip */}
        <View style={styles.heroStrip}>
          <View style={styles.heroPillRow}>
            <View style={styles.heroPill}>
              <Ionicons name="school-outline" size={13} color={COLORS.accentBlue} />
              <Text style={styles.heroPillText}>NEET UG 2027</Text>
            </View>
            <View style={styles.heroPillNeutral}>
              <Text style={styles.heroPillNeutralText}>NCERT • PYQs • Notes</Text>
            </View>
          </View>
          <Text style={styles.heroHeading}>Focused Medical Prep, Simplified</Text>
          <Text style={styles.heroSub}>
            Access curated Physics, Chemistry & Biology revision modules in one distraction-free workspace.
          </Text>
        </View>

        <Card style={styles.card}>
          <View style={styles.cardTopRow}>
            <View style={styles.modeIconBox}>
              <Ionicons
                name={
                  mode === 'secret'
                    ? 'key-outline'
                    : mode === 'login'
                      ? 'log-in-outline'
                      : 'sparkles-outline'
                }
                size={20}
                color={COLORS.inkPrimary}
              />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.title}>
                {mode === 'secret'
                  ? 'Activate StudyWallah Notes'
                  : mode === 'login'
                    ? 'Student Sign In'
                    : 'Create Batch Code'}
              </Text>
              <Text style={styles.caption}>
                {mode === 'secret'
                  ? 'Enter your invitation code once to unlock NEET notes and PDFs.'
                  : mode === 'login'
                    ? 'Sign in with your registered StudyWallah email.'
                    : 'Register to generate a single-use batch invitation code.'}
              </Text>
            </View>
          </View>

          {mode === 'secret' ? (
            <LabeledInput
              label="Invitation Code"
              icon="key-outline"
              value={invitationCode}
              onChangeText={setInvitationCode}
              placeholder="e.g. 817835"
              autoCapitalize="characters"
              autoCorrect={false}
              inputStyle={styles.codeInput}
            />
          ) : null}

          {mode !== 'login' ? (
            <LabeledInput
              label="Full Name"
              icon="person-outline"
              value={name}
              onChangeText={setName}
              placeholder="e.g. Aarav Sharma"
              autoCapitalize="words"
            />
          ) : null}

          <LabeledInput
            label="Email Address"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="student@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <LabeledInput
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Minimum 8 characters"
            secureTextEntry={!showPassword}
            rightAction={
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.inkMuted}
                />
              </TouchableOpacity>
            }
          />

          {error ? (
            <View style={styles.bannerWrap}>
              <FeedbackBanner type="error" message={error} />
            </View>
          ) : null}

          <PrimaryButton
            title={
              mode === 'secret'
                ? 'Continue to StudyWallah'
                : mode === 'login'
                  ? 'Sign In'
                  : 'Create Account & Get Code'
            }
            icon={mode === 'login' ? 'arrow-forward-outline' : 'checkmark-circle-outline'}
            onPress={handleSubmit}
            loading={submitting}
            style={styles.submitBtn}
          />
        </Card>

        <View style={styles.footerLinks}>
          {mode !== 'login' ? (
            <TouchableOpacity onPress={() => switchMode('login')} style={styles.footerBtn}>
              <Text style={styles.linkText}>Already activated? Sign In</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => switchMode('secret')} style={styles.footerBtn}>
              <Text style={styles.linkText}>Have an invitation code? Activate</Text>
            </TouchableOpacity>
          )}

          <View style={styles.secondaryLinksRow}>
            {mode !== 'freedom' ? (
              <TouchableOpacity onPress={() => switchMode('freedom')} style={styles.secondaryPill}>
                <Ionicons name="shield-outline" size={13} color={COLORS.inkSecondary} />
                <Text style={styles.mutedLink}>Educator / Freedom Setup</Text>
              </TouchableOpacity>
            ) : null}

            {onPreviewHome ? (
              <TouchableOpacity onPress={onPreviewHome} style={styles.secondaryPill}>
                <Ionicons name="book-outline" size={13} color={COLORS.inkSecondary} />
                <Text style={styles.mutedLink}>Preview NEET Notes</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bgCanvas,
  },
  scroll: {
    padding: 16,
    paddingBottom: 36,
    maxWidth: 540,
    width: '100%',
    alignSelf: 'center',
  },
  heroStrip: {
    marginTop: 4,
    marginBottom: 14,
    gap: 6,
  },
  heroPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.accentBlueBg,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentBlue,
  },
  heroPillNeutral: {
    backgroundColor: COLORS.bgSubtle,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  heroPillNeutralText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.inkSecondary,
  },
  heroHeading: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.inkPrimary,
    letterSpacing: -0.4,
    marginTop: 2,
  },
  heroSub: {
    fontSize: 13,
    color: COLORS.inkSecondary,
    lineHeight: 19,
  },
  card: {
    padding: 18,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  modeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardHeaderText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.inkPrimary,
  },
  caption: {
    fontSize: 13,
    color: COLORS.inkSecondary,
    marginTop: 3,
    lineHeight: 18,
  },
  field: {
    marginBottom: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.inkPrimary,
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    borderRadius: 12,
    backgroundColor: COLORS.bgCard,
    paddingHorizontal: 12,
  },
  inputWrapFocused: {
    borderColor: COLORS.inkPrimary,
    borderWidth: 1.5,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 15,
    color: COLORS.inkPrimary,
  },
  eyeBtn: {
    paddingLeft: 8,
  },
  codeInput: {
    letterSpacing: 1.8,
    fontWeight: '700',
  },
  bannerWrap: {
    marginBottom: 12,
  },
  submitBtn: {
    marginTop: 4,
  },
  footerLinks: {
    marginTop: 20,
    alignItems: 'center',
    gap: 14,
  },
  footerBtn: {
    paddingVertical: 4,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.inkPrimary,
    textDecorationLine: 'underline',
  },
  secondaryLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  secondaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  mutedLink: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.inkSecondary,
  },
});
