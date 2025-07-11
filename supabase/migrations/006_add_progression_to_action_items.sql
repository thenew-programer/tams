-- Add progression column to action_items table
ALTER TABLE IF EXISTS public.action_items
ADD COLUMN IF NOT EXISTS progression INTEGER DEFAULT 0 CHECK (progression >= 0 AND progression <= 100);

-- Create index for the new column
CREATE INDEX IF NOT EXISTS idx_action_items_progression ON public.action_items(progression);
