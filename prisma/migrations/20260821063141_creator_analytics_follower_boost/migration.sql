-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CreatorAnalytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "totalWatchTime" INTEGER NOT NULL DEFAULT 0,
    "totalLikes" INTEGER NOT NULL DEFAULT 0,
    "totalComments" INTEGER NOT NULL DEFAULT 0,
    "totalShares" INTEGER NOT NULL DEFAULT 0,
    "totalSaves" INTEGER NOT NULL DEFAULT 0,
    "followerBoost" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CreatorAnalytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_CreatorAnalytics" ("id", "totalComments", "totalLikes", "totalSaves", "totalShares", "totalViews", "totalWatchTime", "userId") SELECT "id", "totalComments", "totalLikes", "totalSaves", "totalShares", "totalViews", "totalWatchTime", "userId" FROM "CreatorAnalytics";
DROP TABLE "CreatorAnalytics";
ALTER TABLE "new_CreatorAnalytics" RENAME TO "CreatorAnalytics";
CREATE UNIQUE INDEX "CreatorAnalytics_userId_key" ON "CreatorAnalytics"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
