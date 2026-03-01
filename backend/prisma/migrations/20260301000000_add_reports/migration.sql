-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "reporterNickname" TEXT NOT NULL,
    "messageContent" TEXT NOT NULL,
    "messageSenderNickname" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- Row Level Security: deny direct access via PostgREST (backend uses postgres role which bypasses RLS)
ALTER TABLE "Report" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all_anon" ON "Report" FOR ALL TO anon USING (false);
CREATE POLICY "deny_all_authenticated" ON "Report" FOR ALL TO authenticated USING (false);
