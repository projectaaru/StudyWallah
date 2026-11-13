import React, { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
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
import { LoadingView } from '../components/LoadingView';
import { PrimaryButton } from '../components/PrimaryButton';
import { SectionHeader } from '../components/SectionHeader';
import { StatusIndicator } from '../components/StatusIndicator';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/apiClient';
import { COLORS, SHADOWS } from '../theme/tokens';
import { formatDateTime12Hour, formatTime12Hour } from '../utils/time';

export function FreedomDashboardScreen() {
  const { token, user, initialInvitation, logout } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [invitation, setInvitation] = useState(initialInvitation);
  const [signals, setSignals] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acking, setAcking] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const [showSendModal, setShowSendModal] = useState(false);
  const [signalContent, setSignalContent] = useState('');
  const [sendingSignal, setSendingSignal] = useState(false);
  const [sendSignalError, setSendSignalError] = useState('');
  const [sendSignalSuccess, setSendSignalSuccess] = useState('');
  const [permissionNotice, setPermissionNotice] = useState('');

  const loadData = useCallback(
    async ({ silent = false, targetPage = 1 } = {}) => {
      if (!token) return;
      if (!silent) setLoading(true);
      setError('');
      try {
        const [dashResp, invResp, sigPage] = await Promise.all([
          apiClient.getFreedomDashboard(token),
          apiClient.getFreedomInvitation(token),
          apiClient.getFreedomSignals(token, targetPage, 20),
        ]);
        setDashboard(dashResp);
        setInvitation(invResp);
        setSignals(sigPage.signals || []);
        setPage(sigPage.page || 1);
        setTotalPages(Math.max(1, sigPage.total_pages || 1));
      } catch (err) {
        setError(err?.message || 'Failed to load dashboard.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadData({ targetPage: 1 });
  }, [loadData]);

  // Refresh via REST when app returns to foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        loadData({ silent: true, targetPage: page });
      }
    });
    return () => sub.remove();
  }, [loadData, page]);

  const handleViewedAll = async () => {
    if (!token) return;
    setAcking(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await apiClient.viewedAllSignals(token);
      setSuccessMsg(
        res.acknowledged_count > 0
          ? `Acknowledged ${res.acknowledged_count} pending update(s).`
          : 'All updates were already acknowledged.'
      );
      await loadData({ silent: true, targetPage: page });
    } catch (err) {
      setError(err?.message || 'Unable to acknowledge updates.');
    } finally {
      setAcking(false);
    }
  };

  const handleFreedomSendSignal = async () => {
    const trimmed = signalContent.trim();
    if (!trimmed) {
      setSendSignalError('Please enter a short signal update before sending.');
      return;
    }

    setSendingSignal(true);
    setSendSignalError('');
    setSendSignalSuccess('');
    setPermissionNotice('');

    try {
      await apiClient.createSecretSignal(token, trimmed);
      setSendSignalSuccess('Signal sent successfully.');
      setSignalContent('');
      await loadData({ silent: true, targetPage: page });
    } catch (err) {
      if (err?.status === 403 || err?.code === 'FORBIDDEN') {
        setSendSignalError('Backend Permission Restriction (HTTP 403 Forbidden)');
        setPermissionNotice(
          'Current backend API restricts signal creation (POST /api/v1/secret/signals) exclusively to the SECRET_PARTNER role. Backend code was preserved unchanged. A dedicated Freedom Partner signal endpoint (e.g. POST /api/v1/freedom/signals) or role permission update is required on the server.'
        );
      } else {
        setSendSignalError(err?.message || 'Unable to send signal.');
      }
    } finally {
      setSendingSignal(false);
    }
  };

  const handleShareOrCopyCode = async () => {
    if (!invitation?.code) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(invitation.code);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
        return;
      } catch {
        // Fall through to Share
      }
    }
    try {
      await Share.share({
        message: `StudyWallah invitation code: ${invitation.code}`,
      });
    } catch {
      // User dismissed share sheet
    }
  };

  if (loading && !dashboard) {
    return (
      <View style={styles.root}>
        <AppHeader subtitle="Faculty Evaluation Desk" onLogout={logout} />
        <LoadingView message="Loading activity dashboard..." />
      </View>
    );
  }

  const tz = dashboard?.timezone || 'Asia/Kolkata';
  const status = dashboard?.status || 'GREEN';
  const unreadCount = dashboard?.unread_count ?? 0;
  const pairStatus = invitation?.pair_status || dashboard?.pair_status || 'PENDING';
  const isPairActive = pairStatus === 'ACTIVE';

  return (
    <View style={styles.root}>
      <AppHeader
        subtitle={`${user?.name ? `${user.name} • ` : ''}Academic Evaluator`}
        onLogout={logout}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData({ silent: true, targetPage: page });
            }}
          />
        }
      >
        <StatusIndicator
          status={status}
          label={
            status === 'RED'
              ? `${unreadCount} Unread Update${unreadCount === 1 ? '' : 's'}`
              : 'All Updates Acknowledged'
          }
          sublabel={
            status === 'RED'
              ? 'Tap Viewed All below once you have reviewed pending submissions'
              : 'Enrolled students see VERIFIED evaluation status'
          }
        />

        <FeedbackBanner type="error" message={error} />
        <FeedbackBanner type="success" message={successMsg} />

        {/* Activity Metrics Grid */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: COLORS.accentBlueBg }]}>
              <Ionicons name="today-outline" size={16} color={COLORS.accentBlue} />
            </View>
            <Text style={styles.statValue}>{dashboard?.today_total ?? 0}</Text>
            <Text style={styles.statLabel}>Today&apos;s Updates</Text>
          </Card>

          <Card style={styles.statCard}>
            <View
              style={[
                styles.statIconBox,
                { backgroundColor: unreadCount > 0 ? COLORS.statusRedBg : COLORS.statusGreenBg },
              ]}
            >
              <Ionicons
                name="mail-unread-outline"
                size={16}
                color={unreadCount > 0 ? COLORS.statusRed : COLORS.statusGreen}
              />
            </View>
            <Text style={[styles.statValue, unreadCount > 0 && styles.unreadHighlight]}>
              {unreadCount}
            </Text>
            <Text style={styles.statLabel}>Total Unread</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: COLORS.bgSubtle }]}>
              <Ionicons name="time-outline" size={16} color={COLORS.inkPrimary} />
            </View>
            <Text style={styles.statTime} numberOfLines={1}>
              {formatTime12Hour(dashboard?.last_update_at, tz)}
            </Text>
            <Text style={styles.statLabel}>Last Update</Text>
          </Card>
        </View>

        {/* Primary Action Bar */}
        <View style={styles.actionsColumn}>
          <View style={styles.actionsRow}>
            <PrimaryButton
              title="Post Sync Note"
              icon="send-outline"
              variant="dark"
              onPress={() => {
                setSendSignalError('');
                setSendSignalSuccess('');
                setPermissionNotice('');
                setShowSendModal(true);
              }}
              style={styles.actionBtn}
            />
            <PrimaryButton
              title="Viewed All"
              icon="checkmark-done-outline"
              variant="green"
              loading={acking}
              onPress={handleViewedAll}
              style={styles.actionBtn}
            />
          </View>
          <PrimaryButton
            title="Refresh Dashboard"
            icon="refresh-outline"
            variant="outline"
            onPress={() => loadData({ silent: true, targetPage: page })}
            style={styles.refreshBtnFull}
          />
        </View>

        {/* Student Enrollment Code Card */}
        {invitation ? (
          <Card style={styles.inviteCard}>
            <SectionHeader
              icon="key-outline"
              title="Classroom Enrollment Code"
              rightElement={
                <View
                  style={[
                    styles.pairBadge,
                    isPairActive ? styles.pairBadgeActive : styles.pairBadgePending,
                  ]}
                >
                  <View
                    style={[
                      styles.pairDot,
                      { backgroundColor: isPairActive ? COLORS.statusGreen : COLORS.accentAmber },
                    ]}
                  />
                  <Text
                    style={[
                      styles.pairBadgeText,
                      { color: isPairActive ? COLORS.statusGreenDark : COLORS.accentAmber },
                    ]}
                  >
                    {pairStatus}
                  </Text>
                </View>
              }
            />

            <View style={styles.inviteCodeBox}>
              <Text style={styles.inviteCode}>{invitation.code}</Text>
              <TouchableOpacity
                onPress={handleShareOrCopyCode}
                style={styles.shareBtn}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={copiedCode ? 'checkmark-outline' : Platform.OS === 'web' ? 'copy-outline' : 'share-social-outline'}
                  size={15}
                  color={COLORS.inkPrimary}
                />
                <Text style={styles.shareBtnText}>
                  {copiedCode ? 'Copied' : Platform.OS === 'web' ? 'Copy' : 'Share'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inviteMeta}>
              {invitation.used
                ? 'Single-use code claimed and linked with student profile.'
                : `Single-use code • Expires ${formatDateTime12Hour(invitation.expires_at, tz)}`}
            </Text>
          </Card>
        ) : null}

        {/* Recent Submissions Feed */}
        <Card style={styles.signalsCard}>
          <SectionHeader
            icon="notifications-outline"
            title="Recent Submissions"
            badgeText={`Page ${page} of ${totalPages}`}
          />

          {signals.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={24} color={COLORS.inkMuted} />
              </View>
              <Text style={styles.emptyTitle}>No submissions received yet</Text>
              <Text style={styles.emptySub}>
                Share your enrollment code with the student and tap Refresh once they submit study tasks.
              </Text>
            </View>
          ) : (
            <View style={styles.signalsList}>
              {signals.map((item) => (
                <View key={item.id} style={styles.signalItem}>
                  <View style={styles.signalTopRow}>
                    <View
                      style={[
                        styles.itemPill,
                        item.acknowledged ? styles.pillGreen : styles.pillRed,
                      ]}
                    >
                      <View
                        style={[
                          styles.pillDot,
                          {
                            backgroundColor: item.acknowledged
                              ? COLORS.statusGreen
                              : COLORS.statusRed,
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.itemPillText,
                          item.acknowledged ? styles.pillGreenText : styles.pillRedText,
                        ]}
                      >
                        {item.acknowledged ? 'Acknowledged' : 'Unread'}
                      </Text>
                    </View>
                    <Text style={styles.signalTime}>
                      {formatDateTime12Hour(item.created_at, tz)}
                    </Text>
                  </View>

                  <Text style={styles.signalContent}>{item.content}</Text>

                  {item.acknowledged && item.acknowledged_at ? (
                    <Text style={styles.ackMeta}>
                      Viewed {formatDateTime12Hour(item.acknowledged_at, tz)}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {totalPages > 1 ? (
            <View style={styles.paginationRow}>
              <PrimaryButton
                title="Previous"
                icon="chevron-back-outline"
                variant="outline"
                disabled={page <= 1}
                onPress={() => loadData({ silent: true, targetPage: page - 1 })}
                style={styles.pageBtn}
              />
              <PrimaryButton
                title="Next"
                icon="chevron-forward-outline"
                variant="outline"
                disabled={page >= totalPages}
                onPress={() => loadData({ silent: true, targetPage: page + 1 })}
                style={styles.pageBtn}
              />
            </View>
          ) : null}
        </Card>
      </ScrollView>

      {/* Send Signal Modal (Consistent with Secret Partner Interaction) */}
      <Modal
        visible={showSendModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSendModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowSendModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={styles.sendBadge}>
                <Ionicons name="school-outline" size={14} color={COLORS.accentBlue} />
                <Text style={styles.sendBadgeText}>Academic Sync Interaction</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSendModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={COLORS.inkMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSendTitle}>Post Academic Sync Note</Text>
            <Text style={styles.modalSendSub}>
              Send a real-time study verification sync note to the linked student portal.
            </Text>

            <TextInput
              value={signalContent}
              onChangeText={setSignalContent}
              placeholder="e.g. Chapter 4 NCERT formulas verified • Good accuracy"
              placeholderTextColor={COLORS.inkSubtle}
              multiline
              maxLength={500}
              style={styles.modalInput}
            />
            <Text style={styles.charCount}>{signalContent.length}/500 characters</Text>

            <FeedbackBanner type="error" message={sendSignalError} />
            <FeedbackBanner type="success" message={sendSignalSuccess} />

            {permissionNotice ? (
              <View style={styles.permissionCard}>
                <View style={styles.permissionCardHeader}>
                  <Ionicons name="shield-outline" size={16} color={COLORS.accentAmber} />
                  <Text style={styles.permissionCardTitle}>Server Role Permission Notice</Text>
                </View>
                <Text style={styles.permissionCardText}>{permissionNotice}</Text>
              </View>
            ) : null}

            <View style={styles.modalBtnRow}>
              <PrimaryButton
                title="Post Sync Note"
                icon="send-outline"
                variant="dark"
                loading={sendingSignal}
                onPress={handleFreedomSendSignal}
                style={styles.modalActionBtn}
              />
              <PrimaryButton
                title="Close"
                variant="outline"
                onPress={() => setShowSendModal(false)}
                style={styles.modalCancelBtn}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingBottom: 36,
    gap: 13,
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 13,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  statIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.inkPrimary,
  },
  unreadHighlight: {
    color: COLORS.statusRed,
  },
  statTime: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.inkPrimary,
    textAlign: 'center',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.inkMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 2,
    ...SHADOWS.sm,
  },
  refreshBtn: {
    flex: 1,
  },
  inviteCard: {
    gap: 10,
  },
  pairBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pairBadgeActive: {
    backgroundColor: COLORS.statusGreenBg,
  },
  pairBadgePending: {
    backgroundColor: COLORS.accentAmberBg,
  },
  pairDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pairBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inviteCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgCanvas,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.borderMedium,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  inviteCode: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2.5,
    color: COLORS.inkPrimary,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shareBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.inkPrimary,
  },
  inviteMeta: {
    fontSize: 12,
    color: COLORS.inkMuted,
  },
  signalsCard: {
    gap: 12,
  },
  signalsList: {
    gap: 10,
  },
  emptyBox: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.inkPrimary,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.inkMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  signalItem: {
    backgroundColor: COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 12,
    gap: 7,
  },
  signalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillRed: {
    backgroundColor: COLORS.statusRedBg,
  },
  pillGreen: {
    backgroundColor: COLORS.statusGreenBg,
  },
  itemPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pillRedText: {
    color: COLORS.statusRedDark,
  },
  pillGreenText: {
    color: COLORS.statusGreenDark,
  },
  signalTime: {
    fontSize: 11,
    color: COLORS.inkMuted,
    fontWeight: '600',
  },
  signalContent: {
    fontSize: 14,
    color: COLORS.inkPrimary,
    lineHeight: 20,
    fontWeight: '500',
  },
  ackMeta: {
    fontSize: 11,
    color: COLORS.inkMuted,
  },
  paginationRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  pageBtn: {
    flex: 1,
  },
  actionsColumn: {
    gap: 9,
  },
  refreshBtnFull: {
    width: '100%',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: COLORS.bgCard,
    borderRadius: 18,
    padding: 20,
    gap: 10,
    ...SHADOWS.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.accentBlueBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  sendBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentBlue,
  },
  modalSendTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.inkPrimary,
    marginTop: 2,
  },
  modalSendSub: {
    fontSize: 12,
    color: COLORS.inkSecondary,
    lineHeight: 18,
  },
  modalInput: {
    minHeight: 86,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    borderRadius: 11,
    backgroundColor: COLORS.bgCanvas,
    padding: 12,
    fontSize: 14,
    color: COLORS.inkPrimary,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: COLORS.inkMuted,
    textAlign: 'right',
    marginTop: -6,
  },
  permissionCard: {
    backgroundColor: COLORS.accentAmberBg,
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 11,
    padding: 11,
    gap: 5,
  },
  permissionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  permissionCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accentAmber,
  },
  permissionCardText: {
    fontSize: 12,
    color: '#78350F',
    lineHeight: 17,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalActionBtn: {
    flex: 2,
  },
  modalCancelBtn: {
    flex: 1,
  },
});
