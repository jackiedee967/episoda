import {useVariants} from 'react-exo/utils';
import {StyleSheet} from 'react-native-unistyles';
import {View, Text} from 'react-native';
import {Image} from 'react-exo/image';

import rectangle5 from './assets/rectangle5.png';
import userPic from './assets/userpic.png';

import type {ViewStyle, StyleProp} from 'react-native';

export interface NotificationPageCardsProps {
  state: typeof NotificationPageCardsVariants.state[number],
  type: typeof NotificationPageCardsVariants.type[number],
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export const NotificationPageCardsVariants = {
  state: ['Default'],
  type: ['Like', 'Comment', 'Follow', 'Repost'],
} as const;

export function NotificationPageCards(props: NotificationPageCardsProps) {
  const {type, state} = props;
  const {vstyles} = useVariants(NotificationPageCardsVariants, {type, state}, styles);

  return (
    <View testID={props.testID ?? "342:7954"} style={[vstyles.root(), props.style]}>
      <View testID="344:31081" style={styles.frame289741}>
        <Image url={userPic} width={31} height={31}/>
        <View testID="342:7948" style={styles.frame37}>
          <Text testID="342:7949" style={styles.jackieLikedYourPostMindBlown}>
            {`Jackie liked your post “Mind blown”`}
          </Text>
          <Text testID="342:7950" style={vstyles.$2HAgo()}>
            {`2h ago`}
          </Text>
        </View>
      </View>
      <Image url={rectangle5} width={40} height={40}/>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    width: 392,
    height: 61,
    flexShrink: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 0.5,
    borderStyle: 'solid',
    borderColor: 'rgba(62, 62, 62, 1)',
    backgroundColor: 'rgba(40, 40, 40, 1)',
  },
  rootTypeFollowStateDefault: {
    flexDirection: 'row',
    paddingTop: 15,
    paddingLeft: 17,
    paddingBottom: 15,
    paddingRight: 91,
    alignItems: 'center',
    rowGap: 10.979,
    columnGap: 10.979,
  },
  rootTypeCommentStateDefault: {
    height: 77,
  },
  jackieLikedYourPostMindBlown: {
    alignSelf: 'stretch',
    color: 'Pure.White',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '400',
  },
  $2HAgo: {
    width: 131,
    height: 11,
    flexShrink: 0,
    color: 'Grey.1',
    fontFamily: 'Funnel Display',
    fontSize: 8,
    fontStyle: 'normal',
    fontWeight: '400',
  },
  frame289741: {
    flexDirection: 'row',
    alignItems: 'center',
    rowGap: 10,
    columnGap: 10,
  },
  frame37: {
    width: 242,
    height: 27,
    flexDirection: 'column',
    alignItems: 'flex-start',
    rowGap: 5,
    columnGap: 5,
    flexShrink: 0,
  },
}));
