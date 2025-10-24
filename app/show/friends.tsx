import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import tokens from '@/styles/tokens';
import PostCard from '@/components/PostCard';
import { SearchDuotoneLine } from '@/components/SearchDuotoneLine';
import { SortIcon } from '@/components/SortIcon';
import { Vector3Divider } from '@/components/Vector3Divider';

// Placeholder components for Figma elements we'll build next
const Toggle = ({ testID, property1, state }: any) => (
  <View testID={testID} style={{ 
    flexDirection: 'row',
    width: 392,
    height: 46,
    paddingTop: 6,
    paddingLeft: 6,
    paddingBottom: 6,
    paddingRight: 6,
    alignItems: 'flex-start',
    gap: 2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: tokens.colors.cardStroke,
    backgroundColor: 'rgba(40, 40, 40, 1)',
  }} />
);
const Friends = ({ testID, prop, state }: any) => <View testID={testID} />;
const ButtonL = ({ testID, style }: any) => (
  <TouchableOpacity testID={testID} style={[{
    flexDirection: 'row',
    paddingVertical: 11,
    paddingHorizontal: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: tokens.colors.greenHighlight,
  }, style]}>
    <Text style={{
      color: tokens.colors.black,
      textAlign: 'center',
      fontFamily: 'Funnel Display',
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 24,
    }}>Tell your friends</Text>
  </TouchableOpacity>
);

interface ShowHubFriendsTabProps {
  style?: any;
  testID?: string;
}

export default function ShowHubFriendsTab(props: ShowHubFriendsTabProps) {
  return (
    <ScrollView 
      testID={props.testID ?? "368:70822"} 
      style={[styles.root, props.style]}
      contentContainerStyle={styles.contentContainer}
    >
      <View testID="342:4630" style={styles.frame289706}>
        <View testID="342:4759" style={styles.frame289724}>
          <View testID="342:4760" style={styles.frame83}>
            <ChevronLeft testID="342:4761" size={20} color={tokens.colors.pureWhite} />
            <Text testID="342:4762" style={styles.back}>
              Back
            </Text>
          </View>
          <View testID="342:4763" style={styles.group289700}>
            <View testID="342:4764" style={styles.input}>
              <View testID="342:4765" style={styles.frame4}>
                <View testID="342:4766" style={styles.frame}>
                  <View testID="342:4767" style={styles.autoLayoutHorizontal}>
                    <SearchDuotoneLine testID="342:4768"/>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>
        <View testID="342:4631" style={styles.group289706}>
          <Text testID="342:4632" style={styles.loveIslandUsa}>
            Love Island USA
          </Text>
          <View testID="342:4633" style={styles.frame289723}>
            <View testID="342:4634" style={styles.group73}>
              <Image 
                source={require('@/attached_assets/Episoda React/assets/rectangle4.png')} 
                style={{ width: 93.01, height: 119 }}
                resizeMode="cover"
              />
            </View>
            <View testID="342:4636" style={styles.frame289722}>
              <Text testID="342:4637" style={styles.singlePeopleArriveAtATropicalIslandResortWhereTheyMustCoupleUpToSurviveSinglePeopleArriveAtATropicalIsland}>
                Single people arrive at a tropical island resort where they must couple up to survive. Single people arrive at a tropical island.
              </Text>
              <View testID="342:4638" style={styles.frame85}>
                <View testID="342:4639" style={styles.group25}>
                  <Text testID="342:4640" style={styles.$40}>
                    4.0
                  </Text>
                  <Image 
                    source={require('@/attached_assets/Episoda React/assets/Star4.svg')} 
                    style={{ width: 8, height: 8 }}
                  />
                </View>
                <Text testID="342:4642" style={styles.$3Seasons}>
                  3 Seasons
                </Text>
                <Text testID="342:4643" style={styles.$102Episodes}>
                  102 Episodes
                </Text>
              </View>
              <Friends 
                testID="342:4644"
                prop="Small"
                state="Friends_Watching_Bar"
              />
            </View>
          </View>
        </View>
        <ButtonL testID="342:5235" style={styles.buttonL}/>
        <Vector3Divider />
        <Toggle 
          testID="342:4943"
          property1="Post_Tag"
          state="$3_tabs"
        />
      </View>
      <View testID="342:4648" style={styles.frame289707}>
        <View testID="342:4649" style={styles.autoLayoutHorizontal2}>
          <Text testID="342:4650" style={styles.sortBy}>
            Sort by
          </Text>
          <SortIcon testID="342:4651"/>
        </View>
        {/* TODO: Replace with actual Post components with real data */}
        <View style={styles.post}>
          <Text style={{ color: tokens.colors.almostWhite, fontFamily: 'Funnel Display', fontSize: 13 }}>
            Post Card Placeholder
          </Text>
        </View>
        <View style={styles.post2}>
          <Text style={{ color: tokens.colors.almostWhite, fontFamily: 'Funnel Display', fontSize: 13 }}>
            Post Card Placeholder
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: tokens.colors.pageBackground,
  },
  contentContainer: {
    width: 440,
    paddingTop: 20,
    paddingLeft: 20,
    paddingBottom: 20,
    paddingRight: 20,
    flexDirection: 'column',
    alignItems: 'center',
  },
  back: {
    width: 168,
    height: 20,
    flexDirection: 'column',
    justifyContent: 'center',
    color: tokens.colors.pureWhite,
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '300',
  },
  frame289706: {
    width: 392,
    flexDirection: 'column',
    alignItems: 'flex-end',
    rowGap: 21,
    gap: 21,
  },
  frame289724: {
    flexDirection: 'row',
    height: 31,
    justifyContent: 'space-between',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  frame83: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 16,
    gap: 16,
  },
  group289700: {
    width: 49,
    height: 40,
  },
  input: {
    width: 49,
    height: 40,
    flexDirection: 'column',
    alignItems: 'flex-end',
    rowGap: 16,
    gap: 16,
    flexShrink: 0,
  },
  frame4: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingLeft: 6,
    paddingBottom: 8,
    paddingRight: 6,
    alignItems: 'center',
    rowGap: 8,
    gap: 8,
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 0,
    alignSelf: 'stretch',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(22, 22, 22, 0)',
    backgroundColor: 'rgba(239, 239, 239, 0)',
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
    gap: 8,
    flexShrink: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  loveIslandUsa: {
    width: 258,
    height: 22,
    flexShrink: 0,
    color: tokens.colors.pureWhite,
    fontFamily: 'Funnel Display',
    fontSize: 25,
    fontStyle: 'normal',
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  group289706: {
    width: 392,
    height: 164,
  },
  frame289723: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  group73: {
    width: 93.094,
    height: 119,
  },
  singlePeopleArriveAtATropicalIslandResortWhereTheyMustCoupleUpToSurviveSinglePeopleArriveAtATropicalIsland: {
    height: 45,
    alignSelf: 'stretch',
    color: tokens.colors.pureWhite,
    fontFamily: 'Funnel Display',
    fontSize: 13,
    fontStyle: 'normal',
    fontWeight: '300',
  },
  $40: {
    width: 20,
    height: 11,
    flexDirection: 'column',
    justifyContent: 'center',
    flexShrink: 0,
    color: tokens.colors.grey1,
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '300',
  },
  frame289722: {
    width: 290,
    flexDirection: 'column',
    alignItems: 'flex-start',
    rowGap: 11,
    gap: 11,
  },
  frame85: {
    flexDirection: 'row',
    width: 158,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 8,
    gap: 8,
  },
  group25: {
    width: 28.435,
    height: 11,
    flexShrink: 0,
  },
  $3Seasons: {
    color: tokens.colors.grey1,
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '300',
  },
  $102Episodes: {
    color: tokens.colors.grey1,
    textAlign: 'center',
    fontFamily: 'Funnel Display',
    fontSize: 10,
    fontStyle: 'normal',
    fontWeight: '300',
  },
  friends: {
    flexDirection: 'row',
    height: 25,
    paddingTop: 9,
    paddingLeft: 14,
    paddingBottom: 9,
    paddingRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 8,
    gap: 8,
    borderBottomLeftRadius: 11,
    borderBottomRightRadius: 11,
    borderTopLeftRadius: 11,
    borderTopRightRadius: 11,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.colors.cardStroke,
    backgroundColor: tokens.colors.cardBackground,
  },
  buttonL: {
    width: undefined,
    alignSelf: 'stretch',
  },
  toggle: {
    flexDirection: 'row',
    width: 392,
    height: 46,
    paddingTop: 6,
    paddingLeft: 6,
    paddingBottom: 6,
    paddingRight: 6,
    alignItems: 'flex-start',
    rowGap: 2,
    gap: 2,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: tokens.colors.cardStroke,
    backgroundColor: 'rgba(40, 40, 40, 1)',
  },
  sortBy: {
    color: tokens.colors.pureWhite,
    fontFamily: 'Funnel Display',
    fontSize: 9,
    fontStyle: 'normal',
    fontWeight: '400',
    lineHeight: 16,
    letterSpacing: -0.18,
  },
  frame289707: {
    width: 392,
    flexDirection: 'column',
    alignItems: 'flex-end',
    rowGap: 10,
    gap: 10,
  },
  autoLayoutHorizontal2: {
    flexDirection: 'row',
    width: 60,
    height: 38,
    paddingTop: 8,
    paddingLeft: 12,
    paddingBottom: 8,
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    rowGap: 6,
    gap: 6,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 0,
    borderStyle: 'solid',
    borderColor: 'rgba(0, 0, 0, 0.1)',
    shadowColor: 'rgba(0, 0, 0, 0.10196078568696976)',
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
  },
  post: {
    width: undefined,
    alignSelf: 'stretch',
  },
  post2: {
    width: undefined,
    alignSelf: 'stretch',
  },
});
