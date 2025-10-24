import {StyleSheet} from 'react-native-unistyles';
import {View, Text} from 'react-native';
import {Image} from 'react-exo/image';

import showPoster from './assets/showposter.png';
import userPic from './assets/userpic.png';

import type {ViewStyle, StyleProp} from 'react-native';

export interface ExplorePageCardsCommentsProps {
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export function ExplorePageCardsComments(props: ExplorePageCardsCommentsProps) {
  return (
    <View testID={props.testID ?? "342:9016"} style={[styles.root, props.style]}>
      <View testID="344:31056" style={styles.frame289740}>
        <Image url={userPic} width={31} height={31}/>
        <View testID="342:9019" style={styles.commentInfo}>
          <Text testID="342:9020" style={styles.yesITotallyAgreeee}>
            {`Jackie commented on post “Mind Blown” about S#E# of Love Island: ”Yes! I totally agreeee”
`}
          </Text>
          <Text testID="342:9021" style={styles.$2HAgo}>
            {`2h ago`}
          </Text>
        </View>
      </View>
      <Image url={showPoster} width={40} height={40}/>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    width: 392,
    height: 99,
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
  yesITotallyAgreeee: {
    width: 274,
    height: 50,
    flexShrink: 0,
    color: 'Green.Highlight',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '600',
    letterSpacing: -0.24,
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
  frame289740: {
    flexDirection: 'row',
    alignItems: 'center',
    rowGap: 10,
    columnGap: 10,
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 0,
  },
  commentInfo: {
    width: 257,
    height: 49,
    flexDirection: 'column',
    alignItems: 'flex-start',
    rowGap: 5,
    columnGap: 5,
    flexShrink: 0,
  },
}));
