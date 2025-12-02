import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Rect, Text as SvgText, Defs, LinearGradient, Stop } from 'react-native-svg';
import { POSTER_COLOR_SCHEMES } from '@/utils/posterPlaceholderGenerator';

interface PosterPlaceholderProps {
  title: string;
  width?: number;
  height?: number;
  style?: ViewStyle;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getColorSchemeForTitle(title: string) {
  const hash = simpleHash(title.toLowerCase());
  const index = hash % POSTER_COLOR_SCHEMES.length;
  return POSTER_COLOR_SCHEMES[index];
}

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  const approxCharWidth = fontSize * 0.6;
  const maxCharsPerLine = Math.floor(maxWidth / approxCharWidth);
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines.slice(0, 4);
}

export default function PosterPlaceholder({ title, width = 160, height = 240, style }: PosterPlaceholderProps) {
  const colorScheme = getColorSchemeForTitle(title);
  const fontSize = 13;
  const lineHeight = 15.6;
  const padding = 12;
  
  const lines = wrapText(title, width - (padding * 2), fontSize);
  const totalTextHeight = lines.length * lineHeight;
  const startY = (height - totalTextHeight) / 2 + lineHeight;
  const gradientId = `bg-${simpleHash(title)}`;
  
  return (
    <View style={[{ width, height, borderRadius: 8, overflow: 'hidden' }, style]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colorScheme.background} stopOpacity={1} />
            <Stop offset="100%" stopColor={colorScheme.background} stopOpacity={0.8} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill={`url(#${gradientId})`} />
        {lines.map((line, index) => {
          const y = startY + (index * lineHeight);
          return (
            <SvgText
              key={index}
              x={width / 2}
              y={y}
              fontSize={fontSize}
              fontWeight="300"
              fill={colorScheme.text}
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {line}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

export function BackdropPlaceholder({ title, width = 400, height = 160, style }: PosterPlaceholderProps) {
  const colorScheme = getColorSchemeForTitle(title);
  const gradientId = `backdrop-${simpleHash(title)}`;
  
  return (
    <View style={[{ width, height, overflow: 'hidden' }, style]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          <LinearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={colorScheme.background} stopOpacity={1} />
            <Stop offset="100%" stopColor={colorScheme.background} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}
