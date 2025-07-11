-- Test script to verify action plans table
-- Run this after migration to verify table structure

-- Check if tables exist
SELECT 
    table_name, 
    table_schema 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('action_plans', 'action_items');

-- Check column structure for action_plans table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'action_plans'
ORDER BY ordinal_position;

-- Check column structure for action_items table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'action_items'
ORDER BY ordinal_position;

-- Test insert into action_plans table
INSERT INTO public.action_plans (
    anomaly_id, 
    needs_outage, 
    priority, 
    comments, 
    status
) VALUES (
    '123e4567-e89b-12d3-a456-426614174000', 
    true, 
    3, 
    'Test action plan', 
    'draft'
) RETURNING id, priority, comments;

-- Clean up test data
DELETE FROM public.action_plans WHERE comments = 'Test action plan';
