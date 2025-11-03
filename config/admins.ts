/**
 * Admin Configuration
 * 
 * This file contains the list of admin user IDs who have special privileges
 * such as posting announcements on the Help Desk.
 * 
 * TODO: Replace with proper role-based authentication once auth system is implemented
 */

export const ADMIN_USER_IDS = [
  'a0000000-0000-0000-0000-000000000001', // Jacqueline (current user - jvckie)
];

/**
 * Check if a user ID belongs to an admin
 */
export function isAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return ADMIN_USER_IDS.includes(userId);
}
