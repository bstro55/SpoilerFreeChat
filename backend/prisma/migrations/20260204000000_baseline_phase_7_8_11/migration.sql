-- Baseline Migration: Phase 7, 8, and 11 changes
-- This migration captures all schema changes that were applied directly to the database
-- since the initial migration (20260131064009_init).
--
-- Phase 7: User authentication and preferences
-- Phase 8: Multi-sport support
-- Phase 11: Room metadata for landing page redesign

-- ============================================
-- Phase 7: Create User table
-- ============================================
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "preferredNickname" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "notificationSound" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- ============================================
-- Phase 7: Create RecentRoom table
-- ============================================
CREATE TABLE "RecentRoom" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "sportType" TEXT NOT NULL DEFAULT 'basketball',
    "roomName" TEXT,
    "teams" TEXT,
    "gameDate" TIMESTAMP(3),
    "visitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecentRoom_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecentRoom_userId_roomCode_key" ON "RecentRoom"("userId", "roomCode");

-- CreateIndex
CREATE INDEX "RecentRoom_userId_visitedAt_idx" ON "RecentRoom"("userId", "visitedAt");

-- AddForeignKey
ALTER TABLE "RecentRoom" ADD CONSTRAINT "RecentRoom_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- Phase 7: Add userId to Session table
-- ============================================
ALTER TABLE "Session" ADD COLUMN "userId" TEXT;

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- Phase 8: Add sportType to Room table
-- ============================================
ALTER TABLE "Room" ADD COLUMN "sportType" TEXT NOT NULL DEFAULT 'basketball';

-- ============================================
-- Phase 11: Add room metadata to Room table
-- ============================================
ALTER TABLE "Room" ADD COLUMN "roomName" TEXT;
ALTER TABLE "Room" ADD COLUMN "teams" TEXT;
ALTER TABLE "Room" ADD COLUMN "gameDate" TIMESTAMP(3);
