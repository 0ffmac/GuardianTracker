"use client";

import React from "react";

interface AlertsSectionProps {
  alerts: any[];
  alertsLoading: boolean;
  alertsError: string | null;
  alertType: "sent" | "received";
  setAlertType: (value: "sent" | "received") => void;
  alertStatus: string;
  setAlertStatus: (value: string) => void;
  handleDeleteAllAlerts: () => Promise<void> | void;
  handleDeleteAlert: (id: string) => Promise<void> | void;
}

export function AlertsSection({
  alerts,
  alertsLoading,
  alertsError,
  alertType,
  setAlertType,
  alertStatus,
  setAlertStatus,
  handleDeleteAllAlerts,
  handleDeleteAlert,
}: AlertsSectionProps) {
  return (
    <section className="bg-surface backdrop-blur-sm rounded-2xl p-6 border border-white/10">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h2 className="text-lg font-semibold">Alerts</h2>
        {alerts.length > 0 && (
          <button
            className="px-3 py-1 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
            onClick={handleDeleteAllAlerts}
          >
            Delete all
          </button>
        )}
      </div>
      <p className="text-sm text-gray-300">
        See alerts you've sent or received, and filter them.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-300">Type</span>
          <select
            className="bg-gold-900/40 border border-gold-400/40 text-sm text-gold-100 rounded-lg px-2 py-1 appearance-none focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            value={alertType}
            onChange={(e) => setAlertType(e.target.value as "sent" | "received")}
          >
            <option value="sent">Sent</option>
            <option value="received">Received</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-300">Status</span>
          <select
            className="bg-gold-900/40 border border-gold-400/40 text-sm text-gold-100 rounded-lg px-2 py-1 appearance-none focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            value={alertStatus}
            onChange={(e) => setAlertStatus(e.target.value)}
          >
            <option value="ACTIVE">Active</option>
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="READ">Read</option>
            <option value="RESPONDED">Responded</option>
            <option value="DISMISSED">Dismissed</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
          </select>
        </div>
      </div>
      {alertsError && (
        <div className="mt-3 text-sm text-red-400">{alertsError}</div>
      )}
      <div className="mt-6">
        {alertsLoading ? (
          <div className="text-sm text-gray-400">Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div className="text-sm text-gray-400">
            No alerts found for this filter. Trigger or receive an alert and they'll
            appear here.
          </div>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {alerts.map((alert: any) => (
              <li
                key={alert.id}
                className="bg-white/5 rounded-xl px-3 py-2 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">
                    {alert.title || "Alert"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-gray-200">
                      {alert.status}
                    </span>
                    <button
                      className="px-2 py-0.5 text-[11px] rounded bg-red-600 text-white hover:bg-red-700 transition"
                      onClick={() => handleDeleteAlert(alert.id as string)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(alert.createdAt).toLocaleString()}
                </div>
                {alert.description && (
                  <div className="text-xs text-gray-300 mt-1 truncate">
                    {alert.description}
                  </div>
                )}
                <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-gray-300">
                  <span>
                    Recipients: {" "}
                    {alert.recipients
                      ? alert.recipients.length
                      : alert.alertRecipients
                      ? alert.alertRecipients.length
                      : 0}
                  </span>
                  <span>
                    Audio messages: {alert.audioMessages?.length || 0}
                  </span>
                  {alert.recipientStatus && (
                    <span>My status: {alert.recipientStatus}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
