import {StyleSheet} from 'react-native-unistyles';
import {View, Text} from 'react-native';
import {Image} from 'react-exo/image';

import {Heart} from '';
import {MessageCircle} from '';
import {RefreshCw} from '';
import {PostTags} from 'components/ui-pages/base/post-tags';
import {StarRatings} from 'components/ui-pages/base/star-ratings';

import Divider from './assets/divider.svg';
import showPoster from './assets/showposter.png';
import userProfilePic from './assets/userprofilepic.png';

import type {ViewStyle, StyleProp} from 'react-native';

export interface PostProps {
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export function Post(props: PostProps) {
  return (
    <View testID={props.testID ?? "341:2859"} style={[styles.root, props.style]}>
      <View testID="341:3442" style={styles.userPostInfo}>
        <View testID="348:16365" style={styles.frame289745}>
          <Image url={showPoster} width={56.45} height={75}/>
        </View>
        <View testID="341:3415" style={styles.frame289719}>
          <Text testID="341:2591" style={styles.jvckieJustWatched}>
            {`Jvckie just watched`}
          </Text>
          <PostTags testID="344:45677"
            prop="Large"
            property1="Post_Tag"
            state="S_E_"
          />
          <PostTags testID="341:2722"
            prop="Large"
            property1="Post_Tag"
            state="Show_Name"
          />
          <StarRatings testID="341:2725"
            state="$5"
          />
        </View>
      </View>
      <Image url={userProfilePic} width={22} height={22}/>
      <Divider/>
      <View testID="341:2737" style={styles.postInfo}>
        <Text testID="341:2604" style={styles.iNeedSomeoneToTalkToAboutThisNow}>
          {`I need someone to talk to about this NOW`}
        </Text>
        <Text testID="341:2735" style={styles.loremIpsumDolorSitAmetConsecteturAdipiscingElitNullaMaximusEratNonElitRutrumFacilisisOrnareSitAmetEstDuisSemperIdAnteNonMalesuadaUtEratEnimPortaIdPosuereAtVolutpatVehiculaElit}>
          {`Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla maximus erat non elit rutrum facilisis ornare sit amet est. Duis semper id ante non malesuada. Ut erat enim, porta id posuere at, volutpat vehicula elit.  `}
        </Text>
        <View testID="341:2858" style={styles.postTags6}>
          <PostTags testID="341:2850"
            prop="Small"
            property1="Post_Tag"
            state="Fan_Theory"
          />
          <PostTags testID="341:2851"
            prop="Small"
            property1="Post_Tag"
            state="Discussion"
          />
          <PostTags testID="348:4788"
            prop="Small"
            property1="Post_Tag"
            state="Episode_Recap"
          />
        </View>
        <View testID="341:2767" style={styles.engagementIconsAndCount}>
          <View testID="341:2758" style={styles.likes}>
            <Heart testID="341:2742"
              size="$48"
            />
            <Text testID="341:2739" style={styles.$5}>
              {`5`}
            </Text>
          </View>
          <View testID="341:2759" style={styles.comments}>
            <MessageCircle testID="341:2741"
              size="$48"
            />
            <Text testID="341:2740" style={styles.$12}>
              {`12`}
            </Text>
          </View>
          <View testID="341:2768" style={styles.reposts}>
            <RefreshCw testID="341:2769"
              size="$48"
            />
            <Text testID="341:2770" style={styles.$52}>
              {`5`}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    flexDirection: 'row',
    width: 427,
    paddingTop: 16,
    paddingLeft: 16,
    paddingBottom: 16,
    paddingRight: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    alignContent: 'flex-start',
    rowGap: 15,
    flexWrap: 'wrap',
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
  userPostInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 13,
    columnGap: 13,
  },
  frame289745: {
    width: 56,
    height: 75,
    paddingBottom: 0,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
  },
  jvckieJustWatched: {
    width: 162,
    height: 17,
    flexDirection: 'column',
    justifyContent: 'center',
    flexShrink: 0,
    color: 'Almost.White',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '400',
  },
  postTags: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingLeft: 12,
    paddingBottom: 8,
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 6,
    columnGap: 6,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 0.25,
    borderStyle: 'solid',
    borderColor: 'Tab...Stroke.2',
    backgroundColor: 'Tab...Back.2',
  },
  postTags2: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingLeft: 12,
    paddingBottom: 8,
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 6,
    columnGap: 6,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 0.25,
    borderStyle: 'solid',
    borderColor: 'Tab...Stroke',
    backgroundColor: 'Tab...Back',
  },
  starRatings: {
    flexDirection: 'row',
    alignItems: 'center',
    rowGap: 1,
    columnGap: 1,
  },
  frame289719: {
    flexDirection: 'row',
    width: 162,
    height: 69.641,
    alignItems: 'flex-start',
    alignContent: 'flex-start',
    rowGap: 7,
    columnGap: 8,
    flexWrap: 'wrap',
  },
  iNeedSomeoneToTalkToAboutThisNow: {
    alignSelf: 'stretch',
    color: 'Almost.White',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '600',
  },
  loremIpsumDolorSitAmetConsecteturAdipiscingElitNullaMaximusEratNonElitRutrumFacilisisOrnareSitAmetEstDuisSemperIdAnteNonMalesuadaUtEratEnimPortaIdPosuereAtVolutpatVehiculaElit: {
    alignSelf: 'stretch',
    color: 'Almost.White',
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '400',
  },
  postTags3: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingLeft: 12,
    paddingBottom: 8,
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 6,
    columnGap: 6,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 0.25,
    borderStyle: 'solid',
    borderColor: 'Tab...Stroke.3',
    backgroundColor: 'Tab...Back.3',
  },
  postTags4: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingLeft: 12,
    paddingBottom: 8,
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 6,
    columnGap: 6,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 0.25,
    borderStyle: 'solid',
    borderColor: 'Tab...Stroke.4',
    backgroundColor: 'Tab...Back.4',
  },
  postTags5: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingLeft: 12,
    paddingBottom: 8,
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 6,
    columnGap: 6,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 0.25,
    borderStyle: 'solid',
    borderColor: 'Tab...Stroke.2',
    backgroundColor: 'Tab...Back.2',
  },
  postInfo: {
    width: 346,
    flexDirection: 'column',
    alignItems: 'flex-start',
    rowGap: 10,
    columnGap: 10,
    flexShrink: 0,
  },
  postTags6: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    rowGap: 10,
    columnGap: 10,
  },
  $5: {
    color: 'Grey.1',
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '400',
  },
  engagementIconsAndCount: {
    flexDirection: 'row',
    width: 90,
    alignItems: 'center',
    rowGap: 10,
    columnGap: 10,
  },
  likes: {
    flexDirection: 'row',
    alignItems: 'center',
    rowGap: 4,
    columnGap: 4,
  },
  $12: {
    color: 'Grey.1',
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '400',
  },
  comments: {
    flexDirection: 'row',
    alignItems: 'center',
    rowGap: 4,
    columnGap: 4,
  },
  $52: {
    color: 'Grey.1',
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '400',
  },
  reposts: {
    flexDirection: 'row',
    alignItems: 'center',
    rowGap: 4,
    columnGap: 4,
  },
}));
