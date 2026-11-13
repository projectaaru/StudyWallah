import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS } from '../theme/tokens';
import { Card } from './Card';
import { SectionHeader } from './SectionHeader';

const DEFAULT_CHAPTER_TARGETS = [
  {
    id: 'target-phy',
    subject: 'Physics',
    chapter: 'Ray Optics & Optical Instruments',
    classTag: 'Class 12 • High Weightage',
    progress: 80,
    topicsDone: 4,
    totalTopics: 5,
    accent: COLORS.accentBlue,
    accentBg: COLORS.accentBlueBg,
    icon: 'planet-outline',
    completed: false,
  },
  {
    id: 'target-chem',
    subject: 'Chemistry',
    chapter: 'Chemical Thermodynamics & Energetics',
    classTag: 'Class 11 • Core Concepts',
    progress: 100,
    topicsDone: 5,
    totalTopics: 5,
    accent: COLORS.accentTeal,
    accentBg: COLORS.accentTealBg,
    icon: 'flask-outline',
    completed: true,
  },
  {
    id: 'target-bio',
    subject: 'Biology',
    chapter: 'Principles of Inheritance & Variation',
    classTag: 'Class 12 • 12–15 Qs',
    progress: 40,
    topicsDone: 2,
    totalTopics: 5,
    accent: COLORS.accentGreen,
    accentBg: COLORS.accentGreenBg,
    icon: 'leaf-outline',
    completed: false,
  },
];

export function DailyTargetSection({
  targetCount = 0, // Total tasks sent in 24 hours (e.g. 5, then 7)
  viewedCount = 0, // Viewed/acknowledged tasks in 24 hours (e.g. 5)
  pendingCount = 0, // Pending tasks (e.g. 0, or 2 until next viewed all)
  signalStatus = 'GREEN', // 'RED' | 'GREEN' | 'BLACK'
  statusNote = '',
  onRefresh = null,
}) {
  const [chapters, setChapters] = useState(DEFAULT_CHAPTER_TARGETS);

  const toggleChapter = (id) => {
    setChapters((prev) =>
      prev.map((ch) => {
        if (ch.id === id) {
          const nextCompleted = !ch.completed;
          return {
            ...ch,
            completed: nextCompleted,
            progress: nextCompleted ? 100 : Math.round((ch.topicsDone / ch.totalTopics) * 100),
          };
        }
        return ch;
      })
    );
  };

  const completedCount = chapters.filter((c) => c.completed).length;
  const overallPercent = Math.round(
    chapters.reduce((acc, c) => acc + c.progress, 0) / chapters.length
  );

  const isRed = pendingCount > 0 || signalStatus === 'RED';
  const isGreen = pendingCount === 0 && (targetCount > 0 || signalStatus === 'GREEN');

  return (
    <Card style={styles.container}>
      <SectionHeader
        icon="checkbox-outline"
        title="Daily Targets"
        badgeText={`${completedCount}/3 Done`}
      />

      {/* Target Progress Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryTopRow}>
          <Text style={styles.summaryLabel}>Today&apos;s NCERT Revision Goal</Text>
          <Text style={styles.summaryPercent}>{overallPercent}% Completed</Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${overallPercent}%` }]} />
        </View>
      </View>

      {/* 3 Chapter Target Cards */}
      <View style={styles.targetsList}>
        {chapters.map((ch) => (
          <TouchableOpacity
            key={ch.id}
            onPress={() => toggleChapter(ch.id)}
            activeOpacity={0.8}
            style={[styles.chapterItem, ch.completed && styles.chapterItemDone]}
          >
            <TouchableOpacity
              onPress={() => toggleChapter(ch.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.checkCircle, ch.completed && styles.checkCircleDone]}
            >
              {ch.completed ? (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              ) : (
                <View style={styles.checkInnerCircle} />
              )}
            </TouchableOpacity>

            <View style={styles.chapterInfo}>
              <View style={styles.chapterHeaderRow}>
                <View style={[styles.subjectTag, { backgroundColor: ch.accentBg }]}>
                  <Ionicons name={ch.icon} size={11} color={ch.accent} />
                  <Text style={[styles.subjectTagText, { color: ch.accent }]}>{ch.subject}</Text>
                </View>
                <Text style={styles.chapterClassTag}>{ch.classTag}</Text>
              </View>

              <Text
                style={[styles.chapterTitle, ch.completed && styles.chapterTitleDone]}
                numberOfLines={1}
              >
                {ch.chapter}
              </Text>

              <View style={styles.chapterProgressRow}>
                <View style={styles.chapterMiniTrack}>
                  <View
                    style={[
                      styles.chapterMiniFill,
                      { width: `${ch.progress}%`, backgroundColor: ch.accent },
                    ]}
                  />
                </View>
                <Text style={styles.chapterProgressMeta}>
                  {ch.completed
                    ? 'Completed'
                    : `${ch.topicsDone}/${ch.totalTopics} topics (${ch.progress}%)`}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Today Activity Target (24-Hour Cycle Checklist & Evaluation Tracker) */}
      <View style={styles.activityBox}>
        <View style={styles.activityHeader}>
          <View style={styles.activityTitleRow}>
            <Ionicons name="flame" size={16} color={COLORS.accentAmber} />
            <Text style={styles.activityTitle}>Today Activity Target</Text>
          </View>
          <View style={styles.distinctionBadge}>
            <Text style={styles.distinctionBadgeText}>24-Hr Cycle</Text>
          </View>
        </View>

        <Text style={styles.distinctionNotice}>
          Track daily notes accessed, student submissions, and faculty review checklist.
        </Text>

        <View style={styles.activityMetricsGrid}>
          {/* Box 1: Today Target (Total sent in 24 hours) */}
          <View style={styles.activityMetricCard}>
            <Text style={styles.metricVal}>{targetCount}</Text>
            <Text style={styles.metricLabel}>Today Target</Text>
            <Text style={styles.metricSubLabel}>Total Tasks</Text>
          </View>

          {/* Box 2: Viewed (Reviewed in 24 hours) */}
          <View style={styles.activityMetricCard}>
            <Text style={[styles.metricVal, { color: COLORS.statusGreen }]}>{viewedCount}</Text>
            <Text style={styles.metricLabel}>Viewed</Text>
            <Text style={styles.metricSubLabel}>Evaluated</Text>
          </View>

          {/* Box 3: Pending Tasks (Awaiting review) */}
          <View style={styles.activityMetricCard}>
            <Text
              style={[
                styles.metricVal,
                { color: pendingCount > 0 ? COLORS.statusRed : COLORS.inkPrimary },
              ]}
            >
              {pendingCount}
            </Text>
            <Text style={styles.metricLabel}>Pending Task</Text>
            <Text style={styles.metricSubLabel}>
              {pendingCount > 0 ? 'Awaiting Review' : 'All Clear'}
            </Text>
          </View>
        </View>

        <View style={styles.syncStatusRow}>
          <View style={styles.statusPillRow}>
            <View
              style={[
                styles.metricStatusDot,
                {
                  backgroundColor: isRed
                    ? COLORS.statusRed
                    : isGreen
                      ? COLORS.statusGreen
                      : COLORS.inkPrimary,
                },
              ]}
            />
            <Text
              style={[
                styles.metricValSmall,
                {
                  color: isRed
                    ? COLORS.statusRed
                    : isGreen
                      ? COLORS.statusGreen
                      : COLORS.inkPrimary,
                },
              ]}
            >
              Evaluation Status:{' '}
              {isRed
                ? `${pendingCount} Pending Review`
                : isGreen
                  ? 'All Tasks Verified'
                  : 'Ready for Submissions'}
            </Text>
          </View>
          {statusNote ? <Text style={styles.statusNoteText}>{statusNote}</Text> : null}
        </View>

        {onRefresh ? (
          <TouchableOpacity onPress={onRefresh} style={styles.refreshRow} activeOpacity={0.75}>
            <Ionicons name="sync-outline" size={12} color={COLORS.inkMuted} />
            <Text style={styles.refreshRowText}>Tap to refresh activity targets</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    gap: 12,
  },
  summaryBar: {
    backgroundColor: COLORS.bgCanvas,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 11,
    gap: 6,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.inkPrimary,
  },
  summaryPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.accentBlue,
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: COLORS.bgSubtle,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accentBlue,
    borderRadius: 999,
  },
  targetsList: {
    gap: 8,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 11,
    padding: 11,
  },
  chapterItemDone: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
  },
  checkCircleDone: {
    backgroundColor: COLORS.statusGreen,
    borderColor: COLORS.statusGreen,
  },
  checkInnerCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  chapterInfo: {
    flex: 1,
    gap: 3,
  },
  chapterHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  subjectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  subjectTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  chapterClassTag: {
    fontSize: 10,
    color: COLORS.inkMuted,
    fontWeight: '500',
  },
  chapterTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.inkPrimary,
  },
  chapterTitleDone: {
    textDecorationLine: 'line-through',
    color: COLORS.inkMuted,
  },
  chapterProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  chapterMiniTrack: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.bgSubtle,
    borderRadius: 999,
    overflow: 'hidden',
  },
  chapterMiniFill: {
    height: '100%',
    borderRadius: 999,
  },
  chapterProgressMeta: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.inkMuted,
  },
  activityBox: {
    marginTop: 4,
    backgroundColor: COLORS.bgCanvas,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.inkPrimary,
  },
  distinctionBadge: {
    backgroundColor: COLORS.accentAmberBg,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  distinctionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accentAmber,
  },
  distinctionNotice: {
    fontSize: 11,
    color: COLORS.inkMuted,
    lineHeight: 16,
  },
  activityMetricsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  activityMetricCard: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: 9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...SHADOWS.sm,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.inkPrimary,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.inkPrimary,
    textAlign: 'center',
  },
  metricSubLabel: {
    fontSize: 9,
    color: COLORS.inkMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metricValSmall: {
    fontSize: 12,
    fontWeight: '700',
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexWrap: 'wrap',
    gap: 6,
  },
  statusNoteText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.inkMuted,
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingTop: 3,
  },
  refreshRowText: {
    fontSize: 11,
    color: COLORS.inkMuted,
    fontWeight: '600',
  },
});
