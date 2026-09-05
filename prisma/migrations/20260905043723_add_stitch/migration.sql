-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "allowStitch" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "allowStitch" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "stitchOfId" TEXT;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_stitchOfId_fkey" FOREIGN KEY ("stitchOfId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;
