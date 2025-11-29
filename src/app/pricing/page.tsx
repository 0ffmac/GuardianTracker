"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Shield, Stars } from 'lucide-react';

export default function PricingPage() {
  const [pulse, setPulse] = React.useState(0);
  const [swap, setSwap] = React.useState(false);
  const [visible, setVisible] = React.useState(true);
  const [cycle, setCycle] = React.useState(0);

  React.useEffect(() => {
    const id = setInterval(() => setPulse((p) => p + 1), 10000); // quiet for 10s between cycles
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (pulse === 0) return; // skip on initial load
    setVisible(false); // fade out current
    const t = setTimeout(() => {
      setSwap((s) => !s); // swap colors for next cycle
      setCycle((c) => c + 1); // retrigger entrance animation
      setVisible(true); // fade back in (AnimatePresence handles exit)
    }, 1200);
    return () => clearTimeout(t);
  }, [pulse]);
  return (
    <div className="min-h-screen bg-background text-white selection:bg-gold-500/30 selection:text-gold-200">
      <Navbar />

      <main className="relative overflow-hidden">
        {/* background glows */}
        <div className="pointer-events-none absolute -top-40 -left-32 w-[700px] h-[700px] bg-gold-400/10 rounded-full blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-40 -right-32 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px]" />

        {/* Hero pricing */}
        <section className="pt-40 pb-24 px-6 relative">
          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ y: -800, rotate: -45, opacity: 0 }}
              animate={{
                y: [ -800, 0, -120, 0, -50, 0, -15, 0 ],
                rotate: [ -45, 0, 10, 0, 6, 0, 2, 0 ],
                opacity: [0, 1, 1, 1, 1, 1, 1, 1],
              }}
              transition={{ duration: 2.2, ease: 'easeOut', times: [0, 0.55, 0.7, 0.8, 0.88, 0.94, 0.98, 1] }}
              className="mx-auto mb-8 w-28 h-28 md:w-40 md:h-40"
              style={{ transformOrigin: '50% 50%' }}
            >
              <motion.div
                className="w-full h-full flex items-center justify-center border border-gold-400/50 rounded-none"
                key={pulse}
                initial={{ rotate: 0 }}
                animate={{ rotate: [0, 1.8, -1.8, 1, -1, 0] }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
              >
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={{ rotate: [0, 360, 720] }}
                  transition={{ duration: 2.2, ease: 'easeOut' }}
                >
                  <Shield className="w-10 h-10 md:w-16 md:h-16 text-gold-400" />
                </motion.div>
              </motion.div>
            </motion.div>

            <div className="relative inline-block">
              <AnimatePresence mode="wait">
                {visible && (
                  <motion.h1
                    key={cycle}
                    initial="hidden"
                    animate="show"
                    exit={{ opacity: 0, transition: { duration: 1.2 } }}
                    className="text-5xl md:text-8xl lg:text-[10rem] leading-[0.9] font-serif tracking-tight"
                    variants={{
                      hidden: {},
                      show: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
                    }}
                  >
                    {Array.from('Guardian ').map((ch, i) => (
                      <motion.span
                        key={`g-${cycle}-${i}`}
                        className={ch === ' ' ? 'inline-block w-6 md:w-8' : swap ? 'inline-block text-gold-gradient italic' : 'inline-block text-white' }
                        initial={{
                          y: Math.random() * 80 - 40,
                          x: Math.random() * 40 - 20,
                          rotate: Math.random() * 40 - 20,
                          opacity: 0,
                          filter: 'blur(4px)'
                        }}
                        animate={{ y: 0, x: 0, rotate: 0, opacity: 1, filter: 'blur(0px)' }}
                        transition={{ duration: 1.1, ease: 'easeOut' }}
                      >
                        {ch}
                      </motion.span>
                    ))}
                    {Array.from('Elite').map((ch, i) => (
                      <motion.span
                        key={`e-${cycle}-${i}`}
                        className={swap ? 'inline-block text-white' : 'inline-block text-gold-gradient italic' }
                        initial={{
                          y: Math.random() * 80 - 40,
                          x: Math.random() * 40 - 20,
                          rotate: Math.random() * 40 - 20,
                          opacity: 0,
                          filter: 'blur(4px)'
                        }}
                        animate={{ y: 0, x: 0, rotate: 0, opacity: 1, filter: 'blur(0px)' }}
                        transition={{ duration: 1.1, ease: 'easeOut' }}
                      >
                        {ch}
                      </motion.span>
                    ))}
                  </motion.h1>
                )}
              </AnimatePresence>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -6 }}
              animate={{ opacity: 1, scale: 1, rotate: [ -6, 0, 6, 0 ] }}
              transition={{ delay: 1.6, duration: 0.9 }}
              className="mt-8 inline-flex items-center gap-3"
            >
              <motion.span className="text-3xl md:text-5xl font-serif">
                <span className="text-gold-gradient">is Free</span>
              </motion.span>
              <motion.span
                initial={{ scaleY: 1 }}
                animate={{ scaleY: [1, 0.4, 1] }}
                transition={{ delay: 2.2, duration: 0.5 }}
                className="inline-flex"
              >
                <Stars className="w-6 h-6 md:w-8 md:h-8 text-gold-300" />
              </motion.span>
              <motion.span className="text-base md:text-xl text-gold-200">
                — thanks to <span className="font-semibold text-gold-300">ChatGPT</span>
              </motion.span>
            </motion.div>

            {/* Simple tier card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="mt-12 grid md:grid-cols-3 gap-6"
            >
              <div className="relative border border-white/10 bg-surface/60 backdrop-blur-md p-8 text-left">
                <div className="text-xs uppercase tracking-[0.3em] text-gray-400">Plan</div>
                <div className="text-3xl md:text-4xl font-serif mt-2">Free</div>
                <div className="text-gray-400 mt-3">All core features included. Personal use. No ads.</div>
              </div>
              <div className="relative border border-white/10 bg-surface/60 backdrop-blur-md p-8 text-left">
                <div className="text-xs uppercase tracking-[0.3em] text-gray-400">What you get</div>
                <ul className="mt-3 text-gray-300 space-y-2 text-sm">
                  <li>• Real‑time tracking & matched routes</li>
                  <li>• Signal fusion (GPS + Wi‑Fi/BLE)</li>
                  <li>• Private sharing for trusted contacts</li>
                  <li>• Alerts and safety check‑ins</li>
                </ul>
              </div>
              <div className="relative border border-white/10 bg-surface/60 backdrop-blur-md p-8 text-left">
                <div className="text-xs uppercase tracking-[0.3em] text-gray-400">Future</div>
                <div className="text-gray-400 mt-3 text-sm">Open APIs, responder tooling, and enhanced analytics — driven by the community.</div>
              </div>
            </motion.div>
          </div>

          {/* Confetti pulses */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 1.2 }}
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <motion.span
              animate={{ y: [0, -20, 0], opacity: [0.3, 0.8, 0.3] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="absolute left-1/3 top-1/3 w-3 h-3 rounded-full bg-gold-400 shadow-[0_0_20px_rgba(212,175,55,0.8)]"
            />
            <motion.span
              animate={{ y: [0, -28, 0], opacity: [0.2, 0.9, 0.2] }}
              transition={{ repeat: Infinity, duration: 5 }}
              className="absolute left-2/3 top-1/2 w-2 h-2 rounded-full bg-gold-300 shadow-[0_0_16px_rgba(212,175,55,0.7)]"
            />
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
