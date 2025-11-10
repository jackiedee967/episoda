import { supabase } from '@/app/integrations/supabase/client';

export async function deleteAccountViaEdgeFunction(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { success: false, error: 'No active session' };
    }

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    
    if (!supabaseUrl) {
      return { success: false, error: 'Supabase URL not configured' };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to delete account' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error calling delete-account edge function:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
