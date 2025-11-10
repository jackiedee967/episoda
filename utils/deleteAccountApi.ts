import { supabase } from '@/app/integrations/supabase/client';

export async function deleteAccountViaEdgeFunction(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return { success: false, error: 'No active session' };
    }

    const { data, error } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
    });

    if (error) {
      console.error('Edge function error:', error);
      return { success: false, error: error.message || 'Failed to delete account' };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error calling delete-account edge function:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
