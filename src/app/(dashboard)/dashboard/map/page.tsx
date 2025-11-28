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
      if (!selectedSessionId && sessions.length > 0) {
        setSelectedSessionId(sessions[0].id);
      }
      if (selectedSessionId) {
        const session = sessions.find((s) => s.id === selectedSessionId);
        setLocations(session ? session.locations : []);
      }
    };
    fetchLocationHistory();
  }, [selectedSessionId]);

  return (
    <div className="min-h-screen bg-background text-white">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-8 pt-20">
        <h1 className="text-2xl font-bold mb-4">Tracking Map</h1>
        <div className="mb-4">
          <label htmlFor="session-select" className="mr-2">Session:</label>
          <select
            id="session-select"
            value={selectedSessionId || ''}
            onChange={e => setSelectedSessionId(e.target.value)}
            className="p-2 rounded bg-surface text-white"
          >
            {trackingSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || `Session ${new Date(s.startTime).toLocaleString()}`}
              </option>
            ))}
          </select>
        </div>
        <div className="h-[500px] rounded-xl overflow-hidden">
          <Map locations={locations} currentLocation={locations[locations.length-1] || null} fitOnUpdate={true} autoZoomOnFirstPoint={true} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
