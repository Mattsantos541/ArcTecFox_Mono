-- Storage policies for user-manuals bucket
-- Run these in Supabase SQL Editor or add via Storage Policies UI

-- Policy 1: Allow users to INSERT files to their own folder
CREATE POLICY "Users can upload files to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-manuals' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- Policy 2: Allow users to SELECT files from their own folder
CREATE POLICY "Users can view files in their own folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'user-manuals' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- Policy 3: Allow users to UPDATE files in their own folder
CREATE POLICY "Users can update files in their own folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'user-manuals' AND auth.uid()::text = (string_to_array(name, '/'))[1])
WITH CHECK (bucket_id = 'user-manuals' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- Policy 4: Allow users to DELETE files from their own folder
CREATE POLICY "Users can delete files in their own folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'user-manuals' AND auth.uid()::text = (string_to_array(name, '/'))[1]);

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;