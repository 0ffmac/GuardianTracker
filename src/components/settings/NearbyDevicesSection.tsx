"use client";

import React from "react";

interface NearbyDevicesSectionProps {
  wifiDevices: any[];
  bleDevices: any[];
  devicesLoading: boolean;
  devicesError: string | null;
  handleRefreshDevices: () => Promise<void> | void;
  handleDeleteDevice: (
    type: "wifi" | "ble",
    id: string,
    hasSessions: boolean
  ) => Promise<void> | void;
  formatDuration: (ms: number) => string;
}

export function NearbyDevicesSection({
  wifiDevices,
  bleDevices,
  devicesLoading,
  devicesError,
  handleRefreshDevices,
  handleDeleteDevice,
  formatDuration,
}: NearbyDevicesSectionProps) {
  return (
    <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-lg font-semibold">Nearby Wi-Fi &amp; Bluetooth Devices</h2>
        <button
          className="px-3 py-1 text-xs rounded-lg bg-white/10 text-gray-100 hover:bg-white/20 border border-white/15 transition"
          onClick={handleRefreshDevices}
          disabled={devicesLoading}
        >
          {devicesLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>
      <p className="text-sm text-gray-300">
        See Wi-Fi networks and Bluetooth devices that have been recently observed
        near you.
      </p>
      {devicesError && (
        <div className="mt-3 text-sm text-red-400">{devicesError}</div>
      )}
      <div className="mt-4">
        {devicesLoading ? (
          <div className="text-sm text-gray-400">Loading nearby devices...</div>
        ) : wifiDevices.length === 0 && bleDevices.length === 0 ? (
          <div className="text-sm text-gray-400">
            No nearby devices recorded yet. Start a tracking session or use the
            mobile app to see devices here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-2">
                Wi-Fi devices
              </h3>
              <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {wifiDevices.map((device) => {
                  const first = device.firstSeen
                    ? new Date(device.firstSeen)
                    : null;
                  const last = device.lastSeen ? new Date(device.lastSeen) : null;
                  const durationMs =
                    first && last ? last.getTime() - first.getTime() : 0;
                  return (
                    <li
                      key={device.id}
                      className="bg-white/5 rounded-xl px-3 py-2 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">
                            {device.ssid || "Hidden network"}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            BSSID: {device.bssid}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {device.hasSessions && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-100">
                              Part of sessions
                            </span>
                          )}
                          <button
                            className="px-2 py-0.5 text-[11px] rounded bg-red-600 text-white hover:bg-red-700 transition"
                            onClick={() =>
                              handleDeleteDevice(
                                "wifi",
                                device.id as string,
                                device.hasSessions
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-gray-300">
                        {first && (
                          <span>First seen: {first.toLocaleString()}</span>
                        )}
                        {last && (
                          <span>Last seen: {last.toLocaleString()}</span>
                        )}
                        <span>Scans: {device.scanCount}</span>
                        {durationMs > 0 && (
                          <span>
                            Near you for ~{formatDuration(durationMs)}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-2">
                Bluetooth devices
              </h3>
              <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {bleDevices.map((device) => {
                  const first = device.firstSeen
                    ? new Date(device.firstSeen)
                    : null;
                  const last = device.lastSeen ? new Date(device.lastSeen) : null;
                  const durationMs =
                    first && last ? last.getTime() - first.getTime() : 0;
                  return (
                    <li
                      key={device.id}
                      className="bg-white/5 rounded-xl px-3 py-2 text-xs flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">
                            {device.name || "Unknown device"}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            Address: {device.address}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {device.hasSessions && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-100">
                              Part of sessions
                            </span>
                          )}
                          <button
                            className="px-2 py-0.5 text-[11px] rounded bg-red-600 text-white hover:bg-red-700 transition"
                            onClick={() =>
                              handleDeleteDevice(
                                "ble",
                                device.id as string,
                                device.hasSessions
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-gray-300">
                        {first && (
                          <span>First seen: {first.toLocaleString()}</span>
                        )}
                        {last && (
                          <span>Last seen: {last.toLocaleString()}</span>
                        )}
                        <span>Scans: {device.scanCount}</span>
                        {durationMs > 0 && (
                          <span>
                            Near you for ~{formatDuration(durationMs)}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
