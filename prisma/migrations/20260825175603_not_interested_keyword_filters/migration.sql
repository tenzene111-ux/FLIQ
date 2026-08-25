-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "keywordFilters" TEXT NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "NotInterested" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotInterested_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotInterested_userId_idx" ON "NotInterested"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotInterested_userId_videoId_key" ON "NotInterested"("userId", "videoId");

-- AddForeignKey
ALTER TABLE "NotInterested" ADD CONSTRAINT "NotInterested_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotInterested" ADD CONSTRAINT "NotInterested_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

