-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "ConversationParticipant" ADD COLUMN     "muted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'member';

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "sharedHashtagId" TEXT,
ADD COLUMN     "sharedLiveId" TEXT,
ADD COLUMN     "sharedSoundId" TEXT,
ADD COLUMN     "sharedUserId" TEXT,
ADD COLUMN     "sharedVideoId" TEXT;

-- AlterTable
ALTER TABLE "UserSettings" ADD COLUMN     "readReceipts" BOOLEAN NOT NULL DEFAULT true;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sharedVideoId_fkey" FOREIGN KEY ("sharedVideoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sharedUserId_fkey" FOREIGN KEY ("sharedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sharedHashtagId_fkey" FOREIGN KEY ("sharedHashtagId") REFERENCES "Hashtag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sharedSoundId_fkey" FOREIGN KEY ("sharedSoundId") REFERENCES "Sound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_sharedLiveId_fkey" FOREIGN KEY ("sharedLiveId") REFERENCES "LiveStream"("id") ON DELETE SET NULL ON UPDATE CASCADE;

