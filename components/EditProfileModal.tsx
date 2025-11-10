import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Animated,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { colors, typography } from '@/styles/tokens';
import { X, Instagram, Music, Globe } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SocialLink } from '@/types';
import { supabase } from '@/app/integrations/supabase/client';
import { IconSymbol } from '@/components/IconSymbol';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  displayName: string;
  username: string;
  bio: string;
  socialLinks: SocialLink[];
  onSave: (data: {
    displayName: string;
    username: string;
    bio: string;
    socialLinks: SocialLink[];
  }) => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

const PLATFORM_URLS = {
  instagram: 'https://instagram.com/',
  tiktok: 'https://tiktok.com/@',
  x: 'https://x.com/',
  spotify: 'https://open.spotify.com/user/',
};

export default function EditProfileModal({
  visible,
  onClose,
  displayName: initialDisplayName,
  username: initialUsername,
  bio: initialBio,
  socialLinks: initialSocialLinks,
  onSave,
}: EditProfileModalProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  
  const [usernameError, setUsernameError] = useState<string>('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [instagramUsername, setInstagramUsername] = useState('');
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [xUsername, setXUsername] = useState('');
  const [spotifyUsername, setSpotifyUsername] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
      
      const socialLinksArray = Array.isArray(initialSocialLinks) ? initialSocialLinks : [];
      
      const instagram = socialLinksArray.find(link => link.platform === 'instagram');
      const tiktok = socialLinksArray.find(link => link.platform === 'tiktok');
      const x = socialLinksArray.find(link => link.platform === 'x');
      const spotify = socialLinksArray.find(link => link.platform === 'spotify');
      const website = socialLinksArray.find(link => link.platform === 'website');

      setInstagramUsername(instagram ? instagram.url.replace(PLATFORM_URLS.instagram, '') : '');
      setTiktokUsername(tiktok ? tiktok.url.replace(PLATFORM_URLS.tiktok, '') : '');
      setXUsername(x ? x.url.replace(PLATFORM_URLS.x, '') : '');
      setSpotifyUsername(spotify ? spotify.url.replace(PLATFORM_URLS.spotify, '') : '');
      setWebsiteUrl(website ? website.url : '');
      
      setUsernameError('');
      setUsernameAvailable(true);
      setIsCheckingUsername(false);
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim, initialSocialLinks]);

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
        .from('profiles' as any)
        .select('username')
        .eq('username', newUsername.toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') {
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
      setUsernameError('Error checking username availability');
      setUsernameAvailable(false);
    } finally {
      setIsCheckingUsername(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (username && username !== initialUsername) {
        checkUsernameAvailability(username);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [username, initialUsername]);

  const handleSave = async () => {
    if (isCheckingUsername) {
      return;
    }

    if (username !== initialUsername && !usernameAvailable) {
      if (typeof window !== 'undefined') {
        window.alert('Please choose an available username');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (websiteUrl && !isValidUrl(websiteUrl)) {
      if (typeof window !== 'undefined') {
        window.alert('Please enter a valid website URL (e.g., https://yourwebsite.com)');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

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

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: existingProfile } = await supabase
          .from('profiles' as any)
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (existingProfile) {
          await supabase
            .from('profiles' as any)
            .update({
              display_name: displayName.trim(),
              username: username.toLowerCase().trim(),
              bio: bio.trim(),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);
        } else {
          await supabase
            .from('profiles' as any)
            .insert({
              user_id: user.id,
              display_name: displayName.trim(),
              username: username.toLowerCase().trim(),
              bio: bio.trim(),
            });
        }

        await supabase
          .from('social_links' as any)
          .delete()
          .eq('user_id', user.id);

        if (updatedSocialLinks.length > 0) {
          const socialLinksToInsert = updatedSocialLinks.map(link => ({
            user_id: user.id,
            platform: link.platform,
            url: link.url,
          }));

          await supabase
            .from('social_links' as any)
            .insert(socialLinksToInsert as any);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      onSave({
        displayName,
        username,
        bio,
        socialLinks: updatedSocialLinks,
      });

      if (typeof window !== 'undefined') {
        window.alert('Your profile has been updated!');
        onClose();
      }

    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (typeof window !== 'undefined') {
        window.alert('Failed to save profile. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      return urlPattern.test(url) && (url.startsWith('http://') || url.startsWith('https://'));
    } catch {
      return false;
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        
        <Animated.View
          style={[
            styles.modalContent,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Edit Profile</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.almostWhite} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your display name"
                placeholderTextColor={colors.grey1}
              />
            </View>

            <View style={styles.section}>
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
                  placeholderTextColor={colors.grey1}
                  autoCapitalize="none"
                />
                {isCheckingUsername && (
                  <View style={styles.usernameIndicator}>
                    <ActivityIndicator size="small" color={colors.greenHighlight} />
                  </View>
                )}
                {!isCheckingUsername && username !== initialUsername && (
                  <View style={styles.usernameIndicator}>
                    {usernameAvailable ? (
                      <IconSymbol name="checkmark.circle.fill" size={20} color={colors.greenHighlight} />
                    ) : (
                      <IconSymbol name="xmark.circle.fill" size={20} color={colors.error} />
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

            <View style={styles.section}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself"
                placeholderTextColor={colors.grey1}
                multiline
                numberOfLines={3}
              />
            </View>

            <Text style={styles.sectionTitle}>Social Links</Text>

            <View style={styles.section}>
              <Text style={styles.label}>Instagram</Text>
              <View style={styles.socialInputContainer}>
                <View style={styles.iconContainer}>
                  <Instagram size={16} color={colors.almostWhite} />
                </View>
                <TextInput
                  style={styles.socialInput}
                  value={instagramUsername}
                  onChangeText={setInstagramUsername}
                  placeholder="username"
                  placeholderTextColor={colors.grey1}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>TikTok</Text>
              <View style={styles.socialInputContainer}>
                <View style={styles.iconContainer}>
                  <Music size={16} color={colors.almostWhite} />
                </View>
                <TextInput
                  style={styles.socialInput}
                  value={tiktokUsername}
                  onChangeText={setTiktokUsername}
                  placeholder="username"
                  placeholderTextColor={colors.grey1}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.section}>
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
                  placeholderTextColor={colors.grey1}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Spotify</Text>
              <View style={styles.socialInputContainer}>
                <View style={styles.iconContainer}>
                  <Music size={16} color={colors.almostWhite} />
                </View>
                <TextInput
                  style={styles.socialInput}
                  value={spotifyUsername}
                  onChangeText={setSpotifyUsername}
                  placeholder="username"
                  placeholderTextColor={colors.grey1}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Website</Text>
              <View style={styles.socialInputContainer}>
                <View style={styles.iconContainer}>
                  <Globe size={16} color={colors.almostWhite} />
                </View>
                <TextInput
                  style={styles.socialInput}
                  value={websiteUrl}
                  onChangeText={setWebsiteUrl}
                  placeholder="https://yourwebsite.com"
                  placeholderTextColor={colors.grey1}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={styles.saveButton}
              onPress={handleSave}
              disabled={isSaving || isCheckingUsername}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.black} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  backdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: SCREEN_HEIGHT * 0.9,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.cardStroke,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardStroke,
  },
  title: {
    ...typography.titleL,
    color: colors.almostWhite,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.almostWhite,
    paddingHorizontal: 20,
    marginTop: 30,
    marginBottom: 10,
  },
  label: {
    ...typography.p1B,
    color: colors.almostWhite,
    marginBottom: 8,
  },
  input: {
    ...typography.p1,
    backgroundColor: colors.pageBackground,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    borderRadius: 12,
    padding: 14,
    color: colors.almostWhite,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  usernameContainer: {
    position: 'relative',
  },
  usernameIndicator: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  inputError: {
    borderColor: colors.error,
  },
  inputSuccess: {
    borderColor: colors.greenHighlight,
  },
  errorText: {
    ...typography.p3R,
    color: colors.error,
    marginTop: 4,
  },
  successText: {
    ...typography.p3R,
    color: colors.greenHighlight,
    marginTop: 4,
  },
  socialInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.pageBackground,
    borderWidth: 1,
    borderColor: colors.cardStroke,
    borderRadius: 12,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
  },
  socialInput: {
    ...typography.p1,
    flex: 1,
    padding: 14,
    color: colors.almostWhite,
  },
  xIcon: {
    fontSize: 16,
    color: colors.almostWhite,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.cardStroke,
  },
  saveButton: {
    backgroundColor: colors.greenHighlight,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveButtonText: {
    ...typography.buttonSmall,
    color: colors.black,
  },
});
