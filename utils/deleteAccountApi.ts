import { supabase } from '@/app/integrations/supabase/client';

export async function deleteAccountViaEdgeFunction(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🗑️ deleteAccountViaEdgeFunction: Starting...');
    
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🗑️ Session check:', session ? `User ID: ${session.user.id}` : 'No session');
    
    if (!session) {
      console.error('🗑️ No active session found');
      return { success: false, error: 'No active session' };
    }

    console.log('🗑️ Calling edge function: delete-account');
    const { data, error } = await supabase.functions.invoke('delete-account', {
      method: 'POST',
    });
    
    console.log('🗑️ Edge function response:', { data, error });

    if (error) {
      console.error('🗑️ Edge function error:', error);
      return { success: false, error: error.message || 'Failed to delete account' };
    }

    if (data?.error) {
      console.error('🗑️ Data error from edge function:', data.error);
      return { success: false, error: data.error };
    }

    console.log('🗑️ Account deletion successful');
    return { success: true };
  } catch (error) {
    console.error('🗑️ Exception calling delete-account edge function:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
