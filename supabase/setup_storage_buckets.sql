-- Setup Supabase Storage for REX files
-- This file should be run after the main migration

-- Create a public bucket for REX files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('rex_files', 'REX Files', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies for the bucket
-- Allow any authenticated user to read from the bucket
CREATE POLICY "Authenticated users can view REX files" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (bucket_id = 'rex_files');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload REX files" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'rex_files');

-- Allow users to update their own files
CREATE POLICY "Users can update their own REX files" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'rex_files' AND auth.uid() = owner)
    WITH CHECK (bucket_id = 'rex_files');

-- By default, don't allow deletion - this can be customized based on role
CREATE POLICY "No file deletion by default" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'rex_files' AND false);  -- Set to false to prevent deletion
