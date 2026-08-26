ALTER TABLE "LiveStream" ADD COLUMN     "chatCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "peakViewerCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reactionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalViewers" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "allowReuse" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowSoundReuse" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "CreateEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreateEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CreateEvent_type_idx" ON "CreateEvent"("type");

-- CreateIndex
CREATE INDEX "CreateEvent_createdAt_idx" ON "CreateEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "CreateEvent" ADD CONSTRAINT "CreateEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

