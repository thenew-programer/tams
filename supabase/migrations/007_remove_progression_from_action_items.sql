-- Remove progression column from action_items table
ALTER TABLE IF EXISTS public.action_items DROP COLUMN IF EXISTS progression CASCADE;

-- Drop the index if it exists
DROP INDEX IF EXISTS idx_action_items_progression;
