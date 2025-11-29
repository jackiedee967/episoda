import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  ImageBackground,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Alert,
  Platform
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { 
  Users, 
  FileText, 
  MessageSquare, 
  Tv, 
  AlertTriangle,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  CheckCircle,
  XCircle,
  BarChart3,
  Clock
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/contexts/AuthContext';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { Asset } from 'expo-asset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const appBackground = Asset.fromModule(require('../../assets/images/app-background.jpg')).uri;

interface AdminStats {
  total_users: number;
  active_users_7d: number;
  active_users_30d: number;
  total_posts: number;
  posts_today: number;
  posts_7d: number;
  total_comments: number;
  total_shows_logged: number;
  total_episodes_watched: number;
  total_playlists: number;
  pending_reports: number;
}

interface PostReport {
  id: string;
  post_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter: {
    user_id: string;
    username: string;
    display_name: string;
  };
  post: {
    id: string;
    content: string;
    user_id: string;
    author: {
      user_id: string;
      username: string;
      display_name: string;
    };
  };
}

interface UserReport {
  id: string;
  reported_user_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter: {
    user_id: string;
    username: string;
    display_name: string;
  };
  reported_user: {
    user_id: string;
    username: string;
    display_name: string;
  };
}

interface SearchUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_suspended: boolean;
  suspended_reason: string | null;
  created_at: string;
  post_count: number;
  follower_count: number;
}

type TabType = 'overview' | 'reports' | 'users';

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentUserData } = useData();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [postReports, setPostReports] = useState<PostReport[]>([]);
  const [userReports, setUserReports] = useState<UserReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const isAdmin = (currentUserData as any)?.is_admin === true;

  const loadStats = useCallback(async () => {
    try {
      const { data, error } = await (supabase.rpc as any)('get_admin_stats');
      if (error) {
        console.error('Error loading admin stats:', error);
        return;
      }
      setStats(data);
    } catch (error) {
      console.error('Error loading admin stats:', error);
    }
  }, []);

  const loadReports = useCallback(async () => {
    try {
      const { data, error } = await (supabase.rpc as any)('get_admin_reports', { report_status: 'pending' });
      if (error) {
        console.error('Error loading reports:', error);
        return;
      }
      setPostReports(data?.post_reports || []);
      setUserReports(data?.user_reports || []);
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([loadStats(), loadReports()]);
    setIsLoading(false);
  }, [loadStats, loadReports]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, [loadData]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, loadData]);

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await (supabase.rpc as any)('admin_search_users', { 
        search_query: query,
        result_limit: 20
      });
      if (error) {
        console.error('Error searching users:', error);
        return;
      }
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  const handleResolveReport = async (reportId: string, deletePost: boolean = false) => {
    const confirmed = Platform.OS === 'web' 
      ? window.confirm(deletePost ? 'Delete this post and resolve the report?' : 'Dismiss this report?')
      : true;

    if (!confirmed) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { error } = await (supabase.rpc as any)('resolve_post_report', {
        report_id: reportId,
        admin_id: user?.id,
        new_status: deletePost ? 'resolved' : 'dismissed',
        delete_post: deletePost
      });

      if (error) {
        console.error('Error resolving report:', error);
        return;
      }

      await loadReports();
      await loadStats();
    } catch (error) {
      console.error('Error resolving report:', error);
    }
  };

  const handleSuspendUser = async (userId: string, username: string) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Suspend user @${username}? They won't be able to use the app.`)
      : true;

    if (!confirmed) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const { error } = await (supabase.rpc as any)('suspend_user', {
        target_user_id: userId,
        admin_id: user?.id,
        reason: 'Suspended by admin'
      });

      if (error) {
        console.error('Error suspending user:', error);
        return;
      }

      await searchUsers(searchQuery);
      await loadReports();
    } catch (error) {
      console.error('Error suspending user:', error);
    }
  };

  const handleUnsuspendUser = async (userId: string, username: string) => {
    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Unsuspend user @${username}?`)
      : true;

    if (!confirmed) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { error } = await (supabase.rpc as any)('unsuspend_user', {
        target_user_id: userId
      });

      if (error) {
        console.error('Error unsuspending user:', error);
        return;
      }

      await searchUsers(searchQuery);
    } catch (error) {
      console.error('Error unsuspending user:', error);
    }
  };

  if (!isAdmin) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ImageBackground source={{ uri: appBackground }} style={styles.backgroundImage}>
          <View style={[styles.container, { paddingTop: insets.top + 60 }]}>
            <View style={styles.accessDenied}>
              <Shield size={48} color={colors.error} />
              <Text style={styles.accessDeniedTitle}>Access Denied</Text>
              <Text style={styles.accessDeniedText}>
                You don't have admin permissions to view this page.
              </Text>
              <Pressable style={styles.backBtn} onPress={() => router.back()}>
                <Text style={styles.backBtnText}>Go Back</Text>
              </Pressable>
            </View>
          </View>
        </ImageBackground>
      </>
    );
  }

  const renderStatCard = (
    icon: React.ReactNode, 
    label: string, 
    value: number | string,
    subLabel?: string
  ) => (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subLabel && <Text style={styles.statSubLabel}>{subLabel}</Text>}
    </View>
  );

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Dashboard Overview</Text>
      
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : stats ? (
        <>
          <View style={styles.statsGrid}>
            {renderStatCard(
              <Users size={24} color={colors.primary} />,
              'Total Users',
              stats.total_users
            )}
            {renderStatCard(
              <BarChart3 size={24} color={colors.greenHighlight} />,
              'Active (7d)',
              stats.active_users_7d
            )}
            {renderStatCard(
              <FileText size={24} color={colors.blue} />,
              'Total Posts',
              stats.total_posts
            )}
            {renderStatCard(
              <Clock size={24} color="#9334e9" />,
              'Posts Today',
              stats.posts_today
            )}
          </View>

          <View style={styles.statsGrid}>
            {renderStatCard(
              <MessageSquare size={24} color="#FF6B6B" />,
              'Comments',
              stats.total_comments
            )}
            {renderStatCard(
              <Tv size={24} color="#4ECDC4" />,
              'Shows Logged',
              stats.total_shows_logged
            )}
          </View>

          <View style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <AlertTriangle size={20} color={stats.pending_reports > 0 ? colors.error : colors.greenHighlight} />
              <Text style={[
                styles.alertTitle,
                { color: stats.pending_reports > 0 ? colors.error : colors.greenHighlight }
              ]}>
                {stats.pending_reports > 0 
                  ? `${stats.pending_reports} Pending Reports` 
                  : 'No Pending Reports'}
              </Text>
            </View>
            {stats.pending_reports > 0 && (
              <Pressable 
                style={styles.alertAction}
                onPress={() => setActiveTab('reports')}
              >
                <Text style={styles.alertActionText}>View Reports</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Quick Stats</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Posts (7 days)</Text>
              <Text style={styles.infoValue}>{stats.posts_7d}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Active Users (30d)</Text>
              <Text style={styles.infoValue}>{stats.active_users_30d}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Episodes Watched</Text>
              <Text style={styles.infoValue}>{stats.total_episodes_watched}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Playlists Created</Text>
              <Text style={styles.infoValue}>{stats.total_playlists}</Text>
            </View>
          </View>
        </>
      ) : (
        <Text style={styles.errorText}>Failed to load stats</Text>
      )}
    </View>
  );

  const renderReports = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Pending Reports</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          {postReports.length === 0 && userReports.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle size={48} color={colors.greenHighlight} />
              <Text style={styles.emptyStateText}>No pending reports!</Text>
              <Text style={styles.emptyStateSubtext}>All clear for now</Text>
            </View>
          ) : (
            <>
              {postReports.length > 0 && (
                <>
                  <Text style={styles.subSectionTitle}>Post Reports ({postReports.length})</Text>
                  {postReports.map((report) => (
                    <View key={report.id} style={styles.reportCard}>
                      <View style={styles.reportHeader}>
                        <Text style={styles.reportReason}>{report.reason}</Text>
                        <Text style={styles.reportDate}>
                          {new Date(report.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      
                      <View style={styles.reportContent}>
                        <Text style={styles.reportLabel}>Post by @{report.post?.author?.username}:</Text>
                        <Text style={styles.reportText} numberOfLines={3}>
                          {report.post?.content || 'Post content unavailable'}
                        </Text>
                      </View>

                      <Text style={styles.reporterText}>
                        Reported by @{report.reporter?.username}
                      </Text>

                      <View style={styles.reportActions}>
                        <Pressable 
                          style={[styles.actionBtn, styles.dismissBtn]}
                          onPress={() => handleResolveReport(report.id, false)}
                        >
                          <XCircle size={16} color={colors.textSecondary} />
                          <Text style={styles.dismissBtnText}>Dismiss</Text>
                        </Pressable>
                        <Pressable 
                          style={[styles.actionBtn, styles.deleteBtn]}
                          onPress={() => handleResolveReport(report.id, true)}
                        >
                          <Trash2 size={16} color="#fff" />
                          <Text style={styles.deleteBtnText}>Delete Post</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </>
              )}

              {userReports.length > 0 && (
                <>
                  <Text style={styles.subSectionTitle}>User Reports ({userReports.length})</Text>
                  {userReports.map((report) => (
                    <View key={report.id} style={styles.reportCard}>
                      <View style={styles.reportHeader}>
                        <Text style={styles.reportReason}>{report.reason}</Text>
                        <Text style={styles.reportDate}>
                          {new Date(report.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      
                      <View style={styles.reportContent}>
                        <Text style={styles.reportLabel}>
                          User: @{report.reported_user?.username}
                        </Text>
                      </View>

                      <Text style={styles.reporterText}>
                        Reported by @{report.reporter?.username}
                      </Text>

                      <View style={styles.reportActions}>
                        <Pressable 
                          style={[styles.actionBtn, styles.suspendBtn]}
                          onPress={() => handleSuspendUser(
                            report.reported_user_id, 
                            report.reported_user?.username || ''
                          )}
                        >
                          <ShieldOff size={16} color="#fff" />
                          <Text style={styles.deleteBtnText}>Suspend User</Text>
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
    </View>
  );

  const renderUsers = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>User Management</Text>

      <View style={styles.searchContainer}>
        <Search size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
      </View>

      {searchResults.length > 0 ? (
        searchResults.map((user) => (
          <View key={user.user_id} style={styles.userCard}>
            <View style={styles.userInfo}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {user.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>
                  {user.display_name || user.username}
                  {user.is_suspended && (
                    <Text style={styles.suspendedBadge}> (Suspended)</Text>
                  )}
                </Text>
                <Text style={styles.userHandle}>@{user.username}</Text>
                <Text style={styles.userStats}>
                  {user.post_count} posts · {user.follower_count} followers
                </Text>
              </View>
            </View>
            
            <View style={styles.userActions}>
              {user.is_suspended ? (
                <Pressable 
                  style={[styles.userActionBtn, styles.unsuspendBtn]}
                  onPress={() => handleUnsuspendUser(user.user_id, user.username)}
                >
                  <Shield size={16} color={colors.greenHighlight} />
                  <Text style={styles.unsuspendBtnText}>Unsuspend</Text>
                </Pressable>
              ) : (
                <Pressable 
                  style={[styles.userActionBtn, styles.suspendBtn]}
                  onPress={() => handleSuspendUser(user.user_id, user.username)}
                >
                  <ShieldOff size={16} color="#fff" />
                  <Text style={styles.suspendBtnText}>Suspend</Text>
                </Pressable>
              )}
            </View>
          </View>
        ))
      ) : searchQuery ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No users found</Text>
          <Text style={styles.emptyStateSubtext}>Try a different search term</Text>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Search size={48} color={colors.textSecondary} />
          <Text style={styles.emptyStateText}>Search for users</Text>
          <Text style={styles.emptyStateSubtext}>Enter a username to find and manage users</Text>
        </View>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
          statusBarTranslucent: true,
          statusBarBackgroundColor: 'transparent',
          contentStyle: { backgroundColor: 'transparent' },
        }} 
      />
      <ImageBackground
        source={{ uri: appBackground }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={[styles.customHeader, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.tabBar}>
          {(['overview', 'reports', 'users'] as TabType[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab);
              }}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'reports' && renderReports()}
          {activeTab === 'users' && renderUsers()}
          
          <View style={{ height: 100 }} />
        </ScrollView>
      </ImageBackground>
    </>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    ...typography.subtitle,
    fontWeight: '600',
    color: colors.text,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.p2,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  tabContent: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    ...typography.titleL,
    color: colors.text,
    marginBottom: 16,
  },
  subSectionTitle: {
    ...typography.subtitle,
    fontWeight: '600',
    color: colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    ...typography.titleL,
    color: colors.text,
    fontSize: 28,
  },
  statLabel: {
    ...typography.p3Regular,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  statSubLabel: {
    ...typography.p3Regular,
    color: colors.textSecondary,
    opacity: 0.7,
  },
  alertCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  alertTitle: {
    ...typography.subtitle,
    fontWeight: '600',
  },
  alertAction: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  alertActionText: {
    ...typography.p2Bold,
    color: colors.background,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  infoTitle: {
    ...typography.subtitle,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    ...typography.p2,
    color: colors.textSecondary,
  },
  infoValue: {
    ...typography.p2Bold,
    color: colors.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    ...typography.subtitle,
    color: colors.text,
    marginTop: 16,
  },
  emptyStateSubtext: {
    ...typography.p2,
    color: colors.textSecondary,
    marginTop: 4,
  },
  reportCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  reportReason: {
    ...typography.subtitle,
    fontWeight: '600',
    color: colors.error,
    flex: 1,
  },
  reportDate: {
    ...typography.p3Regular,
    color: colors.textSecondary,
  },
  reportContent: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  reportLabel: {
    ...typography.p3Regular,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  reportText: {
    ...typography.p2,
    color: colors.text,
  },
  reporterText: {
    ...typography.p3Regular,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  reportActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  dismissBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dismissBtnText: {
    ...typography.p2,
    color: colors.textSecondary,
  },
  deleteBtn: {
    backgroundColor: colors.error,
  },
  deleteBtnText: {
    ...typography.p2Bold,
    color: '#fff',
  },
  suspendBtn: {
    backgroundColor: '#FF6B6B',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    ...typography.p2,
    color: colors.text,
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    ...typography.subtitle,
    fontWeight: '600',
    color: colors.background,
    fontSize: 20,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    ...typography.subtitle,
    fontWeight: '600',
    color: colors.text,
  },
  userHandle: {
    ...typography.p2,
    color: colors.textSecondary,
  },
  userStats: {
    ...typography.p3Regular,
    color: colors.textSecondary,
    marginTop: 2,
  },
  suspendedBadge: {
    ...typography.p3Bold,
    color: colors.error,
  },
  userActions: {
    flexDirection: 'row',
    gap: 12,
  },
  userActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  suspendBtnText: {
    ...typography.p2Bold,
    color: '#fff',
  },
  unsuspendBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.greenHighlight,
  },
  unsuspendBtnText: {
    ...typography.p2Bold,
    color: colors.greenHighlight,
  },
  accessDenied: {
    alignItems: 'center',
    padding: 40,
  },
  accessDeniedTitle: {
    ...typography.titleL,
    color: colors.text,
    marginTop: 16,
  },
  accessDeniedText: {
    ...typography.p2,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  backBtn: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  backBtnText: {
    ...typography.p2Bold,
    color: colors.background,
  },
  errorText: {
    ...typography.p2,
    color: colors.error,
    textAlign: 'center',
    marginTop: 40,
  },
});
