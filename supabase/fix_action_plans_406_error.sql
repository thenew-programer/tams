-- Fix for 406 Not Acceptable errors when retrieving action plans

-- 1. Check if tables exist and what their structure is
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'action_plans') THEN
        RAISE NOTICE 'The action_plans table does not exist!';
    ELSE
        RAISE NOTICE 'The action_plans table exists.';
    END IF;
    
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'action_items') THEN
        RAISE NOTICE 'The action_items table does not exist!';
    ELSE
        RAISE NOTICE 'The action_items table exists.';
    END IF;
END $$;

-- 2. Drop and recreate RLS policies (sometimes policies can cause 406 errors)
DO $$
BEGIN
    -- Drop all policies on action_plans
    DROP POLICY IF EXISTS "Authenticated users can view action plans" ON public.action_plans;
    DROP POLICY IF EXISTS "Authenticated users can create action plans" ON public.action_plans;
    DROP POLICY IF EXISTS "Authenticated users can update action plans" ON public.action_plans;
    DROP POLICY IF EXISTS "Authenticated users can delete action plans" ON public.action_plans;
    DROP POLICY IF EXISTS "All users can view action_plans" ON public.action_plans;
    DROP POLICY IF EXISTS "All users can insert action_plans" ON public.action_plans;
    DROP POLICY IF EXISTS "All users can update action_plans" ON public.action_plans;
    DROP POLICY IF EXISTS "All users can delete action_plans" ON public.action_plans;
    DROP POLICY IF EXISTS "action_plans_policy" ON public.action_plans;
    
    -- Drop all policies on action_items
    DROP POLICY IF EXISTS "Authenticated users can view action items" ON public.action_items;
    DROP POLICY IF EXISTS "Authenticated users can create action items" ON public.action_items;
    DROP POLICY IF EXISTS "Authenticated users can update action items" ON public.action_items;
    DROP POLICY IF EXISTS "Authenticated users can delete action items" ON public.action_items;
    DROP POLICY IF EXISTS "action_items_policy" ON public.action_items;

    RAISE NOTICE 'Dropped all existing policies';
END $$;

-- 3. Recreate simpler RLS policies for both tables
CREATE POLICY "action_plans_select_policy" ON public.action_plans 
    FOR SELECT USING (true);

CREATE POLICY "action_plans_insert_policy" ON public.action_plans 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "action_plans_update_policy" ON public.action_plans 
    FOR UPDATE USING (true);

CREATE POLICY "action_plans_delete_policy" ON public.action_plans 
    FOR DELETE USING (true);

CREATE POLICY "action_items_select_policy" ON public.action_items 
    FOR SELECT USING (true);

CREATE POLICY "action_items_insert_policy" ON public.action_items 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "action_items_update_policy" ON public.action_items 
    FOR UPDATE USING (true);

CREATE POLICY "action_items_delete_policy" ON public.action_items 
    FOR DELETE USING (true);

-- 4. Check if the anomaly_id column exists in action_plans
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'action_plans' 
        AND column_name = 'anomaly_id'
    ) INTO column_exists;
    
    IF NOT column_exists THEN
        RAISE NOTICE 'The anomaly_id column does not exist in action_plans table!';
    ELSE
        RAISE NOTICE 'The anomaly_id column exists in action_plans table.';
    END IF;
END $$;

-- 5. Check a sample row to make sure data format is correct
SELECT id, anomaly_id, needs_outage, priority, status, created_at 
FROM public.action_plans 
LIMIT 1;

-- 6. Make sure public is granted access to the tables
GRANT ALL ON public.action_plans TO authenticated;
GRANT ALL ON public.action_items TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 7. This query will check the headers Supabase expects for this endpoint
SELECT format(
  'curl -X GET "%s/rest/v1/action_plans?select=*" -H "apikey: %s" -H "Authorization: Bearer TOKEN_HERE" -H "Accept: application/json"',
  current_setting('app.settings.db_host', true),
  current_setting('app.settings.anon_key', true)
);
