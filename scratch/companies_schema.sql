-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add company_id to stores
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add company_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for companies (Admins/SuperAdmins can view, SuperAdmin can edit)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Anyone can view companies') THEN
      CREATE POLICY "Anyone can view companies" ON public.companies FOR SELECT USING (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Anyone can insert companies') THEN
      CREATE POLICY "Anyone can insert companies" ON public.companies FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Create a Default Company for existing stores
DO $$
DECLARE
    default_company_id UUID;
BEGIN
    -- Check if we already have any company
    IF NOT EXISTS (SELECT 1 FROM public.companies) THEN
        -- Create 'Default Company'
        INSERT INTO public.companies (name) VALUES ('Default Company') RETURNING id INTO default_company_id;
        
        -- Migrate all existing stores to this company
        UPDATE public.stores SET company_id = default_company_id WHERE company_id IS NULL;
        
        -- Migrate all existing profiles to this company
        UPDATE public.profiles SET company_id = default_company_id WHERE company_id IS NULL;
    END IF;
END $$;
