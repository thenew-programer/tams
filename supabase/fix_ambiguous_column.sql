-- Fix ambiguous column error in action_items and action_plans tables

-- 1. Check if we have a column name conflict
DO $$
DECLARE
    action_plans_columns text;
    action_items_columns text;
BEGIN
    SELECT string_agg(column_name, ', ') 
    INTO action_plans_columns
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'action_plans';
    
    SELECT string_agg(column_name, ', ') 
    INTO action_items_columns
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'action_items';
    
    RAISE NOTICE 'Action Plans columns: %', action_plans_columns;
    RAISE NOTICE 'Action Items columns: %', action_items_columns;
END $$;

-- 2. Fix the ambiguous column_percentage column
-- Drop the column from action_items if it exists (it shouldn't be there)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'action_items'
              AND column_name = 'completion_percentage') THEN
        ALTER TABLE public.action_items DROP COLUMN completion_percentage;
        RAISE NOTICE 'Dropped completion_percentage column from action_items table';
    END IF;
END $$;

-- 3. Update insert triggers to avoid ambiguity in queries
CREATE OR REPLACE FUNCTION process_action_item_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Make sure we reference columns with table qualifier to avoid ambiguity
    NEW.progression := COALESCE(NEW.progression, 0);
    NEW.duree_heures := COALESCE(NEW.duree_heures, 0);
    NEW.duree_jours := COALESCE(NEW.duree_jours, 0);
    NEW.order_index := COALESCE(NEW.order_index, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_action_item_insert' 
    ) THEN
        CREATE TRIGGER trigger_action_item_insert
        BEFORE INSERT ON public.action_items
        FOR EACH ROW
        EXECUTE FUNCTION process_action_item_insert();
        
        RAISE NOTICE 'Created trigger_action_item_insert';
    END IF;
END $$;

-- 4. Verify the action_items schema after changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'action_items'
ORDER BY ordinal_position;

-- 5. Verify existing action_items data
SELECT id, action_plan_id, action, responsable, statut, progression
FROM action_items
LIMIT 5;
