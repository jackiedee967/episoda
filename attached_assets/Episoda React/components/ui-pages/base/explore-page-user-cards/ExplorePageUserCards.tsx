import {useVariants} from 'react-exo/utils';
import {StyleSheet} from 'react-native-unistyles';
import {View, Text} from 'react-native';
import {Image} from 'react-exo/image';

import {ButtonS} from 'components/ui-pages/base/button-s';
import userPic from './assets/userpic.png';

import type {ViewStyle, StyleProp} from 'react-native';

export interface ExplorePageUserCardsProps {
  state: typeof ExplorePageUserCardsVariants.state[number],
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export const ExplorePageUserCardsVariants = {
  state: ['NotFollowing', 'Following'],
} as const;

export function ExplorePageUserCards(props: ExplorePageUserCardsProps) {
  const {state} = props;
  const {vstyles} = useVariants(ExplorePageUserCardsVariants, {state}, styles);

  return (
    <View testID={props.testID ?? "342:7650"} style={[vstyles.root(), props.style]}>
      <View testID="344:30934" style={styles.frame289738}>
        <Image url={userPic} width={47} height={47}/>
        <View testID="342:7638" style={vstyles.userInfo()}>
          <Text testID="342:7639" style={vstyles.jackie()}>
            {`Jackie`}
          </Text>
          <Text testID="342:7640" style={vstyles.jvckie()}>
            {`@jvckie`}
          </Text>
          <Text testID="342:7641" style={vstyles.realityShowAddict3()}>
            {`Reality show addict <3`}
          </Text>
        </View>
      </View>
      <ButtonS testID="342:7645" style={vstyles.buttonS()}/>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    width: 392,
    height: 78,
    flexShrink: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 0.5,
    borderStyle: 'solid',
    borderColor: 'Card.Stroke',
    backgroundColor: 'Card.Background',
  },
  jackie: {
    width: 238,
    height: 10,
    flexDirection: 'column',
    justifyContent: 'center',
    flexShrink: 0,
    color: 'Pure.White',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '600',
  },
  jvckie: {
    width: 87,
    height: 11,
    flexShrink: 0,
    color: 'Green.Highlight',
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '500',
  },
  realityShowAddict3: {
    width: 131,
    height: 11,
    flexShrink: 0,
    color: 'Grey.1',
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '400',
  },
  frame289738: {
    flexDirection: 'row',
    alignItems: 'center',
    rowGap: 10,
    columnGap: 10,
  },
  userInfo: {
    width: 162,
    height: 42,
    flexDirection: 'column',
    alignItems: 'flex-start',
    rowGap: 5,
    columnGap: 5,
    flexShrink: 0,
  },
  buttonS: {
    width: 74,
  },
  buttonSStateFollowing: {
    flexDirection: 'row',
    height: 25,
    paddingTop: 16,
    paddingLeft: 20,
    paddingBottom: 16,
    paddingRight: 20,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 8,
    columnGap: 8,
    flexShrink: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: 'Grey.2',
  },
}));
