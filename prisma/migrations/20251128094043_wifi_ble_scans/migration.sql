-- CreateTable
CREATE TABLE "WifiScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ssid" TEXT NOT NULL,
    "bssid" TEXT NOT NULL,
    "rssi" INTEGER NOT NULL,
    "frequency" INTEGER,
    "locationId" TEXT NOT NULL,
    CONSTRAINT "WifiScan_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BleScan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "address" TEXT NOT NULL,
    "rssi" INTEGER NOT NULL,
    "locationId" TEXT NOT NULL,
    CONSTRAINT "BleScan_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "WifiScan_locationId_idx" ON "WifiScan"("locationId");

-- CreateIndex
CREATE INDEX "BleScan_locationId_idx" ON "BleScan"("locationId");
