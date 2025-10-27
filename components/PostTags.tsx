import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import tokens from '@/styles/tokens';
import * as Haptics from 'expo-haptics';

type TagSize = 'Small' | 'Large';
type TagState = 'S_E_' | 'Show_Name' | 'Fan_Theory' | 'Discussion' | 'Episode_Recap' | 'Spoiler' | 'Misc' | 'Custom';

interface PostTagsProps {
  prop?: TagSize;
  state?: TagState;
  text?: string;
  testID?: string;
  style?: ViewStyle;
  onPress?: () => void;
}

export default function PostTags({ 
  prop = 'Large', 
  state = 'S_E_', 
  text = 'S3 E3',
  testID,
  style,
  onPress
}: PostTagsProps) {
  
  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };
  
  const getTagStyle = () => {
    const baseStyle = [styles.root];
    
    if (prop === 'Small') {
      baseStyle.push(styles.small);
    }
    
    switch (state) {
      case 'S_E_':
        baseStyle.push(styles.episode);
        break;
      case 'Show_Name':
        baseStyle.push(styles.showName);
        break;
      case 'Fan_Theory':
        baseStyle.push(styles.fanTheory);
        break;
      case 'Discussion':
        baseStyle.push(styles.discussion);
        break;
      case 'Episode_Recap':
        baseStyle.push(styles.episodeRecap);
        break;
      case 'Spoiler':
        baseStyle.push(styles.spoiler);
        break;
      case 'Misc':
        baseStyle.push(styles.misc);
        break;
      case 'Custom':
        baseStyle.push(styles.custom);
        break;
    }
    
    return baseStyle;
  };
  
  const getTextStyle = () => {
    const baseStyle = [styles.text];
    
    if (prop === 'Small') {
      baseStyle.push(styles.textSmall);
    }
    
    switch (state) {
      case 'S_E_':
        baseStyle.push(styles.textEpisode);
        break;
      case 'Show_Name':
        baseStyle.push(styles.textShowName);
        break;
      case 'Fan_Theory':
        baseStyle.push(styles.textFanTheory);
        break;
      case 'Discussion':
        baseStyle.push(styles.textDiscussion);
        break;
      case 'Spoiler':
        baseStyle.push(styles.textSpoiler);
        break;
      case 'Misc':
        baseStyle.push(styles.textMisc);
        break;
      case 'Custom':
        baseStyle.push(styles.textCustom);
        break;
    }
    
    return baseStyle;
  };

  const TagWrapper = onPress ? Pressable : View;
  
  return (
    <TagWrapper 
      testID={testID} 
      style={[...getTagStyle(), style]}
      {...(onPress ? { onPress: handlePress } : {})}
    >
      <Text style={getTextStyle()}>{text}</Text>
    </TagWrapper>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingLeft: 12,
    paddingBottom: 8,
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 0.25,
    borderStyle: 'solid',
  },
  small: {
    paddingTop: 5,
    paddingLeft: 9,
    paddingBottom: 5,
    paddingRight: 9,
  },
  episode: {
    borderColor: tokens.colors.tabStroke2,
    backgroundColor: tokens.colors.tabBack2,
  },
  showName: {
    borderColor: tokens.colors.tabStroke,
    backgroundColor: tokens.colors.tabBack,
  },
  fanTheory: {
    borderColor: tokens.colors.tabStroke3,
    backgroundColor: tokens.colors.tabBack3,
  },
  discussion: {
    borderColor: tokens.colors.tabStroke4,
    backgroundColor: tokens.colors.tabBack4,
  },
  episodeRecap: {
    borderColor: tokens.colors.tabStroke2,
    backgroundColor: tokens.colors.tabBack2,
  },
  spoiler: {
    borderColor: tokens.colors.tabStroke5,
    backgroundColor: tokens.colors.tabBack5,
  },
  misc: {
    borderColor: tokens.colors.tabStroke6,
    backgroundColor: tokens.colors.tabBack6,
  },
  custom: {
    borderColor: tokens.colors.grey3,
    backgroundColor: tokens.colors.almostWhite,
  },
  text: {
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '400',
  },
  textSmall: {
    fontSize: 10,
  },
  textEpisode: {
    color: tokens.colors.tabStroke2,
  },
  textShowName: {
    color: tokens.colors.tabStroke,
  },
  textFanTheory: {
    color: tokens.colors.tabStroke3,
  },
  textDiscussion: {
    color: tokens.colors.tabStroke4,
  },
  textSpoiler: {
    color: tokens.colors.tabStroke5,
  },
  textMisc: {
    color: tokens.colors.tabStroke6,
  },
  textCustom: {
    color: tokens.colors.grey3,
  },
});
