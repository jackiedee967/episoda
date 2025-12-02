import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  Platform,
  Alert,
  Pressable,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Asset } from 'expo-asset';
import { colors } from '@/styles/tokens';
import { PhoneInput } from '@/components/PhoneInput';
import ButtonL from '@/components/ButtonL';
import { PaginationDots } from '@/components/PaginationDots';
import { Country } from '@/components/auth/CountryCodeSelector';
import { supabase } from '@/integrations/supabase/client';
import * as Haptics from 'expo-haptics';

const phoneBackground = Asset.fromModule(require('../../assets/images/auth/Background.png')).uri;
const layer1 = Asset.fromModule(require('../../assets/images/auth/layer-1.png')).uri;
const layer12 = Asset.fromModule(require('../../assets/images/auth/layer12.png')).uri;

export const options = {
  headerShown: false,
};

/**
 * Phone Number Entry Screen - Step 2 in 7-screen auth flow
 * Pixel-perfect implementation matching Figma design
 */
const TERMS_CONTENT = `Terms & Conditions
Last Updated: December 1, 2025

Welcome to Episoda! These Terms & Conditions ("Terms") govern your use of the Episoda mobile application and services (collectively, the "Service"). By creating an account or using Episoda, you agree to these Terms.

1. Acceptance of Terms
By accessing or using Episoda, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, do not use the Service.

2. Eligibility
You must be at least 13 years old to use Episoda. If you are under 18, you represent that you have your parent or guardian's permission to use the Service.

3. Account Registration
3.1 Account Creation
• You must provide accurate and complete information when creating an account
• You are responsible for maintaining the confidentiality of your account credentials
• You are responsible for all activity that occurs under your account

3.2 Account Security
• You must notify us immediately of any unauthorized access to your account
• We are not liable for any loss or damage arising from your failure to protect your account information

4. User Content
4.1 Your Content
• You retain ownership of all content you post on Episoda (reviews, comments, ratings, lists, etc.)
• By posting content, you grant Episoda a worldwide, non-exclusive, royalty-free license to use, display, reproduce, and distribute your content within the Service

4.2 Content Standards
You agree NOT to post content that:
• Is illegal, harmful, threatening, abusive, harassing, defamatory, or invasive of privacy
• Contains hate speech, discrimination, or promotes violence
• Infringes on intellectual property rights
• Contains spam, advertising, or promotional content without authorization
• Contains spoilers without appropriate warnings
• Impersonates any person or entity

4.3 Content Moderation
• We reserve the right to remove any content that violates these Terms
• We may suspend or terminate accounts that repeatedly violate our content policies

5. TV Show Data & Third-Party Content
5.1 Show Information
• TV show data (titles, descriptions, images, ratings) is provided by third-party APIs
• We do not claim ownership of this content
• Show data accuracy is not guaranteed

5.2 User Reviews & Opinions
• Reviews and ratings reflect individual user opinions
• Episoda is not responsible for the accuracy of user-generated reviews

6. Prohibited Conduct
You agree NOT to:
• Use the Service for any illegal purpose
• Harass, abuse, or harm other users
• Attempt to gain unauthorized access to the Service or other users' accounts
• Use automated systems (bots, scrapers) without permission
• Interfere with or disrupt the Service
• Create multiple accounts to manipulate ratings or circumvent bans
• Sell, transfer, or share your account

7. Blocking & Reporting
7.1 User Controls
• You can block other users to prevent them from interacting with you
• You can report users or content that violates these Terms

7.2 Our Actions
• We will investigate reported content and users
• We may remove content or suspend/terminate accounts for violations

8. Intellectual Property
8.1 Episoda's Rights
• The Episoda app, including its design, features, and code, is owned by Episoda
• Our trademarks, logos, and brand elements may not be used without permission

8.2 DMCA Compliance
• If you believe content on Episoda infringes your copyright, contact us at hello@episoda.io
• We comply with the Digital Millennium Copyright Act (DMCA)

9. Disclaimers
9.1 Service Availability
• Episoda is provided "as is" without warranties of any kind
• We do not guarantee uninterrupted or error-free service
• We may modify, suspend, or discontinue the Service at any time

9.2 User Interactions
• You are responsible for your interactions with other users
• We are not liable for disputes between users

10. Limitation of Liability
To the maximum extent permitted by law:
• Episoda is not liable for any indirect, incidental, or consequential damages
• Our total liability shall not exceed the amount you paid us (if any) in the past 12 months
• Some jurisdictions do not allow these limitations, so they may not apply to you

11. Indemnification
You agree to indemnify and hold Episoda harmless from any claims, damages, or expenses arising from:
• Your use of the Service
• Your violation of these Terms
• Your violation of any third-party rights

12. Termination
12.1 By You
• You may delete your account at any time through the app settings

12.2 By Us
• We may suspend or terminate your account if you violate these Terms
• We may terminate accounts for inactivity or at our discretion
• Upon termination, your right to use the Service ends immediately

13. Changes to Terms
• We may update these Terms from time to time
• We will notify you of material changes via the app or email
• Continued use after changes constitutes acceptance of new Terms

14. Governing Law
These Terms are governed by the laws of the State of California and the United States, without regard to conflict of law principles.

15. Dispute Resolution
15.1 Informal Resolution
• Before filing a claim, contact us at hello@episoda.io to attempt informal resolution

15.2 Arbitration
• Any disputes will be resolved through binding arbitration in Los Angeles, California rather than in court

16. Contact Us
If you have questions about these Terms, contact us at:
• Email: hello@episoda.io
• Website: episoda.io`;

const PRIVACY_CONTENT = `Privacy Policy
Last Updated: December 1, 2025

Episoda ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services (the "Service").

By using Episoda, you agree to the collection and use of information in accordance with this Privacy Policy.

1. Information We Collect

1.1 Information You Provide to Us

Account Information:
• Username
• Email address (if provided via Apple Sign-In)
• Phone number (for authentication)
• Birthday (for age verification)
• Profile picture (optional)
• Bio and other profile information (optional)

Content You Create:
• TV show ratings and reviews
• Comments on posts
• Lists and playlists
• Custom tags
• Posts and activity logs
• Messages and interactions with other users

Show Tracking Data:
• Shows you're watching, have watched, or want to watch
• Episodes you've logged
• Watch history and progress
• Favorite shows

1.2 Information Collected Automatically

Usage Data:
• How you interact with the app (features used, time spent, navigation patterns)
• Search queries
• Shows you view or interact with
• Posts you like, comment on, or repost

Device Information:
• Device type and model
• Operating system version
• Unique device identifiers
• Mobile network information
• IP address
• App version

Location Information:
• General location (city/state) based on IP address for content recommendations
• We do NOT collect precise GPS location

1.3 Information from Third Parties

TV Show Data:
• We retrieve TV show information (titles, descriptions, images, air dates, ratings) from third-party APIs (such as TMDB or TVMaze)
• This data is used to populate the app and provide show information

Apple Sign-In:
• If you sign in with Apple, we may receive your name and email (or a private relay email if you choose to hide your email)

2. How We Use Your Information

We use the information we collect to:

Provide and Improve the Service:
• Create and manage your account
• Display your profile and activity
• Track your watch history and progress
• Generate personalized recommendations based on your interests
• Enable social features (following friends, commenting, liking)
• Process and display your posts, reviews, and ratings

Communication:
• Send verification codes for phone authentication
• Send notifications about friend activity, new episodes, and app updates
• Respond to your support requests

Safety and Security:
• Detect and prevent fraud, spam, and abuse
• Enforce our Terms & Conditions
• Monitor for prohibited content
• Investigate reported users or content

Analytics and Improvement:
• Analyze usage patterns to improve features
• Understand how users engage with content
• Fix bugs and technical issues
• Develop new features

Legal Compliance:
• Comply with legal obligations
• Respond to legal requests (subpoenas, court orders)
• Protect our rights and property

3. How We Share Your Information

3.1 Information Shared Publicly

Public by Default:
• Your username, profile picture, and bio
• Your posts, reviews, ratings, and comments
• Shows you're watching and have watched
• Lists you create (unless marked private)
• Your followers and following lists

You control what's public through your privacy settings.

3.2 Information Shared with Other Users

Your Friends:
• Can see your watch activity, posts, and profile information
• Can see what shows you're currently watching

Other Users:
• Can see your public profile and activity
• Cannot see content you've marked private

3.3 Third-Party Service Providers

We share information with service providers who help us operate the app:
• Supabase (database and authentication hosting)
• Twilio (SMS verification for phone authentication)
• Cloud storage providers (for profile pictures and media)
• Analytics services (to understand app usage)
• TV show data APIs (TMDB, TVMaze, etc.)

These providers are contractually obligated to protect your data and use it only for the services they provide to us.

3.4 Legal Requirements

We may disclose your information if required by law or in response to:
• Court orders or subpoenas
• Legal processes or government requests
• Protecting our rights, safety, or property
• Investigating fraud or security issues

3.5 Business Transfers

If Episoda is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you of any such change.

4. Your Privacy Choices and Rights

4.1 Account Settings

You can control your privacy through the app:
• Make lists private - Hide lists from other users
• Block users - Prevent specific users from seeing your content or interacting with you
• Delete content - Remove posts, comments, and reviews
• Delete account - Permanently delete your account and all associated data

4.2 Communication Preferences
• You can opt out of promotional notifications in your app settings
• You cannot opt out of essential service notifications (verification codes, security alerts)

4.3 Your Legal Rights

Depending on your location, you may have the right to:
• Access: Request a copy of your personal data
• Correction: Update or correct inaccurate information
• Deletion: Request deletion of your account and data
• Portability: Receive your data in a machine-readable format
• Objection: Object to certain types of data processing
• Restriction: Request we limit how we use your data

To exercise these rights, contact us at hello@episoda.io.

4.4 California Privacy Rights (CCPA)

If you're a California resident, you have additional rights:
• Right to know what personal information we collect
• Right to delete your personal information
• Right to opt out of sale of personal information (we do NOT sell your data)
• Right to non-discrimination for exercising your rights

4.5 European Privacy Rights (GDPR)

If you're in the EU/EEA, you have rights under GDPR:
• Our legal basis for processing your data is consent and contract performance
• You can withdraw consent at any time
• You have the right to lodge a complaint with your data protection authority

5. Data Retention

How Long We Keep Your Data:
• Active accounts: We retain your data as long as your account is active
• Deleted accounts: We delete your data within 30 days of account deletion
• Legal obligations: Some data may be retained longer if required by law

Anonymized Data:
• We may retain anonymized or aggregated data indefinitely for analytics

6. Children's Privacy

Episoda requires users to be at least 13 years old. We do not knowingly collect personal information from children under 13. If we learn we have collected data from a child under 13, we will delete it immediately.

If you believe we have information from a child under 13, contact us at hello@episoda.io.

7. Data Security

We implement reasonable security measures to protect your information:
• Encryption of data in transit (HTTPS/TLS)
• Secure authentication via phone verification and Apple Sign-In
• Regular security audits
• Access controls and authentication for our systems

However, no system is 100% secure. We cannot guarantee absolute security of your data.

8. International Data Transfers

Your information may be transferred to and processed in countries other than your own, including the United States. These countries may have different data protection laws.

By using Episoda, you consent to the transfer of your information to our servers and service providers globally.

9. Third-Party Links

Episoda may contain links to third-party websites or services (such as streaming platforms). We are not responsible for the privacy practices of these third parties. Please review their privacy policies.

10. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of material changes by:
• Posting the updated policy in the app
• Sending an email or notification
• Updating the "Last Updated" date

Continued use of Episoda after changes constitutes acceptance of the updated policy.

11. Contact Us

If you have questions about this Privacy Policy or your data, contact us at:
• Email: hello@episoda.io
• Website: episoda.io

12. Data Protection Officer

For GDPR-related inquiries, you can contact our Data Protection Officer at:
hello@episoda.io`;

export default function PhoneNumberScreen() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>({
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    flag: '🇺🇸',
  });
  const [loading, setLoading] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  const handleContinue = async () => {
    // Validate phone number
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    if (cleanedNumber.length < 10) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid phone number.\n\nExample: 305 1234 5678'
      );
      return;
    }

    const formattedNumber = selectedCountry.dialCode + cleanedNumber;
    console.log('📱 Sending OTP to:', formattedNumber);

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: formattedNumber,
      });

      if (error) {
        console.error('❌ Phone sign in error:', error);

        if (error.message.includes('phone_provider_disabled') || error.message.includes('Unsupported phone provider')) {
          Alert.alert(
            'Phone Authentication Not Enabled',
            'Phone authentication is not configured. Please contact support.'
          );
        } else if (error.message.includes('rate limit')) {
          Alert.alert(
            'Too Many Attempts',
            'You have requested too many codes. Please wait a few minutes and try again.'
          );
        } else {
          Alert.alert('Error', error.message);
        }
      } else {
        console.log('✅ OTP sent successfully!');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        router.push({
          pathname: '/auth/verify-otp',
          params: { phone: formattedNumber },
        });
      }
    } catch (error: any) {
      console.error('❌ Exception:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.wrapper}>
      <ImageBackground
        source={{ uri: phoneBackground }}
        style={styles.backgroundImage}
        resizeMode="stretch"
      >
        {/* Top logo */}
        <View style={styles.topContainer}>
          <Image
            source={{ uri: layer1 }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Main content */}
        <View style={styles.centerContent}>
          {/* Header text */}
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Enter your phone number</Text>
            <Text style={styles.subtitle}>
              Just for verification. We won't call or give it to anyone.
            </Text>
          </View>

          {/* Phone input and button */}
          <View style={styles.formContainer}>
            <PhoneInput
              selectedCountry={selectedCountry}
              onCountryChange={setSelectedCountry}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="305 1234 5678"
              editable={!loading}
              testID="phone-input"
            />

            <ButtonL
              onPress={handleContinue}
              disabled={loading || phoneNumber.replace(/\D/g, '').length < 10}
              testID="continue-button"
            >
              {loading ? 'Sending...' : 'Continue'}
            </ButtonL>

            {/* Terms text */}
            <View style={styles.termsContainer}>
              <Text style={styles.termsText}>
                By continuing you agree to the{' '}
                <Text style={styles.termsLink} onPress={() => setShowTermsModal(true)}>
                  Terms of Service
                </Text>
                {' '}and{' '}
                <Text style={styles.termsLink} onPress={() => setShowPrivacyModal(true)}>
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>

            {/* Pagination dots */}
            <View style={styles.paginationInline}>
              <PaginationDots total={5} current={1} testID="pagination-dots" />
            </View>
          </View>
        </View>

        {/* Bottom decorative image */}
        <Image
          source={{ uri: layer12 }}
          style={styles.layer12}
          resizeMode="contain"
        />
      </ImageBackground>

      {/* Terms of Service Modal */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Terms of Service</Text>
            <Pressable onPress={() => setShowTermsModal(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Done</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={true}>
            <Text style={styles.modalContent}>{TERMS_CONTENT}</Text>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPrivacyModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Privacy Policy</Text>
            <Pressable onPress={() => setShowPrivacyModal(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Done</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={true}>
            <Text style={styles.modalContent}>{PRIVACY_CONTENT}</Text>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  topContainer: {
    alignItems: 'center',
    paddingTop: 20,
  },
  logo: {
    width: 99,
    height: 19.8,
  },
  centerContent: {
    flex: 1,
    paddingHorizontal: 40,
    justifyContent: 'center',
    gap: 44,
  },
  headerContainer: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    width: 353,
    color: colors.pureWhite,
    textAlign: 'center',
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 35,
    fontWeight: '400',
    letterSpacing: -0.7,
  },
  subtitle: {
    color: colors.pureWhite,
    textAlign: 'center',
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 13,
    fontWeight: '300',
  },
  formContainer: {
    gap: 16,
  },
  termsContainer: {
    alignItems: 'center',
    paddingTop: 8,
  },
  termsText: {
    width: 327,
    color: colors.grey1,
    textAlign: 'center',
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 8,
    fontWeight: '300',
    lineHeight: 15,
  },
  termsLink: {
    color: colors.pureWhite,
    textDecorationLine: 'underline',
  },
  paginationInline: {
    alignItems: 'center',
    paddingTop: 24,
  },
  layer12: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: 16,
    height: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.pageBackground,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardStroke,
  },
  modalTitle: {
    fontFamily: 'InstrumentSerif_400Regular',
    fontSize: 24,
    color: colors.pureWhite,
  },
  closeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  closeButtonText: {
    fontFamily: 'FunnelDisplay_500Medium',
    fontSize: 16,
    color: colors.greenHighlight,
  },
  modalScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalContent: {
    fontFamily: 'FunnelDisplay_300Light',
    fontSize: 14,
    color: colors.pureWhite,
    lineHeight: 22,
  },
});
