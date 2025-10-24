import {useVariants} from 'react-exo/utils';
import {StyleSheet} from 'react-native-unistyles';
import {View} from 'react-native';

import Star1 from './assets/star1.svg';
import Star2 from './assets/star2.svg';
import Star3 from './assets/star3.svg';
import Star4 from './assets/star4.svg';
import Star5 from './assets/star5.svg';

import type {ViewStyle, StyleProp} from 'react-native';

export interface StarRatingsProps {
  state: typeof StarRatingsVariants.state[number],
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export const StarRatingsVariants = {
  state: ['Blank', '$1', '$2', '$3', '$4', '$5'],
} as const;

export function StarRatings(props: StarRatingsProps) {
  const {state} = props;
  const {vstyles} = useVariants(StarRatingsVariants, {state}, styles);

  return (
    <View testID={props.testID ?? "342:8964"} style={[vstyles.root(), props.style]}>
      <Star1/>
      <Star2/>
      <Star3/>
      <Star4/>
      <Star5/>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    rowGap: 1,
    columnGap: 1,
  },
}));
