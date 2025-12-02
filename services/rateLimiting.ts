import { supabase } from '../integrations/supabase/client';

export interface RateLimitConfig {
  actionType: string;
  maxCount: number;
  windowMinutes: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  otp: { actionType: 'otp', maxCount: 3, windowMinutes: 60 },
  post: { actionType: 'post', maxCount: 20, windowMinutes: 60 },
  comment: { actionType: 'comment', maxCount: 60, windowMinutes: 60 },
  follow: { actionType: 'follow', maxCount: 100, windowMinutes: 60 },
  report: { actionType: 'report', maxCount: 10, windowMinutes: 1440 },
};

export async function checkRateLimit(
  identifier: string,
  limitType: keyof typeof RATE_LIMITS
): Promise<{ allowed: boolean; remaining?: number; error?: string }> {
  const config = RATE_LIMITS[limitType];
  
  if (!config) {
    return { allowed: true };
  }
  
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_action_type: config.actionType,
      p_max_count: config.maxCount,
      p_window_minutes: config.windowMinutes,
    });
    
    if (error) {
      return { allowed: true };
    }
    
    if (!data) {
      return { 
        allowed: false, 
        error: getRateLimitMessage(limitType) 
      };
    }
    
    return { allowed: true };
  } catch (err) {
    return { allowed: true };
  }
}

export async function getRemainingRateLimit(
  identifier: string,
  limitType: keyof typeof RATE_LIMITS
): Promise<number> {
  const config = RATE_LIMITS[limitType];
  
  if (!config) {
    return 999;
  }
  
  try {
    const { data, error } = await supabase.rpc('get_rate_limit_remaining', {
      p_identifier: identifier,
      p_action_type: config.actionType,
      p_max_count: config.maxCount,
      p_window_minutes: config.windowMinutes,
    });
    
    if (error) {
      return config.maxCount;
    }
    
    return data ?? config.maxCount;
  } catch (err) {
    return config.maxCount;
  }
}

function getRateLimitMessage(limitType: keyof typeof RATE_LIMITS): string {
  switch (limitType) {
    case 'otp':
      return 'Too many verification code requests. Please wait an hour before trying again.';
    case 'post':
      return 'You\'ve created too many posts recently. Please wait a bit before posting again.';
    case 'comment':
      return 'You\'ve posted too many comments recently. Please slow down.';
    case 'follow':
      return 'You\'ve followed too many users recently. Please wait before following more.';
    case 'report':
      return 'You\'ve submitted too many reports today. Please try again tomorrow.';
    default:
      return 'Rate limit exceeded. Please try again later.';
  }
}
