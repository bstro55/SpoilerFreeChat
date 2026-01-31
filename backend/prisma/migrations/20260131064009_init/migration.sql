-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "senderNickname" TEXT NOT NULL,
    "sessionId" TEXT,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "gameTimeQuarter" INTEGER,
    "gameTimeMinutes" INTEGER,
    "gameTimeSeconds" INTEGER,
    "elapsedSeconds" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "currentSocketId" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_roomCode_key" ON "Room"("roomCode");

-- CreateIndex
CREATE INDEX "Room_lastActivityAt_idx" ON "Room"("lastActivityAt");

-- CreateIndex
CREATE INDEX "Message_roomId_timestamp_idx" ON "Message"("roomId", "timestamp");

-- CreateIndex
CREATE INDEX "Session_currentSocketId_idx" ON "Session"("currentSocketId");

-- CreateIndex
CREATE INDEX "Session_lastSeenAt_idx" ON "Session"("lastSeenAt");

-- CreateIndex
CREATE INDEX "Session_roomId_isActive_idx" ON "Session"("roomId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Session_roomId_nickname_key" ON "Session"("roomId", "nickname");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
