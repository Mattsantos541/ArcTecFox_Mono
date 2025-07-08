# Supabase Storage Setup Guide

## Quick Setup Instructions

### 1. Create Storage Bucket
1. Go to your Supabase dashboard
2. Navigate to **Storage** → **Create a new bucket**
3. Create bucket with these settings:
   - **Name**: `user-manuals`
   - **Public**: `false` (private bucket)
   - **File size limit**: `10485760` (10MB)
   - **Allowed MIME types**: 
     ```
     application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/jpeg,image/png,image/gif
     ```

### 2. Set Up Storage Policies

#### Option A: Use Supabase Dashboard UI
1. Go to **Storage** → **user-manuals** → **Policies**
2. Create 4 policies with these settings:

**Policy 1 - INSERT (Upload)**
- Name: `Users can upload files to their own folder`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- USING expression: `(bucket_id = 'user-manuals')`
- WITH CHECK expression: `(bucket_id = 'user-manuals' AND auth.uid()::text = (string_to_array(name, '/'))[1])`

**Policy 2 - SELECT (View)**
- Name: `Users can view files in their own folder`
- Allowed operation: `SELECT`
- Target roles: `authenticated`
- USING expression: `(bucket_id = 'user-manuals' AND auth.uid()::text = (string_to_array(name, '/'))[1])`

**Policy 3 - UPDATE (Modify)**
- Name: `Users can update files in their own folder`
- Allowed operation: `UPDATE`
- Target roles: `authenticated`
- USING expression: `(bucket_id = 'user-manuals' AND auth.uid()::text = (string_to_array(name, '/'))[1])`
- WITH CHECK expression: `(bucket_id = 'user-manuals' AND auth.uid()::text = (string_to_array(name, '/'))[1])`

**Policy 4 - DELETE (Remove)**
- Name: `Users can delete files in their own folder`
- Allowed operation: `DELETE`
- Target roles: `authenticated`
- USING expression: `(bucket_id = 'user-manuals' AND auth.uid()::text = (string_to_array(name, '/'))[1])`

#### Option B: Use SQL Editor
Run the SQL from `storage_policies.sql` in your Supabase SQL Editor.

### 3. Test the Setup

Once you've created the bucket and policies, the file upload should work. The system will:

1. Create user-specific folders like: `{user-id}/filename.pdf`
2. Only allow users to access their own files
3. Validate file types and sizes
4. Store file metadata in the `pm_plans` table

### 4. Verify Setup

You can verify the setup by:
1. Checking that the bucket exists in Storage
2. Confirming all 4 policies are created
3. Testing file upload from the PM Planner page

## Troubleshooting

If you still get errors:

1. **"Bucket not found"**: Make sure the bucket name is exactly `user-manuals`
2. **"Row level security policy"**: Ensure all 4 storage policies are created
3. **"Access denied"**: Check that the user is authenticated
4. **"File size limit"**: Ensure bucket file size limit is set to 10MB

## File Structure

Files will be stored as:
```
user-manuals/
├── {user-id-1}/
│   ├── AssetName_timestamp.pdf
│   └── AnotherAsset_timestamp.docx
├── {user-id-2}/
│   └── TheirAsset_timestamp.pdf
└── ...
```

This ensures each user can only access their own files.