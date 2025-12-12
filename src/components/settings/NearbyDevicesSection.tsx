"use client";

import React from "react";
import { useLanguage } from "@/hooks/useLanguage";

interface NearbyDevicesSectionProps {
  wifiDevices: any[];
  bleDevices: any[];
  devicesLoading: boolean;
  devicesError: string | null;
  handleRefreshDevices: () => Promise<void> | void;
  handleDeleteDevice: (
    type: "wifi" | "ble",
    id: string,
    hasSessions: boolean,
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
  const { t } = useLanguage();

  return (
    <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-lg font-semibold">
          {t("settings.nearby.title")}
        </h2>
        <button
          className="px-3 py-1 text-xs rounded-lg bg-white/10 text-gray-100 hover:bg-white/20 border border-white/15 transition"
          onClick={handleRefreshDevices}
          disabled={devicesLoading}
        >
          {devicesLoading
            ? t("settings.nearby.refresh.loading")
            : t("settings.nearby.refresh.idle")}
        </button>
      </div>

      <p className="text-sm text-gray-300">
        {t("settings.nearby.body")}
      </p>

      {devicesError && (
        <div className="mt-3 text-sm text-red-400">{devicesError}</div>
      )}

      <div className="mt-4">
        {devicesLoading ? (
          <div className="text-sm text-gray-400">
            {t("settings.nearby.loading")}
          </div>
        ) : wifiDevices.length === 0 && bleDevices.length === 0 ? (
          <div className="text-sm text-gray-400">
            {t("settings.nearby.empty")}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Wi-Fi devices */}
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-2">
                {t("settings.nearby.wifiHeading")}
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
                            {device.ssid || t("settings.nearby.hiddenNetwork")}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            BSSID: {device.bssid}
                          </div>
                          {device.manufacturer && (
                            <div className="text-[11px] text-gray-400">
                              {t("settings.nearby.manufacturer")} {device.manufacturer}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {device.hasSessions && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-100">
                              {t("settings.nearby.partOfSessions")}
                            </span>
                          )}
                          <button
                            className="px-2 py-0.5 text-[11px] rounded bg-red-600 text-white hover:bg-red-700 transition"
                            onClick={() =>
                              handleDeleteDevice(
                                "wifi",
                                device.id as string,
                                device.hasSessions,
                              )
                            }
                          >
                            {t("settings.nearby.delete")}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-gray-300">
                        {first && (
                          <span>
                            {t("settings.nearby.firstSeen")} {first.toLocaleString()}
                          </span>
                        )}
                        {last && (
                          <span>
                            {t("settings.nearby.lastSeen")} {last.toLocaleString()}
                          </span>
                        )}
                        <span>
                          {t("settings.nearby.scans")} {device.scanCount}
                        </span>
                        {durationMs > 0 && (
                          <span>
                            {t("settings.nearby.nearDuration")} {formatDuration(durationMs)}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Bluetooth devices */}
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-2">
                {t("settings.nearby.bluetoothHeading")}
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
                            {device.name || t("settings.nearby.unknownDevice")}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {t("settings.nearby.address")} {device.address}
                          </div>
                          {device.manufacturer && (
                            <div className="text-[11px] text-gray-400">
                              {t("settings.nearby.manufacturer")} {device.manufacturer}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          {device.hasSessions && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-100">
                              {t("settings.nearby.partOfSessions")}
                            </span>
                          )}
                          <button
                            className="px-2 py-0.5 text-[11px] rounded bg-red-600 text-white hover:bg-red-700 transition"
                            onClick={() =>
                              handleDeleteDevice(
                                "ble",
                                device.id as string,
                                device.hasSessions,
                              )
                            }
                          >
                            {t("settings.nearby.delete")}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-1 text-[11px] text-gray-300">
                        {first && (
                          <span>
                            {t("settings.nearby.firstSeen")} {first.toLocaleString()}
                          </span>
                        )}
                        {last && (
                          <span>
                            {t("settings.nearby.lastSeen")} {last.toLocaleString()}
                          </span>
                        )}
                        <span>
                          {t("settings.nearby.scans")} {device.scanCount}
                        </span>
                        {durationMs > 0 && (
                          <span>
                            {t("settings.nearby.nearDuration")} {formatDuration(durationMs)}
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
