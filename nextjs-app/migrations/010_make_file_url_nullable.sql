-- Migration 010: Make file_url nullable in user_documents table
-- Reason: Allow creating document records before files are uploaded

BEGIN;

-- Make file_url nullable
ALTER TABLE user_documents
ALTER COLUMN file_url DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN user_documents.file_url IS 'URL of uploaded file (nullable to allow records without files)';

COMMIT;
