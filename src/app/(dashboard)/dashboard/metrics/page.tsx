"use client";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";

export default function DashboardMetricsPage() {
  const [trackingSessions, setTrackingSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [wifiNetworks, setWifiNetworks] = useState<any[]>([]);
  const [bleDevices, setBleDevices] = useState<any[]>([]);
  const [environmentSummary, setEnvironmentSummary] = useState<any>(null);

  useEffect(() => {
    const fetchLocationHistory = async () => {
      const res = await fetch("/api/locations");
      const data = await res.json();
      setTrackingSessions(data.trackingSessions || []);
      if (!selectedSessionId && data.trackingSessions.length > 0) {
        setSelectedSessionId(data.trackingSessions[0].id);
      }
    };
    fetchLocationHistory();
  }, [selectedSessionId]);

  useEffect(() => {
    const loadEnvironment = async () => {
      if (!selectedSessionId) {
        setEnvironmentSummary(null);
        setWifiNetworks([]);
        setBleDevices([]);
        return;
      }
      try {
        const res = await fetch(`/api/tracking_session/${selectedSessionId}/environment`);
        if (!res.ok) return;
        const data = await res.json();
        setEnvironmentSummary(data.summary ?? null);
        setWifiNetworks(data.wifi ?? []);
        setBleDevices(data.ble ?? []);
      } catch (err) {
        console.error("Failed to load environment metrics", err);
      }
    };
    loadEnvironment();
  }, [selectedSessionId]);

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 pt-20">
        <h1 className="text-2xl font-bold mb-4">Tracking Metrics</h1>
        <div className="mt-4 p-6 bg-gold-900/20 rounded-2xl border border-gold-400/20">
          <label htmlFor="session-select" className="mr-2">Session:</label>
          <select
            id="session-select"
            value={selectedSessionId || ''}
            onChange={e => setSelectedSessionId(e.target.value)}
            className="w-full md:w-64 p-3 bg-gold-900/40 border border-gold-400/30 
              rounded-lg text-gold-100 appearance-none cursor-pointer 
              focus:ring-gold-500 focus:border-gold-500 font-semibold
              "
          >
            {trackingSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || `Session ${new Date(s.startTime).toLocaleString()}`}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Wi-Fi Networks Seen</h2>
          {wifiNetworks.length === 0 ? (
            <p className="text-sm text-gray-400">No Wi-Fi data recorded for this session yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-white/10">
                  <th className="py-2 pr-4">SSID</th>
                  <th className="py-2 pr-4">BSSID</th>
                  <th className="py-2 pr-4">Samples</th>
                  <th className="py-2 pr-4">Avg RSSI</th>
                </tr>
              </thead>
              <tbody>
                {wifiNetworks.map((net, idx) => (
                  <tr key={`${net.bssid}-${idx}`} className="border-b border-white/5 last:border-b-0">
                    <td className="py-1 pr-4 text-white">{net.ssid || <span className="text-gray-500 italic">(hidden)</span>}</td>
                    <td className="py-1 pr-4 text-gray-300 font-mono text-xs">{net.bssid}</td>
                    <td className="py-1 pr-4 text-gray-200">{net.count}</td>
                    <td className="py-1 pr-4 text-gray-200">{net.avgRssi !== null && net.avgRssi !== undefined ? `${Math.round(net.avgRssi)} dBm` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Wi-Fi Devices Most Time Nearby</h2>
          {wifiNetworks.length === 0 ? (
            <p className="text-sm text-gray-400">No Wi-Fi data recorded for this session yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-white/10">
                  <th className="py-2 pr-4">SSID</th>
                  <th className="py-2 pr-4">BSSID</th>
                  <th className="py-2 pr-4">Samples (proxy for time)</th>
                </tr>
              </thead>
              <tbody>
                {wifiNetworks
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 10)
                  .map((net, idx) => (
                    <tr key={`most-${net.bssid}-${idx}`} className="border-b border-white/5 last:border-b-0">
                      <td className="py-1 pr-4 text-white">{net.ssid || <span className="text-gray-500 italic">(hidden)</span>}</td>
                      <td className="py-1 pr-4 text-gray-300 font-mono text-xs">{net.bssid}</td>
                      <td className="py-1 pr-4 text-gold-300 font-bold">{net.count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Bluetooth Devices Seen</h2>
          {bleDevices.length === 0 ? (
            <p className="text-sm text-gray-400">No BLE data recorded for this session yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-white/10">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Address</th>
                  <th className="py-2 pr-4">Samples</th>
                  <th className="py-2 pr-4">Avg RSSI</th>
                </tr>
              </thead>
              <tbody>
                {bleDevices.map((dev, idx) => (
                  <tr key={`${dev.address}-${idx}`} className="border-b border-white/5 last:border-b-0">
                    <td className="py-1 pr-4 text-white">{dev.name || <span className="text-gray-500 italic">(unknown)</span>}</td>
                    <td className="py-1 pr-4 text-gray-300 font-mono text-xs">{dev.address}</td>
                    <td className="py-1 pr-4 text-gray-200">{dev.count}</td>
                    <td className="py-1 pr-4 text-gray-200">{dev.avgRssi !== null && dev.avgRssi !== undefined ? `${Math.round(dev.avgRssi)} dBm` : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-2">Bluetooth Devices Most Time Nearby</h2>
          {bleDevices.length === 0 ? (
            <p className="text-sm text-gray-400">No BLE data recorded for this session yet.</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-white/10">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Address</th>
                  <th className="py-2 pr-4">Samples (proxy for time)</th>
                </tr>
              </thead>
              <tbody>
                {bleDevices
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 10)
                  .map((dev, idx) => (
                    <tr key={`most-${dev.address}-${idx}`} className="border-b border-white/5 last:border-b-0">
                      <td className="py-1 pr-4 text-white">{dev.name || <span className="text-gray-500 italic">(unknown)</span>}</td>
                      <td className="py-1 pr-4 text-gray-300 font-mono text-xs">{dev.address}</td>
                      <td className="py-1 pr-4 text-gold-300 font-bold">{dev.count}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
