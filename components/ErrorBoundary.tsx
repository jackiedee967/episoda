import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, typography } from '@/styles/commonStyles';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): State {
    const message = ErrorBoundary.extractErrorMessage(error);
    return {
      hasError: true,
      errorMessage: message,
    };
  }

  static extractErrorMessage(error: Error): string {
    const fullMessage = error.message || error.toString();
    const match = fullMessage.match(/^([^:\n]+)/);
    if (match) {
      return match[1].trim();
    }
    return fullMessage.substring(0, 100);
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorMessage = ErrorBoundary.extractErrorMessage(error);
    const componentStack = errorInfo.componentStack || '';
    
    const screenMatch = componentStack.match(/at\s+(\w+)/);
    const screenName = screenMatch ? screenMatch[1] : 'Unknown';

    console.error('ErrorBoundary caught an error:', {
      message: errorMessage,
      stack: error.stack,
      componentStack,
    });

    try {
      await this.logErrorToDatabase(errorMessage, screenName, error.stack || '', componentStack);
      await this.notifyAdmins(errorMessage, screenName);
    } catch (logError) {
      console.error('Failed to log error or notify admins:', logError);
    }
  }

  async logErrorToDatabase(
    errorMessage: string,
    screenName: string,
    stackTrace: string,
    componentStack: string
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('app_errors' as any).insert({
        error_message: errorMessage,
        screen_name: screenName,
        stack_trace: stackTrace.substring(0, 5000),
        component_stack: componentStack.substring(0, 5000),
        user_id: user?.id || null,
        platform: Platform.OS,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Failed to insert error log:', error);
      }
    } catch (err) {
      console.error('Error logging to database:', err);
    }
  }

  async notifyAdmins(errorMessage: string, screenName: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.rpc('notify_admins_of_error' as any, {
        p_error_message: errorMessage,
        p_screen_name: screenName,
        p_user_id: user?.id || null,
      });

      if (error) {
        console.error('Failed to notify admins:', error);
      }
    } catch (err) {
      console.error('Error notifying admins:', err);
    }
  }

  handleGoBack = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    this.setState({ hasError: false, errorMessage: '' });
    
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/' as any);
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <LinearGradient
            colors={['#1a0a2e', '#0a1628', '#0e0e0e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientOverlay}
          />
          <LinearGradient
            colors={['rgba(200, 50, 150, 0.3)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.5, y: 0.5 }}
            style={styles.pinkGlow}
          />
          <LinearGradient
            colors={['rgba(50, 200, 100, 0.25)', 'transparent']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0.5, y: 0.5 }}
            style={styles.greenGlow}
          />

          <View style={styles.content}>
            <Image
              source={require('@/assets/images/scream-emoji.png')}
              style={styles.emoji}
              resizeMode="contain"
            />

            <Text style={styles.title}>Oops! Something went wrong</Text>

            <Text style={styles.description}>
              Don't worry - we're on it! Our dev team has been notified and we're working to fix this right now.
            </Text>

            <Text style={styles.errorCode}>
              Error: {this.state.errorMessage || '[Unknown error]'}
            </Text>

            <Pressable
              onPress={this.handleGoBack}
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>Go back</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.pageBackground,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  pinkGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '60%',
    height: '40%',
  },
  greenGlow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '60%',
    height: '40%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emoji: {
    width: 100,
    height: 100,
    marginBottom: 32,
  },
  title: {
    ...typography.titleL,
    color: colors.almostWhite,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    ...typography.p1,
    color: colors.grey1,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  errorCode: {
    ...typography.p1,
    color: colors.grey1,
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: 'FunnelDisplay_500Medium',
  },
  button: {
    backgroundColor: colors.greenHighlight,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 80,
    minWidth: 200,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    ...typography.p1Bold,
    color: colors.black,
    textAlign: 'center',
  },
});

export default ErrorBoundary;
