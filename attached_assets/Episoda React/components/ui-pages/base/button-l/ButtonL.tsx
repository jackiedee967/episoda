import {StyleSheet} from 'react-native-unistyles';
import {Text, Pressable} from 'react-native';

import type {ViewStyle, StyleProp, PressableProps, GestureResponderEvent} from 'react-native';

export interface ButtonLProps extends PressableProps {
  httpsWwwAnimaappComUtmSourceFigmaSamplesUtmCampaignFigmaLpUiKitUtmMediumFigmaSamples?: (e: GestureResponderEvent) => void,
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
}

export function ButtonL(props: ButtonLProps) {
  return (
    <Pressable testID={props.testID ?? "341:2417"} style={[styles.root, props.style]} {...props}>
      {e => <>
        <Text testID="341:2415" style={styles.label}>
          {`Tell your friends`}
        </Text>
      </>}
    </Pressable>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    flexDirection: 'row',
    width: 136,
    paddingTop: 11,
    paddingLeft: 34,
    paddingBottom: 11,
    paddingRight: 34,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 8,
    columnGap: 8,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: 'Green.Highlight',
  },
  label: {
    color: 'Black',
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '600',
    lineHeight: 24,
  },
}));
