-- Enable Row Level Security (RLS) on all tables
-- This fixes Supabase security warnings about tables exposed via PostgREST
-- Note: The postgres role (used by Prisma) bypasses RLS automatically

-- Enable RLS on all application tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecentRoom" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on Prisma internal table
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- Create deny-all policies for PostgREST access (anon and authenticated roles)
-- Our app only accesses the database through the backend (Prisma with postgres role)
-- so we don't need any PostgREST access

CREATE POLICY "Deny all access via PostgREST" ON "User"
  FOR ALL TO anon, authenticated
  USING (false);

CREATE POLICY "Deny all access via PostgREST" ON "Session"
  FOR ALL TO anon, authenticated
  USING (false);

CREATE POLICY "Deny all access via PostgREST" ON "Room"
  FOR ALL TO anon, authenticated
  USING (false);

CREATE POLICY "Deny all access via PostgREST" ON "Message"
  FOR ALL TO anon, authenticated
  USING (false);

CREATE POLICY "Deny all access via PostgREST" ON "RecentRoom"
  FOR ALL TO anon, authenticated
  USING (false);

CREATE POLICY "Deny all access via PostgREST" ON "_prisma_migrations"
  FOR ALL TO anon, authenticated
  USING (false);
