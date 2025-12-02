import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ImageBackground, Image, Linking } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { colors, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { Asset } from 'expo-asset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const appBackground = Asset.fromModule(require('../../assets/images/app-background.jpg')).uri;
const tmdbLogo = require('../../assets/tmdb-logo.png');
const traktLogo = require('../../assets/trakt-logo.png');
const tvmazeLogo = require('../../assets/tvmaze-logo.png');

interface DataSourceProps {
  logo: any;
  logoWidth: number;
  logoHeight: number;
  name: string;
  description: string;
  url: string;
  disclaimer?: string;
}

function DataSourceCard({ logo, logoWidth, logoHeight, name, description, url, disclaimer }: DataSourceProps) {
  const handlePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open URL:', error);
    }
  };

  return (
    <Pressable style={styles.card} onPress={handlePress}>
      <View style={styles.logoContainer}>
        <Image source={logo} style={{ width: logoWidth, height: logoHeight }} resizeMode="contain" />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.sourceName}>{name}</Text>
        <Text style={styles.sourceDescription}>{description}</Text>
        {disclaimer && (
          <Text style={styles.disclaimer}>{disclaimer}</Text>
        )}
        <Text style={styles.linkText}>{url.replace('https://', '')}</Text>
      </View>
    </Pressable>
  );
}

export default function AcknowledgmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={[styles.customHeader, { paddingTop: insets.top + 12 }]}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Acknowledgments</Text>
            <Text style={styles.headerSubtitle}>
              Episoda is powered by the following amazing data sources.
            </Text>
          </View>

          <View style={styles.cardsContainer}>
            <DataSourceCard
              logo={tmdbLogo}
              logoWidth={100}
              logoHeight={40}
              name="TMDB"
              description="The Movie Database provides comprehensive TV show and movie metadata, including posters, cast information, and streaming availability."
              url="https://www.themoviedb.org"
              disclaimer="This product uses the TMDB API but is not endorsed or certified by TMDB."
            />

            <DataSourceCard
              logo={traktLogo}
              logoWidth={120}
              logoHeight={36}
              name="Trakt"
              description="Trakt provides detailed TV show information including episode data, air dates, and show statistics that power our tracking features."
              url="https://trakt.tv"
            />

            <DataSourceCard
              logo={tvmazeLogo}
              logoWidth={100}
              logoHeight={24}
              name="TVMaze"
              description="TVMaze provides episode thumbnails and supplementary show information to enhance your viewing experience."
              url="https://www.tvmaze.com"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              We're grateful to these services for making their data available to developers and enabling apps like Episoda to exist.
            </Text>
          </View>

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
  scrollView: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 4,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  headerTitle: {
    ...typography.titleL,
    color: colors.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    ...typography.p2,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  cardsContainer: {
    paddingHorizontal: 16,
    gap: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.cardStroke,
  },
  logoContainer: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardContent: {
    gap: 8,
  },
  sourceName: {
    ...typography.subtitle,
    color: colors.text,
    fontWeight: '600',
  },
  sourceDescription: {
    ...typography.p2,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  disclaimer: {
    ...typography.p3Regular,
    color: colors.grey1,
    fontStyle: 'italic',
    lineHeight: 18,
    marginTop: 4,
  },
  linkText: {
    ...typography.p3Regular,
    color: colors.greenHighlight,
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  footerText: {
    ...typography.p3Regular,
    color: colors.grey1,
    textAlign: 'center',
    lineHeight: 18,
  },
});
