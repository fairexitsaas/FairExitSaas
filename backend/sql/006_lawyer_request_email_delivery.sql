-- ===========================================================================
-- FairExit Database Migration 006: Lawyer Request Confirmation Email Tracking
-- ===========================================================================
-- Adds optional index support for querying leads by email_delivery status inside
-- summary jsonb so failed confirmation emails can be retried safely without
-- creating duplicate lead records.
-- ===========================================================================

CREATE INDEX IF NOT EXISTS idx_leads_email_delivery_status
  ON public.leads ((summary->'email_delivery'->>'status'))
  WHERE summary ? 'email_delivery';
