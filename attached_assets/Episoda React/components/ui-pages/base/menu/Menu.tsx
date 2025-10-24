import {StyleSheet} from 'react-native-unistyles';
import {View} from 'react-native';
import {Image} from 'react-exo/image';

import {Bell} from '';
import {Home} from '';
import {Search} from '';

import ellipse1 from './assets/ellipse1.png';

import type {ViewStyle, StyleProp} from 'react-native';

export interface MenuProps {
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export function Menu(props: MenuProps) {
  return (
    <View testID={props.testID ?? "342:4188"} style={[styles.root, props.style]}>
      <View testID="341:4061" style={styles.pills}>
        <Home testID="341:4100"
          size="$48"
        />
      </View>
      <View testID="341:4117" style={styles.pills2}>
        <Search testID="341:4118"
          size="$48"
        />
      </View>
      <View testID="341:4121" style={styles.pills3}>
        <Bell testID="341:4122"
          size="$48"
        />
      </View>
      <View testID="341:4071" style={styles.pills4}>
        <Image url={ellipse1} width={16} height={16}/>
      </View>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    flexDirection: 'row',
    paddingTop: 6,
    paddingLeft: 6,
    paddingBottom: 6,
    paddingRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 4,
    columnGap: 4,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'Card.Stroke',
    backgroundColor: 'Black',
  },
  pills: {
    flexDirection: 'row',
    width: 46,
    height: 30,
    paddingTop: 8,
    paddingLeft: 12,
    paddingBottom: 8,
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 4,
    columnGap: 4,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0,
    borderStyle: 'solid',
    borderColor: 'light.40',
    backgroundColor: 'Green.Highlight',
    shadowColor: 'rgba(0, 0, 0, 0.03921568766236305)',
    shadowRadius: 14,
    shadowOffset: {"width":0,"height":0},
  },
  pills2: {
    flexDirection: 'row',
    width: 46,
    height: 30,
    paddingTop: 8,
    paddingLeft: 12,
    paddingBottom: 8,
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 4,
    columnGap: 4,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0,
    borderStyle: 'solid',
    borderColor: 'light.40',
    shadowColor: 'rgba(0, 0, 0, 0.03921568766236305)',
    shadowRadius: 14,
    shadowOffset: {"width":0,"height":0},
  },
  pills3: {
    flexDirection: 'row',
    width: 46,
    height: 30,
    paddingTop: 8,
    paddingLeft: 12,
    paddingBottom: 8,
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 4,
    columnGap: 4,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0,
    borderStyle: 'solid',
    borderColor: 'light.40',
    shadowColor: 'rgba(0, 0, 0, 0.03921568766236305)',
    shadowRadius: 14,
    shadowOffset: {"width":0,"height":0},
  },
  pills4: {
    flexDirection: 'row',
    width: 46,
    height: 30,
    paddingTop: 8,
    paddingLeft: 12,
    paddingBottom: 8,
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 4,
    columnGap: 4,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 0,
    borderStyle: 'solid',
    borderColor: 'light.40',
    shadowColor: 'rgba(0, 0, 0, 0.03921568766236305)',
    shadowRadius: 14,
    shadowOffset: {"width":0,"height":0},
  },
}));
