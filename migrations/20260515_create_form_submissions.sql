-- Migration: Create form_submissions table
-- Date: 2026-05-15

CREATE TABLE IF NOT EXISTS public.form_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    type TEXT NOT NULL, -- 'contact' or 'support'
    first_name TEXT,
    last_name TEXT,
    full_name TEXT,
    email TEXT NOT NULL,
    company TEXT,
    store_name TEXT,
    issue_type TEXT,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending'
);

-- Enable RLS
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for public contact/support forms)
DROP POLICY IF EXISTS "Enable insert for anonymous users" ON public.form_submissions;
CREATE POLICY "Enable insert for anonymous users" ON public.form_submissions
    FOR INSERT WITH CHECK (true);

-- Allow admins to read all submissions
DROP POLICY IF EXISTS "Enable read for admins" ON public.form_submissions;
CREATE POLICY "Enable read for admins" ON public.form_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.role = 'admin' OR profiles.role = 'superadmin')
        )
    );
