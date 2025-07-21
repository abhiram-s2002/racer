import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, Clock, MessageCircle, CheckCircle, XCircle } from 'lucide-react-native';
import { PingInsights, formatResponseTime, getPerformanceRating, getPerformanceColor } from '../utils/pingAnalytics';

interface PingInsightsCardProps {
  insights: PingInsights;
}

export default function PingInsightsCard({ insights }: PingInsightsCardProps) {
  const performanceRating = getPerformanceRating(insights.acceptance_rate, insights.average_response_time_minutes);
  const performanceColor = getPerformanceColor(performanceRating);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TrendingUp size={20} color="#22C55E" />
        <Text style={styles.title}>Ping Analytics</Text>
      </View>

      <View style={styles.statsGrid}>
        {/* Sent Pings */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <MessageCircle size={16} color="#3B82F6" />
            <Text style={styles.statLabel}>Sent</Text>
          </View>
          <Text style={styles.statValue}>{insights.total_pings_sent}</Text>
          <Text style={styles.statSubtext}>
            {insights.remaining_pings} remaining today
          </Text>
        </View>

        {/* Received Pings */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <MessageCircle size={16} color="#8B5CF6" />
            <Text style={styles.statLabel}>Received</Text>
          </View>
          <Text style={styles.statValue}>{insights.total_pings_received}</Text>
          <Text style={styles.statSubtext}>Total received</Text>
        </View>

        {/* Acceptance Rate */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <CheckCircle size={16} color="#22C55E" />
            <Text style={styles.statLabel}>Accepted</Text>
          </View>
          <Text style={styles.statValue}>{insights.accepted_pings}</Text>
          <Text style={styles.statSubtext}>
            {insights.acceptance_rate}% rate
          </Text>
        </View>

        {/* Rejected Pings */}
        <View style={styles.statCard}>
          <View style={styles.statHeader}>
            <XCircle size={16} color="#EF4444" />
            <Text style={styles.statLabel}>Rejected</Text>
          </View>
          <Text style={styles.statValue}>{insights.rejected_pings}</Text>
          <Text style={styles.statSubtext}>Total rejected</Text>
        </View>
      </View>

      {/* Performance Rating */}
      <View style={styles.performanceSection}>
        <View style={styles.performanceHeader}>
          <Text style={styles.performanceLabel}>Performance Rating</Text>
          <View style={[styles.performanceBadge, { backgroundColor: performanceColor + '20' }]}>
            <Text style={[styles.performanceText, { color: performanceColor }]}>
              {performanceRating}
            </Text>
          </View>
        </View>
        
        <View style={styles.performanceDetails}>
          <View style={styles.performanceItem}>
            <Clock size={14} color="#64748B" />
            <Text style={styles.performanceDetailText}>
              Avg Response: {formatResponseTime(insights.average_response_time_minutes)}
            </Text>
          </View>
          <View style={styles.performanceItem}>
            <TrendingUp size={14} color="#64748B" />
            <Text style={styles.performanceDetailText}>
              Acceptance Rate: {insights.acceptance_rate}%
            </Text>
          </View>
        </View>
      </View>

      {/* Daily Progress */}
      <View style={styles.progressSection}>
        <Text style={styles.progressLabel}>Daily Ping Progress</Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${(insights.daily_pings_sent / insights.daily_pings_limit) * 100}%`,
                backgroundColor: insights.daily_pings_sent >= insights.daily_pings_limit ? '#EF4444' : '#22C55E'
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {insights.daily_pings_sent} / {insights.daily_pings_limit} pings used today
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    textAlign: 'center',
  },
  performanceSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  performanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  performanceLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
  },
  performanceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  performanceText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  performanceDetails: {
    gap: 6,
  },
  performanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  performanceDetailText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  progressSection: {
    gap: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
}); 