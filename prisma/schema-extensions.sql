
-- Extension to support enhanced findings with security frameworks
-- This will be applied after the current schema

-- Add new columns to Finding model for security framework integration
ALTER TABLE "Finding" ADD COLUMN IF NOT EXISTS "nistControls" TEXT[];
ALTER TABLE "Finding" ADD COLUMN IF NOT EXISTS "owaspCategory" TEXT;
ALTER TABLE "Finding" ADD COLUMN IF NOT EXISTS "cvssScore" DECIMAL(3,1);
ALTER TABLE "Finding" ADD COLUMN IF NOT EXISTS "asvsLevel" INTEGER;
ALTER TABLE "Finding" ADD COLUMN IF NOT EXISTS "tags" TEXT[];
ALTER TABLE "Finding" ADD COLUMN IF NOT EXISTS "falsePositive" BOOLEAN DEFAULT FALSE;
ALTER TABLE "Finding" ADD COLUMN IF NOT EXISTS "notApplicable" BOOLEAN DEFAULT FALSE;

-- Add session activity tracking
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "lastActivity" TIMESTAMP;
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "activityTimeout" INTEGER DEFAULT 5;

-- Add user creation tracking for platform admin
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "invitationToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "invitationExpires" TIMESTAMP;

-- Add enhanced report tracking
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "downloadCount" INTEGER DEFAULT 0;
ALTER TABLE "Report" ADD COLUMN IF NOT EXISTS "lastDownloaded" TIMESTAMP;
