-- CreateTable
CREATE TABLE "TrackingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "TrackingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "accuracy" REAL,
    "altitude" REAL,
    "speed" REAL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT,
    "trackingSessionId" TEXT,
    CONSTRAINT "Location_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Location_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Location_trackingSessionId_fkey" FOREIGN KEY ("trackingSessionId") REFERENCES "TrackingSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Location" ("accuracy", "altitude", "deviceId", "id", "latitude", "longitude", "speed", "timestamp", "userId") SELECT "accuracy", "altitude", "deviceId", "id", "latitude", "longitude", "speed", "timestamp", "userId" FROM "Location";
DROP TABLE "Location";
ALTER TABLE "new_Location" RENAME TO "Location";
CREATE INDEX "Location_userId_idx" ON "Location"("userId");
CREATE INDEX "Location_deviceId_idx" ON "Location"("deviceId");
CREATE INDEX "Location_timestamp_idx" ON "Location"("timestamp");
CREATE INDEX "Location_trackingSessionId_idx" ON "Location"("trackingSessionId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

-- CreateIndex
CREATE INDEX "TrackingSession_userId_idx" ON "TrackingSession"("userId");
