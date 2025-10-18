
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { NotificationPreferences, SocialLink } from '@/types';
import * as Haptics from 'expo-haptics';
import { Instagram, Music, Globe } from 'lucide-react-native';
import { supabase } from '@/app/integrations/supabase/client';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
  displayName: string;
  username: string;
  bio: string;
  socialLinks: SocialLink[];
  notificationPreferences: NotificationPreferences;
  authMethod: 'apple' | 'sms';
  phoneNumber?: string;
  onSave: (data: {
    displayName: string;
    username: string;
    bio: string;
    socialLinks: SocialLink[];
    notificationPreferences: NotificationPreferences;
  }) => void;
  onDeleteAccount: () => void;
  onLogout: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

// Platform base URLs
const PLATFORM_URLS = {
  instagram: 'https://instagram.com/',
  tiktok: 'https://tiktok.com/@',
  x: 'https://x.com/',
  spotify: 'https://open.spotify.com/user/',
};

export default function SettingsModal({
  visible,
  onClose,
  displayName: initialDisplayName,
  username: initialUsername,
  bio: initialBio,
  socialLinks: initialSocialLinks,
  notificationPreferences: initialNotificationPreferences,
  authMethod,
  phoneNumber,
  onSave,
  onDeleteAccount,
  onLogout,
}: SettingsModalProps) {
  const slideAnim = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [activeTab, setActiveTab] = useState<'account' | 'notifications' | 'security'>('account');

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>(initialSocialLinks);
  const [notificationPreferences, setNotificationPreferences] = useState(initialNotificationPreferences);

  // Username validation states
  const [usernameError, setUsernameError] = useState<string>('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(true);

  // Social link input states (store just the username part)
  const [instagramUsername, setInstagramUsername] = useState('');
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [xUsername, setXUsername] = useState('');
  const [spotifyUsername, setSpotifyUsername] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
      
      // Initialize social link inputs from full URLs
      initializeSocialInputs();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Initialize social inputs by extracting usernames from full URLs
  const initializeSocialInputs = () => {
    const instagram = socialLinks.find(link => link.platform === 'instagram');
    const tiktok = socialLinks.find(link => link.platform === 'tiktok');
    const x = socialLinks.find(link => link.platform === 'x');
    const spotify = socialLinks.find(link => link.platform === 'spotify');
    const website = socialLinks.find(link => link.platform === 'website');

    setInstagramUsername(instagram ? instagram.url.replace(PLATFORM_URLS.instagram, '') : '');
    setTiktokUsername(tiktok ? tiktok.url.replace(PLATFORM_URLS.tiktok, '') : '');
    setXUsername(x ? x.url.replace(PLATFORM_URLS.x, '') : '');
    setSpotifyUsername(spotify ? spotify.url.replace(PLATFORM_URLS.spotify, '') : '');
    setWebsiteUrl(website ? website.url : '');
  };

  // Check if username is available in database
  const checkUsernameAvailability = async (newUsername: string) => {
    if (newUsername === initialUsername) {
      setUsernameError('');
      setUsernameAvailable(true);
      return;
    }

    if (newUsername.trim().length < 3) {
      setUsernameError('Username must be at least 3 characters');
      setUsernameAvailable(false);
      return;
    }

    setIsCheckingUsername(true);
    setUsernameError('');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', newUsername.toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking username:', error);
        setUsernameError('Error checking username availability');
        setUsernameAvailable(false);
      } else if (data) {
        setUsernameError('Username already taken');
        setUsernameAvailable(false);
      } else {
        setUsernameError('');
        setUsernameAvailable(true);
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameError('Error checking username availability');
      setUsernameAvailable(false);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  // Debounced username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username && username !== initialUsername) {
        checkUsernameAvailability(username);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username]);

  const handleSave = () => {
    // Validate username
    if (!usernameAvailable) {
      Alert.alert('Error', 'Please choose an available username');
      return;
    }

    // Validate website URL if provided
    if (websiteUrl && !isValidUrl(websiteUrl)) {
      Alert.alert('Error', 'Please enter a valid website URL (e.g., https://yourwebsite.com)');
      return;
    }

    // Construct full URLs from usernames
    const updatedSocialLinks: SocialLink[] = [];

    if (instagramUsername.trim()) {
      updatedSocialLinks.push({
        platform: 'instagram',
        url: PLATFORM_URLS.instagram + instagramUsername.trim(),
      });
    }

    if (tiktokUsername.trim()) {
      updatedSocialLinks.push({
        platform: 'tiktok',
        url: PLATFORM_URLS.tiktok + tiktokUsername.trim(),
      });
    }

    if (xUsername.trim()) {
      updatedSocialLinks.push({
        platform: 'x',
        url: PLATFORM_URLS.x + xUsername.trim(),
      });
    }

    if (spotifyUsername.trim()) {
      updatedSocialLinks.push({
        platform: 'spotify',
        url: PLATFORM_URLS.spotify + spotifyUsername.trim(),
      });
    }

    if (websiteUrl.trim()) {
      updatedSocialLinks.push({
        platform: 'website',
        url: websiteUrl.trim(),
      });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    onSave({
      displayName,
      username,
      bio,
      socialLinks: updatedSocialLinks,
      notificationPreferences,
    });

    // Show success message
    Alert.alert('Success', 'Your settings have been saved successfully!');
    onClose();
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const urlPattern = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      return urlPattern.test(url) && (url.startsWith('http://') || url.startsWith('https://'));
    } catch {
      return false;
    }
  };

  const toggleNotification = (key: keyof NotificationPreferences) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotificationPreferences({
      ...notificationPreferences,
      [key]: !notificationPreferences[key],
    });
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you absolutely sure? This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'This is your last chance. Delete your account?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete Forever', style: 'destructive', onPress: onDeleteAccount },
              ]
            );
          },
        },
      ]
    );
  };

  const renderAccountTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Profile Information</Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your display name"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Username</Text>
        <View style={styles.usernameContainer}>
          <TextInput
            style={[
              styles.input,
              usernameError ? styles.inputError : usernameAvailable && username !== initialUsername ? styles.inputSuccess : null
            ]}
            value={username}
            onChangeText={setUsername}
            placeholder="Your username"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            editable={true}
          />
          {isCheckingUsername && (
            <View style={styles.usernameIndicator}>
              <ActivityIndicator size="small" color={colors.secondary} />
            </View>
          )}
          {!isCheckingUsername && username !== initialUsername && (
            <View style={styles.usernameIndicator}>
              {usernameAvailable ? (
                <IconSymbol name="checkmark.circle.fill" size={20} color="#4CAF50" />
              ) : (
                <IconSymbol name="xmark.circle.fill" size={20} color="#FF3B30" />
              )}
            </View>
          )}
        </View>
        {usernameError && (
          <Text style={styles.errorText}>{usernameError}</Text>
        )}
        {!usernameError && usernameAvailable && username !== initialUsername && (
          <Text style={styles.successText}>Username is available!</Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us about yourself"
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={3}
        />
      </View>

      <Text style={styles.sectionTitle}>Social Links</Text>
      <Text style={styles.sectionDescription}>
        Just enter your username - we&apos;ll handle the rest!
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Instagram</Text>
        <View style={styles.socialInputContainer}>
          <View style={styles.iconContainer}>
            <Instagram size={20} color={colors.text} />
          </View>
          <TextInput
            style={styles.socialInput}
            value={instagramUsername}
            onChangeText={setInstagramUsername}
            placeholder="username"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
          />
        </View>
        {instagramUsername.trim() && (
          <Text style={styles.urlPreview}>
            {PLATFORM_URLS.instagram}{instagramUsername}
          </Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>TikTok</Text>
        <View style={styles.socialInputContainer}>
          <View style={styles.iconContainer}>
            <Music size={20} color={colors.text} />
          </View>
          <TextInput
            style={styles.socialInput}
            value={tiktokUsername}
            onChangeText={setTiktokUsername}
            placeholder="username"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
          />
        </View>
        {tiktokUsername.trim() && (
          <Text style={styles.urlPreview}>
            {PLATFORM_URLS.tiktok}{tiktokUsername}
          </Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>X (Twitter)</Text>
        <View style={styles.socialInputContainer}>
          <View style={styles.iconContainer}>
            <Text style={styles.xIcon}>𝕏</Text>
          </View>
          <TextInput
            style={styles.socialInput}
            value={xUsername}
            onChangeText={setXUsername}
            placeholder="username"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
          />
        </View>
        {xUsername.trim() && (
          <Text style={styles.urlPreview}>
            {PLATFORM_URLS.x}{xUsername}
          </Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Spotify</Text>
        <View style={styles.socialInputContainer}>
          <View style={styles.iconContainer}>
            <Music size={20} color={colors.text} />
          </View>
          <TextInput
            style={styles.socialInput}
            value={spotifyUsername}
            onChangeText={setSpotifyUsername}
            placeholder="username"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
          />
        </View>
        {spotifyUsername.trim() && (
          <Text style={styles.urlPreview}>
            {PLATFORM_URLS.spotify}{spotifyUsername}
          </Text>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Website</Text>
        <View style={styles.socialInputContainer}>
          <View style={styles.iconContainer}>
            <Globe size={20} color={colors.text} />
          </View>
          <TextInput
            style={styles.socialInput}
            value={websiteUrl}
            onChangeText={setWebsiteUrl}
            placeholder="https://yourwebsite.com"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
      </View>
    </View>
  );

  const renderNotificationsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Notification Preferences</Text>
      <Text style={styles.sectionDescription}>
        Choose which notifications you want to receive
      </Text>

      <View style={styles.notificationItem}>
        <View style={styles.notificationInfo}>
          <Text style={styles.notificationLabel}>New Follower</Text>
          <Text style={styles.notificationDescription}>When someone follows you</Text>
        </View>
        <Switch
          value={notificationPreferences.newFollower}
          onValueChange={() => toggleNotification('newFollower')}
          trackColor={{ false: colors.border, true: colors.secondary }}
          thumbColor={colors.card}
        />
      </View>

      <View style={styles.notificationItem}>
        <View style={styles.notificationInfo}>
          <Text style={styles.notificationLabel}>Post Liked</Text>
          <Text style={styles.notificationDescription}>When someone likes your post</Text>
        </View>
        <Switch
          value={notificationPreferences.postLiked}
          onValueChange={() => toggleNotification('postLiked')}
          trackColor={{ false: colors.border, true: colors.secondary }}
          thumbColor={colors.card}
        />
      </View>

      <View style={styles.notificationItem}>
        <View style={styles.notificationInfo}>
          <Text style={styles.notificationLabel}>Post Commented</Text>
          <Text style={styles.notificationDescription}>When someone comments on your post</Text>
        </View>
        <Switch
          value={notificationPreferences.postCommented}
          onValueChange={() => toggleNotification('postCommented')}
          trackColor={{ false: colors.border, true: colors.secondary }}
          thumbColor={colors.card}
        />
      </View>

      <View style={styles.notificationItem}>
        <View style={styles.notificationInfo}>
          <Text style={styles.notificationLabel}>Comment Replied</Text>
          <Text style={styles.notificationDescription}>When someone replies to your comment</Text>
        </View>
        <Switch
          value={notificationPreferences.commentReplied}
          onValueChange={() => toggleNotification('commentReplied')}
          trackColor={{ false: colors.border, true: colors.secondary }}
          thumbColor={colors.card}
        />
      </View>

      <View style={styles.notificationItem}>
        <View style={styles.notificationInfo}>
          <Text style={styles.notificationLabel}>Mentioned</Text>
          <Text style={styles.notificationDescription}>When someone mentions you</Text>
        </View>
        <Switch
          value={notificationPreferences.mentioned}
          onValueChange={() => toggleNotification('mentioned')}
          trackColor={{ false: colors.border, true: colors.secondary }}
          thumbColor={colors.card}
        />
      </View>

      <View style={styles.notificationItem}>
        <View style={styles.notificationInfo}>
          <Text style={styles.notificationLabel}>Friend Posted</Text>
          <Text style={styles.notificationDescription}>When a friend posts something new</Text>
        </View>
        <Switch
          value={notificationPreferences.friendPosted}
          onValueChange={() => toggleNotification('friendPosted')}
          trackColor={{ false: colors.border, true: colors.secondary }}
          thumbColor={colors.card}
        />
      </View>

      <View style={styles.notificationItem}>
        <View style={styles.notificationInfo}>
          <Text style={styles.notificationLabel}>Friend Activity</Text>
          <Text style={styles.notificationDescription}>When friends like or comment</Text>
        </View>
        <Switch
          value={notificationPreferences.friendActivity}
          onValueChange={() => toggleNotification('friendActivity')}
          trackColor={{ false: colors.border, true: colors.secondary }}
          thumbColor={colors.card}
        />
      </View>
    </View>
  );

  const renderSecurityTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Authentication</Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>Sign-in Method</Text>
        <Text style={styles.infoValue}>
          {authMethod === 'apple' ? 'Sign in with Apple' : 'SMS Authentication'}
        </Text>
      </View>

      {authMethod === 'sms' && phoneNumber && (
        <>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Phone Number</Text>
            <Text style={styles.infoValue}>{phoneNumber}</Text>
          </View>
          <Pressable style={styles.changeButton}>
            <Text style={styles.changeButtonText}>Change Phone Number</Text>
          </Pressable>
        </>
      )}

      <View style={styles.dangerZone}>
        <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
        <Pressable style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </Pressable>
        <Text style={styles.deleteWarning}>
          This action cannot be undone. All your data will be permanently deleted.
        </Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Settings</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.tabs}>
            <Pressable
              style={[styles.tab, activeTab === 'account' && styles.activeTab]}
              onPress={() => setActiveTab('account')}
            >
              <Text style={[styles.tabText, activeTab === 'account' && styles.activeTabText]}>
                Account
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'notifications' && styles.activeTab]}
              onPress={() => setActiveTab('notifications')}
            >
              <Text style={[styles.tabText, activeTab === 'notifications' && styles.activeTabText]}>
                Notifications
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'security' && styles.activeTab]}
              onPress={() => setActiveTab('security')}
            >
              <Text style={[styles.tabText, activeTab === 'security' && styles.activeTabText]}>
                Security
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {activeTab === 'account' && renderAccountTab()}
            {activeTab === 'notifications' && renderNotificationsTab()}
            {activeTab === 'security' && renderSecurityTab()}

            {activeTab !== 'security' && (
              <Pressable 
                style={[
                  styles.saveButton,
                  (!usernameAvailable || isCheckingUsername) && styles.saveButtonDisabled
                ]} 
                onPress={handleSave}
                disabled={!usernameAvailable || isCheckingUsername}
              >
                <Text style={styles.saveButtonText}>
                  {isCheckingUsername ? 'Checking...' : 'Save Changes'}
                </Text>
              </Pressable>
            )}

            <Pressable style={styles.logoutButton} onPress={onLogout}>
              <Text style={styles.logoutButtonText}>Log Out</Text>
            </Pressable>

            <View style={{ height: 100 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 4,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.secondary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.secondary,
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  inputSuccess: {
    borderColor: '#4CAF50',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  usernameContainer: {
    position: 'relative',
  },
  usernameIndicator: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 4,
  },
  successText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 4,
  },
  socialInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  xIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  socialInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  urlPreview: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    marginLeft: 4,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notificationInfo: {
    flex: 1,
    marginRight: 16,
  },
  notificationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  changeButton: {
    backgroundColor: colors.secondary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  dangerZone: {
    marginTop: 32,
    padding: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF3B30',
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteWarning: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: colors.secondary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginHorizontal: 20,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  logoutButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    marginHorizontal: 20,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
});
