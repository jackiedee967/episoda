import {useVariants} from 'react-exo/utils';
import {StyleSheet} from 'react-native-unistyles';
import {View, Text} from 'react-native';

import {SearchDuotoneLine} from '';

import type {ViewStyle, StyleProp} from 'react-native';

export interface InputProps {
  areaCode: string,
  filledText: string,
  helperDisabledText: string,
  helperErrorText: string,
  helperSuccessText: string,
  helperText: string,
  placeholderInput: string,
  text: string,
  typedText: string,
  property1: typeof InputVariants.property1[number],
  state: typeof InputVariants.state[number],
  helperText?: boolean,
  iconStatus?: boolean,
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export const InputVariants = {
  property1: ['Input'],
  state: ['Search', 'Standard', 'BodyText', 'Phone'],
} as const;

export function Input(props: InputProps) {
  const {property1, state} = props;
  const {vstyles} = useVariants(InputVariants, {property1, state}, styles);

  return (
    <View testID={props.testID ?? "342:5997"} style={[vstyles.root(), props.style]}>
      <View testID="342:5979" style={vstyles.frame4()}>
        <Text testID="342:5980" style={styles.search}>
          {`Search`}
        </Text>
        <View testID="342:5981" style={styles.frame}>
          <View testID="342:5982" style={styles.autoLayoutHorizontal}>
            <SearchDuotoneLine testID="342:5983"/>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    flexDirection: 'row',
    width: 392,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  rootProperty1InputStateBodyText: {
    height: 313,
  },
  rootProperty1InputStatePhone: {
    justifyContent: undefined,
    flexDirection: 'column',
    alignItems: 'flex-start',
    rowGap: 4,
    columnGap: 4,
  },
  search: {
    width: 317,
    flexShrink: 0,
    color: 'Grey.1',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '400',
  },
  frame4: {
    flexDirection: 'row',
    width: 392,
    paddingTop: 8,
    paddingLeft: 20,
    paddingBottom: 8,
    paddingRight: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
    alignSelf: 'stretch',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'Grey.2',
    backgroundColor: 'Almost.White',
  },
  frame4Property1InputStateStandard: {
    justifyContent: undefined,
    rowGap: 8,
    columnGap: 8,
  },
  frame4Property1InputStateBodyText: {
    justifyContent: undefined,
    alignItems: 'flex-start',
    rowGap: 8,
    columnGap: 8,
  },
  frame: {
    flexDirection: 'row',
    width: 37,
    height: 35,
    paddingTop: 6,
    paddingLeft: 0,
    paddingBottom: 7,
    paddingRight: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
  },
  autoLayoutHorizontal: {
    flexDirection: 'row',
    width: 37,
    height: 22,
    paddingTop: 8,
    paddingLeft: 10,
    paddingBottom: 8,
    paddingRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 8,
    columnGap: 8,
    flexShrink: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
}));
