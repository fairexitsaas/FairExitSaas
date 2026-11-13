-- ===========================================================================
-- FairExit Database Migration 005: Lawyer Enquiries & Lead Attribution
-- ===========================================================================
-- Adds enquiry_type, source_page, and consent tracking to public.leads.
-- Supports email capture from all free lawyer CTAs (Ask a Lawyer, 3-Point Checklist, etc.)
-- across both Canada and United States user journeys.
-- ===========================================================================

-- 1. Add enquiry attribution columns to public.leads if not present
ALTER TABLE public.leads 
  ADD COLUMN IF NOT EXISTS enquiry_type text NOT NULL DEFAULT 'ask_lawyer',
  ADD COLUMN IF NOT EXISTS source_page text,
  ADD COLUMN IF NOT EXISTS consent boolean NOT NULL DEFAULT true;

-- 2. Ensure consent_text can be nullable or carry default context
ALTER TABLE public.leads 
  ALTER COLUMN consent_text DROP NOT NULL;

-- 3. Create performance indexes for admin filtering, sorting and email search
CREATE INDEX IF NOT EXISTS idx_leads_enquiry_type ON public.leads(enquiry_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_country ON public.leads(country, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(lower(email));
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at DESC);

-- 4. Row Level Security documentation:
-- Public / anonymous users may submit enquiries only through the authorized backend endpoint (POST /api/v1/leads).
-- Direct public SELECT on public.leads is restricted: only service-role and authorized administrators may query lead records.

