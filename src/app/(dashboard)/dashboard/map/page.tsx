"use client";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const Map = dynamic(() => import("@/components/Map"), { ssr: false });

export default function DashboardMapPage() {
  interface Location {
    id: string;
    latitude: number;
    longitude: number;
    deviceId: string | null;
    timestamp: string;
  }
  interface TrackingSession {
    id: string;
    name: string | null;
    startTime: string;
    endTime: string;
    locations: Location[];
  }
  const [locations, setLocations] = useState<Location[]>([]);
  const [trackingSessions, setTrackingSessions] = useState<TrackingSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocationHistory = async () => {
      const res = await fetch("/api/locations");
      const data = await res.json();
      const sessions: TrackingSession[] = (data.trackingSessions || []) as TrackingSession[];
      setTrackingSessions(sessions);

      if (sessions.length === 0) {
        setSelectedSessionId(null);
        setLocations([]);
        return;
      }

      // If nothing is selected yet, default to the most recent session
      setSelectedSessionId((prev) => prev ?? sessions[0].id);
    };
    fetchLocationHistory();
  }, []);

  useEffect(() => {
    if (!selectedSessionId) {
      setLocations([]);
      return;
    }
    const session = trackingSessions.find((s) => s.id === selectedSessionId);
    setLocations(session ? session.locations : []);
  }, [selectedSessionId, trackingSessions]);

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8 pt-20">
        <h1 className="text-2xl font-bold mb-4">Tracking Map</h1>
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
        <div className="h-[500px] rounded-xl overflow-hidden">
          <Map
            locations={locations}
            currentLocation={locations[locations.length - 1] || null}
            fitOnUpdate={true}
            autoZoomOnFirstPoint={true}
          />
        </div>

        <div className="mt-6 p-6 bg-gold-900/20 rounded-2xl border border-gold-400/20 overflow-x-auto">
          <h2 className="text-xl font-semibold mb-4">Points for Selected Session</h2>
          {locations.length === 0 ? (
            <p className="text-sm text-gold-300/80">
              No points recorded for this session yet.
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gold-300/80 border-b border-gold-400/30">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Latitude</th>
                  <th className="py-2 pr-4">Longitude</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc, index) => (
                  <tr
                    key={loc.id}
                    className="border-b border-gold-400/10 last:border-b-0"
                  >
                    <td className="py-1 pr-4 text-gold-100">{index + 1}</td>
                    <td className="py-1 pr-4 text-gold-100">
                      {new Date(loc.timestamp).toLocaleString()}
                    </td>
                    <td className="py-1 pr-4 text-gold-100 font-mono text-xs">
                      {loc.latitude.toFixed(6)}
                    </td>
                    <td className="py-1 pr-4 text-gold-100 font-mono text-xs">
                      {loc.longitude.toFixed(6)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
