import {StyleSheet} from 'react-native-unistyles';
import {View, Text} from 'react-native';
import {Image} from 'react-exo/image';

import {Friends} from 'components/ui-pages/base/friends';
import userProfilePic from './assets/userprofilepic.png';

import type {ViewStyle, StyleProp} from 'react-native';

export interface UserCardProps {
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export function UserCard(props: UserCardProps) {
  return (
    <View testID={props.testID ?? "341:3566"} style={[styles.root, props.style]}>
      <View testID="341:3552" style={styles.userInfo}>
        <Image url={userProfilePic} width={92} height={92}/>
        <Text testID="341:3554" style={styles.name}>
          {`Jacqueline`}
        </Text>
        <Text testID="341:3555" style={styles.username}>
          {`@jvckie`}
        </Text>
      </View>
      <Friends testID="344:29871"
        prop="Count"
        state="Mutual_Friends"
      />
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    width: 114,
    paddingTop: 12,
    paddingLeft: 11,
    paddingBottom: 12,
    paddingRight: 11,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 10,
    columnGap: 10,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 0.5,
    borderStyle: 'solid',
    borderColor: 'Card.Stroke',
    backgroundColor: 'Card.Background',
    shadowColor: 'rgba(0, 0, 0, 0.07058823853731155)',
    shadowRadius: 10.9,
    shadowOffset: {"width":0,"height":4},
  },
  name: {
    alignSelf: 'stretch',
    color: 'Almost.White',
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '400',
  },
  username: {
    alignSelf: 'stretch',
    color: 'Grey.1',
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '500',
  },
  userInfo: {
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: 6,
    columnGap: 6,
    alignSelf: 'stretch',
  },
  friends: {
    flexDirection: 'row',
    width: 56,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
}));
