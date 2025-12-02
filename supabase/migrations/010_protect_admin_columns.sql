-- Migration: Protect Admin-Only Columns
-- Prevents users from modifying is_admin, is_suspended, suspended_at, suspended_reason columns

-- Create a trigger function to protect admin-only columns
CREATE OR REPLACE FUNCTION protect_admin_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_admin BOOLEAN;
BEGIN
  SELECT COALESCE(is_admin, FALSE) INTO current_user_admin
  FROM profiles
  WHERE user_id = auth.uid();
  
  current_user_admin := COALESCE(current_user_admin, FALSE);
  
  IF NOT current_user_admin THEN
    IF OLD.is_admin IS DISTINCT FROM NEW.is_admin THEN
      RAISE EXCEPTION 'Unauthorized: Cannot modify is_admin column';
    END IF;
    
    IF OLD.is_suspended IS DISTINCT FROM NEW.is_suspended THEN
      RAISE EXCEPTION 'Unauthorized: Cannot modify is_suspended column';
    END IF;
    
    IF OLD.suspended_at IS DISTINCT FROM NEW.suspended_at THEN
      RAISE EXCEPTION 'Unauthorized: Cannot modify suspended_at column';
    END IF;
    
    IF OLD.suspended_reason IS DISTINCT FROM NEW.suspended_reason THEN
      RAISE EXCEPTION 'Unauthorized: Cannot modify suspended_reason column';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop the trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS protect_profiles_admin_columns ON profiles;

-- Create the trigger
CREATE TRIGGER protect_profiles_admin_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_admin_columns();

-- Also add constraints to prevent users from setting these columns on INSERT
-- (only admins should be able to create admin accounts)
CREATE OR REPLACE FUNCTION protect_admin_columns_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_admin BOOLEAN;
BEGIN
  SELECT COALESCE(is_admin, FALSE) INTO current_user_admin
  FROM profiles
  WHERE user_id = auth.uid();
  
  current_user_admin := COALESCE(current_user_admin, FALSE);
  
  IF NOT current_user_admin THEN
    IF NEW.is_admin = TRUE THEN
      RAISE EXCEPTION 'Unauthorized: Cannot set is_admin on profile creation';
    END IF;
    
    IF NEW.is_suspended = TRUE THEN
      RAISE EXCEPTION 'Unauthorized: Cannot set is_suspended on profile creation';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profiles_admin_columns_insert ON profiles;

CREATE TRIGGER protect_profiles_admin_columns_insert
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_admin_columns_insert();
