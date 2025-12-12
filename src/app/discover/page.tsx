"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Shield, Activity, Map, Radar, Database, Lock, Bell, HeartPulse, Smartphone } from 'lucide-react';

const Glow: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`pointer-events-none absolute rounded-full blur-[120px] opacity-30 ${className}`} />
);

const Card: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; onClick?: () => void }>
= ({ title, icon, children, onClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    className={`relative border border-white/10 bg-surface/60 backdrop-blur-md p-6 md:p-8 overflow-hidden group ${onClick ? 'cursor-pointer hover:border-gold-400/30' : ''}`}
  >
    <div className="absolute inset-0 bg-gradient-to-b from-gold-400/0 via-gold-400/0 to-gold-400/0 group-hover:from-gold-400/5 group-hover:via-transparent group-hover:to-transparent transition-colors duration-700" />
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 border border-gold-400/40 bg-black/20">{icon}</div>
        <h3 className="text-xl md:text-2xl font-serif text-white tracking-tight">{title}</h3>
      </div>
      <div className="text-gray-400 leading-relaxed text-sm md:text-base">{children}</div>
    </div>
    <motion.div
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ repeat: Infinity, duration: 4 }}
      className="absolute -top-10 -right-10 w-40 h-40 md:w-60 md:h-60 rounded-full bg-gold-400/10 blur-3xl"
    />
  </motion.div>
);

export default function DiscoverPage() {
  const [reverse, setReverse] = useState(false);
  const [modal, setModal] = useState<null | 'osrm' | 'fusion' | 'privacy'>(null);
  return (
    <div className="min-h-screen bg-background text-white selection:bg-gold-500/30 selection:text-gold-200">
      <Navbar />

      <main className="relative overflow-hidden">
        {/* Background glows */}
        <Glow className="w-[600px] h-[600px] -top-40 -left-40 bg-gold-400/20" />
        <Glow className="w-[500px] h-[500px] -bottom-40 -right-40 bg-blue-500/20" />

        {/* Hero */}
        <section className="pt-36 pb-20 px-6 relative">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="text-4xl md:text-6xl font-serif tracking-tight leading-tight"
                >
                  Discover <span className="text-gold-gradient italic">Guard Royal</span> Technology
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, delay: 0.1 }}
                  className="text-gray-400 mt-6 max-w-xl"
                >
                  A modern safety platform combining precise map-matching, intelligent signal fusion, and privacy-first data handling to protect people in real time.
                </motion.p>

                <div className="mt-8 flex items-center gap-4">
                  <span className="inline-flex items-center gap-2 text-gold-300 text-xs uppercase tracking-[0.2em]">
                    <span className="w-2 h-2 rounded-full bg-gold-400 animate-ping" /> Live Detection Pulse
                  </span>
                </div>
              </div>

              {/* Animated target scanner */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="relative aspect-square rounded-full border border-white/10 bg-surface/30 overflow-hidden"
                onMouseEnter={() => setReverse(true)}
                onMouseLeave={() => setReverse(false)}
              >
                {/* Concentric rings */}
                <div className="absolute inset-4 rounded-full border border-white/10" />
                <div className="absolute inset-12 rounded-full border border-white/10" />
                <div className="absolute inset-20 rounded-full border border-white/10" />

                {/* Rotating dashed ring */}
                <motion.div
                  animate={{ rotate: reverse ? -360 : 360 }}
                  transition={{ repeat: Infinity, duration: 30, ease: 'linear' }}
                  className="absolute inset-8 rounded-full border border-dashed border-gold-400/20"
                />

                {/* Rotating gold sweep */}
                <motion.div
                  animate={{ rotate: reverse ? -360 : 360 }}
                  transition={{ repeat: Infinity, duration: 18, ease: 'linear' }}
                  className="absolute inset-0 rounded-full"
                  style={{ background: 'conic-gradient(from 0deg, rgba(212,175,55,0.18), rgba(212,175,55,0) 25%)' }}
                />

                {/* Pulsing center glow */}
                <motion.div
                  animate={{ scale: [1, 1.06, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 md:w-36 md:h-36 rounded-full bg-gold-400/10 blur-3xl"
                />

                {/* Orbiting pulse dots */}
                <motion.div
                  animate={{ rotate: reverse ? -360 : 360 }}
                  transition={{ repeat: Infinity, duration: 10, ease: 'linear' }}
                  className="absolute inset-10"
                >
                  <motion.span
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gold-300 shadow-[0_0_18px_rgba(212,175,55,0.9)]"
                    animate={{ scale: [1, 1.35, 1], opacity: [0.85, 1, 0.85] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                  />
                </motion.div>
                <motion.div
                  animate={{ rotate: reverse ? 360 : -360 }}
                  transition={{ repeat: Infinity, duration: 14, ease: 'linear' }}
                  className="absolute inset-16"
                >
                  <motion.span
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gold-300/80 shadow-[0_0_14px_rgba(212,175,55,0.7)]"
                    animate={{ scale: [1, 1.25, 1], opacity: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                  />
                </motion.div>
                <motion.div
                  animate={{ rotate: reverse ? -360 : 360 }}
                  transition={{ repeat: Infinity, duration: 22, ease: 'linear' }}
                  className="absolute inset-24"
                >
                  <motion.span
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-[6px] h-[6px] rounded-full bg-gold-200 shadow-[0_0_10px_rgba(212,175,55,0.6)]"
                    animate={{ scale: [1, 1.2, 1], opacity: [0.75, 1, 0.75] }}
                    transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
                  />
                </motion.div>

                {/* Crosshair lines */}
                <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-px bg-white/5" />
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-px bg-white/5" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Technical pillars */}
        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6 md:gap-8">
            <Card title="OSRM Map-Matching" icon={<Map className="w-5 h-5 text-gold-300" />} onClick={() => setModal('osrm')}>
              We snap GPS traces to real road segments using OSRM's map_match endpoint. Under the hood, a Hidden Markov Model with Viterbi search weighs emission (GPS noise) and transition (movement) probabilities to output a clean, navigable path with a confidence score.
            </Card>
            <Card title="Signal Fusion" icon={<Radar className="w-5 h-5 text-gold-300" />} onClick={() => setModal('fusion')}>
              Alongside GPS, the mobile app optionally collects Wi‑Fi BSSIDs and BLE beacons. We store these as time-bound observations and use them to stabilize position indoors, flag unfamiliar devices, and detect proximity patterns that could indicate harassment or tracking.
            </Card>
            <Card title="Privacy by Design" icon={<Lock className="w-5 h-5 text-gold-300" />} onClick={() => setModal('privacy')}>
              All personally identifiable data stays within our infrastructure. We never sell to third parties. Access is strictly scoped per user, with auditing, short-lived tokens, and encryption at rest and in transit.
            </Card>
          </div>
        </section>

        {/* Data pipeline */}
        <section className="py-10 md:py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-serif">Data Flow</h2>
                <div className="text-gray-400 space-y-4">
                  <p>
                    1) Mobile app posts batched or live points to <code className="text-gold-300">/api/update_location</code>.
                    Poor-accuracy points are filtered and short hops under a few meters are skipped to reduce jitter.
                  </p>
                  <p>
                    2) The server persists rows in <code className="text-gold-300">Location</code> and links optional <code className="text-gold-300">WifiScan</code>/<code className="text-gold-300">BleScan</code> records for proximity intelligence.
                  </p>
                  <p>
                    3) For route visualization, recent points are sent to <code className="text-gold-300">/api/map_match</code>, which calls OSRM and returns a GeoJSON geometry and confidence.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="border border-white/10 p-4 bg-surface/40">
                    <div className="text-gold-300 mb-1">Prisma Models</div>
                    <div className="text-gray-400">User, Device, Location, WifiScan, BleScan, TrackingSession</div>
                  </div>
                  <div className="border border-white/10 p-4 bg-surface/40">
                    <div className="text-gold-300 mb-1">Filters</div>
                    <div className="text-gray-400">Accuracy threshold, min-distance dedupe, session scoping</div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4">
                <Card title="Realtime Alerts" icon={<Bell className="w-5 h-5 text-gold-300" />}>
                  Configurable triggers watch for events like sudden stops, long idle in unsafe areas, unusual detours, or unknown devices shadowing you. When thresholds trip, alerts can auto‑notify trusted contacts and, where configured, local responders.
                  <div className="mt-3 text-gray-400 text-sm space-y-2">
                    <div><span className="text-gold-300">Commuter safety:</span> If your route deviates significantly at night, the app asks for confirmation and can share your live session.</div>
                    <div><span className="text-gold-300">Device stalking:</span> Repeated BLE MAC near you across time windows raises severity from “notice” → “warning” → “urgent”.</div>
                    <div><span className="text-gold-300">Stranded:</span> No movement + low battery + late hours can notify your emergency contact with last matched route.</div>
                  </div>
                </Card>
                <Card title="Health & Safety" icon={<HeartPulse className="w-5 h-5 text-gold-300" />}>
                  With opt‑in, motion and heart‑rate signals (via wearables) highlight potential falls or cardiac events, prompting fast welfare checks and sharing the last matched route.
                  <div className="mt-3 text-gray-400 text-sm space-y-2">
                    <div><span className="text-gold-300">Fall detection:</span> Sudden acceleration + no subsequent motion can ping a caregiver with location and time.</div>
                    <div><span className="text-gold-300">Cardiac risk:</span> Abnormal HR patterns paired with low movement triggers a “check-in” prompt before notifying contacts.</div>
                    <div><span className="text-gold-300">Outdoor activity:</span> Hiking alone? Share a timed session that escalates if you don’t return by sunset.</div>
                  </div>
                </Card>
                <Card title="Mobile + Web" icon={<Smartphone className="w-5 h-5 text-gold-300" />}>
                  The website mirrors the mobile feed for authorized viewers, so the right people see the right data at the right time.
                  <div className="mt-3 text-gray-400 text-sm space-y-2">
                    <div><span className="text-gold-300">Family check‑ins:</span> Share a live session link that auto‑expires when you arrive safely.</div>
                    <div><span className="text-gold-300">Care circles:</span> Caregivers can get notified and follow the snapped route when someone needs help.</div>
                    <div><span className="text-gold-300">Public safety:</span> In emergencies, generate a restricted view for responders with only the essentials.</div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Mission & Vision */}
        <section className="py-20 px-6 relative">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-serif mb-6">Mission & Vision</h2>
            <p className="text-gray-400 max-w-3xl mx-auto">
              Our mission is simple: give people the tools to be found fast and to deter harm. The vision is a world where location data serves the user first—private, precise, and actionable—so that police, medics, and loved ones reach you when seconds matter.
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-dashed border-gold-400/10"
          />
        </section>

        {/* Legal & Privacy */}
        <section className="py-16 md:py-24 px-6 bg-black/20 border-t border-white/10">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-serif mb-6">Legal & Privacy</h2>
            <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
              <p>
                Consent: Users control data collection and sharing. Trusted contacts must be explicitly added by the user. For minors, guardians manage consent.
              </p>
              <p>
                Data Use: We use your data to provide core features (routing, alerts, dashboards). We do not sell data. We do not share with third parties or big ad networks.
              </p>
              <p>
                Security: TLS in transit; encryption at rest. Strict RBAC; short‑lived sessions; audit logs. Suspect access is flagged and rate‑limited.
              </p>
              <p>
                Retention: Raw telemetry is minimized. You can request export or deletion. Aggregated analytics are anonymized.
              </p>
              <p>
                Public Information: When we show public view links, they are scoped to specific sessions with expiring tokens and redaction of sensitive fields.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto text-center border border-white/10 bg-surface p-10 relative overflow-hidden group">
            <h3 className="text-3xl md:text-4xl font-serif mb-4">Ready to Explore More?</h3>
            <p className="text-gray-400 mb-8">Start a private trial or talk to us about tailored deployments for families, health, or public safety.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/#start-trial" className="px-8 py-3 bg-gold-400 text-black uppercase tracking-[0.2em] text-xs">Start Trial</a>
              <a href="mailto:contact@example.com" className="px-8 py-3 border border-white/20 uppercase tracking-[0.2em] text-xs">Contact</a>
            </div>
            <div className="absolute inset-0 -z-10">
              <div className="absolute -top-20 right-10 w-72 h-72 bg-gold-400/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-24 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
            </div>
          </div>
        </section>
        {/* Immersive modal: OSRM deep dive */}
        <AnimatePresence>
        {modal === 'osrm' && (
          <div className="fixed inset-0 z-[60]" onKeyDown={(e) => { if (e.key === 'Escape') setModal(null); }} tabIndex={-1}>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => setModal(null)}
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="relative z-[61] w-full h-full flex items-center justify-center p-0 md:p-10"
            >
              <div className="relative w-full h-full bg-surface border border-white/10 overflow-y-auto">
                <button onClick={() => setModal(null)} className="absolute top-4 right-4 z-10 px-3 py-1 text-sm border border-white/20 hover:border-gold-400/50">× Close</button>
                <div className="px-6 md:px-12 py-12 max-w-6xl mx-auto">
                  <h2 className="text-3xl md:text-4xl font-serif mb-3">OSRM Map‑Matching — Deep Dive</h2>
                  <p className="text-gray-400 mb-8">End‑to‑end overview of our snapping pipeline, request/response format, and how confidence scores inform the UI.</p>

                  <div className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-4 text-sm leading-relaxed text-gray-300">
                      <h3 className="text-xl font-serif text-white">Algorithm & Query</h3>
                      <p>We call OSRM’s <code className="text-gold-300">/match</code> with a coordinate series and optional timestamps. OSRM uses an HMM with Viterbi search: it balances emission probabilities (GPS noise around candidate road segments) with transition probabilities (movement feasibility along the graph).</p>
                      <p>Our API: <code className="text-gold-300">src/app/api/map_match/route.ts</code> constructs <code>coords</code>/<code>timestamps</code>, fetches OSRM, and returns <code>GeoJSON</code> geometry and <code>confidence</code>.</p>
                      <pre className="bg-black/40 p-4 border border-white/10 text-xs overflow-auto"><code>{`POST /api/map_match
{
  "points": [
    { "lat": 40.1, "lon": -73.9, "timestamp": 1710000000 },
    { "lat": 40.2, "lon": -73.8, "timestamp": 1710000060 }
  ]
}
`}</code></pre>
                      <p>Response includes <code>geometry</code> (GeoJSON LineString) and <code>confidence</code> to drive styling, smoothing, or fallback logic.</p>

                      <h3 className="text-xl font-serif text-white mt-8">Why Confidence Matters</h3>
                      <p>Low confidence triggers: thinner polylines, dashed rendering, or prompting for additional location signals. High confidence can enable predictive interpolation between points.</p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xl font-serif text-white">Architecture (High Level)</h3>
                      <div className="bg-black/30 border border-white/10 p-3">
                        <svg viewBox="0 0 900 460" className="w-full h-[360px]">
                          <defs>
                            <marker id="arrow" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                              <path d="M0,0 L0,6 L9,3 z" fill="rgba(212,175,55,0.8)" />
                            </marker>
                          </defs>
                          {/* Nodes */}
                          <rect x="40" y="40" width="180" height="60" rx="6" fill="transparent" stroke="rgba(255,255,255,0.2)" />
                          <text x="130" y="78" textAnchor="middle" fill="#fff" fontSize="12">Mobile App</text>

                          <rect x="40" y="140" width="180" height="60" rx="6" fill="transparent" stroke="rgba(255,255,255,0.2)" />
                          <text x="130" y="178" textAnchor="middle" fill="#fff" fontSize="12">Web Client (Dashboard)</text>

                          <rect x="330" y="40" width="220" height="60" rx="6" fill="transparent" stroke="rgba(255,255,255,0.2)" />
                          <text x="440" y="78" textAnchor="middle" fill="#fff" fontSize="12">API /api/update_location</text>

                          <rect x="330" y="140" width="220" height="60" rx="6" fill="transparent" stroke="rgba(255,255,255,0.2)" />
                          <text x="440" y="178" textAnchor="middle" fill="#fff" fontSize="12">API /api/map_match</text>

                          <rect x="620" y="40" width="240" height="60" rx="6" fill="transparent" stroke="rgba(255,255,255,0.2)" />
                          <text x="740" y="78" textAnchor="middle" fill="#fff" fontSize="12">Prisma DB (Location/WifiScan/BleScan)</text>

                          <rect x="620" y="140" width="240" height="60" rx="6" fill="transparent" stroke="rgba(255,255,255,0.2)" />
                          <text x="740" y="178" textAnchor="middle" fill="#fff" fontSize="12">OSRM Engine</text>

                          {/* Arrows */}
                          <line x1="220" y1="70" x2="330" y2="70" stroke="rgba(212,175,55,0.8)" strokeWidth="2" markerEnd="url(#arrow)" />
                          <line x1="550" y1="70" x2="620" y2="70" stroke="rgba(212,175,55,0.8)" strokeWidth="2" markerEnd="url(#arrow)" />

                          <line x1="220" y1="170" x2="330" y2="170" stroke="rgba(212,175,55,0.8)" strokeWidth="2" markerEnd="url(#arrow)" />
                          <line x1="550" y1="170" x2="620" y2="170" stroke="rgba(212,175,55,0.8)" strokeWidth="2" markerEnd="url(#arrow)" />
                          <line x1="860" y1="170" x2="550" y2="170" stroke="rgba(212,175,55,0.5)" strokeWidth="2" markerEnd="url(#arrow)" />
                        </svg>
                      </div>

                      <div className="text-gray-400 text-sm leading-relaxed">
                        <p className="mb-2"><span className="text-gold-300">Mobile App</span> sends GPS + optional Wi‑Fi/BLE to <code>/api/update_location</code> → persisted in Prisma.</p>
                        <p className="mb-2"><span className="text-gold-300">Web Client</span> requests /api/map_match with recent points to get snapped geometry for clean route rendering.</p>
                        <p><span className="text-gold-300">OSRM</span> returns GeoJSON + confidence which the UI uses to style polylines and hint uncertainty.</p>
                      </div>
                    </div>

                    <div className="mt-10 grid md:grid-cols-3 gap-4 text-sm">
                      <div className="border border-white/10 p-4 bg-surface/40">
                        <div className="text-gold-300 mb-1">Endpoints</div>
                        <div className="text-gray-400">/api/update_location, /api/map_match</div>
                      </div>
                      <div className="border border-white/10 p-4 bg-surface/40">
                        <div className="text-gold-300 mb-1">Data</div>
                        <div className="text-gray-400">Location, WifiScan, BleScan, TrackingSession</div>
                      </div>
                      <div className="border border-white/10 p-4 bg-surface/40">
                        <div className="text-gold-300 mb-1">Match Params</div>
                        <div className="text-gray-400">Coordinates, timestamps, driving profile, GeoJSON</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>

        {/* Immersive modal: Signal Fusion deep dive */}
        <AnimatePresence>
        {modal === 'fusion' && (
          <div className="fixed inset-0 z-[60]" onKeyDown={(e) => { if (e.key === 'Escape') setModal(null); }} tabIndex={-1}>
            <motion.div
              key="backdrop-fusion"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => setModal(null)}
            />
            <motion.div
              key="modal-fusion"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="relative z-[61] w-full h-full flex items-center justify-center p-0 md:p-10"
            >
              <div className="relative w-full h-full bg-surface border border-white/10 overflow-y-auto">
                <button onClick={() => setModal(null)} className="absolute top-4 right-4 z-10 px-3 py-1 text-sm border border-white/20 hover:border-gold-400/50">× Close</button>
                <div className="px-6 md:px-12 py-12 max-w-6xl mx-auto">
                  <h2 className="text-3xl md:text-4xl font-serif mb-3">Signal Fusion — Deep Dive</h2>
                  <p className="text-gray-400 mb-8">How Wi‑Fi and BLE scans complement GPS for stability, indoor positioning, and proximity anomaly detection.</p>

                  <div className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-4 text-sm leading-relaxed text-gray-300">
                      <h3 className="text-xl font-serif text-white">Data & Storage</h3>
                      <p>Mobile app can send observed Wi‑Fi (SSID/BSSID/RSSI/Frequency) and BLE (MAC/name/RSSI). We store them in <code className="text-gold-300">WifiScan</code> and <code className="text-gold-300">BleScan</code>, linked to a <code className="text-gold-300">Location</code> row for time and place context.</p>
                      <pre className="bg-black/40 p-4 border border-white/10 text-xs overflow-auto"><code>{`WifiScan { ssid, bssid, rssi, frequency, locationId }
BleScan  { name, address, rssi, locationId }`}</code></pre>
                      <h3 className="text-xl font-serif text-white">Inference</h3>
                      <ul className="list-disc list-inside text-gray-400">
                        <li>Indoor hints: Recognize stable Wi‑Fi beacons to smooth GPS drift.</li>
                        <li>Proximity alerts: Unknown BLE devices shadowing user across time windows.</li>
                        <li>Confidence boost: More signals → higher certainty in segments.</li>
                      </ul>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xl font-serif text-white">Architecture (Fusion)</h3>
                      <div className="bg-black/30 border border-white/10 p-3">
                        <svg viewBox="0 0 900 420" className="w-full h-[340px]">
                          <defs>
                            <marker id="arrow2" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                              <path d="M0,0 L0,6 L9,3 z" fill="rgba(212,175,55,0.8)" />
                            </marker>
                          </defs>
                          <rect x="40" y="40" width="220" height="60" rx="6" fill="transparent" stroke="rgba(255,255,255,0.2)" />
                          <text x="150" y="78" textAnchor="middle" fill="#fff" fontSize="12">Mobile Sensors (GPS/Wi‑Fi/BLE)</text>

                          <rect x="320" y="40" width="220" height="60" rx="6" fill="transparent" stroke="rgba(255,255,255,0.2)" />
                          <text x="430" y="78" textAnchor="middle" fill="#fff" fontSize="12">/api/update_location</text>

                          <rect x="320" y="140" width="220" height="60" rx="6" fill="transparent" stroke="rgba(255,255,255,0.2)" />
                          <text x="430" y="178" textAnchor="middle" fill="#fff" fontSize="12">Analyzer (Heuristics)</text>

                          <rect x="600" y="40" width="260" height="60" rx="6" fill="transparent" stroke="rgba(255,255,255,0.2)" />
                          <text x="730" y="78" textAnchor="middle" fill="#fff" fontSize="12">Prisma DB (Location/Wifi/BLE)</text>

                          <rect x="600" y="140" width="260" height="60" rx="6" fill="transparent" stroke="rgba(255,255,255,0.2)" />
                          <text x="730" y="178" textAnchor="middle" fill="#fff" fontSize="12">Alerts / Dashboard</text>

                          <line x1="260" y1="70" x2="320" y2="70" stroke="rgba(212,175,55,0.8)" strokeWidth="2" markerEnd="url(#arrow2)" />
                          <line x1="540" y1="70" x2="600" y2="70" stroke="rgba(212,175,55,0.8)" strokeWidth="2" markerEnd="url(#arrow2)" />
                          <line x1="540" y1="170" x2="600" y2="170" stroke="rgba(212,175,55,0.8)" strokeWidth="2" markerEnd="url(#arrow2)" />
                        </svg>
                      </div>

                      <div className="text-gray-400 text-sm leading-relaxed">
                        <p className="mb-2">Heuristics run per session: dwell detection, RSSI stability, and repeated unknown MACs near the user trigger notifications.</p>
                        <p>UI reflects certainty with glows and pulses; repeated sightings increase severity.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>

        {/* Immersive modal: Privacy deep dive */}
        <AnimatePresence>
        {modal === 'privacy' && (
          <div className="fixed inset-0 z-[60]" onKeyDown={(e) => { if (e.key === 'Escape') setModal(null); }} tabIndex={-1}>
            <motion.div
              key="backdrop-privacy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => setModal(null)}
            />
            <motion.div
              key="modal-privacy"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25, delay: 0.05 }}
              className="relative z-[61] w-full h-full flex items-center justify-center p-0 md:p-10"
            >
              <div className="relative w-full h-full bg-surface border border-white/10 overflow-y-auto">
                <button onClick={() => setModal(null)} className="absolute top-4 right-4 z-10 px-3 py-1 text-sm border border-white/20 hover:border-gold-400/50">× Close</button>
                <div className="px-6 md:px-12 py-12 max-w-6xl mx-auto">
                  <h2 className="text-3xl md:text-4xl font-serif mb-3">Privacy by Design — Security & Compliance</h2>
                  <p className="text-gray-400 mb-8">How we protect user data end‑to‑end: consent, minimal collection, encryption, scoped access, and retention.</p>

                  <div className="grid md:grid-cols-2 gap-10">
                    <div className="space-y-4 text-sm leading-relaxed text-gray-300">
                      <h3 className="text-xl font-serif text-white">Controls</h3>
                      <ul className="list-disc list-inside text-gray-400">
                        <li>Consent-driven sharing: user-owned trust circles and expiring links.</li>
                        <li>Transport + at-rest encryption; short-lived tokens; RBAC; audit logs.</li>
                        <li>Data minimization and deletion/export on demand.</li>
                        <li>No sale or third‑party sharing of personal data.</li>
                      </ul>

                      <h3 className="text-xl font-serif text-white mt-6">Retention</h3>
                      <p>Raw telemetry is minimized and rotated; analytics are aggregated and anonymized. Public views are redacted and scoped to sessions with expiry.</p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xl font-serif text-white">Architecture (Security)</h3>
                      <div className="bg-black/30 border border-white/10 p-3">
                        <svg viewBox="0 0 900 420" className="w-full h-[340px]">
                          <defs>
                            <marker id="arrow3" markerWidth="10" markerHeight="10" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
                              <path d="M0,0 L0,6 L9,3 z" fill="rgba(212,175,55,0.8)" />
                            </marker>
                          </defs>
                          <rect x="60" y="40" width="200" height="60" rx="6" fill="transparent" stroke="rgba(255,255,255,0.2)" />
                          <text x="160" y="78" textAnchor="middle" fill="#fff" fontSize="12">User / Auth</text>

                          <rect x="330" y="40" width="220" height="60" rx="6" fill="transparent" stroke="rgba(255,255,255,0.2)" />
                          <text x="440" y="78" textAnchor="middle" fill="#fff" fontSize="12">Services (APIs)</text>

                          <rect x="330" y="140" width="220" height="60" rx="6" fill="transparent" stroke="rgba(255,255,255,0.2)" />
                          <text x="440" y="178" textAnchor="middle" fill="#fff" fontSize="12">Access Control (RBAC)</text>

                          <rect x="600" y="40" width="240" height="60" rx="6" fill="transparent" stroke="rgba(255,255,255,0.2)" />
                          <text x="720" y="78" textAnchor="middle" fill="#fff" fontSize="12">Encrypted Storage</text>

                          <rect x="600" y="140" width="240" height="60" rx="6" fill="transparent" stroke="rgba(255,255,255,0.2)" />
                          <text x="720" y="178" textAnchor="middle" fill="#fff" fontSize="12">Audit & Retention</text>

                          <line x1="260" y1="70" x2="330" y2="70" stroke="rgba(212,175,55,0.8)" strokeWidth="2" markerEnd="url(#arrow3)" />
                          <line x1="550" y1="70" x2="600" y2="70" stroke="rgba(212,175,55,0.8)" strokeWidth="2" markerEnd="url(#arrow3)" />
                          <line x1="550" y1="170" x2="600" y2="170" stroke="rgba(212,175,55,0.8)" strokeWidth="2" markerEnd="url(#arrow3)" />
                        </svg>
                      </div>

                      <div className="text-gray-400 text-sm leading-relaxed">
                        <p className="mb-2">Scopes restrict access to user-owned resources; all sensitive fields are encrypted at rest and transmitted via TLS.</p>
                        <p>Audit logs cover read/write access; automated retention jobs scrub or anonymize stale data.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
