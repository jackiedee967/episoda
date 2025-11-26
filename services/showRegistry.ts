/**
 * Show Registry - Centralized show persistence gateway
 * 
 * CRITICAL: This is the ONLY way show IDs should be obtained for ANY write operation.
 * This ensures every show reference in the database is a valid UUID pointing to an
 * existing shows table record.
 * 
 * Usage:
 * - Favorites: const showId = await ensureShowId(showRef);
 * - Playlists: const showId = await ensureShowId(showRef);
 * - Posts: const showId = await ensureShowId(showRef);
 * - Any feature that writes a show_id: MUST use ensureShowId()
 */

import { supabase } from '@/integrations/supabase/client';
import { Show } from '@/types';
import { TraktShow, getShowDetails } from './trakt';
import { saveShow, getShowByTraktId, DatabaseShow } from './showDatabase';

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(id: string | null | undefined): boolean {
  if (!id) return false;
  return UUID_REGEX.test(id);
}

/**
 * A reference to a show that can be resolved to a database UUID.
 * This can be:
 * - A valid UUID string (already in database)
 * - A Show object with traktId
 * - A TraktShow object
 * - A numeric traktId
 */
export type ShowRef = 
  | string           // UUID or temporary ID like "trakt-12345"
  | Show             // App model with traktId
  | TraktShow        // Trakt API response
  | { traktId: number; traktShow?: TraktShow }  // Minimal reference with optional full data
  | number;          // Raw traktId

/**
 * Extract traktId from various show reference types
 */
function extractTraktId(showRef: ShowRef): number | null {
  if (typeof showRef === 'number') {
    return showRef;
  }
  
  if (typeof showRef === 'string') {
    // Check if it's a temporary ID like "trakt-12345"
    if (showRef.startsWith('trakt-')) {
      const id = parseInt(showRef.replace('trakt-', ''), 10);
      return isNaN(id) ? null : id;
    }
    // It's a UUID - we'll need to look it up
    return null;
  }
  
  // TraktShow has ids.trakt
  if ('ids' in showRef && showRef.ids?.trakt) {
    return showRef.ids.trakt;
  }
  
  // Show or minimal reference has traktId
  if ('traktId' in showRef && typeof showRef.traktId === 'number') {
    return showRef.traktId;
  }
  
  return null;
}

/**
 * Extract TraktShow data if available
 */
function extractTraktShow(showRef: ShowRef): TraktShow | null {
  if (typeof showRef === 'string' || typeof showRef === 'number') {
    return null;
  }
  
  // It's a TraktShow
  if ('ids' in showRef && 'title' in showRef) {
    return showRef as TraktShow;
  }
  
  // It has traktShow attached
  if ('traktShow' in showRef && showRef.traktShow) {
    return showRef.traktShow;
  }
  
  return null;
}

/**
 * BULLETPROOF: Ensure a show exists in the database and return its UUID.
 * 
 * This function guarantees that:
 * 1. The returned ID is ALWAYS a valid UUID
 * 2. The UUID ALWAYS points to an existing record in the shows table
 * 3. If the show doesn't exist, it will be created
 * 
 * @param showRef - Any reference to a show (UUID, Show object, TraktShow, traktId, etc.)
 * @returns Promise<string> - A guaranteed valid database UUID
 * @throws Error if the show cannot be resolved or saved
 */
export async function ensureShowId(showRef: ShowRef): Promise<string> {
  console.log('🔐 ensureShowId called with:', typeof showRef === 'object' ? JSON.stringify(showRef).substring(0, 100) : showRef);
  
  // CASE 1: Already a valid UUID - verify it exists in database
  if (typeof showRef === 'string' && isValidUUID(showRef)) {
    console.log('📋 Checking if UUID exists in database:', showRef);
    const { data, error } = await supabase
      .from('shows')
      .select('id')
      .eq('id', showRef)
      .single();
    
    if (data && !error) {
      console.log('✅ UUID verified in database:', showRef);
      return showRef;
    }
    
    // UUID format is valid but show doesn't exist - this shouldn't happen
    // Try to extract traktId from the show reference to recover
    console.warn('⚠️ UUID not found in database, will try to recover via traktId');
  }
  
  // CASE 2: Extract traktId and resolve
  const traktId = extractTraktId(showRef);
  
  if (!traktId) {
    throw new Error(`Cannot resolve show reference: no valid UUID or traktId found. Received: ${JSON.stringify(showRef)}`);
  }
  
  console.log('🔍 Looking up show by traktId:', traktId);
  
  // Check if show already exists in database by traktId
  const existingShow = await getShowByTraktId(traktId);
  
  if (existingShow) {
    console.log('✅ Found existing show in database, ID:', existingShow.id);
    return existingShow.id;
  }
  
  // CASE 3: Show not in database - need to save it
  console.log('📦 Show not in database, saving now...');
  
  // Try to get TraktShow data from the reference
  let traktShow = extractTraktShow(showRef);
  
  // If we don't have TraktShow data, fetch it from the API
  if (!traktShow) {
    console.log('📡 Fetching show details from Trakt API...');
    traktShow = await getShowDetails(traktId);
    
    if (!traktShow) {
      throw new Error(`Failed to fetch show details from Trakt API for traktId: ${traktId}`);
    }
  }
  
  // Save the show to database
  const savedShow = await saveShow(traktShow);
  
  if (!savedShow || !savedShow.id) {
    throw new Error(`Failed to save show to database: ${traktShow.title}`);
  }
  
  console.log('✅ Show saved successfully, ID:', savedShow.id);
  return savedShow.id;
}

/**
 * Batch version of ensureShowId for multiple shows
 * More efficient when you need to resolve multiple shows at once
 */
export async function ensureShowIds(showRefs: ShowRef[]): Promise<string[]> {
  const results = await Promise.all(
    showRefs.map(ref => ensureShowId(ref))
  );
  return results;
}

/**
 * Validate that a show_id is a valid UUID and exists in database.
 * Use this as a guard before any database write that includes a show_id.
 * 
 * @param showId - The show ID to validate
 * @returns Promise<boolean> - True if valid and exists
 */
export async function validateShowId(showId: string): Promise<boolean> {
  if (!isValidUUID(showId)) {
    console.error('❌ Invalid show ID format (not a UUID):', showId);
    return false;
  }
  
  const { data, error } = await supabase
    .from('shows')
    .select('id')
    .eq('id', showId)
    .single();
  
  if (error || !data) {
    console.error('❌ Show ID not found in database:', showId);
    return false;
  }
  
  return true;
}
