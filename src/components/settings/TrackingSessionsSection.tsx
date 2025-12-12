"use client";

import React from "react";
import { useLanguage } from "@/hooks/useLanguage";

interface TrackingSessionsSectionProps {
  trackingSessions: any[];
  loading: boolean;
  deleting: string | null;
  handleDeleteAllSessions: () => Promise<void> | void;
  handleDeleteSession: (id: string) => Promise<void> | void;
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string | null) => void;
  selectedSession: any | null;
  selectedSessionLocations: any[];
  sessionDurationMs: number | null;
  sessionDeviceIds: unknown[];
  environmentLoading: boolean;
  environmentError: string | null;
  environmentSummary: any | null;
  environmentWifi: any[];
  environmentBle: any[];
  environmentVisible: boolean;
  handleLoadEnvironment: (sessionId: string) => Promise<void> | void;
  sessionNameDraft: string;
  setSessionNameDraft: (value: string) => void;
  sessionQualityDraft: "GOOD" | "REGULAR" | "BAD";
  setSessionQualityDraft: (value: "GOOD" | "REGULAR" | "BAD") => void;
  sessionMetaSaving: boolean;
  sessionMetaError: string | null;
  handleSaveSessionMeta: (e: React.FormEvent) => Promise<void> | void;
  formatDuration: (ms: number) => string;
}

export function TrackingSessionsSection({
  trackingSessions,
  loading,
  deleting,
  handleDeleteAllSessions,
  handleDeleteSession,
  selectedSessionId,
  setSelectedSessionId,
  selectedSession,
  selectedSessionLocations,
  sessionDurationMs,
  sessionDeviceIds,
  environmentLoading,
  environmentError,
  environmentSummary,
  environmentWifi,
  environmentBle,
  environmentVisible,
  handleLoadEnvironment,
  sessionNameDraft,
  setSessionNameDraft,
  sessionQualityDraft,
  setSessionQualityDraft,
  sessionMetaSaving,
  sessionMetaError,
  handleSaveSessionMeta,
  formatDuration,
}: TrackingSessionsSectionProps) {
  const { t } = useLanguage();

  return (
    <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-lg font-semibold">
          {t("settings.sessions.title")}
        </h2>
        {trackingSessions.length > 0 && (
          <button
            className="px-3 py-1 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
            onClick={handleDeleteAllSessions}
          >
            {t("settings.sessions.deleteAll")}
          </button>
        )}
      </div>

      <p className="text-sm text-gray-300">
        {t("settings.sessions.body")}
      </p>

      <div className="mt-4">
        {loading ? (
          <div>{t("settings.sessions.loading")}</div>
        ) : trackingSessions.length === 0 ? (
          <div className="text-sm text-gray-400">
            {t("settings.sessions.empty")}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Sessions list */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-200 mb-1">
                {t("settings.sessions.listTitle")}
              </h3>
              <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {trackingSessions.map((session) => {
                  const quality = (session as any).quality;
                  const dotClass =
                    quality === "GOOD"
                      ? "bg-emerald-400"
                      : quality === "BAD"
                      ? "bg-red-500"
                      : quality === "REGULAR"
                      ? "bg-amber-400"
                      : "bg-gray-500";

                  const qualityLabel =
                    quality === "GOOD"
                      ? t("settings.sessions.quality.good")
                      : quality === "BAD"
                      ? t("settings.sessions.quality.bad")
                      : quality === "REGULAR"
                      ? t("settings.sessions.quality.regular")
                      : null;

                  return (
                    <li
                      key={session.id}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer border ${
                        selectedSession && selectedSession.id === session.id
                          ? "bg-white/10 border-gold-400/70"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                      onClick={() => setSelectedSessionId(session.id as string)}
                    >
                      <div className="mr-3 flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                        <div>
                          <div className="text-sm font-medium">
                            {session.name || t("settings.sessions.sessionFallback")}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(session.startTime).toLocaleString()}
                          </div>
                          {qualityLabel && (
                            <div
                              className="mt-0.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] text-black"
                              style={{
                                backgroundColor:
                                  quality === "GOOD"
                                    ? "#22c55e"
                                    : quality === "BAD"
                                    ? "#ef4444"
                                    : "#f97316",
                              }}
                            >
                              {qualityLabel}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id as string);
                        }}
                        disabled={deleting === session.id}
                      >
                        {deleting === session.id
                          ? t("settings.sessions.row.deleting")
                          : t("settings.sessions.row.delete")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Details + environment */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-gray-200">
                  {t("settings.sessions.details.title")}
                </h3>
                {selectedSession && (
                  <button
                    className="px-3 py-1 text-[11px] rounded-lg bg-white/10 text-gray-100 hover:bg-white/20 border border-white/15 transition"
                    onClick={() => handleLoadEnvironment(selectedSession.id as string)}
                    disabled={environmentLoading}
                  >
                    {environmentLoading
                      ? t("settings.sessions.details.viewEnv.loading")
                      : t("settings.sessions.details.viewEnv.idle")}
                  </button>
                )}
              </div>

              {!selectedSession ? (
                <div className="text-sm text-gray-400">
                  {t("settings.sessions.details.selectPrompt")}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Basic stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="text-xs text-gray-400 mb-1">
                        {t("settings.sessions.details.name")}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium">
                          {selectedSession.name || t("settings.sessions.sessionFallback")}
                        </div>
                        {(() => {
                          const quality = (selectedSession as any).quality;
                          if (!quality) return null;

                          let label = "";
                          let cls = "";
                          if (quality === "GOOD") {
                            label = t("settings.sessions.quality.good") + " track";
                            cls = "bg-emerald-600 text-emerald-50";
                          } else if (quality === "BAD") {
                            label = t("settings.sessions.quality.bad");
                            cls = "bg-red-600 text-red-50";
                          } else if (quality === "REGULAR") {
                            label = t("settings.sessions.quality.regular");
                            cls = "bg-amber-500 text-black";
                          }
                          if (!label) return null;

                          return (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
                              {label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="text-xs text-gray-400">
                        {t("settings.sessions.details.duration")}
                      </div>
                      <div className="text-sm font-medium">
                        {sessionDurationMs != null
                          ? formatDuration(sessionDurationMs)
                          : t("settings.sessions.details.durationUnknown")}
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="text-xs text-gray-400">
                        {t("settings.sessions.details.points")}
                      </div>
                      <div className="text-sm font-medium">
                        {selectedSessionLocations.length}
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3">
                      <div className="text-xs text-gray-400">
                        {t("settings.sessions.details.devices")}
                      </div>
                      <div className="text-sm font-medium">
                        {sessionDeviceIds.length > 0
                          ? sessionDeviceIds.length
                          : t("settings.sessions.details.devicesNone")}
                      </div>
                    </div>
                  </div>

                  {/* Edit meta */}
                  <form
                    onSubmit={handleSaveSessionMeta}
                    className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-4"
                  >
                    <div className="bg-white/5 rounded-xl p-3 sm:col-span-2">
                      <div className="text-xs text-gray-400 mb-1">
                        {t("settings.sessions.edit.label")}
                      </div>
                      <input
                        type="text"
                        value={sessionNameDraft}
                        onChange={(e) => setSessionNameDraft(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-gold-900/40 border border-gold-400/40 text-sm text-gold-100 placeholder:text-gold-400/70 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                        placeholder={t("settings.sessions.edit.placeholder")}
                      />
                      <div className="text-[11px] text-gray-400 mt-1">
                        {t("settings.sessions.edit.helper")}
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-xl p-3 flex flex-col gap-2">
                      <div className="text-xs text-gray-400">
                        {t("settings.sessions.rating.label")}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSessionQualityDraft("GOOD")}
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition ${
                            sessionQualityDraft === "GOOD"
                              ? "bg-emerald-600 text-emerald-50 border-emerald-300"
                              : "bg-black/30 text-emerald-200 border-emerald-500/40 hover:bg-emerald-700/40"
                          }`}
                        >
                          {t("settings.sessions.rating.good")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSessionQualityDraft("REGULAR")}
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition ${
                            sessionQualityDraft === "REGULAR"
                              ? "bg-amber-500 text-black border-amber-300"
                              : "bg-black/30 text-amber-200 border-amber-500/40 hover:bg-amber-700/40"
                          }`}
                        >
                          {t("settings.sessions.rating.regular")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSessionQualityDraft("BAD")}
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition ${
                            sessionQualityDraft === "BAD"
                              ? "bg-red-600 text-red-50 border-red-300"
                              : "bg-black/30 text-red-200 border-red-500/40 hover:bg-red-700/40"
                          }`}
                        >
                          {t("settings.sessions.rating.bad")}
                        </button>
                      </div>
                      {sessionMetaError && (
                        <div className="text-[11px] text-red-400">
                          {sessionMetaError}
                        </div>
                      )}
                      <button
                        type="submit"
                        className="mt-1 px-3 py-1.5 bg-gold-500 text-black rounded-lg hover:bg-gold-400 transition text-[11px] font-semibold disabled:opacity-60"
                        disabled={sessionMetaSaving}
                      >
                        {sessionMetaSaving
                          ? t("settings.sessions.saveMeta.loading")
                          : t("settings.sessions.saveMeta.idle")}
                      </button>
                    </div>
                  </form>

                  {/* Environment metrics */}
                  {environmentError && (
                    <div className="text-xs text-red-400">{environmentError}</div>
                  )}

                  {environmentVisible && environmentSummary && (
                    <div className="mt-4 space-y-3">
                      <h4 className="text-xs font-semibold text-gray-300 tracking-wide uppercase">
                        Environment metrics for this session
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-white/5 rounded-xl p-3">
                          <div className="text-[11px] text-gray-400">
                            Location points
                          </div>
                          <div className="text-sm font-semibold">
                            {environmentSummary.locations ?? 0}
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                          <div className="text-[11px] text-gray-400">
                            Wi-Fi scans
                          </div>
                          <div className="text-sm font-semibold">
                            {environmentSummary.wifiScans ?? 0}
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                          <div className="text-[11px] text-gray-400">
                            Bluetooth scans
                          </div>
                          <div className="text-sm font-semibold">
                            {environmentSummary.bleScans ?? 0}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-gray-300">
                        <div className="bg-white/5 rounded-xl p-3">
                          <div className="text-[11px] font-semibold text-gray-200 mb-1">
                            Top Wi-Fi networks
                          </div>
                          {environmentWifi.length === 0 ? (
                            <div className="text-gray-400">
                              No Wi-Fi data for this session.
                            </div>
                          ) : (
                            <ul className="space-y-0.5 max-h-32 overflow-y-auto pr-1">
                              {environmentWifi.slice(0, 5).map((w: any) => (
                                <li
                                  key={w.bssid}
                                  className="flex justify-between gap-2"
                                >
                                  <span className="truncate">
                                    {w.ssid || "Hidden"}
                                  </span>
                                  <span className="text-gray-400">
                                    ×{w.count ?? 0}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                          <div className="text-[11px] font-semibold text-gray-200 mb-1">
                            Top Bluetooth devices
                          </div>
                          {environmentBle.length === 0 ? (
                            <div className="text-gray-400">
                              No Bluetooth data for this session.
                            </div>
                          ) : (
                            <ul className="space-y-0.5 max-h-32 overflow-y-auto pr-1">
                              {environmentBle.slice(0, 5).map((b: any) => (
                                <li
                                  key={b.address}
                                  className="flex justify-between gap-2"
                                >
                                  <span className="truncate">
                                    {b.name || "Unknown"}
                                  </span>
                                  <span className="text-gray-400">
                                    ×{b.count ?? 0}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
