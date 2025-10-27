import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Image,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import PostCard from '@/components/PostCard';
import PostModal from '@/components/PostModal';
import TabSelector, { Tab } from '@/components/TabSelector';
import ButtonL from '@/components/ButtonL';
import PostTags from '@/components/PostTags';
import SortDropdown, { SortOption } from '@/components/SortDropdown';
import { Vector3Divider } from '@/components/Vector3Divider';
import { SearchDuotoneLine } from '@/components/SearchDuotoneLine';
import FloatingTabBar from '@/components/FloatingTabBar';
import { mockEpisodes, mockShows } from '@/data/mockData';
import { useData } from '@/contexts/DataContext';
import tokens from '@/styles/tokens';
import * as Haptics from 'expo-haptics';
import { Star } from 'lucide-react-native';

type TabKey = 'friends' | 'all';

const FEED_TABS: Tab[] = [
  { key: 'friends', label: 'Friends' },
  { key: 'all', label: 'Everyone' },
];

export default function EpisodeHub() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { posts, isFollowing, currentUser } = useData();
  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (activeTab === 'friends') {
      setSortBy('recent');
    } else if (activeTab === 'all') {
      setSortBy('hot');
    }
  }, [activeTab]);

  const episode = mockEpisodes.find((e) => e.id === id);
  const show = episode ? mockShows.find((s) => s.id === episode.showId) : undefined;
  
  // Filter posts for this episode
  let episodePosts = posts.filter((p) => 
    p.episodes?.some((e) => e.id === id)
  );

  // Apply Friends tab filter
  if (activeTab === 'friends') {
    episodePosts = episodePosts.filter(post => post.user.id === currentUser.id || isFollowing(post.user.id));
  }

  // Apply sorting
  if (sortBy === 'hot') {
    episodePosts = [...episodePosts].sort((a, b) => {
      const engagementA = a.likes + a.comments;
      const engagementB = b.likes + b.comments;
      return engagementB - engagementA;
    });
  } else {
    episodePosts = [...episodePosts].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  if (!episode || !show) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorText}>Episode not found</Text>
      </View>
    );
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/search');
  };

  const handleCloseModal = () => {
    setModalVisible(false);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header with Back and Search */}
          <View style={styles.topBar}>
            <Pressable style={styles.backButton} onPress={handleBack}>
              <IconSymbol name="chevron.left" size={16} color={tokens.colors.pureWhite} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <View style={styles.searchContainer}>
              <View style={styles.searchInner}>
                <View style={styles.searchIconWrapper}>
                  <SearchDuotoneLine />
                </View>
              </View>
            </View>
          </View>

          {/* Episode and Show Tags */}
          <View style={styles.tagsRow}>
            <PostTags
              prop="Large"
              state="S_E_"
              text={`S${episode.seasonNumber} E${episode.episodeNumber}`}
            />
            <PostTags
              prop="Large"
              state="Show_Name"
              text={show.title}
            />
          </View>

          {/* Episode Info Card */}
          <View style={styles.episodeInfoContainer}>
            <Text style={styles.sectionTitle}>{episode.title}</Text>
            <View style={styles.episodeCard}>
              <View style={styles.thumbnailPlaceholder}>
                {show.posterUrl && (
                  <Image
                    source={{ uri: show.posterUrl }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                )}
              </View>
              <View style={styles.episodeDetails}>
                <Text style={styles.episodeDescription} numberOfLines={3}>
                  {episode.description}
                </Text>
                <View style={styles.episodeStats}>
                  <View style={styles.ratingContainer}>
                    <Star 
                      size={10} 
                      fill={tokens.colors.greenHighlight} 
                      color={tokens.colors.greenHighlight}
                    />
                    <Text style={styles.ratingText}>{episode.rating.toFixed(1)}</Text>
                  </View>
                  <Text style={styles.postCountText}>{episode.postCount} posts</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Log Button */}
          <View style={styles.buttonContainer}>
            <ButtonL onPress={() => setModalVisible(true)}>
              Log Episode
            </ButtonL>
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <Vector3Divider />
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TabSelector
              tabs={FEED_TABS}
              activeTab={activeTab}
              onTabChange={(tabKey) => setActiveTab(tabKey as TabKey)}
            />
          </View>

          {/* Feed with Sort */}
          <View style={styles.feedContainer}>
            <SortDropdown 
              sortBy={sortBy}
              onSortChange={setSortBy}
              style={styles.sortDropdown}
            />
            <View style={styles.postsContainer}>
              {episodePosts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    {activeTab === 'friends' ? 'No posts from friends yet' : 'No posts yet'}
                  </Text>
                </View>
              ) : (
                episodePosts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))
              )}
            </View>
          </View>
        </ScrollView>
      </View>
      
      <PostModal 
        visible={modalVisible} 
        onClose={handleCloseModal} 
        preselectedShow={show}
        preselectedEpisodes={[episode]}
      />
      
      <FloatingTabBar 
        tabs={[
          { name: 'Home', icon: 'house.fill', route: '/(home)' },
          { name: 'Search', icon: 'magnifyingglass', route: '/search' },
          { name: 'Notifications', icon: 'bell.fill', route: '/notifications' },
          { name: 'Profile', icon: 'person.fill', route: '/profile' },
        ]} 
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.pageBackground,
    ...Platform.select({
      web: {
        backgroundImage: "url('/app-background.jpg')",
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      } as any,
    }),
  },
  scrollView: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backText: {
    ...tokens.typography.p1,
    color: tokens.colors.pureWhite,
  },
  searchContainer: {
    width: 49,
    height: 40,
  },
  searchInner: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  searchIconWrapper: {
    width: 37,
    height: 22,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  episodeInfoContainer: {
    paddingHorizontal: 20,
    paddingTop: 21,
  },
  sectionTitle: {
    ...tokens.typography.titleL,
    color: tokens.colors.pureWhite,
    marginBottom: 15,
    width: 258,
  },
  episodeCard: {
    flexDirection: 'row',
    gap: 8,
  },
  thumbnailPlaceholder: {
    width: 122,
    height: 72,
    borderRadius: 6,
    backgroundColor: tokens.colors.grey3,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  episodeDetails: {
    flex: 1,
    gap: 11,
  },
  episodeDescription: {
    ...tokens.typography.p1,
    color: tokens.colors.pureWhite,
  },
  episodeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '400',
    color: tokens.colors.grey1,
  },
  postCountText: {
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontWeight: '400',
    color: tokens.colors.grey1,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    paddingTop: 21,
  },
  dividerContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  tabsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  feedContainer: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  sortDropdown: {
    marginBottom: 10,
  },
  postsContainer: {
    gap: 10,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    ...tokens.typography.p1,
    color: tokens.colors.grey1,
  },
  errorText: {
    ...tokens.typography.p1,
    color: tokens.colors.pureWhite,
    textAlign: 'center',
    paddingTop: 40,
  },
});
