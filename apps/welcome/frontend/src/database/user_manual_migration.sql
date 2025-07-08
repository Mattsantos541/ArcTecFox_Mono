-- Migration to add user manual support to pm_plans table
-- Run this in your Supabase SQL editor

-- Add user manual columns to pm_plans table
ALTER TABLE pm_plans ADD COLUMN IF NOT EXISTS user_manual_path TEXT;
ALTER TABLE pm_plans ADD COLUMN IF NOT EXISTS user_manual_filename TEXT;
ALTER TABLE pm_plans ADD COLUMN IF NOT EXISTS user_manual_original_name TEXT;
ALTER TABLE pm_plans ADD COLUMN IF NOT EXISTS user_manual_file_size INTEGER;
ALTER TABLE pm_plans ADD COLUMN IF NOT EXISTS user_manual_file_type TEXT;
ALTER TABLE pm_plans ADD COLUMN IF NOT EXISTS user_manual_uploaded_at TIMESTAMP WITH TIME ZONE;

-- Add comments to document the columns
COMMENT ON COLUMN pm_plans.user_manual_path IS 'Path to the user manual file in Supabase storage';
COMMENT ON COLUMN pm_plans.user_manual_filename IS 'Generated filename for the user manual';
COMMENT ON COLUMN pm_plans.user_manual_original_name IS 'Original filename uploaded by user';
COMMENT ON COLUMN pm_plans.user_manual_file_size IS 'File size in bytes';
COMMENT ON COLUMN pm_plans.user_manual_file_type IS 'MIME type of the uploaded file';
COMMENT ON COLUMN pm_plans.user_manual_uploaded_at IS 'Timestamp when the user manual was uploaded';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_pm_plans_user_manual_path ON pm_plans(user_manual_path);
CREATE INDEX IF NOT EXISTS idx_pm_plans_user_manual_uploaded_at ON pm_plans(user_manual_uploaded_at);

-- Create storage policies for user-manuals bucket
-- Note: These policies should be created in the Storage section of Supabase dashboard
-- or run these if you have the necessary permissions

-- Policy to allow authenticated users to upload files to their own folder
-- INSERT policy for user-manuals bucket
INSERT INTO storage.policies (id, bucket_id, name, definition, check_expression, command) 
VALUES (
  'user-manuals-upload-policy',
  'user-manuals',
  'Users can upload files to their own folder',
  'auth.uid()::text = (storage.foldername(name))[1]',
  'auth.uid()::text = (storage.foldername(name))[1]',
  'INSERT'
) ON CONFLICT (id) DO NOTHING;

-- SELECT policy for user-manuals bucket
INSERT INTO storage.policies (id, bucket_id, name, definition, check_expression, command) 
VALUES (
  'user-manuals-select-policy',
  'user-manuals',
  'Users can view files in their own folder',
  'auth.uid()::text = (storage.foldername(name))[1]',
  NULL,
  'SELECT'
) ON CONFLICT (id) DO NOTHING;

-- UPDATE policy for user-manuals bucket
INSERT INTO storage.policies (id, bucket_id, name, definition, check_expression, command) 
VALUES (
  'user-manuals-update-policy',
  'user-manuals',
  'Users can update files in their own folder',
  'auth.uid()::text = (storage.foldername(name))[1]',
  'auth.uid()::text = (storage.foldername(name))[1]',
  'UPDATE'
) ON CONFLICT (id) DO NOTHING;

-- DELETE policy for user-manuals bucket
INSERT INTO storage.policies (id, bucket_id, name, definition, check_expression, command) 
VALUES (
  'user-manuals-delete-policy',
  'user-manuals',
  'Users can delete files in their own folder',
  'auth.uid()::text = (storage.foldername(name))[1]',
  NULL,
  'DELETE'
) ON CONFLICT (id) DO NOTHING;

-- Create a function to clean up storage when a plan is deleted
CREATE OR REPLACE FUNCTION cleanup_user_manual_storage()
RETURNS TRIGGER AS $$
BEGIN
  -- If the deleted plan had a user manual, we could clean it up here
  -- For now, we'll just log it
  IF OLD.user_manual_path IS NOT NULL THEN
    RAISE NOTICE 'Plan deleted with user manual: %', OLD.user_manual_path;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to clean up storage when plans are deleted
DROP TRIGGER IF EXISTS cleanup_user_manual_trigger ON pm_plans;
CREATE TRIGGER cleanup_user_manual_trigger
  AFTER DELETE ON pm_plans
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_user_manual_storage();

-- Create a view to easily query plans with user manual information
CREATE OR REPLACE VIEW pm_plans_with_manuals AS
SELECT 
  p.*,
  CASE 
    WHEN p.user_manual_path IS NOT NULL THEN true 
    ELSE false 
  END AS has_user_manual,
  CASE 
    WHEN p.user_manual_file_size IS NOT NULL THEN 
      ROUND(p.user_manual_file_size / 1024.0 / 1024.0, 2) 
    ELSE NULL 
  END AS user_manual_size_mb
FROM pm_plans p;

-- Grant permissions on the view
GRANT SELECT ON pm_plans_with_manuals TO authenticated;