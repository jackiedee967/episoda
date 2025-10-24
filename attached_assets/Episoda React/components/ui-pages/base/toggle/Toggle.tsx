import {useVariants} from 'react-exo/utils';
import {StyleSheet} from 'react-native-unistyles';
import {View, Text} from 'react-native';

import type {ViewStyle, StyleProp} from 'react-native';

export interface ToggleProps {
  property1: typeof ToggleVariants.property1[number],
  state: typeof ToggleVariants.state[number],
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export const ToggleVariants = {
  property1: ['PostTag'],
  state: ['$3Tabs', '$2Tabs', '$4Tabs', '$2Tabs2', '$3Tabs2'],
} as const;

export function Toggle(props: ToggleProps) {
  const {property1, state} = props;
  const {vstyles} = useVariants(ToggleVariants, {property1, state}, styles);

  return (
    <View testID={props.testID ?? "342:4935"} style={[vstyles.root(), props.style]}>
      <View testID="342:4928" style={vstyles.autoLayoutHorizontal()}>
        <Text testID="342:4929" style={vstyles.friends()}>
          {`Friends`}
        </Text>
      </View>
      <View testID="342:4930" style={vstyles.autoLayoutHorizontal2()}>
        <Text testID="342:4931" style={vstyles.everyone()}>
          {`Everyone`}
        </Text>
      </View>
      <View testID="342:4932" style={vstyles.autoLayoutHorizontal3()}>
        <Text testID="342:4933" style={vstyles.episodes()}>
          {`Episodes`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    flexDirection: 'row',
    width: 392,
    height: 46,
    paddingTop: 6,
    paddingLeft: 6,
    paddingBottom: 6,
    paddingRight: 6,
    alignItems: 'flex-start',
    rowGap: 2,
    columnGap: 2,
    flexShrink: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'Card.Stroke',
    backgroundColor: 'rgba(40, 40, 40, 1)',
  },
  friends: {
    width: 78,
    height: 24,
    flexDirection: 'column',
    justifyContent: 'center',
    color: 'Black',
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '600',
  },
  friendsProperty1PostTagState3Tabs2: {
    width: undefined,
    height: undefined,
    flexDirection: undefined,
    justifyContent: undefined,
    color: 'Pure.White',
  },
  autoLayoutHorizontal: {
    flexDirection: 'row',
    paddingTop: 16,
    paddingLeft: 20,
    paddingBottom: 16,
    paddingRight: 20,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 8,
    columnGap: 8,
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 0,
    alignSelf: 'stretch',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    backgroundColor: 'Green.Highlight',
  },
  autoLayoutHorizontalProperty1PostTagState3Tabs2: {
    backgroundColor: undefined,
  },
  everyone: {
    width: 78,
    height: 24,
    flexDirection: 'column',
    justifyContent: 'center',
    color: 'Pure.White',
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '600',
  },
  everyoneProperty1PostTagState3Tabs2: {
    width: undefined,
    height: undefined,
    flexDirection: undefined,
    justifyContent: undefined,
  },
  autoLayoutHorizontal2: {
    flexDirection: 'row',
    paddingTop: 16,
    paddingLeft: 20,
    paddingBottom: 16,
    paddingRight: 20,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 8,
    columnGap: 8,
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 0,
    alignSelf: 'stretch',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  episodes: {
    width: 78,
    height: 24,
    flexDirection: 'column',
    justifyContent: 'center',
    color: 'Pure.White',
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '600',
  },
  episodesProperty1PostTagState3Tabs2: {
    width: undefined,
    height: undefined,
    flexDirection: undefined,
    justifyContent: undefined,
    color: 'Black',
  },
  autoLayoutHorizontal3: {
    flexDirection: 'row',
    paddingTop: 16,
    paddingLeft: 20,
    paddingBottom: 16,
    paddingRight: 20,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 8,
    columnGap: 8,
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 0,
    alignSelf: 'stretch',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  autoLayoutHorizontal3Property1PostTagState3Tabs2: {
    backgroundColor: 'Green.Highlight',
  },
}));
