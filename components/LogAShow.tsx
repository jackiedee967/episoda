import { StyleSheet, View, Text, Pressable } from 'react-native';
import { colors } from '@/styles/commonStyles';
import tokens from '@/styles/tokens';

export interface LogAShowProps {
  onPress?: () => void;
  style?: any;
  testID?: string;
}

export function LogAShow(props: LogAShowProps) {
  return (
    <View testID={props.testID ?? "348:1932"} style={[styles.root, props.style]}>
      <View style={styles.greenCircle} />
      <Text testID="348:1917" style={styles.whatAreYouWatching}>
        {`What are you watching?`}
      </Text>
      <Pressable 
        testID="348:1918"
        style={styles.tellYourFriendsButton}
        onPress={props.onPress}
      >
        <Text style={styles.buttonText}>Tell your friends</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    width: '100%',
    height: 60,
    paddingTop: 8,
    paddingLeft: 20,
    paddingBottom: 8,
    paddingRight: 6,
    alignItems: 'center',
    gap: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.colors.cardStroke,
    backgroundColor: tokens.colors.cardBackground,
    marginBottom: 20,
  },
  greenCircle: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: tokens.colors.greenHighlight,
  },
  whatAreYouWatching: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 0,
    color: tokens.colors.almostWhite,
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '400',
  },
  tellYourFriendsButton: {
    paddingTop: 11,
    paddingLeft: 20,
    paddingBottom: 11,
    paddingRight: 20,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: tokens.colors.greenHighlight,
  },
  buttonText: {
    color: tokens.colors.black,
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontWeight: '600',
  },
});
