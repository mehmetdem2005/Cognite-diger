-- Migration: Add content column to books table
-- Run this in your Supabase SQL editor to fix the PDF content empty bug.
-- Book content was previously only stored in localStorage (device-specific).
-- This migration persists content to the database so it's available across devices.

alter table public.books
  add column if not exists content text;
