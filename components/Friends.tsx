import React, { useMemo } from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {colors, typography} from '@/styles/tokens';

import {Friends as BaseFriends} from './ui-pages/base/friends';

import type {ViewStyle, StyleProp} from 'react-native';

export interface FriendsProps {
  prop: typeof FriendsVariants.prop[number],
  state: typeof FriendsVariants.state[number],
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
  /** Friends data for the bar */
  friends?: Array<{
    id: string;
    avatar?: string;
    displayName?: string;
    username?: string;
  }>;
  /** Text to display (e.g., "Jackie and 2 others follow") */
  text?: string;
  /** Called when the component is pressed */
  onPress?: () => void;
}

export const FriendsVariants = {
  prop: ['Small', 'Large'],
  state: ['FriendsInCommonBar', 'FriendsWatchingBar'],
} as const;

// Custom useVariants implementation for this project
function useVariants(
  variants: typeof FriendsVariants,
  selected: { state: FriendsProps['state'], prop: FriendsProps['prop'] },
  styles: any
) {
  const vstyles = useMemo(() => {
    return {
      root: () => {
        const baseStyle = styles.root;
        const stateKey = `rootState${selected.state}Prop${selected.prop}` as keyof typeof styles;
        const variantStyle = styles[stateKey];
        
        return [baseStyle, variantStyle].filter(Boolean);
      }
    };
  }, [selected.state, selected.prop]);
  
  return { vstyles };
}

export function Friends(props: FriendsProps) {
  const {state, prop, friends = [], text = '', onPress} = props;
  const {vstyles} = useVariants(FriendsVariants, {state, prop}, styles);

  // Parse text to highlight username in green
  const renderText = () => {
    // Extract username (everything before " and " or " follow")
    const andIndex = text.indexOf(' and ');
    const followIndex = text.indexOf(' follow');
    
    let usernameEndIndex = -1;
    if (andIndex !== -1 && followIndex !== -1) {
      usernameEndIndex = Math.min(andIndex, followIndex);
    } else if (andIndex !== -1) {
      usernameEndIndex = andIndex;
    } else if (followIndex !== -1) {
      usernameEndIndex = followIndex;
    }
    
    if (usernameEndIndex === -1) {
      return <Text style={styles.friendsText}>{text}</Text>;
    }

    const username = text.substring(0, usernameEndIndex);
    const rest = text.substring(usernameEndIndex);

    return (
      <Text style={styles.friendsText}>
        <Text style={styles.usernameText}>{username}</Text>
        {rest}
      </Text>
    );
  };

  return (
    <TouchableOpacity 
      testID={props.testID ?? "342:4191"} 
      style={[vstyles.root(), props.style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <BaseFriends testID="342:4152"
        prop={prop}
        state="Mutual_Friends"
        friends={friends}
      />
      {renderText()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    paddingTop: 9,
    paddingLeft: 14,
    paddingBottom: 9,
    paddingRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 8,
    columnGap: 8,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.cardStroke,
    backgroundColor: colors.cardBackground,
  },
  rootStateFriendsWatchingBarPropSmall: {
    height: 25,
    flexShrink: 0,
  },
  rootStateFriendsInCommonBarPropSmall: {
    height: 25,
    flexShrink: 0,
  },
  friendsText: {
    color: colors.almostWhite,
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
  usernameText: {
    color: colors.greenHighlight,
  },
});
