import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Image, ScrollView } from 'react-native';
import { colors, typography } from '@/styles/tokens';
import Button from '@/components/Button';
import * as Haptics from 'expo-haptics';

interface FoundersWelcomeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FoundersWelcomeModal({ visible, onClose }: FoundersWelcomeModalProps) {
  const handleExplore = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <Image 
              source={require('@/assets/images/founders.png')} 
              style={styles.image}
              resizeMode="contain"
            />
            <View style={styles.textContainer}>
              <Text style={styles.title}>Hello, from us (the founders)!</Text>
              
              <Text style={styles.paragraph}>
                We're Jasmine & Jackie - 2 BFFs who's guilty pleasure is watching TV.
              </Text>
              
              <Text style={styles.paragraph}>
                We are building the app we wished we had - a place to keep track of our shows, talk about them with friends, discover new ones, and make watching TV actually social.
              </Text>
              
              <Text style={styles.paragraphBold}>
                We're building this for you, and we're still early - which means your feedback really matters!
              </Text>
              
              <Text style={styles.paragraphBold}>
                Have an idea, question, concern, or something you wish the app could do? Head to the Help Desk to chat with us directly.
              </Text>
              
              <Text style={styles.paragraph}>
                We're pushing updates almost every day (seriously), so tell us what you want, and we got you.
              </Text>
              
              <Text style={styles.paragraph}>
                Thanks for being here with us at the start 💛
              </Text>
            </View>
            <Button variant="primary" onPress={handleExplore} fullWidth>
              Explore
            </Button>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: 378,
    maxWidth: '100%',
    maxHeight: '90%',
    backgroundColor: colors.pureWhite,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: 'rgba(255, 255, 255, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  scrollContent: {
    alignItems: 'center',
    gap: 20,
  },
  image: {
    width: 280,
    height: 200,
  },
  textContainer: {
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  title: {
    ...typography.titleL,
    color: colors.black,
    textAlign: 'center',
    marginBottom: 4,
  },
  paragraph: {
    color: colors.grey3,
    textAlign: 'left',
    width: '100%',
    ...typography.p1,
    lineHeight: 18,
  },
  paragraphBold: {
    color: colors.grey3,
    textAlign: 'left',
    width: '100%',
    ...typography.p1B,
    lineHeight: 18,
  },
});
