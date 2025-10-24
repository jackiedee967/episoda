import {StyleSheet} from 'react-native-unistyles';
import {View, Text} from 'react-native';
import {Image} from 'react-exo/image';

import {Input} from 'components/ui-pages/base/input';

import rectangle10 from './assets/rectangle10.png';
import rectangle11 from './assets/rectangle11.png';
import rectangle12 from './assets/rectangle12.png';
import rectangle13 from './assets/rectangle13.png';
import rectangle14 from './assets/rectangle14.png';
import rectangle4 from './assets/rectangle4.png';
import rectangle42 from './assets/rectangle42.png';
import rectangle43 from './assets/rectangle43.png';
import rectangle5 from './assets/rectangle5.png';
import rectangle6 from './assets/rectangle6.png';
import rectangle7 from './assets/rectangle7.png';
import rectangle8 from './assets/rectangle8.png';
import rectangle9 from './assets/rectangle9.png';

import type {ViewStyle, StyleProp} from 'react-native';

export interface LogAShowEpisodeFlowPopUp1Props {
  /** Used to override the default root style. */
  style?: StyleProp<ViewStyle>,
  /** Used to locate this view in end-to-end tests. */
  testID?: string,
}

export function LogAShowEpisodeFlowPopUp1(props: LogAShowEpisodeFlowPopUp1Props) {
  return (
    <View testID={props.testID ?? "355:34409"} style={[styles.root, props.style]}>
      <Text testID="330:978" style={styles.selectAShow}>
        {`Select a Show`}
      </Text>
      <Input testID="342:5987"
        areaCode="+1"
        filledText="305 1234 5678"
        helperDisabledText="Your phone number cannot be modified."
        helperErrorText="Phone number already in use, try logging in."
        helperSuccessText="Looking good!"
        helperText="We will use this number to validate your account."
        placeholderInput="305 1234 5678"
        text="Phone Number"
        typedText="305 123"
        property1="Input"
        state="Search"
        helperText
        iconStatus
      />
      <View testID="330:1080" style={styles.frame72}>
        <Image url={rectangle4} width={126} height={172}/>
        <Image url={rectangle42} width={126} height={172}/>
        <Image url={rectangle14} width={126} height={172}/>
        <Image url={rectangle43} width={126} height={172}/>
        <Image url={rectangle5} width={126} height={172}/>
        <Image url={rectangle6} width={126} height={172}/>
        <Image url={rectangle7} width={126} height={172}/>
        <Image url={rectangle8} width={126} height={172}/>
        <Image url={rectangle9} width={126} height={172}/>
        <Image url={rectangle11} width={126} height={172}/>
        <Image url={rectangle12} width={126} height={172}/>
        <Image url={rectangle13} width={126} height={172}/>
        <Image url={rectangle10} width={126} height={172}/>
      </View>
      <View testID="330:1042" style={styles.vector264}/>
      <View testID="330:1043" style={styles.vector265}/>
    </View>
  );
}

const styles = StyleSheet.create(theme => ({
  root: {
    width: 440,
    height: 780,
    paddingTop: 24,
    paddingLeft: 24,
    paddingBottom: 24,
    paddingRight: 24,
    flexDirection: 'column',
    alignItems: 'flex-start',
    rowGap: 16,
    columnGap: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: 'Pure.White',
    shadowColor: 'rgba(255, 255, 255, 0.20000000298023224)',
    shadowRadius: 20,
    shadowOffset: {"width":0,"height":4},
  },
  selectAShow: {
    color: 'Black',
    fontFamily: 'Funnel Display',
    fontSize: 17,
    fontStyle: 'normal',
    fontWeight: '500',
  },
  input: {
    flexDirection: 'row',
    width: 392,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  frame72: {
    display: 'grid',
    height: 888,
    rowGap: 7,
    columnGap: 7,
    flexShrink: 0,
    alignSelf: 'stretch',
    gridTemplateRows: 'repeat(5, minmax(0px, 1fr))',
    gridTemplateColumns: 'repeat(3, minmax(0px, 1fr))',
  },
}));
