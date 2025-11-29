"use client";
import React from 'react';

// Stylized space scene placeholder (CSS + motion, no deps)
const SpaceScene: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Star field (simple) */}
      <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(212,175,55,0.06), transparent 40%), radial-gradient(circle at 80% 70%, rgba(59,130,246,0.08), transparent 40%)' }} />
      {/* Wire arcs */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] rounded-full"
        style={{ border: '1px dashed rgba(255,255,255,0.06)' }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full"
        style={{ border: '1px dashed rgba(255,255,255,0.08)' }}
        animate={{ rotate: [360, 0] }}
        transition={{ duration: 160, repeat: Infinity, ease: 'linear' }}
      />
      {/* Pirate ship (skull in diamond) */}
      <motion.div
        className="absolute"
        initial={{ x: '-20%', y: '20%', rotate: -10 }}
        animate={{ x: ['-20%', '110%'], y: ['20%', '10%', '25%', '15%'], rotate: [-10, 5, -4, 2] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div
          className="w-20 h-20 md:w-28 md:h-28 border border-gold-400/50"
          style={{ transform: 'rotate(45deg)' }}
          animate={{ rotate: [45, 47, 43, 45] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="w-full h-full flex items-center justify-center" style={{ transform: 'rotate(-45deg)' }}>
            <Skull className="w-8 h-8 md:w-12 md:h-12 text-gold-300" />
          </div>
        </motion.div>
        <motion.div
          className="mt-2 mx-auto w-10 h-3 md:w-14 md:h-4 bg-gold-400/30"
          animate={{ scaleX: [1, 1.4, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  );
};
import { motion } from 'framer-motion';
import { Navbar } from '@/components/Navbar';
import { Skull } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-white selection:bg-gold-500/30 selection:text-gold-200">
      <Navbar />

      <main className="relative overflow-hidden">
        {/* Background accents */}


        {/* Hero */}
        <section className="pt-40 pb-24 px-6 relative">
          <div className="max-w-7xl mx-auto text-center">
            {/* Pirate-ish icon */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <motion.div
                initial={{ y: -12, rotate: -8, opacity: 0 }}
                animate={{ y: [ -12, 0, -6, 0 ], rotate: [-8, 0], opacity: 1 }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
                className="w-14 h-14 md:w-20 md:h-20 flex items-center justify-center border border-gold-400/50"
              >
                <Skull className="w-7 h-7 md:w-10 md:h-10 text-gold-300" />
              </motion.div>
            </div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9 }}
              className="text-5xl md:text-8xl lg:text-[9rem] leading-[0.95] font-serif tracking-tight"
            >
              About <span className="text-gold-gradient italic">Guardian</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.8 }}
              className="mt-6 text-xl md:text-2xl text-gold-200"
            >
              Under Construction
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.8 }}
              className="mt-2 text-sm md:text-base text-gray-400 max-w-2xl mx-auto"
            >
              We’re burning the keyboard to GTD — building features, polishing flows, and charting the course. Check back soon for the full voyage log.
            </motion.p>

            {/* Space scene full bleed */}
            <div className="relative mt-14 h-[70vh] md:h-[78vh] border border-white/10 bg-black/10 overflow-hidden">
              <SpaceScene />
            </div>
          </div>
        </section>
      </main>

    </div>
  );
}
