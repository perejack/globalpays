-- Migration: Add reference column to transactions table
-- Run this in Supabase SQL Editor to fix the "Could not find the 'reference' column" error

-- Add reference column to transactions table
alter table public.transactions add column if not exists reference text;

-- Add index for faster lookups by reference
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON public.transactions(reference);
