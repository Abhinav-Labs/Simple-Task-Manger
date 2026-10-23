-- ==============================================================================
-- Simple Task Manager: Supabase PostgreSQL Schema & Row Level Security (RLS)
-- Run this entire script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create the tasks table (with category support)
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
    category TEXT NOT NULL DEFAULT 'General',
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed')),
    due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration for existing databases that already created the table without category:
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'General';

-- 2. Create indexes for high-performance querying
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status);
CREATE INDEX IF NOT EXISTS tasks_category_idx ON public.tasks(category);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 4. Drop any existing conflicting policies if re-running
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

-- 5. Row Level Security Policies (Enforce Ownership)
-- Only authenticated users can SELECT their own tasks
CREATE POLICY "Users can view their own tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Only authenticated users can INSERT tasks assigned to themselves
CREATE POLICY "Users can create their own tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Only authenticated users can UPDATE their own tasks
CREATE POLICY "Users can update their own tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- Only authenticated users can DELETE their own tasks
CREATE POLICY "Users can delete their own tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING ((SELECT auth.uid()) = user_id);
