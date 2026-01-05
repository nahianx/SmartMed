-- Add search vector column to activities table for full-text search
-- This column combines title, subtitle, notes, and tags for efficient searching

-- Add the tsvector column for storing the search index
ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Create a GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS "activities_search_idx" ON "activities" USING GIN ("search_vector");

-- Create a function to update the search vector when activity data changes
CREATE OR REPLACE FUNCTION activities_search_update() RETURNS trigger AS $$
DECLARE
  tags_text TEXT;
BEGIN
  -- Extract text from JSON tags array
  IF NEW.tags IS NOT NULL AND jsonb_typeof(NEW.tags::jsonb) = 'array' THEN
    SELECT string_agg(elem::text, ' ')
    INTO tags_text
    FROM jsonb_array_elements_text(NEW.tags::jsonb) AS elem;
  ELSE
    tags_text := '';
  END IF;

  -- Build the search vector with different weights
  -- 'A' = highest relevance (title)
  -- 'B' = medium relevance (subtitle)
  -- 'C' = lower relevance (tags, notes)
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.subtitle, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(tags_text, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.notes, '')), 'C');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to automatically update search_vector on INSERT/UPDATE
DROP TRIGGER IF EXISTS activities_search_update_trigger ON "activities";
CREATE TRIGGER activities_search_update_trigger
  BEFORE INSERT OR UPDATE OF title, subtitle, tags, notes
  ON "activities"
  FOR EACH ROW
  EXECUTE FUNCTION activities_search_update();

-- Backfill existing records with search vectors
UPDATE "activities" 
SET "search_vector" = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(subtitle, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(
    CASE 
      WHEN tags IS NOT NULL AND jsonb_typeof(tags::jsonb) = 'array' 
      THEN (SELECT string_agg(elem::text, ' ') FROM jsonb_array_elements_text(tags::jsonb) AS elem)
      ELSE ''
    END
  , '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(notes, '')), 'C');
