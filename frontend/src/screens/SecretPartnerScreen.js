import React, { useCallback, useEffect, useState } from 'react';
import { AppState, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { Card } from '../components/Card';
import { FeedbackBanner } from '../components/FeedbackBanner';
import { LoadingView } from '../components/LoadingView';
import { PrimaryButton } from '../components/PrimaryButton';
import { SectionHeader } from '../components/SectionHeader';
import { StatusIndicator } from '../components/StatusIndicator';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { COLORS } from '../theme/tokens';

/**
 * Minimal Secret Partner interface.
 * Intentionally displays ONLY the server-calculated RED/GREEN acknowledgement status
 * and an update submission form—never message history or Freedom Partner data.
 */
export function SecretPartnerScreen() {
  const { token, logout } = useAuth();
  const [statusData, setStatusData] = useState(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const fetchStatus = useCallback(
    async ({ silent = false } = {}) => {
      if (!token) return;
      if (!silent) setLoading(true);
      setError('');
      try {
        const res = await apiClient.getSecretSignalStatus(token);
        setStatusData(res);
      } catch (err) {
        setError(err?.message || 'Unable to fetch status.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        fetchStatus({ silent: true });
      }
    });
    return () => sub.remove();
  }, [fetchStatus]);

  const handleSendUpdate = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      setError('Please enter a short update before sending.');
      return;
    }

    setSending(true);
    setError('');
    setFeedback('');
    try {
      await apiClient.createSecretSignal(token, trimmed);
      setContent('');
      setFeedback('Update sent.');
      await fetchStatus({ silent: true });
    } catch (err) {
      setError(err?.message || 'Failed to send update.');
    } finally {
      setSending(false);
    }
  };

  if (loading && !statusData) {
    return (
      <View style={styles.root}>
        <AppHeader subtitle="StudyWallah Portal" onLogout={logout} />
        <LoadingView message="Checking status..." />
      </View>
    );
  }

  const currentStatus = statusData?.status || 'GREEN';
  const isRed = currentStatus === 'RED';

  return (
    <View style={styles.root}>
      <AppHeader subtitle="StudyWallah Portal" onLogout={logout} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchStatus({ silent: true });
            }}
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.statusCard}>
          <SectionHeader icon="pulse-outline" title="Acknowledgement Status" />
          <StatusIndicator
            status={currentStatus}
            size="lg"
            label={isRed ? 'Pending Acknowledgement' : 'All Updates Acknowledged'}
            sublabel={
              isRed
                ? 'One or more updates are awaiting acknowledgement'
                : 'Everything sent so far has been acknowledged'
            }
          />
        </Card>

        <Card style={styles.sendCard}>
          <SectionHeader
            icon="send-outline"
            title="Send Update"
            badgeText={`${content.length}/500`}
          />

          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Write a brief update..."
            placeholderTextColor={COLORS.inkSubtle}
            multiline
            maxLength={500}
            style={styles.input}
          />

          <FeedbackBanner type="error" message={error} />
          <FeedbackBanner type="success" message={feedback} />

          <PrimaryButton
            title="Send Update"
            icon="send-outline"
            onPress={handleSendUpdate}
            loading={sending}
          />

          <PrimaryButton
            title="Refresh Status"
            icon="refresh-outline"
            variant="outline"
            onPress={() => fetchStatus({ silent: true })}
          />
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bgCanvas,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  statusCard: {
    gap: 12,
  },
  sendCard: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    borderRadius: 12,
    padding: 12,
    minHeight: 104,
    fontSize: 15,
    color: COLORS.inkPrimary,
    textAlignVertical: 'top',
    backgroundColor: COLORS.bgCanvas,
  },
});
