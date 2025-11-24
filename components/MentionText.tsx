import React from 'react';
import { Text, TextStyle, Pressable } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/styles/tokens';
import * as Haptics from 'expo-haptics';

interface MentionTextProps {
  text: string;
  style?: TextStyle;
  mentionColor?: string;
  numberOfLines?: number;
}

/**
 * Component that renders text with clickable @mentions
 * - Purple mentions when displayed in input (white background)
 * - Green mentions when displayed in posts/comments (dark background)
 */
export default function MentionText({
  text,
  style,
  mentionColor = colors.greenHighlight,
  numberOfLines,
}: MentionTextProps) {
  // Parse text into segments (regular text and mentions)
  const parseText = (inputText: string) => {
    const mentionRegex = /@(\w+)/g;
    const segments: Array<{ type: 'text' | 'mention'; content: string; username?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(inputText)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: inputText.substring(lastIndex, match.index),
        });
      }

      // Add mention
      segments.push({
        type: 'mention',
        content: match[0], // @username
        username: match[1], // username without @
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < inputText.length) {
      segments.push({
        type: 'text',
        content: inputText.substring(lastIndex),
      });
    }

    return segments;
  };

  const segments = parseText(text);

  const handleMentionPress = (username: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/user/${username}`);
  };

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {segments.map((segment, index) => {
        if (segment.type === 'mention') {
          return (
            <Text
              key={index}
              style={[style, { color: mentionColor, fontWeight: '600' }]}
              onPress={() => segment.username && handleMentionPress(segment.username)}
            >
              {segment.content}
            </Text>
          );
        }
        return <Text key={index}>{segment.content}</Text>;
      })}
    </Text>
  );
}
