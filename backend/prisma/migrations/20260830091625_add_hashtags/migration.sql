-- CreateTable
CREATE TABLE "Hashtag" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "useCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hashtag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoHashtag" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "hashtagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoHashtag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hashtag_tag_key" ON "Hashtag"("tag");

-- CreateIndex
CREATE INDEX "Hashtag_useCount_idx" ON "Hashtag"("useCount");

-- CreateIndex
CREATE INDEX "VideoHashtag_hashtagId_idx" ON "VideoHashtag"("hashtagId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoHashtag_videoId_hashtagId_key" ON "VideoHashtag"("videoId", "hashtagId");

-- AddForeignKey
ALTER TABLE "VideoHashtag" ADD CONSTRAINT "VideoHashtag_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoHashtag" ADD CONSTRAINT "VideoHashtag_hashtagId_fkey" FOREIGN KEY ("hashtagId") REFERENCES "Hashtag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
