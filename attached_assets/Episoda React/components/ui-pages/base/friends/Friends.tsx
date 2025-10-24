import {useVariants} from 'react-exo/utils';
import {StyleSheet} from 'react-native-unistyles';
import {View} from 'react-native';
import {Image} from 'react-exo/image';

import userPic from './assets/userpic.png';
import userPic2 from './assets/userpic2.png';
import userPic3 from './assets/userpic3.png';
import userPic4 from './assets/userpic4.png';

import type {ViewStyle, StyleProp} from 'react-native';

export interface FriendsProps {
  prop: typeof FriendsVariants.prop[number],
  state: typeof FriendsVariants.state[number],
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export const FriendsVariants = {
  prop: ['Small', 'Large', 'Count'],
  state: ['MutualFriends'],
} as const;

export function Friends(props: FriendsProps) {
  const {state, prop} = props;
  const {vstyles} = useVariants(FriendsVariants, {state, prop}, styles);

  return (
    <View testID={props.testID ?? "341:2553"} style={[vstyles.root(), props.style]}>
      <View testID="341:2555" style={vstyles.mutualFriends()}>
        <Image url={userPic} width={20} height={20}/>
        <Image url={userPic2} width={20} height={20}/>
        <Image url={userPic3} width={20} height={20}/>
        <Image url={userPic4} width={20} height={20}/>
      </View>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    flexDirection: 'row',
    width: 56,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  rootStateMutualFriendsPropSmall: {
    width: 36,
    height: 16,
    paddingTop: 0.5,
    paddingLeft: 0,
    paddingBottom: 0.5,
    paddingRight: 0,
  },
  mutualFriends: {
    flexDirection: 'row',
    alignItems: 'center',
    rowGap: -8,
    columnGap: -8,
  },
}));
,
    flexShrink: 0,
  },
  friends: {
    flexDirection: 'row',
    width: 56,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  friendsStateFriendsWatchingBarPropSmall: {
    flexShrink: undefined,
    width: 36,
    height: 16,
    paddingTop: 0.5,
    paddingLeft: 0,
    paddingBottom: 0.5,
    paddingRight: 0,
  },
  friendsStateFriendsInCommonBarPropSmall: {
    flexShrink: undefined,
    width: 36,
    height: 16,
    paddingTop: 0.5,
    paddingLeft: 0,
    paddingBottom: 0.5,
    paddingRight: 0,
  },
  $5FriendsWatching: {
    color: 'Almost.White',
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '400',
    letterSpacing: -0.2,
  },
}));
