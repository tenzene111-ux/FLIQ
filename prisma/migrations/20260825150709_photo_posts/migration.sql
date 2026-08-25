-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "postType" TEXT NOT NULL DEFAULT 'video',
ALTER COLUMN "videoUrl" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PostPhoto" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "PostPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostPhoto_videoId_idx" ON "PostPhoto"("videoId");

-- AddForeignKey
ALTER TABLE "PostPhoto" ADD CONSTRAINT "PostPhoto_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

