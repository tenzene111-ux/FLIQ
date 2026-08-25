-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "duetOfId" TEXT;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_duetOfId_fkey" FOREIGN KEY ("duetOfId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;

