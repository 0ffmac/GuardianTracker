"use client";
import React, { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";

type UserWithId = { id: string; name?: string | null; email?: string | null; image?: string | null };

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user as UserWithId | undefined;
  const [trackingSessions, setTrackingSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [dangerLoading, setDangerLoading] = useState(false);

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/locations");
        const data = await res.json();
        setTrackingSessions(data.trackingSessions || []);
      } catch (err) {
        setError("Failed to load tracking sessions.");
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  async function handleDeleteSession(id: string) {
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/tracking_session/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete session");
      setTrackingSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError("Failed to delete session.");
    } finally {
      setDeleting(null);
    }
  }

  async function handleDeleteAllData() {
    if (!user?.id) return;
    if (!confirm("Are you sure? This will delete ALL your data and cannot be undone.")) return;
    setDangerLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/user/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user data");
      // Sign out the user after deleting their account
      signOut();
    } catch (err) {
      setError("Failed to delete all user data.");
    } finally {
      setDangerLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-24 p-6 bg-white/10 rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-2">Tracking Sessions</h2>
        <p>Here you can view and delete your tracking sessions.</p>
        <div className="mt-4">
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : trackingSessions.length === 0 ? (
            <div>No tracking sessions found.</div>
          ) : (
            <ul className="space-y-2">
              {trackingSessions.map((session) => (
                <li key={session.id} className="flex items-center justify-between bg-white/20 p-3 rounded">
                  <span>
                    {session.name || "Session"} <span className="text-xs text-gray-400">({new Date(session.startTime).toLocaleString()})</span>
                  </span>
                  <button
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-xs"
                    onClick={() => handleDeleteSession(session.id)}
                    disabled={deleting === session.id}
                  >
                    {deleting === session.id ? "Deleting..." : "Delete"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-2">Danger Zone</h2>
        <p>Delete all your location and database information. This action is irreversible.</p>
        <button
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
          onClick={handleDeleteAllData}
          disabled={dangerLoading}
        >
          {dangerLoading ? "Deleting..." : "Delete All My Data"}
        </button>
      </div>
    </div>
  );
}
