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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { colors, typography } from '@/styles/tokens';
import { X, Instagram, Music, Globe } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { SocialLink } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { IconSymbol } from '@/components/IconSymbol';
import { useData } from '@/contexts/DataContext';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  displayName: string;
  username: string;
  bio: string;
  avatar: string;
  socialLinks: SocialLink[];
  onSave: (data: {
    displayName: string;
    username: string;
    bio: string;
    avatar?: string;
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
  avatar: initialAvatar,
  socialLinks: initialSocialLinks,
  onSave,
}: EditProfileModalProps) {
  const { updateCurrentUserAvatar } = useData();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isModalVisible, setIsModalVisible] = useState(visible);
  const isClosingRef = useRef(false);
  
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [username, setUsername] = useState(initialUsername);
  const [bio, setBio] = useState(initialBio);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  
  const [usernameError, setUsernameError] = useState<string>('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [instagramUsername, setInstagramUsername] = useState('');
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [xUsername, setXUsername] = useState('');
  const [spotifyUsername, setSpotifyUsername] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  const closeWithAnimation = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsModalVisible(false);
      isClosingRef.current = false;
    });
  };

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      setIsModalVisible(true);
      setDisplayName(initialDisplayName);
      setUsername(initialUsername);
      setBio(initialBio);
      
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isModalVisible && !isClosingRef.current) {
      closeWithAnimation();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      
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
  }, [visible, slideAnim, initialSocialLinks, initialDisplayName, initialUsername, initialBio]);

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

  const handlePickImage = async () => {
    try {
      // Web platform - use file input
      if (typeof window !== 'undefined' && window.document) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e: any) => {
          const file = e.target?.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              console.log('📸 Web image selected');
              setAvatarUri(reader.result as string);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        return;
      }
      
      // Native iOS/Android - use expo-image-picker
      // Check permissions first
      const { status: existingStatus } = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photos in Settings to upload a profile picture.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch picker with error handling
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        console.log('📸 Image selected:', result.assets[0].uri.substring(0, 50) + '...');
        setAvatarUri(result.assets[0].uri);
      } else {
        console.log('📸 Image selection cancelled or no URI');
      }
    } catch (pickerError: any) {
      console.error('📸 ImagePicker error:', pickerError);
      // Don't show alert for user cancellation
      if (pickerError?.message?.includes('cancel')) {
        return;
      }
      Alert.alert(
        'Unable to Access Photos',
        'There was an issue accessing your photo library. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const uploadAvatar = async (uri: string): Promise<string | null> => {
    try {
      console.log('📸 uploadAvatar called with uri:', uri?.substring(0, 50) + '...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('📸 No user found for avatar upload');
        return null;
      }

      let imageData: ArrayBuffer;
      let mimeType = 'image/jpeg';
      
      // Check if running on native iOS/Android (not web)
      const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
      
      if (isNative && FileSystem.cacheDirectory) {
        // On iOS native, asset-library:// and ph:// URIs cannot be fetched directly
        // We need to copy the file to a readable location first using FileSystem
        console.log('📸 Using FileSystem to read image on native platform');
        
        try {
          // Copy to cache directory with a unique filename
          const cachedUri = `${FileSystem.cacheDirectory}avatar_upload_${Date.now()}.jpg`;
          
          // Check if the URI is already a file:// URI (which can be read directly)
          if (uri.startsWith('file://')) {
            console.log('📸 URI is already file://, reading directly');
          } else {
            // Copy from asset-library:// or ph:// to file://
            console.log('📸 Copying from asset library to cache...');
            await FileSystem.copyAsync({
              from: uri,
              to: cachedUri
            });
            uri = cachedUri;
            console.log('📸 Copied to:', cachedUri);
          }
          
          // Read the file as base64
          const base64Data = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64
          });
          
          // Convert base64 to ArrayBuffer
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          imageData = bytes.buffer;
          
          // Detect MIME type from magic bytes
          if (bytes[0] === 0xFF && bytes[1] === 0xD8) {
            mimeType = 'image/jpeg';
          } else if (bytes[0] === 0x89 && bytes[1] === 0x50) {
            mimeType = 'image/png';
          } else if (bytes[0] === 0x47 && bytes[1] === 0x49) {
            mimeType = 'image/gif';
          }
          
          console.log('📸 Image read via FileSystem:', { size: imageData.byteLength, mimeType });
          
        } catch (fsError: any) {
          console.error('📸 FileSystem error:', fsError);
          throw new Error(`Failed to read image file: ${fsError.message}`);
        }
      } else {
        // Web platform or fallback - use fetch
        console.log('📸 Using fetch to read image (web platform)');
        const response = await fetch(uri);
        const blob = await response.blob();
        imageData = await blob.arrayBuffer();
        mimeType = blob.type || 'image/jpeg';
        console.log('📸 Image read via fetch:', { size: imageData.byteLength, mimeType });
      }

      const fileExt = mimeType.split('/')[1] || 'jpg';
      const fileName = `avatar-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      console.log('📸 Uploading to Supabase storage:', { filePath, mimeType, size: imageData.byteLength });

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, imageData, {
          contentType: mimeType,
          upsert: true,
        });

      if (uploadError) {
        console.error('📸 Upload error details:', uploadError);
        // Check for specific error types
        if (uploadError.message?.includes('exceeded the maximum allowed size')) {
          Alert.alert('Image Too Large', 'Please select a smaller image (under 2MB).');
        } else {
          Alert.alert('Upload Failed', uploadError.message || 'Storage upload failed');
        }
        return null;
      }

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('📸 Upload successful:', data.publicUrl);
      return data.publicUrl;
    } catch (error: any) {
      console.error('📸 Error uploading avatar:', error);
      Alert.alert('Error', error?.message || 'Failed to upload profile picture. Please try again.');
      return null;
    }
  };

  const handleSave = async () => {
    if (isCheckingUsername) {
      return;
    }

    if (username !== initialUsername && !usernameAvailable) {
      Alert.alert('Username Unavailable', 'Please choose an available username');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (websiteUrl && !isValidUrl(websiteUrl)) {
      Alert.alert('Invalid URL', 'Please enter a valid website URL (e.g., https://yourwebsite.com)');
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
      console.log('📸 Profile save started, avatarUri:', avatarUri ? 'present' : 'null');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('Error getting user:', authError);
        throw new Error('Authentication failed. Please sign in again.');
      }
      
      let avatarUrl: string | null = null;
      
      if (avatarUri) {
        console.log('📸 Starting avatar upload...');
        setIsUploadingAvatar(true);
        avatarUrl = await uploadAvatar(avatarUri);
        setIsUploadingAvatar(false);
        console.log('📸 Avatar upload result:', avatarUrl ? 'success' : 'failed');
        
        if (!avatarUrl) {
          Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
          setIsSaving(false);
          return;
        }
      }
      
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles' as any)
        .select('user_id')
        .eq('user_id', user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error checking existing profile:', profileError);
        throw profileError;
      }

      const updateData: any = {
        display_name: displayName.trim(),
        username: username.toLowerCase().trim(),
        bio: bio.trim(),
        updated_at: new Date().toISOString(),
      };

      if (avatarUrl) {
        updateData.avatar_url = avatarUrl;
      }

      if (existingProfile) {
        const { error: updateError } = await supabase
          .from('profiles' as any)
          .update(updateData)
          .eq('user_id', user.id);
        
        if (updateError) {
          console.error('Error updating profile:', updateError);
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('profiles' as any)
          .insert({
            user_id: user.id,
            ...updateData,
          });
        
        if (insertError) {
          console.error('Error inserting profile:', insertError);
          throw insertError;
        }
      }

      const { error: deleteError } = await supabase
        .from('social_links' as any)
        .delete()
        .eq('user_id', user.id);
      
      if (deleteError) {
        console.error('Error deleting social links:', deleteError);
        throw deleteError;
      }

      if (updatedSocialLinks.length > 0) {
        const socialLinksToInsert = updatedSocialLinks.map(link => ({
          user_id: user.id,
          platform: link.platform,
          url: link.url,
        }));

        const { error: insertLinksError } = await supabase
          .from('social_links' as any)
          .insert(socialLinksToInsert as any);
        
        if (insertLinksError) {
          console.error('Error inserting social links:', insertLinksError);
          throw insertLinksError;
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      const saveData: any = {
        displayName,
        username,
        bio,
        socialLinks: updatedSocialLinks,
      };
      
      if (avatarUrl) {
        saveData.avatar = avatarUrl;
        // Update avatar across all app state (nav bar, posts, etc.)
        updateCurrentUserAvatar(avatarUrl);
        console.log('📸 Called updateCurrentUserAvatar to propagate new avatar');
      }
      
      onSave(saveData);

      setAvatarUri(null);

      // Close the modal immediately after successful save
      onClose();

    } catch (error: any) {
      console.error('Failed to save profile:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
      // Extract the most useful error message
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.details) {
        errorMessage = error.details;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Use native Alert for iOS/Android
      Alert.alert(
        'Failed to Save',
        `${errorMessage}\n\nPlease try again.`,
        [{ text: 'OK' }]
      );
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

  if (!isModalVisible) return null;

  return (
    <Modal
      transparent
      visible={isModalVisible}
      onRequestClose={closeWithAnimation}
      animationType="none"
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <Pressable style={styles.backdrop} onPress={closeWithAnimation} />
          
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
            <Pressable onPress={closeWithAnimation} style={styles.closeButton}>
              <X size={24} color={colors.black} />
            </Pressable>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.section}>
              <Text style={styles.label}>Profile Picture</Text>
              <View style={styles.avatarRow}>
                <Pressable onPress={handlePickImage}>
                  {(avatarUri || initialAvatar) ? (
                    <Image
                      source={{ uri: avatarUri || initialAvatar }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <IconSymbol name="person.circle.fill" size={48} color={colors.grey1} />
                    </View>
                  )}
                </Pressable>
                <Pressable onPress={handlePickImage} style={styles.uploadIconButton}>
                  {isUploadingAvatar ? (
                    <ActivityIndicator size="small" color={colors.black} />
                  ) : (
                    <Image
                      source={require('@/attached_assets/Upload_1763529174180.png')}
                      style={styles.uploadIcon}
                    />
                  )}
                </Pressable>
              </View>
            </View>

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
                {isCheckingUsername ? (
                  <View style={styles.usernameIndicator}>
                    <ActivityIndicator size="small" color={colors.tabStroke3} />
                  </View>
                ) : null}
                {!isCheckingUsername && username !== initialUsername ? (
                  <View style={styles.usernameIndicator}>
                    {usernameAvailable ? (
                      <IconSymbol name="checkmark.circle.fill" size={20} color={colors.tabStroke3} />
                    ) : (
                      <IconSymbol name="xmark.circle.fill" size={20} color={colors.error} />
                    )}
                  </View>
                ) : null}
              </View>
              {usernameError ? (
                <Text style={styles.errorText}>{usernameError}</Text>
              ) : null}
              {!usernameError && usernameAvailable && username !== initialUsername ? (
                <Text style={styles.successText}>Username is available!</Text>
              ) : null}
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
                  <Instagram size={16} color={colors.black} />
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
                  <Music size={16} color={colors.black} />
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
                  <Music size={16} color={colors.black} />
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
                  <Globe size={16} color={colors.black} />
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
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: colors.almostWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SCREEN_HEIGHT * 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey2,
  },
  title: {
    ...typography.titleL,
    color: colors.black,
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
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.grey2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadIconButton: {
    padding: 4,
  },
  uploadIcon: {
    width: 24,
    height: 24,
    tintColor: colors.grey1,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.black,
    paddingHorizontal: 20,
    marginTop: 30,
    marginBottom: 10,
  },
  label: {
    ...typography.p1B,
    color: colors.black,
    marginBottom: 8,
  },
  input: {
    ...typography.p1,
    backgroundColor: colors.pureWhite,
    borderWidth: 1,
    borderColor: colors.grey2,
    borderRadius: 12,
    padding: 14,
    color: colors.black,
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
    borderColor: colors.tabStroke3,
  },
  errorText: {
    ...typography.p3R,
    color: colors.error,
    marginTop: 4,
  },
  successText: {
    ...typography.p3R,
    color: colors.tabStroke3,
    marginTop: 4,
  },
  socialInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.pureWhite,
    borderWidth: 1,
    borderColor: colors.grey2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  iconContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.almostWhite,
  },
  socialInput: {
    ...typography.p1,
    flex: 1,
    padding: 14,
    color: colors.black,
  },
  xIcon: {
    fontSize: 16,
    color: colors.black,
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.grey2,
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
