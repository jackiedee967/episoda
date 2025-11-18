import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { commentId, userId } = await req.json()

    if (!commentId || !userId) {
      throw new Error('Missing commentId or userId')
    }

    const supabaseClient = createClient(
      Denv.get('SUPABASE_URL') ?? '',
      Denv.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: comment, error: fetchError } = await supabaseClient
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single()

    if (fetchError) {
      throw new Error(`Comment not found: ${fetchError.message}`)
    }

    if (comment.user_id !== userId) {
      throw new Error('Unauthorized: You can only delete your own comments')
    }

    const { error: updateError } = await supabaseClient
      .from('comments')
      .update({
        is_deleted: true,
        text: '[Comment deleted]'
      })
      .eq('id', commentId)

    if (updateError) {
      throw new Error(`Failed to delete comment: ${updateError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
