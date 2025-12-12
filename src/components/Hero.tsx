"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui/Button';
import { ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';

export const Hero: React.FC = () => {
  const router = useRouter();
  const [scannerReverse, setScannerReverse] = React.useState(false);
  const onBegin = () => {
    const el = document.getElementById('start-trial');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      router.push('/#start-trial');
    }
  };
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-background">
      {/* Background Texture */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-30 mix-blend-overlay"></div>
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gold-500/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-900/5 rounded-full blur-[150px] pointer-events-none" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10 w-full pt-20">
        <div className="flex flex-col items-center text-center">
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-3 px-4 py-2 border border-gold-400/30 rounded-full bg-gold-400/5 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
              <span className="text-[10px] md:text-xs font-sans font-semibold tracking-[0.2em] uppercase text-gold-300">
                The New Standard in Safety
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-5xl md:text-7xl lg:text-9xl font-serif text-white leading-none mb-8 tracking-tight"
          >
            Guard <span className="text-gold-gradient italic pr-2">Royal</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-gray-400 text-sm md:text-base font-sans tracking-wide max-w-xl mx-auto mb-12 leading-relaxed"
          >
            {/* Experience the pinnacle of personal security. Military-grade encryption tailored for the discerning individual who demands nothing less than absolute protection. */}
            Experience next-level personal & family security.
Military-grade encryption, intelligent route monitoring, and smart proximity alerts that detect unusual patterns, unfamiliar devices, and potential risks—keeping your loved ones safe and connected.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="flex flex-col md:flex-row gap-6"
          >
            <Button variant="gold" icon onClick={onBegin} className="min-w-[200px]">Begin Trial</Button>
            <Button variant="outline" onClick={() => router.push('/discover')} className="min-w-[200px]">Discover More</Button>
          </motion.div>
        </div>

        {/* Abstract Floating Element */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, delay: 1 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-full h-full pointer-events-none"
        >
          {/* Decorative rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] md:w-[600px] md:h-[600px] border border-white/5 rounded-full" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] md:w-[800px] md:h-[800px] border border-white/5 rounded-full" />
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] md:w-[500px] md:h-[500px] border border-dashed border-gold-500/10 rounded-full"
          />
        </motion.div>

        {/* Target Scanner overlay (fades in last) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 2.6 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-auto"
          onMouseEnter={() => setScannerReverse(true)}
          onMouseLeave={() => setScannerReverse(false)}
        >
          <div className="relative w-[700px] h-[700px] md:w-[1100px] md:h-[1100px] rounded-full border border-white/10 overflow-hidden">
            {/* Concentric rings */}
            <div className="absolute inset-6 rounded-full border border-white/10" />
            <div className="absolute inset-16 rounded-full border border-white/10" />
            <div className="absolute inset-28 rounded-full border border-white/10" />

            {/* Rotating dashed ring */}
            <motion.div
              animate={{ rotate: scannerReverse ? -360 : 360 }}
              transition={{ repeat: Infinity, duration: 35, ease: 'linear' }}
              className="absolute inset-10 rounded-full border border-dashed border-gold-400/20"
            />

            {/* Rotating gold sweep (outer ring only, thicker arc) */}
            <motion.div
              animate={{ rotate: scannerReverse ? -360 : 360 }}
              transition={{ repeat: Infinity, duration: 22, ease: 'linear' }}
              className="absolute inset-0 rounded-full"
              style={{
                background: 'conic-gradient(from 0deg, rgba(212,175,55,0.30), rgba(212,175,55,0) 42%)',
                maskImage: 'radial-gradient(circle, transparent 70%, black 76%)',
                WebkitMaskImage: 'radial-gradient(circle, transparent 70%, black 76%)'
              } as React.CSSProperties}
            />

            {/* Center glow removed to preserve headline legibility */}

            {/* Orbiting pulse dots */}
            <motion.div
              animate={{ rotate: scannerReverse ? -360 : 360 }}
              transition={{ repeat: Infinity, duration: 12, ease: 'linear' }}
              className="absolute inset-14"
            >
              <motion.span
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gold-300 shadow-[0_0_18px_rgba(212,175,55,0.9)]"
                animate={{ scale: [1, 1.3, 1], opacity: [0.85, 1, 0.85] }}
                transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
              />
            </motion.div>
            <motion.div
              animate={{ rotate: scannerReverse ? 360 : -360 }}
              transition={{ repeat: Infinity, duration: 16, ease: 'linear' }}
              className="absolute inset-24"
            >
              <motion.span
                className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gold-300/80 shadow-[0_0_14px_rgba(212,175,55,0.7)]"
                animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Full-hero crosshair lines */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          transition={{ duration: 1.2, delay: 3.0 }}
          className="absolute inset-0 pointer-events-none z-0"
        >
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-full w-px bg-white/5" />
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-px bg-white/5" />
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gold-400/50"
      >
        <span className="text-[10px] uppercase tracking-[0.2em]">Explore</span>
        <ChevronDown className="w-4 h-4 animate-bounce" />
      </motion.div>
    </section>
  );
};
