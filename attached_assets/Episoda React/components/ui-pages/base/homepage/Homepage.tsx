import {StyleSheet} from 'react-native-unistyles';
import {View, Text} from 'react-native';
import {Image} from 'react-exo/image';

import {Button} from '';
import {ArrowRight} from '';
import {ArrowLeft} from '';
import {Post} from 'components/ui-pages/base/post';
import {Friends} from 'components/ui-pages/base/friends';
import {UserCard} from 'components/ui-pages/base/user-card';

import Arrow from './assets/arrow.svg';
import Arrow2 from './assets/arrow2.svg';
import Arrow3 from './assets/arrow3.svg';
import Divider from './assets/divider.svg';
import SaveToPlaylistIcon from './assets/savetoplaylisticon.svg';
import SaveToPlaylistIcon2 from './assets/savetoplaylisticon2.svg';
import episodaWhiteLogo1 from './assets/episodawhitelogo1.png';
import greenCircle from './assets/greencircle.png';
import showPosterImg from './assets/showposterimg.png';
import showPosterImg2 from './assets/showposterimg2.png';
import userProfile from './assets/userprofile.png';

import type {ViewStyle, StyleProp} from 'react-native';

export interface HomepageProps {
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export function Homepage(props: HomepageProps) {
  return (
    <View testID={props.testID ?? "344:16938"} style={[styles.root, props.style]}>
      <View testID="336:789" style={styles.everything}>
        <View testID="336:788" style={styles.header}>
          <Image url={episodaWhiteLogo1} width={154} height={27}/>
          <Image url={userProfile} width={40.32} height={38}/>
        </View>
        <Divider/>
        <View testID="330:5983" style={styles.main}>
          <View testID="316:1135" style={styles.welcomeTitles}>
            <Text testID="316:1136" style={styles.welcomeBack}>
              {`Welcome back`}
            </Text>
            <Text testID="316:1137" style={styles.usersName}>
              {`Jacqueline`}
            </Text>
          </View>
          <View testID="316:1140" style={styles.logShow}>
            <Image url={greenCircle} width={9} height={9}/>
            <Text testID="316:1145" style={styles.whatAreYouWatching}>
              {`What are you watching?`}
            </Text>
            <Button testID="316:1146"
              style={styles.tellYourFriendsButton}
              text="Tell your friends"
              type="Primary"
              hasLeftIcon={false}
              hasRightIcon={false}
            />
          </View>
          <View testID="316:1149" style={styles.recommendedTitles2}>
            <View testID="341:4142" style={styles.titleAndArrow}>
              <Text testID="316:1150" style={styles.recommendedTitles}>
                {`Recommended Titles`}
              </Text>
              <Arrow/>
            </View>
            <View testID="316:1151" style={styles.showPosters}>
              <View testID="344:14070" style={styles.showPoster}>
                <Image url={showPosterImg} width={215.5} height={279.99}/>
                <Friends testID="342:4161"
                  prop="Large"
                  state="Friends_Watching_Bar"
                />
                <SaveToPlaylistIcon/>
              </View>
              <View testID="344:14077" style={styles.showPoster2}>
                <Image url={showPosterImg2} width={215.5} height={279.99}/>
                <Friends testID="344:14079"
                  prop="Large"
                  state="Friends_Watching_Bar"
                />
                <SaveToPlaylistIcon2/>
              </View>
            </View>
          </View>
          <View testID="344:14093" style={styles.youMayKnow}>
            <View testID="330:6143" style={styles.userCards}>
              <UserCard testID="341:3567"/>
              <UserCard testID="341:3615"/>
              <UserCard testID="341:3583"/>
              <UserCard testID="341:3599"/>
            </View>
            <View testID="344:14089" style={styles.titleAndArrow2}>
              <Text testID="344:14090" style={styles.youMayKnow2}>
                {`You May Know`}
              </Text>
              <Arrow2/>
            </View>
          </View>
          <View testID="316:1200" style={styles.friendActivity2}>
            <View testID="341:4147" style={styles.titleAndArrow3}>
              <Text testID="341:4148" style={styles.friendActivity}>
                {`Friend Activity`}
              </Text>
              <Arrow3/>
            </View>
            <Post testID="341:2901" style={styles.post}/>
            <Post testID="341:2942" style={styles.post2}/>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    width: 440,
    height: 1463,
    paddingTop: 20,
    paddingLeft: 20,
    paddingBottom: 20,
    paddingRight: 20,
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: 524,
    columnGap: 524,
    backgroundColor: 'lightgray',
  },
  everything: {
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: 23,
    columnGap: 23,
    alignSelf: 'stretch',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  welcomeBack: {
    alignSelf: 'stretch',
    color: 'Almost.White',
    fontFamily: 'Funnel Display',
    fontSize: 17,
    fontStyle: 'normal',
    fontWeight: '500',
  },
  usersName: {
    alignSelf: 'stretch',
    color: 'Pure.White',
    fontFamily: 'Funnel Display',
    fontSize: 43,
    fontStyle: 'normal',
    fontWeight: '700',
    letterSpacing: -0.86,
  },
  main: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    rowGap: 29,
    columnGap: 29,
    alignSelf: 'stretch',
  },
  welcomeTitles: {
    width: 331,
    flexDirection: 'column',
    alignItems: 'flex-start',
    rowGap: 7,
    columnGap: 7,
  },
  whatAreYouWatching: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 0,
    color: 'Almost.White',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '400',
  },
  tellYourFriendsButton: {
    height: undefined,
    flexShrink: undefined,
    width: 136,
    paddingTop: 11,
    paddingLeft: 34,
    paddingBottom: 11,
    paddingRight: 34,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    backgroundColor: 'Green.Highlight',
  },
  logShow: {
    flexDirection: 'row',
    height: 60,
    paddingTop: 8,
    paddingLeft: 20,
    paddingBottom: 8,
    paddingRight: 6,
    alignItems: 'center',
    rowGap: 12,
    columnGap: 12,
    alignSelf: 'stretch',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'Card.Stroke',
    backgroundColor: 'Card.Background',
  },
  recommendedTitles: {
    color: 'Almost.White',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '500',
    letterSpacing: -0.26,
  },
  recommendedTitles2: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    rowGap: 17,
    columnGap: 17,
    alignSelf: 'stretch',
  },
  titleAndArrow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  friendsWatching: {
    flexDirection: 'row',
    width: 191,
    paddingTop: 9,
    paddingLeft: 14,
    paddingBottom: 9,
    paddingRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 8,
    columnGap: 8,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'Card.Stroke',
    backgroundColor: 'Card.Background',
  },
  showPosters: {
    flexDirection: 'row',
    width: 384.07901,
    alignItems: 'flex-start',
    rowGap: 9,
    columnGap: 9,
  },
  showPoster: {
    width: 215.69,
    height: 279.99399,
    flexShrink: 0,
  },
  friendsWatching2: {
    flexDirection: 'row',
    width: 191,
    paddingTop: 9,
    paddingLeft: 14,
    paddingBottom: 9,
    paddingRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 8,
    columnGap: 8,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'Card.Stroke',
    backgroundColor: 'Card.Background',
  },
  showPoster2: {
    width: 215.69,
    height: 279.99399,
    flexShrink: 0,
  },
  userCard: {
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
  userCard2: {
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
  userCard3: {
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
  userCard4: {
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
  youMayKnow: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    rowGap: 16,
    columnGap: 16,
  },
  userCards: {
    flexDirection: 'row',
    alignItems: 'center',
    rowGap: 10,
    columnGap: 10,
  },
  youMayKnow2: {
    color: 'Almost.White',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '500',
    letterSpacing: -0.26,
  },
  titleAndArrow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 0,
  },
  friendActivity: {
    color: 'Almost.White',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '500',
    letterSpacing: -0.26,
  },
  friendActivity2: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    rowGap: 17,
    columnGap: 17,
    alignSelf: 'stretch',
  },
  titleAndArrow3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  post: {
    width: undefined,
    alignSelf: 'stretch',
  },
  post2: {
    width: undefined,
    alignSelf: 'stretch',
  },
}));
